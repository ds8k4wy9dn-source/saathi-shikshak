# Use the exact Python version specified in your tech stack
FROM python:3.13.13-slim

# Install UV securely
COPY --from=ghcr.io/astral-sh/uv:0.11.18 /uv /uvx /bin/

# Set the working directory
WORKDIR /app

# Copy dependency files first for Docker caching
COPY pyproject.toml uv.lock ./

# Install dependencies using UV (fast, locked versions)
RUN uv sync --frozen --no-cache

# Copy the rest of the codebase
COPY . .

# HuggingFace Spaces strictly requires exposing port 7860
EXPOSE 7860

# Run uvicorn using UV, forcing host 0.0.0.0 and port 7860 without touching main.py
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]