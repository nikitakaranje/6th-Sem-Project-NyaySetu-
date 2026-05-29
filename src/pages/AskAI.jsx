import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { api } from '../lib/api.js'
import { getCaseById } from '../data/mockCases.js'

const mockAnswers = {
  'evidence': 'For a theft case under Section 379 IPC, gather: (1) CCTV footage from the location, (2) witness statements, (3) recovered stolen property with seizure memo, (4) forensic evidence like fingerprints, (5) mobile tower location data of the accused, (6) bank/FIT transactions if any. Document the chain of custody for all evidence.',
  'bail': 'Bail strategy: (1) File under Section 436 CrPC for bailable offences, (2) Emphasize lack of criminal antecedents, (3) Offer surety and personal bond, (4) Highlight the accused\'s community roots and employment, (5) Argue that custody is not required for investigation if accused cooperates, (6) Cite precedents where bail was granted in similar circumstances.',
  'weakness': 'Potential case weaknesses to address: (1) Is the recovery witness independent or a police associate? (2) Was proper procedure followed under Section 100 CrPC for search? (3) Are there contradictions in the prosecution\'s timeline? (4) Was the accused\'s statement recorded under Section 161 CrPC without coercion? (5) Is the identification parade procedure legally compliant? (6) Check if the stolen property value affects the bailable/non-bailable classification.',
  'ipc': 'The IPC sections typically applicable: Section 379 (theft - up to 3 years imprisonment), Section 380 (theft in dwelling house), Section 411 (dishonestly receiving stolen property), Section 34 (common intention if multiple accused), Section 120B (criminal conspiracy if applicable). Under Section 379 IPC, the offence is bailable, non-cognizable, and triable by any Magistrate.',
  'chance': 'Predicting conviction probability depends on: strength of evidence (direct vs circumstantial), witness credibility, compliance with procedural law, quality of legal representation, and the specific judge\'s tendency. For a first-time offender with weak direct evidence, defense has a favorable position. Section 379 IPC carries up to 3 years imprisonment or fine, or both. Plea bargaining under Section 265A CrPC is an option to consider.',
  'defense': 'Strong defense arguments: (1) False implication due to personal enmity, (2) Alibi evidence placing accused elsewhere, (3) Lack of motive, (4) Procedural violations during arrest/seizure, (5) Contradictions in prosecution witness statements, (6) Recovery from an open place accessible to all (not exclusive possession), (7) Delay in FIR registration unexplained, (8) Violation of Section 50/52 of CrPC regarding arrest procedure.',
}

function getMockAnswer(question) {
  const q = question.toLowerCase()
  if (q.includes('evidence') || q.includes('gather') || q.includes('proof') || q.includes('document')) return mockAnswers.evidence
  if (q.includes('bail') || q.includes('release') || q.includes('bond') || q.includes('surety')) return mockAnswers.bail
  if (q.includes('weakness') || q.includes('weak') || q.includes('problem') || q.includes('flaw') || q.includes('issue')) return mockAnswers.weakness
  if (q.includes('ipc') || q.includes('section') || q.includes('charge')) return mockAnswers.ipc
  if (q.includes('chance') || q.includes('conviction') || q.includes('win') || q.includes('probability') || q.includes('likely')) return mockAnswers.chance
  if (q.includes('defense') || q.includes('argument') || q.includes('defend') || q.includes('strategy')) return mockAnswers.defense
  return null
}

export default function AskAI() {
  const { id } = useParams()
  const storageKey = `nyaya_ask_${id}`
  const [caseData, setCaseData] = useState(null)
  const [usingMock, setUsingMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [answering, setAnswering] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
  }, [messages, storageKey])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    api.getCase(id)
      .then(setCaseData)
      .catch(() => {
        setUsingMock(true)
        setCaseData(getCaseById(id))
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const useMockAnswer = (question) => {
    if (!usingMock) setUsingMock(true)
    const fallback = getMockAnswer(question)
    setMessages((prev) => [...prev, { role: 'ai', text: fallback || 'I can help with questions about evidence, bail strategy, case weaknesses, IPC sections, conviction chances, or defense arguments.' }])
  }

  const handleAsk = async () => {
    if (!input.trim() || answering) return
    const question = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setAnswering(true)

    if (usingMock) {
      await new Promise((r) => setTimeout(r, 800))
      useMockAnswer(question)
      setAnswering(false)
      return
    }

    try {
      const res = await api.askQuestion(id, question)
      if (res.error || !res.answer) {
        useMockAnswer(question)
      } else {
        setMessages((prev) => [...prev, { role: 'ai', text: res.answer }])
      }
    } catch {
      useMockAnswer(question)
    }
    setAnswering(false)
  }

  if (loading) return <div className="text-center py-20 text-slate-400">Loading...</div>

  if (!caseData) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg">Case not found</p>
        <Link to="/" className="text-amber-600 hover:underline mt-2 inline-block">Back to cases</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to={`/case/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ask AI About This Case</h1>
        <p className="text-sm text-slate-500 mt-1">{caseData.title}</p>
        {usingMock && (
          <p className="text-xs text-amber-600 mt-1">Using local Q&A (backend unreachable)</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 h-[450px] overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">Ask anything about this case — legal strategy, IPC sections, bail options, precedent references, or next steps.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                'What is the best bail strategy?',
                'Which IPC sections apply?',
                'What are the weaknesses in this case?',
                'What evidence should I gather?',
                'What is the chance of conviction?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q) }}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl p-3 ${
              msg.role === 'user'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${msg.role === 'user' ? 'text-white/80' : 'text-slate-500'}`}>
                  {msg.role === 'user' ? 'You' : 'AI'}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {answering && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-xl p-3 text-sm text-slate-500 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this case..."
          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
        />
        <button
          onClick={handleAsk}
          disabled={answering || !input.trim()}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Send className="w-4 h-4" />
          Ask
        </button>
      </div>
    </div>
  )
}
