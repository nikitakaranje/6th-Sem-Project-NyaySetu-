import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Swords, BookOpen, BarChart3, FileText, MessageCircle, Pencil, Trash2, X, Check } from 'lucide-react'
import { api } from '../lib/api.js'
import { getCaseById } from '../data/mockCases.js'
import RadarChart from '../components/RadarChart.jsx'

export default function Dashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [insights, setInsights] = useState('')
  const [bailAnalysis, setBailAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    api.getCase(id)
      .then((data) => {
        setCaseData(data)
        setInsights(data.insights || '')
        setBailAnalysis(data.bail_analysis || null)
      })
      .catch(() => {
        const mock = getCaseById(id)
        setCaseData(mock)
        setInsights(mock?.insights || '')
        setBailAnalysis(mock?.bail_analysis || null)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!caseData || caseData.insights) return
    api.getInsights(id)
      .then((res) => setInsights(res.insights || ''))
      .catch(() => {})
  }, [caseData])

  useEffect(() => {
    if (!caseData) return
    const ba = caseData.bail_analysis
    if (ba && Object.keys(ba).length > 0) return
    api.analyzeBail(id)
      .then(setBailAnalysis)
      .catch(() => {})
  }, [caseData])

  function handleEdit() {
    setEditTitle(caseData.title)
    setEditSummary(caseData.summary || '')
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.updateCase(id, { title: editTitle, summary: editSummary })
      setCaseData(updated)
      setEditing(false)
    } catch {
      alert('Failed to update case')
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    setEditing(false)
  }

  async function handleDelete() {
    try {
      await api.deleteCase(id)
      navigate('/')
    } catch {
      alert('Failed to delete case')
    }
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

  const { title, structured_data, intelligence_scores, summary, precedents, source_type } = caseData

  const quickActions = [
    { to: `/case/${id}/debate`, icon: Swords, label: 'Start Debate', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { to: `/case/${id}/bail`, icon: BarChart3, label: 'Bail Analyzer', color: 'bg-blue-500 hover:bg-blue-600' },
    { to: `/case/${id}/precedents`, icon: BookOpen, label: 'Search Precedents', color: 'bg-violet-500 hover:bg-violet-600' },
    { to: `/case/${id}/ask`, icon: MessageCircle, label: 'Ask AI', color: 'bg-orange-500 hover:bg-orange-600' },
    { to: `/case/${id}/copilot`, icon: FileText, label: 'Generate Draft (RAG)', color: 'bg-slate-700 hover:bg-slate-800' },
  ]

  const scores = intelligence_scores || {}
  const completeness = Object.keys(scores).length > 0
    ? Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / 500) * 100)
    : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {editing ? (
            <div className="space-y-3">
              <input
                type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-2xl font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <textarea
                value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={2}
                className="w-full text-sm text-slate-600 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1 text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                ><Check className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={handleCancelEdit}
                  className="flex items-center gap-1 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg"
                ><X className="w-4 h-4" />Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              <p className="text-sm text-slate-500 mt-1">{summary || 'No summary available'}</p>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex gap-2 shrink-0">
            <button onClick={handleEdit}
              className="flex items-center gap-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            ><Pencil className="w-4 h-4" />Edit</button>
            <button onClick={() => setDeleting(true)}
              className="flex items-center gap-1 text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
            ><Trash2 className="w-4 h-4" />Delete</button>
          </div>
        )}
      </div>

      {deleting && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700 font-medium mb-3">Are you sure you want to delete this case? This action cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
            >Delete</button>
            <button onClick={() => setDeleting(false)}
              className="bg-white hover:bg-slate-50 text-slate-600 text-sm px-4 py-1.5 rounded-lg border border-slate-300 transition-colors"
            >Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ${action.color}`}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </Link>
        ))}
      </div>

      {source_type === 'upload' && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              RAG Document Co-Pilot Active
            </h3>
            <p className="text-xs text-slate-500">This case has been divided into semantic chunks. You can browse chunks, run document Q&A, and generate double-spaced legal drafts.</p>
          </div>
          <Link
            to={`/case/${id}/copilot`}
            className="shrink-0 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Open Co-Pilot Workspace
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Intelligence Scores</h2>
            <RadarChart data={scores} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">Case Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">IPC Sections</span><span className="font-medium">{structured_data?.ipc_sections?.join(', ') || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Accused</span><span className="font-medium text-right max-w-[200px]">{structured_data?.accused_profile || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Issues</span><span className="font-medium">{structured_data?.key_issues?.length || 0}</span></div>
              </dl>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">Key Insight</h3>
              {insights ? (
                <p className="text-sm text-slate-600">{String(insights)}</p>
              ) : (
                <p className="text-sm text-amber-600 animate-pulse">Generating insights...</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Case Completeness</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                <div className="bg-amber-500 h-2.5 rounded-full transition-all" style={{ width: `${completeness}%` }}></div>
              </div>
              <span className="text-sm font-bold text-slate-700">{completeness}%</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Bail Analysis</h3>
            {bailAnalysis ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Probability</span>
                  <span className={`text-lg font-bold ${(bailAnalysis.probability || 0) >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {bailAnalysis.probability || 0}%
                  </span>
                </div>
                <p className="text-xs text-slate-500">{bailAnalysis.recommendation || ''}</p>
              </>
            ) : (
              <p className="text-sm text-amber-600 animate-pulse">Analyzing bail prospects...</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Precedents</h3>
            <p className="text-sm text-slate-600">{(precedents || []).length} relevant cases found</p>
            {(precedents || []).slice(0, 2).map((p) => (
              <div key={p.id} className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                {p.title}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
