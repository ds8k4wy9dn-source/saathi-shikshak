from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    teacher_id: str
    query_text: str = Field(..., min_length=3, max_length=1000)
    language: str = Field(default="hi", pattern="^(hi|en|mr|te|kn|ta)$")
    grade: str = Field(..., pattern="^[1-8]$")
    subject: str = Field(..., pattern="^(hindi|mathematics|evs|science|english|general)$")
    class_size: int = Field(default=40, ge=1, le=100)
    special_context: str | None = Field(default=None, max_length=200)


class FeedbackRequest(BaseModel):
    session_id: str
    feedback: int = Field(..., ge=0, le=1)


class AuthVerifyRequest(BaseModel):
    id_token: str
    language_pref: str = Field(default="hi", pattern="^(hi|en)$")