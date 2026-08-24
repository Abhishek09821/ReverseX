# Microsoft ki official Playwright Python image (Debian/Ubuntu + Chromium pre-installed)
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

# Environment variables configure karein
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=10000

WORKDIR /app

# Pehle package configuration copy karein
COPY pyproject.toml .

# Project aur uske dependencies install karein
RUN pip install --upgrade pip && \
    pip install -e .

# Playwright Chromium browser binaries verify aur ensure karein
RUN playwright install chromium

# Baaki saara backend code copy karein
COPY . .

# Render ke PORT environment variable par FastAPI run karein
CMD ["sh", "-c", "uvicorn weblens.main:app --host 0.0.0.0 --port ${PORT:-10000}"]