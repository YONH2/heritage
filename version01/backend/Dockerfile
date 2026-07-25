# Use Python 3.11 slim image
FROM python:3.11-slim

# Set environment variables to optimize Python runtime
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Set PYTHONPATH to root /app so that backend can be imported as a package
ENV PYTHONPATH=/app

# Set workspace directory
WORKDIR /app

# Install build dependencies (for any native extensions if required)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install backend requirements
COPY requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the backend project files into /app/backend/
COPY . /app/backend/

# Expose FastAPI service port
EXPOSE 8000

# Run uvicorn server as a package to resolve relative imports properly
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
