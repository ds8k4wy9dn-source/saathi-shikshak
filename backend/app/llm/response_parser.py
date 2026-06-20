"""Parse Claude's JSON output into Pydantic response models."""
from app.models.response import (
    ClassroomActivity,
    ImmediateSteps,
    InclusionStrategy,
    QueryResponse,
    ReflectionPrompt,
    SourceCitation,
)


FALLBACK_RESPONSE_HI = {
    "immediate_steps": {
        "title": "तत्काल सलाह",
        "steps": [
            "अभी सेवा व्यस्त है। कृपया एक मिनट बाद फिर कोशिश करें।",
            "आप अपने नज़दीकी बीआरसी/सीआरसी समन्वयक से भी सहायता ले सकते हैं।",
            "ऑफलाइन मोड में पहले से तैयार जवाब देखें।",
        ],
    },
    "classroom_activity": {
        "title": "कक्षा गतिविधि",
        "activity": "जल्द ही जवाब आएगा। तब तक बच्चों को जोड़े में बिठाएं और पिछले पाठ पर चर्चा करवाएं।",
        "materials": "कोई सामग्री नहीं चाहिए",
        "time_required": "10 मिनट",
    },
    "inclusion_strategy": {
        "title": "समावेश रणनीति",
        "strategy": "सभी बच्चों को बोलने का अवसर दें — कमज़ोर बच्चे पहले बोलें।",
    },
    "reflection_prompt": {
        "title": "चिंतन",
        "question": "आज कक्षा में कौन सा पल सबसे अच्छा रहा?",
    },
    "source_citation": {
        "title": "संदर्भ",
        "reference": "NEP 2020 — Chapter 5, Teacher Empowerment",
    },
}

FALLBACK_RESPONSE_EN = {
    "immediate_steps": {
        "title": "Immediate Action",
        "steps": [
            "Service is temporarily busy. Please try again in one minute.",
            "You can also reach your BRC/CRC coordinator for immediate support.",
            "Check offline mode for pre-computed answers.",
        ],
    },
    "classroom_activity": {
        "title": "Classroom Activity",
        "activity": "While waiting for the response, have students discuss the previous lesson in pairs.",
        "materials": "No materials needed",
        "time_required": "10 minutes",
    },
    "inclusion_strategy": {
        "title": "Inclusion Strategy",
        "strategy": "Give every student a chance to speak — let struggling learners go first.",
    },
    "reflection_prompt": {
        "title": "Reflection",
        "question": "What was the best moment in class today?",
    },
    "source_citation": {
        "title": "Source",
        "reference": "NEP 2020 — Chapter 5, Teacher Empowerment",
    },
}


def parse_claude_response(raw: dict, language: str, session_id: str, response_time_ms: int) -> QueryResponse:
    """Convert raw Claude dict output to a validated QueryResponse."""
    fallback = FALLBACK_RESPONSE_HI if language == "hi" else FALLBACK_RESPONSE_EN

    def safe_get(key: str, fallback_key: str) -> dict:
        return raw.get(key) or fallback[fallback_key]

    steps_data = safe_get("immediate_steps", "immediate_steps")
    activity_data = safe_get("classroom_activity", "classroom_activity")
    inclusion_data = safe_get("inclusion_strategy", "inclusion_strategy")
    reflection_data = safe_get("reflection_prompt", "reflection_prompt")
    citation_data = safe_get("source_citation", "source_citation")

    return QueryResponse(
        session_id=session_id,
        language=language,
        immediate_steps=ImmediateSteps(
            title=steps_data.get("title", ""),
            steps=steps_data.get("steps", []),
        ),
        classroom_activity=ClassroomActivity(
            title=activity_data.get("title", ""),
            activity=activity_data.get("activity", ""),
            materials=activity_data.get("materials", ""),
            time_required=activity_data.get("time_required", ""),
        ),
        inclusion_strategy=InclusionStrategy(
            title=inclusion_data.get("title", ""),
            strategy=inclusion_data.get("strategy", ""),
        ),
        reflection_prompt=ReflectionPrompt(
            title=reflection_data.get("title", ""),
            question=reflection_data.get("question", ""),
        ),
        source_citation=SourceCitation(
            title=citation_data.get("title", ""),
            reference=citation_data.get("reference", ""),
        ),
        response_time_ms=response_time_ms,
        from_cache=False,
    )