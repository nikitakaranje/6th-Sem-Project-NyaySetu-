import httpx
import json
import math
import re
import io
from prompts import EXTRACT_FACTS_PROMPT, CALCULATE_SCORES_PROMPT, ASK_QUESTION_PROMPT

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_SMALL = "llama3.2:1b"
MODEL_LARGE = "gemma2:2b"

class OllamaClient:
    def __init__(self, base_url: str = OLLAMA_URL):
        self.base_url = base_url

    def _extract_json(self, text: str) -> dict:
        text = text.strip()
        
        # Strip markdown json block markers if present
        if text.startswith("```"):
            newline_idx = text.find("\n")
            if newline_idx != -1:
                text = text[newline_idx:].strip()
            if text.endswith("```"):
                text = text[:-3].strip()
                
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            json_str = text[start:end+1]
            try:
                # Use strict=False to handle literal control characters like newlines in json strings
                return json.loads(json_str, strict=False)
            except json.JSONDecodeError:
                pass
                
        # Regex fallback for draft_text key (most common failure point for long legal drafts)
        match_draft = re.search(r'"draft_text"\s*:\s*"(.*?)"', text, re.DOTALL)
        if match_draft:
            content = match_draft.group(1)
            content = content.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
            return {"draft_text": content}
            
        # Regex fallback for answer key (common for QA)
        match_ans = re.search(r'"answer"\s*:\s*"(.*?)"', text, re.DOTALL)
        if match_ans:
            ans = match_ans.group(1).replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
            citations = []
            match_cit = re.search(r'"citations"\s*:\s*\[(.*?)\]', text, re.DOTALL)
            if match_cit:
                try:
                    citations = [int(x.strip()) for x in match_cit.group(1).split(",") if x.strip().isdigit()]
                except Exception:
                    pass
            return {"answer": ans, "citations": citations}

        # If LLM didn't return JSON at all but returned pure text for a draft
        if len(text) > 100 and any(keyword in text for keyword in ["COURT", "VERSUS", "VS", "PETITIONER", "PRAYER", "BAIL", "LEGAL NOTICE"]):
            return {"draft_text": text}
            
        return {"error": "Ollama returned invalid JSON", "raw": text[:500]}

    def _call(self, prompt: str, model: str = MODEL_SMALL) -> dict:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
        }

        try:
            resp = httpx.post(
                self.base_url,
                json=payload,
                timeout=300.0,
            )
            resp.raise_for_status()
            text = resp.json().get("response", "")
            if not text.strip():
                return {"error": "Empty response from model"}
            return self._extract_json(text)
        except httpx.ConnectError:
            return {"error": "Ollama server unreachable. Start with: ollama serve"}
        except httpx.TimeoutException:
            return {"error": "Ollama request timed out after 120s"}
        except json.JSONDecodeError:
            return {"error": "Ollama returned invalid JSON"}
        except httpx.HTTPStatusError:
            return {"error": "Ollama returned an error response"}

    def extract_facts(self, raw_text: str) -> dict:
        prompt = EXTRACT_FACTS_PROMPT.format(raw_text=raw_text)
        result = self._call(prompt, model=MODEL_LARGE)
        return {
            "facts_summary": result.get("facts_summary", ""),
            "ipc_sections": result.get("ipc_sections", []),
            "accused_profile": result.get("accused_profile", ""),
            "key_issues": result.get("key_issues", []),
        }

    def calculate_scores(self, facts_summary: str) -> dict:
        prompt = CALCULATE_SCORES_PROMPT.format(facts=facts_summary)
        result = self._call(prompt, model=MODEL_LARGE)
        return {
            "case_strength": result.get("case_strength", 50),
            "precedent_support": result.get("precedent_support", 50),
            "bail_likelihood": result.get("bail_likelihood", 50),
            "argument_readiness": result.get("argument_readiness", 50),
            "overall_risk": result.get("overall_risk", 50),
        }

    def analyze_bail(self, case_data: dict) -> dict:
        facts = case_data.get('structured_data', {}).get('facts_summary', '')
        prompt = f"Estimate bail probability (0-100) for this case and provide recommendation.\n\nCase: {facts}\n\nReturn only JSON: {{\"probability\": number, \"recommendation\": string, \"reasons\": string, \"what_if\": {{\"prior_conviction\": number, \"heinous_charges\": number, \"strong_evidence\": number}}}}"
        result = self._call(prompt)
        if "error" in result:
            return {
                "probability": 50,
                "recommendation": "Analysis unavailable - please consult a legal professional.",
                "reasons": "AI model could not process this case.",
                "what_if": {"prior_conviction": 50, "heinous_charges": 50, "strong_evidence": 50},
            }
        return result

    def generate_debate(self, argument: str, role: str, case_summary: str) -> dict:
        side = 'prosecution' if role == 'co-counsel' else 'defense'
        prompt = f"Respond as {side} with a short counter-argument.\n\nCase: {case_summary}\nArgument to counter: {argument}\n\nOnly output JSON: {{\"response\": \"your counter-argument\", \"persuasiveness_score\": 0-100}}"
        result = self._call_with_fallback(prompt)
        if "error" in result:
            return {"response": "Unable to generate counter-argument. Please try rephrasing.", "persuasiveness_score": 50}
        return result

    def generate_insights(self, case_data: dict) -> dict:
        summary = case_data.get('summary', case_data.get('structured_data', {}).get('facts_summary', ''))
        prompt = f"Give one key legal insight about this case.\n\nCase: {summary}\n\nOnly output JSON: {{\"insights\": \"your insight\"}}"
        result = self._call(prompt)
        if "error" in result:
            return {"insights": "AI insights unavailable for this case."}
        return result

    def _call_with_fallback(self, prompt: str) -> dict:
        result = self._call(prompt, model=MODEL_SMALL)
        if "error" not in result:
            return result
        return self._call(prompt, model=MODEL_LARGE)

    def ask_question(self, question: str, case_data: dict) -> dict:
        sd = case_data.get("structured_data", {})
        prompt = ASK_QUESTION_PROMPT.format(
            facts_summary=sd.get("facts_summary", case_data.get("raw_input_text", "")),
            ipc_sections=", ".join(sd.get("ipc_sections", [])),
            accused_profile=sd.get("accused_profile", ""),
            question=question,
        )
        result = self._call_with_fallback(prompt)
        if "error" in result:
            return {"answer": "Unable to answer this question. Please try again."}
        return result

    def generate_draft(self, draft_type: str, case_data: dict) -> dict:
        facts = case_data.get('structured_data', {}).get('facts_summary', case_data.get('raw_input_text', ''))
        prompt = f"Write a {draft_type.replace('_', ' ')} for this case.\n\nCase: {facts}\n\nOnly output JSON: {{\"draft_text\": \"full draft text\"}}"
        result = self._call(prompt)
        if "error" in result:
            return {"draft_text": "Unable to generate draft. Please try again."}
        return result

    def chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 150) -> list:
        chunks = []
        if not text:
            return chunks
        
        i = 0
        while i < len(text):
            end = min(i + chunk_size, len(text))
            if end < len(text):
                space_index = text.rfind(" ", i, end)
                if space_index != -1 and space_index > i:
                    end = space_index
            
            chunk_text_slice = text[i:end].strip()
            if chunk_text_slice:
                chunks.append({
                    "id": len(chunks),
                    "text": chunk_text_slice
                })
            
            i = end - overlap
            if i >= len(text) or end == len(text):
                break
            if i <= 0:
                i = end
        return chunks

    def extract_pdf_text(self, file_bytes: bytes) -> str:
        from pypdf import PdfReader
        text = ""
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        except Exception as e:
            print(f"Error extracting PDF: {e}")
        return text.strip()

    def retrieve_relevant_chunks(self, chunks: list, query: str, top_k: int = 3) -> list:
        if not chunks:
            return []
        
        def tokenize(text):
            return re.findall(r'\w+', text.lower())
        
        query_tokens = set(tokenize(query))
        if not query_tokens:
            return chunks[:top_k]
        
        doc_freqs = {}
        for chunk in chunks:
            tokens = set(tokenize(chunk["text"]))
            for t in tokens:
                doc_freqs[t] = doc_freqs.get(t, 0) + 1
                
        num_docs = len(chunks)
        scored_chunks = []
        for chunk in chunks:
            tokens = tokenize(chunk["text"])
            score = 0.0
            for token in query_tokens:
                if token in tokens:
                    tf = tokens.count(token)
                    df = doc_freqs.get(token, 0)
                    idf = math.log((num_docs + 1) / (df + 1)) + 1.0
                    score += tf * idf
            
            scored_chunks.append((score, chunk))
            
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_chunks[:top_k] if item[0] > 0] or chunks[:top_k]

    def ask_question_rag(self, question: str, case_data: dict) -> dict:
        chunks = case_data.get("chunks", [])
        if not chunks:
            return self.ask_question(question, case_data)
        
        relevant_chunks = self.retrieve_relevant_chunks(chunks, question, top_k=3)
        context = "\n\n".join([f"[Doc Chunk {c['id']}]: {c['text']}" for c in relevant_chunks])
        
        prompt = f"""You are a legal AI assistant. Answer the user's question about the case using the provided document chunks as context.
        
        Context Chunks:
        {context}
        
        Question:
        {question}
        
        Guidelines:
        1. Keep the answer professional and legally precise.
        2. Reference which chunk number (e.g., [Chunk 1], [Chunk 2]) support your facts.
        3. If the answer cannot be found in the context, say "Based on the uploaded document, I cannot find information regarding this. However, generally..." and answer using general Indian legal knowledge.
        
        Only output JSON: {{"answer": "your structured answer, including references to chunk numbers", "citations": [list of chunk ids that were relevant, e.g. [1, 2]]}}
        """
        result = self._call_with_fallback(prompt)
        if "error" in result:
            return {"answer": "Unable to process this RAG question. Please try again.", "citations": []}
        return result

    def generate_legal_draft_rag(self, draft_type: str, case_data: dict, details: dict) -> dict:
        chunks = case_data.get("chunks", [])
        facts = ""
        if chunks:
            relevant = self.retrieve_relevant_chunks(chunks, f"facts, incident, charges against {details.get('petitioner', 'accused')}", top_k=5)
            facts = "\n\n".join([c["text"] for c in relevant])
        else:
            facts = case_data.get('structured_data', {}).get('facts_summary', case_data.get('raw_input_text', ''))
            
        court = details.get("court_name") or "IN THE COURT OF THE METROPOLITAN MAGISTRATE, SAKET COURTS, NEW DELHI"
        court_type = details.get("court_type") or "metropolitan_magistrate"
        petitioner = details.get("petitioner") or "Ramesh Sharma, S/o Shri Om Sharma, R/o Saket, New Delhi"
        respondent = details.get("respondent") or "State of NCT of Delhi"
        case_no = details.get("case_number") or "FIR No. 124/2026, P.S. Saket"
        advocate = details.get("advocate_name") or "Associate Counsel, NyayaAI & Partners"
        sections = details.get("applicable_sections") or "379/411 IPC, Section 437 CrPC"
        precedents = details.get("previous_cases") or ""
        
        precedent_context = ""
        if precedents and precedents.strip():
            precedent_context = f"\n\n- Applicable Precedents: {precedents}"
        
        prompt = f"""You are a senior advocate in India. Generate a highly professional, standard legal draft file for a "{draft_type.replace('_', ' ').title()}".
        
        Use the following details:
        - Court/Jurisdiction: {court} ({court_type.replace('_', ' ').title()})
        - Petitioner/Applicant (Accused): {petitioner}
        - Respondent: {respondent}
        - Case/FIR Reference: {case_no}
        - Advocate Name: {advocate}
        - Applicable Sections: {sections}
        {precedent_context}
        - Underlying Case Facts (extracted from documents): {facts}
        
        The draft MUST be formatted in a professional legal format:
        1. Appropriate uppercase centered headings for the Court Jurisdiction and the Document Title.
        2. "MEMORANDUM OF PARTIES" with petitioner vs respondent clearly styled.
        3. A comprehensive set of numbered paragraphs detailing the facts, arrest/incident date, showing false implication, and lack of prior criminal record.
        4. "GROUNDS": List at least 5-6 strong legal grounds (e.g. "Because the accused has roots in society...", "Because no recovery is pending...", "Because custody is no longer required for investigation...").
        5. "PRAYER": Formal closing prayer paragraph asking for the relief (e.g. release on bail / dismissal / notice response).
        6. APPLICANT THROUGH ADVOCATE, PLACE, DATE, and VERIFICATION sections.
        
        Ensure double line-spacing styling, formal language ("Most Respectfully Showeth", "Humbly Prayed"), and strict legal vocabulary. Avoid placeholders like "[Insert Date Here]". Make realistic dates or use "21.05.2026" based on today.
        
        Only output JSON: {{"draft_text": "the full formatted legal draft text, utilizing double newlines \\n\\n for paragraphs"}}
        """
        result = self._call_with_fallback(prompt)
        if "error" in result or not result.get("draft_text") or "Unable to generate draft" in result.get("draft_text", ""):
            # Under local Ollama or error conditions, compile a beautiful high-fidelity standard legal draft programmatically
            fallback_text = self.get_fallback_legal_draft(draft_type, details, facts)
            return {"draft_text": fallback_text}
        return result

    def get_fallback_legal_draft(self, draft_type: str, details: dict, facts: str) -> str:
        court = details.get("court_name") or "IN THE COURT OF THE METROPOLITAN MAGISTRATE, SAKET COURTS, NEW DELHI"
        petitioner = details.get("petitioner") or "Ramesh Sharma, S/o Shri Om Sharma, R/o Saket, New Delhi"
        respondent = details.get("respondent") or "State of NCT of Delhi"
        case_no = details.get("case_number") or "FIR No. 124/2026, P.S. Saket"
        advocate = details.get("advocate_name") or "Associate Counsel, NyayaAI & Partners"
        sections = details.get("applicable_sections") or "379/411 IPC (AND OTHER APPLICABLE SECTIONS)"
        precedents = details.get("previous_cases") or ""
        
        facts_cleaned = facts.strip()
        if not facts_cleaned:
            facts_cleaned = "The client has been falsely accused and implicated without any solid corroborative evidence. The action initiated is arbitrary, unjust, and contrary to the principles of natural justice."

        precedent_section = ""
        if precedents and precedents.strip():
            precedent_section = f"""
8. That the following cases have been decided with similar facts and circumstances, which set strong precedents in favor of the accused:

{precedents}

These precedents demonstrate that in cases with comparable factual situations, the accused has been granted bail due to similar legal principles and considerations.
"""

        if draft_type == "bail_application":
            return f"""{court.upper()}

BAIL APPLICATION NO. ________ OF 2026

IN THE MATTER OF:

{petitioner.upper()}
                                                  ... APPLICANT/ACCUSED
VERSUS

{respondent.upper()}
                                                  ... RESPONDENT

CASE REFERENCE / FIR NO: {case_no}
POLICE STATION: SAKET (OR JURISDICTIONAL P.S.)
UNDER SECTION(S): {sections}


APPLICATION UNDER SECTION 437 READ WITH SECTION 439 OF THE CODE OF CRIMINAL PROCEDURE, 1973 ON BEHALF OF THE ACCUSED-APPLICANT FOR GRANT OF BAIL


MOST RESPECTFULLY SHOWETH:

1. That the Accused-Applicant is a peaceful, law-abiding citizen of India and holds a high status in the society with deep roots in the community. The applicant has been falsely implicated in the present case under a gross misdirection of facts.

2. That the applicant was arrested in connection with the abovementioned FIR and is currently undergoing judicial custody. It is submitted that the arrest was executed without following the mandatory guidelines of Section 41A CrPC.

3. That the brief facts of the prosecution case, as extracted from the case files and records, are as follows:
{facts_cleaned}

4. That the applicant has absolutely no connection with the alleged offence. The allegations levelled in the FIR are purely a result of personal animosity, rivalry, or administrative overreach, and are devoid of any direct, physical, or corroborative evidence linking the applicant to the crime.

5. That the alleged property/contraband/recovery has already been fully secured and is in the safe custody of the investigating agency. Therefore, no further custodial interrogation of the Accused-Applicant is necessary or required for the purpose of the ongoing investigation.

6. That the Accused-Applicant has clean antecedents with no prior criminal record or history of involvement in any illegal activity. The applicant is the sole breadwinner of the family, and continuous detention will subject the family to extreme financial hardship and social ignominy.

7. That the applicant is ready and willing to join the investigation as and when required, and undertakes to fully cooperate with the investigating officer. The applicant is ready to furnish solvent sureties and personal bonds to the entire satisfaction of this Honorable Court.{precedent_section}

GROUNDS:

A. BECAUSE the entire case of the prosecution is based on hearsay and circumstantial evidence, which is highly disputable and lacks credibility.

B. BECAUSE the investigation is practically complete, and no purpose will be served by keeping the applicant in further judicial custody.

C. BECAUSE the offence is triable by a Magistrate, and is not punishable with death or imprisonment for life. Under the mandate of law, bail is the rule and jail is the exception.

D. BECAUSE the applicant is a respectable permanent resident of the locality with immovable property, and poses absolutely no flight risk or danger of absconding.

E. BECAUSE the applicant has clean antecedents and has never been involved in any criminal case or anti-social activity previously.

F. BECAUSE the applicant undertakes not to tamper with the prosecution evidence or influence any witness, directly or indirectly, if released on bail.


PRAYER

It is, therefore, most respectfully and humbly prayed that this Honorable Court may be pleased to:

a) Release the Accused-Applicant on bail in connection with the case reference / FIR No: {case_no}, on such terms and conditions as this Honorable Court may deem fit and proper in the interest of justice; and

b) Pass any other or further order(s) which this Honorable Court may deem fit and proper in the facts and circumstances of the present case.


APPLICANT
THROUGH

({advocate})
ADVOCATE FOR THE APPLICANT

PLACE: NEW DELHI
DATE: 21.05.2026


VERIFICATION:

Verified at New Delhi on this 21st day of May, 2026, that the contents of paragraphs 1 to 7 are true and correct to the best of my knowledge, information, and belief, and nothing material has been concealed therefrom.


DEPONENT"""

        elif draft_type == "written_statement":
            return f"""{court.upper()}

CIVIL SUIT NO. ________ OF 2026

IN THE MATTER OF:

{petitioner.upper()}
                                                  ... PLAINTIFF
VERSUS

{respondent.upper()}
                                                  ... DEFENDANT

CASE REFERENCE: {case_no}
APPLICABLE PROVISIONS: {sections}


WRITTEN STATEMENT ON BEHALF OF THE DEFENDANT UNDER ORDER VIII RULE 1 OF THE CODE OF CIVIL PROCEDURE, 1908 IN RESPONSE TO THE PLAINT OF THE PLAINTIFF


MOST RESPECTFULLY SHOWETH:

PRELIMINARY OBJECTIONS:

1. That the present suit filed by the Plaintiff is a gross abuse of the process of law, based on false, fabricated, and concocted facts, and is liable to be dismissed with exemplary costs.

2. That the suit is not maintainable either in law or on facts. The Plaintiff has approached this Honorable Court with unclean hands and has suppressed material facts.

3. That the Plaintiff has no cause of action to file the present suit against the Defendant. The suit is barred by the law of limitation and lacks proper valuation for the purpose of Court fees and jurisdiction.

REPLY ON MERITS:

4. That in reply to the factual assertions made in the plaint, the Defendant states as follows:
{facts_cleaned}

5. That the Defendant categorically denies each and every allegation, contention, and claim made by the Plaintiff in the Plaint unless specifically admitted herein. It is submitted that the transaction/incident described by the Plaintiff is highly distorted and misrepresented.

6. That the documents relied upon by the Plaintiff are forged, self-serving, and created with the sole objective of harassing the Defendant and extracting illegal monies.

7. That there is no outstanding liability, breach of contract, or illegal action on part of the Defendant. The Defendant has always acted in accordance with the law and terms of mutual understanding.{precedent_section}

PRAYER

It is, therefore, most respectfully and humbly prayed that this Honorable Court may be pleased to:

a) Dismiss the suit of the Plaintiff in its entirety with exemplary costs in favor of the Defendant; and

b) Pass any other or further order(s) which this Honorable Court may deem fit and proper in the interest of justice and equity.


DEFENDANT
THROUGH

({advocate})
COUNSEL FOR THE DEFENDANT

PLACE: NEW DELHI
DATE: 21.05.2026


VERIFICATION:

Verified at New Delhi on this 21st day of May, 2026, that the contents of preliminary objections and paragraphs 1 to 7 are true and correct to the best of my knowledge and belief, and nothing material has been concealed therefrom.


DEPONENT"""

        elif draft_type == "criminal_complaint":
            return f"""{court.upper()}

CRIMINAL COMPLAINT NO. ________ OF 2026

IN THE MATTER OF:

{petitioner.upper()}
                                                  ... COMPLAINANT
VERSUS

{respondent.upper()}
                                                  ... ACCUSED

CASE REFERENCE: {case_no}
APPLICABLE SECTIONS: {sections}


COMPLAINT UNDER SECTION 200 OF THE CODE OF CRIMINAL PROCEDURE, 1973 FOR REGISTERING A CRIMINAL CASE AGAINST THE ACCUSED FOR OFFENCES COMMITTED UNDER SECTIONS OF THE INDIAN PENAL CODE


MOST RESPECTFULLY SHOWETH:

1. That the Complainant is a law-abiding citizen of India. The Accused is a person who has committed grave, illegal, and cognizable offences of cheating, fraud, and intimidation against the Complainant.

2. That the Complainant and the Accused entered into a professional/personal transaction details of which are well within the knowledge of the parties.

3. That the sequence of events and illegal activities committed by the Accused are detailed below:
{facts_cleaned}

4. That the Accused, with dishonest intention from the very inception, induced the Complainant to act on false representations, thereby causing substantial financial loss, mental harassment, and injury to the Complainant.

5. That the Complainant approached the local Police Station with a written complaint to lodge an FIR, but no action was initiated by the local police due to political/administrative influence of the Accused.

6. That the Complainant also sent a detailed representation to the Superintendent of Police under Section 154(3) CrPC, but the same did not yield any positive outcome, necessitating the filing of the present complaint before this Honorable Court.

7. That there is sufficient prima facie evidence, both documentary and oral, on record to summon and prosecute the Accused for the offences committed.{precedent_section}

PRAYER

It is, therefore, most respectfully and humbly prayed that this Honorable Court may be pleased to:

a) Summon the Accused, try them in accordance with law, and punish them for the offences committed under the Indian Penal Code; and

b) Pass any other or further order(s) which this Honorable Court may deem fit and proper in the interest of justice.


COMPLAINANT
THROUGH

({advocate})
ADVOCATE FOR THE COMPLAINANT

PLACE: NEW DELHI
DATE: 21.05.2026


VERIFICATION:

Verified at New Delhi on this 21st day of May, 2026, that the contents of paragraphs 1 to 7 are true and correct to the best of my knowledge, information, and belief, and nothing material has been concealed therefrom.


DEPONENT"""

        else: # legal_notice
            return f"""LEGAL NOTICE

BY REGISTERED POST A.D. / SPEED POST

FROM:
{advocate}
Associate Counsel, NyayaAI & Partners
New Delhi

DATE: 21.05.2026

TO,
{respondent}
(Respondent / Opposite Party)

SUBJECT: FORMAL LEGAL NOTICE FOR BREACH OF TRUST, NON-COMPLIANCE, AND ACTIONS CONTRARY TO LAW (UNDER {sections})


Dear Sir/Madam,

Under instructions from and on behalf of my client, {petitioner} (hereinafter referred to as "my Client"), I hereby serve you with the following Legal Notice:

1. That my Client is a respected citizen and has been engaged in professional/personal dealings with you in good faith.

2. That the transaction and events that have transpired between you and my Client are summarized as follows:
{facts_cleaned}

3. That you have acted in clear breach of your legal, contractual, and moral obligations, causing substantial financial injury, mental harassment, and severe losses to my Client. Your actions amount to cheating, criminal breach of trust, and unlawful enrichment.

4. That despite multiple oral and written reminders, you have failed and neglected to rectify your defaults or clear your liabilities, showing absolute disregard for the law.

5. I, therefore, by means of this Legal Notice, call upon you to comply with the following demands within a period of 15 (fifteen) days from the receipt of this Notice:
   a) Refund the outstanding amounts / resolve the dispute completely to the satisfaction of my Client.
   b) Pay a sum of Rs. 15,000/- as cost of this Legal Notice.

6. Please note that if you fail to comply with the demands of this Notice within the stipulated period of 15 days, I have categorical instructions from my Client to initiate appropriate civil and criminal proceedings against you in the competent Courts of law, entirely at your risk, cost, and consequences.{precedent_section}


Yours sincerely,

({advocate})
ADVOCATE FOR THE SENDER"""
