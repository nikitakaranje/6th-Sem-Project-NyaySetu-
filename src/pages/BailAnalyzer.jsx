import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Shield, Scale } from 'lucide-react'
import { api } from '../lib/api.js'
import { getCaseById } from '../data/mockCases.js'

export default function BailAnalyzer() {
  const { id } = useParams()
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [whatIf, setWhatIf] = useState({ priorConviction: 50, heinousCharges: 50, strongEvidence: 50 })

  useEffect(() => {
    api.getCase(id)
      .then(setCaseData)
      .catch(() => setCaseData(getCaseById(id)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-20 text-slate-400">Loading...</div>

  if (!caseData) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg">Case not found</p>
        <Link to="/" className="text-amber-600 hover:underline mt-2 inline-block">Back to cases</Link>
      </div>
    )
  }

  const { bail_analysis } = caseData
  const baseProb = bail_analysis?.probability || 50

  const simulatedProbability = Math.round(
    (baseProb * (whatIf.priorConviction / 100) * (whatIf.heinousCharges / 100) * (whatIf.strongEvidence / 100)) / 50
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to={`/case/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bail Analyzer</h1>
        <p className="text-sm text-slate-500 mt-1">{caseData.title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Current Assessment</h2>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle cx="64" cy="64" r="54" fill="none" stroke="#22c55e" strokeWidth="8"
                    strokeDasharray={`${(baseProb / 100) * 339.292} 339.292`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-emerald-600">{baseProb}%</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-900">{bail_analysis?.recommendation || 'Recommendation pending'}</p>
              <p className="text-sm text-slate-500 mt-2">{bail_analysis?.reasons || ''}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Key Factors</h3>
            <div className="space-y-3">
              {[
                { label: 'Flight Risk', value: 20, color: 'bg-green-500' },
                { label: 'Evidence Strength', value: 55, color: 'bg-amber-500' },
                { label: 'Criminal History', value: 10, color: 'bg-green-500' },
                { label: 'Trial Delay', value: 70, color: 'bg-amber-500' },
              ].map((factor) => (
                <div key={factor.label}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{factor.label}</span>
                    <span>{factor.value}%</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2">
                    <div className={`${factor.color} h-2 rounded-full`} style={{ width: `${factor.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              What-If Scenario Simulator
            </h2>
            <p className="text-xs text-slate-500 mb-6">Adjust variables to see instant impact on bail probability</p>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-700">Prior Criminal Record</span>
                  <span className="font-medium text-slate-900">{whatIf.priorConviction}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={whatIf.priorConviction}
                  onChange={(e) => setWhatIf({ ...whatIf, priorConviction: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Clean record</span>
                  <span>Multiple convictions</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-700">Severity of Charges</span>
                  <span className="font-medium text-slate-900">{whatIf.heinousCharges}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={whatIf.heinousCharges}
                  onChange={(e) => setWhatIf({ ...whatIf, heinousCharges: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Bailable</span>
                  <span>Non-bailable</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-700">Prosecution Evidence</span>
                  <span className="font-medium text-slate-900">{whatIf.strongEvidence}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={whatIf.strongEvidence}
                  onChange={(e) => setWhatIf({ ...whatIf, strongEvidence: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Weak</span>
                  <span>Strong</span>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Simulated Bail Probability</span>
                <span className={`text-2xl font-bold ${
                  simulatedProbability >= 60 ? 'text-emerald-600' :
                  simulatedProbability >= 40 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {Math.max(0, Math.min(100, simulatedProbability))}%
                </span>
              </div>
              <div className="mt-2 bg-slate-200 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all ${
                  simulatedProbability >= 60 ? 'bg-emerald-500' :
                  simulatedProbability >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                  style={{ width: `${Math.max(0, Math.min(100, simulatedProbability))}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-500" />
              Recommendations
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                File bail application under Section 436/437 CrPC
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                Emphasize lack of criminal antecedents in arguments
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                Offer surety and personal bond to address flight risk concerns
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
