import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Home from './pages/Home.jsx'
import NewCase from './pages/NewCase.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DebateArena from './pages/DebateArena.jsx'
import Precedents from './pages/Precedents.jsx'
import BailAnalyzer from './pages/BailAnalyzer.jsx'
import AskAI from './pages/AskAI.jsx'
import Workspace from './pages/Workspace.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/new-case" element={<NewCase />} />
          <Route path="/case/:id" element={<Dashboard />} />
          <Route path="/case/:id/debate" element={<DebateArena />} />
          <Route path="/case/:id/precedents" element={<Precedents />} />
          <Route path="/case/:id/bail" element={<BailAnalyzer />} />
          <Route path="/case/:id/ask" element={<AskAI />} />
          <Route path="/case/:id/copilot" element={<Workspace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
