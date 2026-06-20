from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.development",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Anthropic — Kept in UPPERCASE so that settings.ANTHROPIC_API_KEY 
    # references in other files never fracture.
    ANTHROPIC_API_KEY: str | None = None

    # PostgreSQL
    database_url: str = "postgresql+asyncpg://localhost/saathi_shikshak_dev"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # ChromaDB
    chroma_persist_dir: str = "./data/chroma"

    # Firebase
    firebase_project_id: str = ""

    # LLM settings
    max_tokens: int = 1200
    temperature: float = 0.3
    rag_top_k: int = 5

    # Rate limiting
    rate_limit_per_teacher: int = 30

    # Cache
    cache_ttl_seconds: int = 3600

    # CORS
    allowed_origins: str = "http://localhost:5173"

    # App
    log_level: str = "INFO"
    embedding_model: str = "intfloat/multilingual-e5-small"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

settings = Settings()