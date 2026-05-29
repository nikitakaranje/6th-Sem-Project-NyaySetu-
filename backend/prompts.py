EXTRACT_FACTS_PROMPT = """You are a legal AI assistant for Indian courts. Extract structured information from the following case description.

Case Description:
{raw_text}

Return ONLY valid JSON with these exact keys:
- "facts_summary": a 2-3 sentence summary of the key facts
- "ipc_sections": an array of applicable IPC section numbers as strings (e.g., ["379", "411"])
- "accused_profile": brief description of the accused including age, occupation, criminal history if mentioned
- "key_issues": an array of the key legal issues in this case

IMPORTANT: Return ONLY the JSON object. No markdown, no explanation."""

ASK_QUESTION_PROMPT = """Answer briefly based on this case.

Case: {facts_summary}
IPC: {ipc_sections}
Q: {question}

Only output JSON: {{"answer": "your short answer"}}"""

CALCULATE_SCORES_PROMPT = """You are a legal intelligence analyst. Score the following case on 5 metrics from 0-100 (100 = strongest/most favorable).

Case Facts:
{facts}

Return ONLY valid JSON with these exact keys as integers between 0 and 100:
- "case_strength": How strong is the prosecution/plaintiff's case?
- "precedent_support": How well do precedents support this case?
- "bail_likelihood": How likely is bail to be granted?
- "argument_readiness": How ready are the arguments?
- "overall_risk": What is the overall risk level?

IMPORTANT: Return ONLY the JSON object. No markdown, no explanation."""
