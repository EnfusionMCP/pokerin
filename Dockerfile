FROM python:3.13-slim

WORKDIR /app

# OS deps for asyncpg and cryptography
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .

RUN pip install --no-cache-dir \
    "fastapi>=0.115" \
    "uvicorn[standard]>=0.30" \
    "websockets>=13.0" \
    "sqlalchemy[asyncio]>=2.0" \
    "asyncpg>=0.30" \
    "alembic>=1.14" \
    "redis>=5.0" \
    "pydantic>=2.9" \
    "pydantic-settings>=2.6" \
    "pyjwt[crypto]>=2.9" \
    "httpx>=0.28" \
    "phevaluator>=0.5" \
    "passlib>=1.7" \
    "cryptography>=44.0"

COPY backend/ backend/
COPY alembic/ alembic/
COPY alembic.ini .

RUN useradd -r -s /bin/false pokerin
USER pokerin

EXPOSE 8080

CMD ["sh", "-c", "alembic upgrade head && uvicorn backend.main:app --host 0.0.0.0 --port 8080 --workers 1"]
