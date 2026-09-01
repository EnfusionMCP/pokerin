FROM ghcr.io/astral-sh/uv:0.10.11@sha256:3472e43b4e738cf911c99d41bb34331280efad54c73b1def654a6227bb59b2b4 AS uv

FROM python:3.14-slim@sha256:656d12e70054d5fda18a045e2494c96701e9792dd1445f95b3d038df954f57e9 AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
WORKDIR /app

COPY --from=uv /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./

# Cache the runtime dependency layer independently from application source.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

COPY backend/ backend/
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable

FROM python:3.14-slim@sha256:656d12e70054d5fda18a045e2494c96701e9792dd1445f95b3d038df954f57e9 AS runtime

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY alembic/ alembic/
COPY alembic.ini .
COPY deploy/check-empty-tables.py deploy/check-empty-tables.py
COPY deploy/migrate.sh deploy/migrate.sh

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/lib/python3.13/site-packages/pip \
        /usr/local/lib/python3.13/site-packages/pip-*.dist-info \
        /usr/local/bin/pip /usr/local/bin/pip3 /usr/local/bin/pip3.13 \
    && useradd -r -s /usr/sbin/nologin pokerin
USER pokerin

EXPOSE 8080

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--no-access-log", "--ws-max-size", "16384"]
