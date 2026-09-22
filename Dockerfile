FROM ghcr.io/astral-sh/uv:0.12.17@sha256:10787c682e4184e4f290de1171fd4703dc63de99221f10fe1c99002ce7fa9acc AS uv

FROM python:3.13-slim@sha256:7ce4b6dfe35e55397b7cda544f8a13f191b7ae28dc5aad71fe664dbc9bc2623f AS builder

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

FROM python:3.13-slim@sha256:7ce4b6dfe35e55397b7cda544f8a13f191b7ae28dc5aad71fe664dbc9bc2623f AS runtime

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
