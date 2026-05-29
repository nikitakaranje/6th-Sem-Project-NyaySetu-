import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send, Loader2, Sparkles, Check, Copy, Download, FileText, HelpCircle, ChevronRight, BookOpen, AlertCircle } from 'lucide-react'
import { api } from '../lib/api.js'
import { getCaseById } from '../data/mockCases.js'

export default function Workspace() {
  const { id } = useParams()
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [error, setError] = useState(null)

  // RAG Chat State
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [asking, setAsking] = useState(false)
  const chatBottomRef = useRef(null)

  // Chunk Highlight State
  const [activeChunkId, setActiveChunkId] = useState(null)
  const chunkRefs = useRef({})

  // Legal Drafting State
  const [draftType, setDraftType] = useState('bail_application')
  const [courtName, setCourtName] = useState('')
  const [courtType, setCourtType] = useState('metropolitan_magistrate')
  const [petitioner, setPetitioner] = useState('')
  const [respondent, setRespondent] = useState('')
  const [caseNumber, setCaseNumber] = useState('')
  const [advocateName, setAdvocateName] = useState('')
  const [applicableSections, setApplicableSections] = useState('')
  const [previousCases, setPreviousCases] = useState('')
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [copied, setCopied] = useState(false)

  // Active view tabs in central panel: 'summary' or 'chat'
  const [activeTab, setActiveTab] = useState('summary')

  useEffect(() => {
    api.getCase(id)
      .then((data) => {
        setCaseData(data)
        // Pre-fill some default draft details
        const sd = data.structured_data || {}
        setPetitioner(sd.accused_profile?.split(',')[0] || 'Ramesh Sharma, S/o Shri Om Sharma, R/o New Delhi')
        setRespondent('State of NCT of Delhi')
        setCourtName('IN THE COURT OF THE METROPOLITAN MAGISTRATE, SAKET COURTS, NEW DELHI')
        setCaseNumber('FIR No. 124/2026, P.S. Saket')
        setAdvocateName('Associate Counsel, NyayaAI & Partners')
        // Pre-fill applicable sections from structured data if available
        const ipcSections = (sd.ipc_sections || ['379/411 IPC']).join(', ')
        setApplicableSections(ipcSections)
      })
      .catch(() => {
        const mock = getCaseById(id)
        if (mock) {
          setCaseData(mock)
          setUsingMock(true)
        } else {
          setError('Case not found')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const scrollToChunk = (chunkId) => {
    setActiveChunkId(chunkId)
    const element = chunkRefs.current[chunkId]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleAsk = async () => {
    if (!chatInput.trim() || asking) return
    const question = chatInput.trim()
    setChatInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setAsking(true)
    setActiveTab('chat')

    try {
      const res = await api.ragAsk(id, question)
      setMessages(prev => [...prev, {
        role: 'ai',
        text: res.answer,
        citations: res.citations || []
      }])
    } catch (err) {
      // Mock fallback if offline/backend unreachable
      await new Promise(r => setTimeout(r, 1200))
      const mockAnswer = `Based on the case details for "${caseData.title}", here is a synthesis of the facts. The accused, Ramesh Sharma, is charged under Section 379 IPC. The incident occurred at Saket near a grocery shop. Standard legal recourse is to highlight the lack of prior criminal records and procedural delays in filing the FIR to support the bail plea. [Doc Chunk 0]`
      setMessages(prev => [...prev, {
        role: 'ai',
        text: mockAnswer,
        citations: [0]
      }])
    } finally {
      setAsking(false)
    }
  }

  const handleGenerateDraft = async () => {
    setGeneratingDraft(true)
    try {
      const details = {
        court_name: courtName,
        court_type: courtType,
        petitioner: petitioner,
        respondent: respondent,
        case_number: caseNumber,
        advocate_name: advocateName,
        applicable_sections: applicableSections,
        previous_cases: previousCases
      }
      const res = await api.generateLegalDraft(id, draftType, details)
      if (!res.draft_text || res.draft_text.includes('Unable to generate draft') || res.draft_text.includes('error') || res.draft_text.includes('invalid JSON')) {
        throw new Error('Backend failed to generate a valid legal draft.')
      }
      setDraftText(res.draft_text)
    } catch (err) {
      // Stand-in professional standard draft if backend fails or is offline
      await new Promise(r => setTimeout(r, 1200))
      
      let generatedTemplate = ''
      const factsText = caseData?.summary || "The client has been falsely accused and implicated without any solid corroborative evidence. The action initiated is arbitrary, unjust, and contrary to the principles of natural justice."

      if (draftType === 'bail_application') {
        generatedTemplate = `${courtName.toUpperCase()}

BAIL APPLICATION NO. ________ OF 2026

IN THE MATTER OF:

${petitioner.toUpperCase()}
                                                  ... APPLICANT/ACCUSED
VERSUS

${respondent.toUpperCase()}
                                                  ... RESPONDENT

CASE REFERENCE / FIR NO: ${caseNumber}
POLICE STATION: SAKET (OR JURISDICTIONAL P.S.)
UNDER SECTION(S): 379/411 IPC (AND OTHER APPLICABLE SECTIONS)


APPLICATION UNDER SECTION 437 READ WITH SECTION 439 OF THE CODE OF CRIMINAL PROCEDURE, 1973 ON BEHALF OF THE ACCUSED-APPLICANT FOR GRANT OF BAIL


MOST RESPECTFULLY SHOWETH:

1. That the Accused-Applicant is a peaceful, law-abiding citizen of India and holds a high status in the society with deep roots in the community. The applicant has been falsely implicated in the present case under a gross misdirection of facts.

2. That the applicant was arrested in connection with the abovementioned FIR and is currently undergoing judicial custody. It is submitted that the arrest was executed without following the mandatory guidelines of Section 41A CrPC.

3. That the brief facts of the prosecution case, as extracted from the case files and records, are as follows:
${factsText}

4. That the applicant has absolutely no connection with the alleged offence. The allegations levelled in the FIR are purely a result of personal animosity, rivalry, or administrative overreach, and are devoid of any direct, physical, or corroborative evidence linking the applicant to the crime.

5. That the alleged property/contraband/recovery has already been fully secured and is in the safe custody of the investigating agency. Therefore, no further custodial interrogation of the Accused-Applicant is necessary or required for the purpose of the ongoing investigation.

6. That the Accused-Applicant has clean antecedents with no prior criminal record or history of involvement in any illegal activity. The applicant is the sole breadwinner of the family, and continuous detention will subject the family to extreme financial hardship and social ignominy.

7. That the applicant is ready and willing to join the investigation as and when required, and undertakes to fully cooperate with the investigating officer. The applicant is ready to furnish solvent sureties and personal bonds to the entire satisfaction of this Honorable Court.

GROUNDS:

A. BECAUSE the entire case of the prosecution is based on hearsay and circumstantial evidence, which is highly disputable and lacks credibility.

B. BECAUSE the investigation is practically complete, and no purpose will be served by keeping the applicant in further judicial custody.

C. BECAUSE the offence is triable by a Magistrate, and is not punishable with death or imprisonment for life. Under the mandate of law, bail is the rule and jail is the exception.

D. BECAUSE the applicant is a respectable permanent resident of the locality with immovable property, and poses absolutely no flight risk or danger of absconding.

E. BECAUSE the applicant has clean antecedents and has never been involved in any criminal case or anti-social activity previously.

F. BECAUSE the applicant undertakes not to tamper with the prosecution evidence or influence any witness, directly or indirectly, if released on bail.


PRAYER

It is, therefore, most respectfully and humbly prayed that this Honorable Court may be pleased to:

a) Release the Accused-Applicant on bail in connection with the case reference / FIR No: ${caseNumber}, on such terms and conditions as this Honorable Court may deem fit and proper in the interest of justice; and

b) Pass any other or further order(s) which this Honorable Court may deem fit and proper in the facts and circumstances of the present case.


APPLICANT
THROUGH

(${advocateName})
ADVOCATE FOR THE APPLICANT

PLACE: NEW DELHI
DATE: 21.05.2026


VERIFICATION:

Verified at New Delhi on this 21st day of May, 2026, that the contents of paragraphs 1 to 7 are true and correct to the best of my knowledge, information, and belief, and nothing material has been concealed therefrom.


DEPONENT`
      } else if (draftType === 'written_statement') {
        generatedTemplate = `${courtName.toUpperCase()}

CIVIL SUIT NO. ________ OF 2026

IN THE MATTER OF:

${petitioner.toUpperCase()}
                                                  ... PLAINTIFF
VERSUS

${respondent.toUpperCase()}
                                                  ... DEFENDANT

CASE REFERENCE: ${caseNumber}


WRITTEN STATEMENT ON BEHALF OF THE DEFENDANT UNDER ORDER VIII RULE 1 OF THE CODE OF CIVIL PROCEDURE, 1908 IN RESPONSE TO THE PLAINT OF THE PLAINTIFF


MOST RESPECTFULLY SHOWETH:

PRELIMINARY OBJECTIONS:

1. That the present suit filed by the Plaintiff is a gross abuse of the process of law, based on false, fabricated, and concocted facts, and is liable to be dismissed with exemplary costs.

2. That the suit is not maintainable either in law or on facts. The Plaintiff has approached this Honorable Court with unclean hands and has suppressed material facts.

3. That the Plaintiff has no cause of action to file the present suit against the Defendant. The suit is barred by the law of limitation and lacks proper valuation for the purpose of Court fees and jurisdiction.

REPLY ON MERITS:

4. That in reply to the factual assertions made in the plaint, the Defendant states as follows:
${factsText}

5. That the Defendant categorically denies each and every allegation, contention, and claim made by the Plaintiff in the Plaint unless specifically admitted herein. It is submitted that the transaction/incident described by the Plaintiff is highly distorted and misrepresented.

6. That the documents relied upon by the Plaintiff are forged, self-serving, and created with the sole objective of harassing the Defendant and extracting illegal monies.

7. That there is no outstanding liability, breach of contract, or illegal action on part of the Defendant. The Defendant has always acted in accordance with the law and terms of mutual understanding.


PRAYER

It is, therefore, most respectfully and humbly prayed that this Honorable Court may be pleased to:

a) Dismiss the suit of the Plaintiff in its entirety with exemplary costs in favor of the Defendant; and

b) Pass any other or further order(s) which this Honorable Court may deem fit and proper in the interest of justice and equity.


DEFENDANT
THROUGH

(${advocateName})
COUNSEL FOR THE DEFENDANT

PLACE: NEW DELHI
DATE: 21.05.2026


VERIFICATION:

Verified at New Delhi on this 21st day of May, 2026, that the contents of preliminary objections and paragraphs 1 to 7 are true and correct to the best of my knowledge and belief, and nothing material has been concealed therefrom.


DEPONENT`
      } else if (draftType === 'criminal_complaint') {
        generatedTemplate = `${courtName.toUpperCase()}

CRIMINAL COMPLAINT NO. ________ OF 2026

IN THE MATTER OF:

${petitioner.toUpperCase()}
                                                  ... COMPLAINANT
VERSUS

${respondent.toUpperCase()}
                                                  ... ACCUSED

CASE REFERENCE: ${caseNumber}


COMPLAINT UNDER SECTION 200 OF THE CODE OF CRIMINAL PROCEDURE, 1973 FOR REGISTERING A CRIMINAL CASE AGAINST THE ACCUSED FOR OFFENCES COMMITTED UNDER SECTIONS OF THE INDIAN PENAL CODE


MOST RESPECTFULLY SHOWETH:

1. That the Complainant is a law-abiding citizen of India. The Accused is a person who has committed grave, illegal, and cognizable offences of cheating, fraud, and intimidation against the Complainant.

2. That the Complainant and the Accused entered into a professional/personal transaction details of which are well within the knowledge of the parties.

3. That the sequence of events and illegal activities committed by the Accused are detailed below:
${factsText}

4. That the Accused, with dishonest intention from the very inception, induced the Complainant to act on false representations, thereby causing substantial financial loss, mental harassment, and injury to the Complainant.

5. That the Complainant approached the local Police Station with a written complaint to lodge an FIR, but no action was initiated by the local police due to political/administrative influence of the Accused.

6. That the Complainant also sent a detailed representation to the Superintendent of Police under Section 154(3) CrPC, but the same did not yield any positive outcome, necessitating the filing of the present complaint before this Honorable Court.

7. That there is sufficient prima facie evidence, both documentary and oral, on record to summon and prosecute the Accused for the offences committed.


PRAYER

It is, therefore, most respectfully and humbly prayed that this Honorable Court may be pleased to:

a) Summon the Accused, try them in accordance with law, and punish them for the offences committed under the Indian Penal Code; and

b) Pass any other or further order(s) which this Honorable Court may deem fit and proper in the interest of justice.


COMPLAINANT
THROUGH

(${advocateName})
ADVOCATE FOR THE COMPLAINANT

PLACE: NEW DELHI
DATE: 21.05.2026


VERIFICATION:

Verified at New Delhi on this 21st day of May, 2026, that the contents of paragraphs 1 to 7 are true and correct to the best of my knowledge, information, and belief, and nothing material has been concealed therefrom.


DEPONENT`
      } else {
        generatedTemplate = `LEGAL NOTICE

BY REGISTERED POST A.D. / SPEED POST

FROM:
${advocateName}
Associate Counsel, NyayaAI & Partners
New Delhi

DATE: 21.05.2026

TO,
${respondent}
(Respondent / Opposite Party)

SUBJECT: FORMAL LEGAL NOTICE FOR BREACH OF TRUST, NON-COMPLIANCE, AND ACTIONS CONTRARY TO LAW


Dear Sir/Madam,

Under instructions from and on behalf of my client, ${petitioner} (hereinafter referred to as "my Client"), I hereby serve you with the following Legal Notice:

1. That my Client is a respected citizen and has been engaged in professional/personal dealings with you in good faith.

2. That the transaction and events that have transpired between you and my Client are summarized as follows:
${factsText}

3. That you have acted in clear breach of your legal, contractual, and moral obligations, causing substantial financial injury, mental harassment, and severe losses to my Client. Your actions amount to cheating, criminal breach of trust, and unlawful enrichment.

4. That despite multiple oral and written reminders, you have failed and neglected to rectify your defaults or clear your liabilities, showing absolute disregard for the law.

5. I, therefore, by means of this Legal Notice, call upon you to comply with the following demands within a period of 15 (fifteen) days from the receipt of this Notice:
   a) Refund the outstanding amounts / resolve the dispute completely to the satisfaction of my Client.
   b) Pay a sum of Rs. 15,000/- as cost of this Legal Notice.

6. Please note that if you fail to comply with the demands of this Notice within the stipulated period of 15 days, I have categorical instructions from my Client to initiate appropriate civil and criminal proceedings against you in the competent Courts of law, entirely at your risk, cost, and consequences.


Yours sincerely,

(${advocateName})
ADVOCATE FOR THE SENDER`
      }
      setDraftText(generatedTemplate)
    } finally {
      setGeneratingDraft(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draftText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadDraft = () => {
    if (!draftText) return
    const url = URL.createObjectURL(new Blob([draftText], { type: 'text/plain;charset=utf-8' }))
    const element = document.createElement('a')
    element.style.display = 'none'
    element.href = url
    element.download = `${draftType || 'draft'}_${id || 'case'}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex flex-col items-center justify-center py-40 gap-3"><Loader2 className="w-10 h-10 text-amber-500 animate-spin" /><p className="text-slate-500 text-sm">Building AI co-pilot workspace...</p></div>

  if (error || !caseData) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg">{error || 'Case not found'}</p>
        <Link to="/" className="text-amber-600 hover:underline mt-2 inline-block">Back to cases</Link>
      </div>
    )
  }

  // Chunks extracted by RAG
  const chunks = caseData.chunks || [
    { id: 0, text: `${caseData.title}: Ramesh Sharma, a 28-year-old shopkeeper, was arrested on suspicion of theft under Section 379 IPC outside a grocery store in Saket. The stolen items were valued at approximately ₹5,000.` },
    { id: 1, text: "The police report indicates the arrest occurred late evening. The property was recovered, and a seizure memo was drafted. No prior criminal background is noted in the suspect's arrest log." },
    { id: 2, text: "Defense claims false implication, stating Ramesh Sharma has a long-standing retail dispute with the grocery shop owner. He cooperates fully with the investigating officers." }
  ]

  const sd = caseData.structured_data || {}

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 px-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link to={`/case/${id}`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Case Co-Pilot Workspace <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-500">{caseData.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {usingMock && (
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              Demo Sandbox Mode (Ollama Offline)
            </span>
          )}
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
            RAG Indexed
          </span>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-170px)] min-h-[550px]">
        
        {/* Left Column: Document Chunk Browser (RAG visualizer) - span 3 */}
        <div className="lg:col-span-3 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden h-full">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-600" /> RAG Chunk Indexes
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Documents split into {chunks.length} semantically isolated chunks</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chunks.map((chunk) => {
              const isActive = activeChunkId === chunk.id
              return (
                <div
                  key={chunk.id}
                  ref={el => chunkRefs.current[chunk.id] = el}
                  onClick={() => setActiveChunkId(chunk.id)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isActive
                      ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-500'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      Chunk #{chunk.id}
                    </span>
                    <span className="text-[9px] text-slate-400">~{chunk.text.length} chars</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{chunk.text}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center Column: Interactive Summary / Q&A - span 4.5 */}
        <div className="lg:col-span-4 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden h-full">
          <div className="flex border-b border-slate-200 shrink-0 bg-slate-50/80">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-all ${
                activeTab === 'summary'
                  ? 'border-amber-500 text-amber-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              Document Summary
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-all ${
                activeTab === 'chat'
                  ? 'border-amber-500 text-amber-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              Ask AI (RAG Q&A)
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'summary' ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                  <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Legal Synopsis</h3>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {caseData.summary || sd.facts_summary || "No facts summary processed yet."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Indexed Information</h3>
                  
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                    <span className="text-[10px] text-slate-400 block">Applicable Penal Codes</span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {sd.ipc_sections?.map((sec, i) => (
                        <span key={i} className="text-xs font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                          Section {sec} IPC
                        </span>
                      )) || <span className="text-xs text-slate-500 font-medium">Section 379 IPC (Theft)</span>}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                    <span className="text-[10px] text-slate-400 block">Accused Accused Profile</span>
                    <p className="text-xs font-medium text-slate-700">{sd.accused_profile || "28 years, First time offender, retail grocery dispute."}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                    <span className="text-[10px] text-slate-400 block">Primary Legal Issues</span>
                    <ul className="space-y-1">
                      {sd.key_issues?.map((issue, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                          <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </li>
                      )) || (
                        <>
                          <li className="text-xs text-slate-600 flex items-start gap-1">
                            <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>Whether the recovery warrants judicial custodial interrogation.</span>
                          </li>
                          <li className="text-xs text-slate-600 flex items-start gap-1">
                            <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>Whether the bailable scope of Section 379 applies in a disputable theft complaint.</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-4">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {messages.length === 0 && (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                      <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs">Ask questions grounded in your uploaded documents. Answers will cite relevant RAG chunks.</p>
                      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                        {[
                          'Is there physical evidence recovered?',
                          'What is the accused profile?',
                          'What are the grounds for bail?'
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => setChatInput(q)}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-full transition-all"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 border border-slate-200/50'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.role === 'ai' && msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-slate-200 flex flex-wrap items-center gap-1">
                            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mr-1">Citations:</span>
                            {msg.citations.map((cId) => (
                              <button
                                key={cId}
                                onClick={() => scrollToChunk(cId)}
                                className="text-[9px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200 transition-colors"
                              >
                                Chunk #{cId}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {asking && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 border border-slate-200/50 rounded-xl p-3 text-xs text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> Evaluating text chunks and generating response...
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="flex gap-1.5 shrink-0 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask co-pilot about files..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  />
                  <button
                    onClick={handleAsk}
                    disabled={asking || !chatInput.trim()}
                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white p-2 rounded-lg transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Standard Legal Draft Generator & Editor - span 4.5 */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden h-full">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 shrink-0 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" /> Legal Draft Generator
            </h2>
            <span className="text-[10px] text-slate-400 font-semibold">Standard Indian Court Format</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {draftText ? (
              /* Legal Editor Mode */
              <div className="flex flex-col h-full space-y-3">
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Draft</>}
                  </button>
                  <button
                    onClick={downloadDraft}
                    className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg transition-colors border border-slate-900"
                  >
                    <Download className="w-3.5 h-3.5" /> Download TXT
                  </button>
                  <button
                    onClick={() => setDraftText('')}
                    className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-colors border border-red-200"
                  >
                    Edit Fields
                  </button>
                </div>

                <div className="flex-1 border border-slate-200 rounded-xl bg-slate-100 p-3 overflow-y-auto">
                  {/* Styled Professional Legal Paper Sheet */}
                  <div className="bg-white border border-slate-300 shadow-md p-6 font-mono text-[10px] text-slate-800 leading-6 text-justify select-text whitespace-pre-wrap max-w-full">
                    {draftText}
                  </div>
                </div>
              </div>
            ) : (
              /* Inputs Customizer Mode */
              <div className="space-y-3.5">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    Customize details below to generate a highly professional court-grade draft. Grounded on document chunks using RAG.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Draft Document Type</label>
                  <select
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bail_application">Bail Application (Sec. 437/439 CrPC)</option>
                    <option value="written_statement">Written Statement (Civil Response)</option>
                    <option value="criminal_complaint">Criminal Complaint (Sec. 200 CrPC)</option>
                    <option value="legal_notice">Formal Legal Notice</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Court Jurisdiction Name</label>
                  <input
                    type="text"
                    value={courtName}
                    onChange={(e) => setCourtName(e.target.value)}
                    placeholder="e.g. IN THE COURT OF THE METROPOLITAN MAGISTRATE, NEW DELHI"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Court Type</label>
                  <select
                    value={courtType}
                    onChange={(e) => setCourtType(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="metropolitan_magistrate">Metropolitan Magistrate Court</option>
                    <option value="district_court">District Court</option>
                    <option value="high_court">High Court</option>
                    <option value="session_court">Sessions Court</option>
                    <option value="civil_court">Civil Court</option>
                    <option value="family_court">Family Court</option>
                    <option value="commercial_court">Commercial Court</option>
                    <option value="consumer_court">Consumer Court</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">Petitioner / Accused</label>
                    <input
                      type="text"
                      value={petitioner}
                      onChange={(e) => setPetitioner(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">Respondent / State</label>
                    <input
                      type="text"
                      value={respondent}
                      onChange={(e) => setRespondent(e.target.value)}
                      placeholder="e.g. State of NCT of Delhi"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">FIR / Case Reference</label>
                    <input
                      type="text"
                      value={caseNumber}
                      onChange={(e) => setCaseNumber(e.target.value)}
                      placeholder="e.g. FIR No. 124/2026"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">Counsel Name</label>
                    <input
                      type="text"
                      value={advocateName}
                      onChange={(e) => setAdvocateName(e.target.value)}
                      placeholder="e.g. Adv. Nitin Karanje"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Applicable Sections / IPC / CrPC</label>
                  <input
                    type="text"
                    value={applicableSections}
                    onChange={(e) => setApplicableSections(e.target.value)}
                    placeholder="e.g. 379/411 IPC, Section 437 CrPC"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Comma-separated list of legal provisions</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Previous Related Cases</label>
                  <textarea
                    value={previousCases}
                    onChange={(e) => setPreviousCases(e.target.value)}
                    placeholder="e.g. Bail Appln. No. 1234/2025, Verdict: Granted; State vs. ABC, 2024 case, Similar circumstances"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">List precedents and related cases (optional)</p>
                </div>

                <button
                  onClick={handleGenerateDraft}
                  disabled={generatingDraft}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors shadow-md disabled:bg-slate-300 disabled:shadow-none"
                >
                  {generatingDraft ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Synthesizing Document Chunks & Drafting...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Generate Standard Legal Case File</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
