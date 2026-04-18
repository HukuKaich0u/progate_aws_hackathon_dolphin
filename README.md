# progate_aws_hackathon_dolphin

## Setup

This repository uses `prek` to manage shared Git hooks.
The shared configuration lives in `prek.toml`.
TOML formatting policy will live in `tombi.toml`.

1. Install `prek` in your local environment.
2. Run `make setup` after cloning this repository.

```bash
make setup
```

This installs the shared Git hook configuration into your local Git repository.

## Local development

Frontend is a static `Vite` SPA in production, but local development runs:

- `backend + postgres` via `docker compose`
- `frontend` via the local `Vite` dev server

Common commands:

```bash
make frontend-install
make up
make frontend-dev
make dev
make down
make logs
make verify
```

`make dev` starts `backend + postgres` in Docker and then runs the frontend dev server on the host.
