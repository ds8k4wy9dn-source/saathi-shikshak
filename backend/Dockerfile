# Use official Python 3.13 image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for ChromaDB and ML models
RUN apt-get update && apt-get install -y build-essential

# Install uv (The exact package manager you used locally)
RUN pip install uv

# Copy your dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN uv sync --frozen

# Copy the rest of your application code
COPY . .

# Expose the FastAPI port
EXPOSE 7860

# Command to run the application (Hugging Face expects port 7860)
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]