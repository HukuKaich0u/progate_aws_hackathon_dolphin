# Python API

This directory contains the FastAPI backend starter managed with `uv`.

## Requirements

- Python 3.11
- `uv`

## Setup

```powershell
cd backend/python
uv sync
```

## Run the development server

```powershell
uv run uvicorn app.main:app --app-dir src --reload
```

The API will start at `http://127.0.0.1:8000`.

## Run tests

```powershell
uv run pytest
```

## Run lint

```powershell
uv run ruff check .
```

## Starter endpoint

- `GET /health`

Successful response:

```json
{"status": "ok"}
```
