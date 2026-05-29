import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, Mic, Upload } from 'lucide-react'
import { api } from '../lib/api.js'
import { mockCases } from '../data/mockCases.js'

export default function Home() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listCases()
      .then(setCases)
      .catch(() => setCases(mockCases))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-slate-400">Loading...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Cases</h1>
          <p className="text-sm text-slate-500 mt-1">{cases.length} active case{cases.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/new-case"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Case
        </Link>
      </div>

      <div className="grid gap-4">
        {cases.map((caseItem) => (
          <Link
            key={caseItem.id}
            to={`/case/${caseItem.id}`}
            className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900">{caseItem.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-1">{caseItem.summary || 'No summary'}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                caseItem.status === 'Active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {caseItem.status || 'Active'}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span>{caseItem.case_type || 'Criminal'}</span>
              {caseItem.created_at && <><span>•</span><span>{caseItem.created_at}</span></>}
              {caseItem.source_type && <><span>•</span>
                <span className="flex items-center gap-1">
                  {caseItem.source_type === 'audio' ? <Mic className="w-3 h-3" /> :
                   caseItem.source_type === 'upload' ? <Upload className="w-3 h-3" /> :
                   <FileText className="w-3 h-3" />}
                  {caseItem.source_type}
                </span>
              </>}
            </div>
          </Link>
        ))}
      </div>

      {cases.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No cases yet</p>
          <p className="text-sm mt-1">Create your first case to get started</p>
        </div>
      )}
    </div>
  )
}
