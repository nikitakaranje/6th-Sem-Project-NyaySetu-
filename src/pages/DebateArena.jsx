import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Mic, Square, Send, ArrowLeft, RotateCcw } from 'lucide-react'
import { api } from '../lib/api.js'
import { getCaseById } from '../data/mockCases.js'

const mockOpposing = [
  'The accused was found in possession of stolen property shortly after the incident. The recovery itself establishes prima facie involvement. Custodial interrogation may be required.',
  'The prosecution has credible eyewitnesses who have identified the accused. The weight of direct evidence cannot be dismissed without proper cross-examination.',
  'Given the nature of the offence and the strength of prima facie evidence, the accused poses a flight risk. We oppose bail on grounds of investigation interference.',
  'The identification parade was conducted per proper procedure. Any challenge to its validity is a trial issue, not relevant at this stage of proceedings.',
  'The stolen property valued at ₹5,000 was recovered from the exclusive possession of the accused. Section 114 of the Evidence Act draws a presumption of guilt in such circumstances.',
]

const tipLines = [
  'Emphasize lack of criminal antecedents',
  'Cite Section 436 CrPC - right to bail for bailable offences',
  'Challenge the identification procedure',
  'Offer additional conditions to mitigate flight risk concerns',
]

export default function DebateArena() {
  const { id } = useParams()
  const storageKey = `nyaya_debate_${id}`
  const [caseData, setCaseData] = useState(null)
  const [usingMock, setUsingMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [answering, setAnswering] = useState(false)
  const [scores, setScores] = useState({ coCounsel: 0, opposing: 0 })
  const [isRecording, setIsRecording] = useState(false)
  const bottomRef = useRef(null)
  const fetchedRef = useRef(false)

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

  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste', 'thanks', 'thank you']

  const useMockReply = (aiRole) => {
    if (!usingMock) setUsingMock(true)
    const reply = mockOpposing[Math.floor(Math.random() * mockOpposing.length)]
    const score = 40 + Math.floor(Math.random() * 40)
    setScores((prev) => ({ ...prev, [aiRole]: score }))
    setMessages((prev) => [...prev, { role: aiRole, text: reply, timestamp: `${prev.length}:00` }])
  }

  const handleSend = async (role) => {
    try {
      if (!input.trim() || answering) { setAnswering(false); return }
      const argument = input.trim()
      setInput('')

      const isGreeting = greetings.some((g) => argument.toLowerCase().startsWith(g)) && argument.split(' ').length <= 3
      if (isGreeting) {
        setMessages((prev) => [...prev, { role, text: argument, timestamp: `${prev.length}:00` }])
        setTimeout(() => {
          setMessages((prev) => [...prev, { role: 'opposing', text: 'Please state your legal argument so I can respond with a counter-argument.', timestamp: `${prev.length}:00` }])
        }, 100)
        return
      }

      setMessages((prev) => [...prev, { role, text: argument, timestamp: `${prev.length}:00` }])
      setAnswering(true)

      const aiRole = role === 'co-counsel' ? 'opposing' : 'co-counsel'

      if (usingMock) {
        await new Promise((r) => setTimeout(r, 800))
        useMockReply(aiRole)
        setAnswering(false)
        return
      }

      const res = await api.debate(id, argument, role)
      if (!res || res.error || !res.response) {
        useMockReply(aiRole)
      } else {
        setScores((prev) => ({ ...prev, [aiRole]: res.persuasiveness_score || 50 }))
        setMessages((prev) => [...prev, { role: aiRole, text: res.response, timestamp: `${prev.length}:00` }])
      }
    } catch (e) {
      const aiRole = role === 'co-counsel' ? 'opposing' : 'co-counsel'
      useMockReply(aiRole)
    }
    setAnswering(false)
  }

  if (loading) return <div className="text-center py-20 text-slate-400"><p className="text-lg">Loading...</p></div>

  if (!caseData) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg">Case not found</p>
        <Link to="/" className="text-amber-600 hover:underline mt-2 inline-block">Back to cases</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to={`/case/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Debate Arena</h1>
        <p className="text-sm text-slate-500 mt-1">{caseData.title}</p>
        {usingMock && (
          <p className="text-xs text-amber-600 mt-1">Using local debate (backend unreachable)</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 h-[450px] overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm">Type your first argument as Co-Counsel to start the debate. The AI will respond as Opposing Counsel.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'co-counsel' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${
                  msg.role === 'co-counsel'
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${
                      msg.role === 'co-counsel' ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {msg.role === 'co-counsel' ? 'Co-Counsel' : 'Opposing Counsel'}
                    </span>
                    <span className="text-xs text-slate-400">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {answering && (
              <div className="flex justify-end">
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-slate-500 animate-pulse">
                  Opposing Counsel is thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2.5 rounded-lg transition-colors shrink-0 ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend('co-counsel') } }}
              placeholder="Type your argument as Co-Counsel..."
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <button
              onClick={() => handleSend('co-counsel')}
              disabled={answering || !input.trim()}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              {answering ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Argument Tips</h3>
            <ul className="space-y-2">
              {tipLines.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-amber-500 mt-0.5">&#x1f4a1;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Persuasiveness</h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Co-Counsel (You)</span>
                  <span>{scores.coCounsel}%</span>
                </div>
                <div className="bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${scores.coCounsel}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Opposing (AI)</span>
                  <span>{scores.opposing}%</span>
                </div>
                <div className="bg-slate-100 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${scores.opposing}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            You argue as Co-Counsel (defense). The AI responds as Opposing Counsel (prosecution). Each AI response includes a persuasiveness score.
          </div>
        </div>
      </div>
    </div>
  )
}
