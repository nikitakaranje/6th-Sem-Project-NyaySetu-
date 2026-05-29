import { RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

const labelMap = {
  case_strength: 'Case Strength',
  precedent_support: 'Precedent Support',
  bail_likelihood: 'Bail Likelihood',
  argument_readiness: 'Argument Readiness',
  overall_risk: 'Overall Risk',
}

export default function RadarChart({ data }) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    metric: labelMap[key] || key,
    score: value,
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadar data={chartData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Radar name="Score" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
        <Tooltip />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}
