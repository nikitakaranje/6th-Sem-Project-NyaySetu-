import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Upload, FileText, Edit3, ArrowLeft, Send, File, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { api } from '../lib/api.js'

const inputMethods = [
  { id: 'audio', icon: Mic, title: 'Record Audio', desc: 'Speak or upload voice notes about the case', color: 'bg-violet-50 border-violet-200 hover:border-violet-400', iconColor: 'text-violet-600' },
  { id: 'upload', icon: Upload, title: 'Upload Documents', desc: 'PDF, DOCX, or image files with case details', color: 'bg-blue-50 border-blue-200 hover:border-blue-400', iconColor: 'text-blue-600' },
  { id: 'describe', icon: FileText, title: 'Describe Case', desc: 'Type a brief description of your case', color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400', iconColor: 'text-emerald-600' },
  { id: 'manual', icon: Edit3, title: 'Manual Form', desc: 'Fill structured fields for precise input', color: 'bg-amber-50 border-amber-200 hover:border-amber-400', iconColor: 'text-amber-600' },
]

export default function NewCase() {
  const [selected, setSelected] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Document upload state
  const [files, setFiles] = useState([])
  const [caseTitle, setCaseTitle] = useState('')
  const [statusSteps, setStatusSteps] = useState([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)

  const handleSelect = (id) => {
    setSelected(id)
    setError(null)
    setFiles([])
    setCaseTitle('')
    setCurrentStepIndex(-1)
    if (id !== 'describe') {
      setText('')
    }
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const caseData = await api.createCase({
        title: text.trim().slice(0, 50) + '...',
        source_type: selected,
        raw_input_text: text.trim(),
      })
      navigate(`/case/${caseData.id}`)
    } catch (err) {
      setError('Backend unreachable. Make sure the API server is running.')
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles(selectedFiles)
    if (selectedFiles.length > 0 && !caseTitle) {
      const firstFileName = selectedFiles[0].name.replace(/\.[^/.]+$/, "")
      setCaseTitle(firstFileName.slice(0, 50))
    }
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadSubmit = async () => {
    if (!caseTitle.trim() || files.length === 0) return
    setLoading(true)
    setError(null)
    setCurrentStepIndex(0)
    
    const steps = [
      "Reading uploaded documents...",
      "Extracting text content...",
      "Dividing document into semantic chunks...",
      "Indexing RAG data vectors...",
      "Evaluating case intelligence facts...",
      "Assembling AI co-pilot workspace..."
    ]
    setStatusSteps(steps)
    
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 2) {
          return prev + 1
        }
        return prev
      })
    }, 1800)
    
    try {
      const formData = new FormData()
      formData.append('title', caseTitle.trim())
      files.forEach((file) => {
        formData.append('files', file)
      })
      
      const caseData = await api.uploadDocs(formData)
      clearInterval(interval)
      setCurrentStepIndex(steps.length - 1)
      await new Promise(r => setTimeout(r, 600))
      navigate(`/case/${caseData.id}`)
    } catch (err) {
      clearInterval(interval)
      setError('Failed to process documents. Make sure the backend server is running and standard PDF/TXT files are uploaded.')
      setLoading(false)
      setCurrentStepIndex(-1)
    }
  }

  if (selected === 'describe') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => { setSelected(null); setText(''); setError(null) }}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Back to input options
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Describe Your Case</h1>
          <p className="text-sm text-slate-500 mt-1">Enter a brief description of the case facts</p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., Ramesh Sharma arrested for theft under Section 379 IPC outside a grocery store. Stolen item valued at ₹5,000. Accused claims false implication and has no prior criminal record..."
          className="w-full h-48 p-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}
        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Processing with AI...' : <><Send className="w-4 h-4" /> Analyze Case</>}
        </button>
      </div>
    )
  }

  if (selected === 'upload') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => { setSelected(null); setFiles([]); setCaseTitle(''); setError(null); setCurrentStepIndex(-1); }}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Back to input options
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Case Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Upload PDF, TXT, or markdown files to index using RAG</p>
        </div>

        {currentStepIndex >= 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              <h3 className="font-semibold text-slate-800 text-lg">AI Legal Co-Pilot is processing...</h3>
              <p className="text-sm text-slate-500">Indexing your legal file with local vector search</p>
            </div>
            
            <div className="space-y-2 max-w-md mx-auto">
              {statusSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {i < currentStepIndex ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : i === currentStepIndex ? (
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />
                  )}
                  <span className={`${i === currentStepIndex ? 'text-slate-800 font-medium' : i < currentStepIndex ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Case Title / Reference</label>
              <input
                type="text"
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                placeholder="e.g. State vs Ramesh Sharma (Theft)"
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Upload Files</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-amber-400 transition-colors bg-white cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-700 font-medium">Drag and drop your legal documents here, or <span className="text-amber-600 underline">browse</span></p>
                <p className="text-xs text-slate-400 mt-1">Supports PDF, TXT, or Markdown up to 10MB each</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selected Documents ({files.length})</h4>
                <div className="divide-y divide-slate-100">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-700">
                        <File className="w-4 h-4 text-slate-400" />
                        <span className="font-medium truncate max-w-[250px]">{file.name}</span>
                        <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-2 text-sm text-red-600">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <button
              onClick={handleUploadSubmit}
              disabled={loading || files.length === 0 || !caseTitle.trim()}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <Send className="w-4 h-4" /> Analyze and Build RAG Index
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Case</h1>
        <p className="text-sm text-slate-500 mt-1">Choose how you'd like to enter case information</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {inputMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => handleSelect(method.id)}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              selected === method.id
                ? 'ring-2 ring-amber-500 border-amber-500 scale-[1.02]'
                : method.color
            } ${method.color}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${method.iconColor} bg-white/80`}>
              <method.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">{method.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{method.desc}</p>
          </button>
        ))}
      </div>

      {selected && selected !== 'describe' && selected !== 'upload' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          {selected === 'audio' ? '🎤 Audio input coming soon. Use "Describe Case" for now.'
           : '✏️ Manual form coming soon. Use "Describe Case" for now.'}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-700">
        <strong>Tip:</strong> Audio is optional. All input methods extract the same structured data via AI.
      </div>
    </div>
  )
}
