from pydantic import BaseModel
from typing import Optional

class CreateCaseRequest(BaseModel):
    title: str
    source_type: str
    raw_input_text: str

class DebateRequest(BaseModel):
    argument: str
    role: str

class DraftRequest(BaseModel):
    type: str
    court_name: Optional[str] = None
    court_type: Optional[str] = None
    petitioner: Optional[str] = None
    respondent: Optional[str] = None
    case_number: Optional[str] = None
    advocate_name: Optional[str] = None
    applicable_sections: Optional[str] = None
    previous_cases: Optional[str] = None

class AskQuestionRequest(BaseModel):
    question: str

class UpdateCaseRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    raw_input_text: Optional[str] = None
