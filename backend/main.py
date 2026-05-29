from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from schemas import CreateCaseRequest, UpdateCaseRequest, DebateRequest, DraftRequest, AskQuestionRequest
from storage import Storage
from ollama_client import OllamaClient

app = FastAPI(title="NyayaAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

storage = Storage()
ollama = OllamaClient()


@app.get("/api/cases")
def list_cases():
    return storage.list_cases()


@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return case


@app.put("/api/cases/{case_id}")
def update_case(case_id: str, req: UpdateCaseRequest):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        return case
    updated = storage.update_case(case_id, updates)
    return updated


@app.delete("/api/cases/{case_id}")
def delete_case(case_id: str):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    storage.delete_case(case_id)
    return {"ok": True}


@app.post("/api/cases")
def create_case(req: CreateCaseRequest):
    facts = ollama.extract_facts(req.raw_input_text)
    scores = ollama.calculate_scores(facts["facts_summary"])
    case_data = {
        "title": req.title,
        "source_type": req.source_type,
        "raw_input_text": req.raw_input_text,
        "structured_data": facts,
        "intelligence_scores": scores,
        "summary": facts["facts_summary"],
        "insights": "",
        "bail_analysis": {},
        "precedents": [],
        "evidence": [],
    }
    return storage.create_case(case_data)


@app.post("/api/cases/{case_id}/insights")
def generate_insights(case_id: str):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    result = ollama.generate_insights(case)
    storage.update_case(case_id, {"insights": result.get("insights", "")})
    return result


@app.post("/api/cases/{case_id}/bail-analysis")
def analyze_bail(case_id: str):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    result = ollama.analyze_bail(case)
    storage.update_case(case_id, {"bail_analysis": result})
    return result


@app.post("/api/cases/{case_id}/debate")
def debate(case_id: str, req: DebateRequest):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    summary = case.get("summary", "")
    return ollama.generate_debate(req.argument, req.role, summary)


@app.post("/api/cases/{case_id}/ask")
def ask_question(case_id: str, req: AskQuestionRequest):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return ollama.ask_question(req.question, case)


@app.post("/api/cases/{case_id}/draft")
def generate_draft(case_id: str, req: DraftRequest):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return ollama.generate_draft(req.type, case)


@app.post("/api/cases/upload-docs")
async def upload_docs(
    title: str = Form(...),
    files: List[UploadFile] = File(...)
):
    full_text = ""
    for file in files:
        content = await file.read()
        filename = file.filename or ""
        if filename.lower().endswith(".pdf"):
            text = ollama.extract_pdf_text(content)
        else:
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    text = content.decode("latin-1")
                except Exception:
                    text = ""
        if text:
            full_text += f"\n\n--- Document: {filename} ---\n\n" + text
    
    full_text = full_text.strip()
    if not full_text:
        raise HTTPException(400, "Could not extract any text from the uploaded files.")
    
    chunks = ollama.chunk_text(full_text)
    
    # Analyze the text (first 6000 chars to avoid model context limits)
    facts = ollama.extract_facts(full_text[:6000])
    scores = ollama.calculate_scores(facts["facts_summary"])
    
    case_data = {
        "title": title,
        "source_type": "upload",
        "raw_input_text": full_text,
        "chunks": chunks,
        "structured_data": facts,
        "intelligence_scores": scores,
        "summary": facts["facts_summary"],
        "insights": "",
        "bail_analysis": {},
        "precedents": [],
        "evidence": [],
    }
    return storage.create_case(case_data)


@app.post("/api/cases/{case_id}/rag-ask")
def ask_question_rag(case_id: str, req: AskQuestionRequest):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return ollama.ask_question_rag(req.question, case)


@app.post("/api/cases/{case_id}/legal-draft")
def generate_legal_draft(case_id: str, req: DraftRequest):
    case = storage.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    details = {
        "court_name": req.court_name,
        "court_type": req.court_type,
        "petitioner": req.petitioner,
        "respondent": req.respondent,
        "case_number": req.case_number,
        "advocate_name": req.advocate_name,
        "applicable_sections": req.applicable_sections,
        "previous_cases": req.previous_cases,
    }
    return ollama.generate_legal_draft_rag(req.type, case, details)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
