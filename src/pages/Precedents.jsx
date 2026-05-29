import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search, ExternalLink, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api.js'
import { getCaseById } from '../data/mockCases.js'

const allPrecedents = [
  { id: 'p1', title: 'State of Maharashtra v. Suresh Pandey (2019)', relevance: 85, court: 'Bombay HC', citation: '2019 SCC 1234', summary: 'Held that mere recovery without independent witnesses is insufficient for conviction under Section 379 IPC.' },
  { id: 'p2', title: 'Rajan v. State of UP (2020)', relevance: 72, court: 'Allahabad HC', citation: '2020 ALL 567', summary: 'Bail granted where accused was first-time offender and trial was delayed beyond reasonable period.' },
  { id: 'p3', title: 'Suman v. Rajesh (2018)', relevance: 90, court: 'Supreme Court', citation: '2018 SC 789', summary: 'Laid down guidelines for maintenance quantum under Section 125 CrPC for working spouses.' },
  { id: 'p4', title: 'Kumar v. State of Bihar (2021)', relevance: 65, court: 'Patna HC', citation: '2021 PAT 234', summary: 'Distinction between commercial and non-commercial quantity under NDPS Act for bail purposes.' },
  { id: 'p5', title: 'State of Punjab v. Baldev Singh (1999)', relevance: 60, court: 'Supreme Court', citation: '1999 SCC (Cri) 1080', summary: 'Non-compliance of Section 50 NDPS Act renders recovery invalid.' },
]

export default function Precedents() {
  const { id } = useParams()
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getCase(id)
      .then(setCaseData)
      .catch(() => setCaseData(getCaseById(id)))
      .finally(() => setLoading(false))
  }, [id])

  const filtered = allPrecedents.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.court.toLowerCase().includes(search.toLowerCase()) ||
      p.summary.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-center py-20 text-slate-400">Loading...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to={`/case/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Precedents Explorer</h1>
        <p className="text-sm text-slate-500 mt-1">Search and explore relevant case law</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, court, or keywords..."
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {caseData && caseData.precedents && caseData.precedents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <strong>Case-matched:</strong> {caseData.precedents.length} precedents auto-matched to this case
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((precedent) => (
          <div key={precedent.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <h3 className="font-semibold text-slate-900">{precedent.title}</h3>
                <p className="text-sm text-slate-600">{precedent.summary}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-medium text-slate-500">{precedent.court}</span>
                <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                  {precedent.relevance}% match
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Citation: {precedent.citation}</span>
              <button className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
                View Full Text <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <p>No precedents found for "{search}"</p>
        </div>
      )}
    </div>
  )
}
