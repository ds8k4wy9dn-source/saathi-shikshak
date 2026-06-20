from pydantic import BaseModel


class ImmediateSteps(BaseModel):
    title: str
    steps: list[str]


class ClassroomActivity(BaseModel):
    title: str
    activity: str
    materials: str
    time_required: str


class InclusionStrategy(BaseModel):
    title: str
    strategy: str


class ReflectionPrompt(BaseModel):
    title: str
    question: str


class SourceCitation(BaseModel):
    title: str
    reference: str


class QueryResponse(BaseModel):
    session_id: str
    language: str
    immediate_steps: ImmediateSteps
    classroom_activity: ClassroomActivity
    inclusion_strategy: InclusionStrategy
    reflection_prompt: ReflectionPrompt
    source_citation: SourceCitation
    response_time_ms: int
    from_cache: bool = False


class TeacherProfile(BaseModel):
    teacher_id: str
    phone: str
    name: str | None = None
    language_pref: str = "hi"
    grades_taught: str | None = None
    subjects_taught: str | None = None
    is_new_user: bool = False


class SessionRecord(BaseModel):
    session_id: str
    query_text: str
    grade: str | None
    subject: str | None
    language: str
    created_at: str
    feedback: int | None
    response_preview: str