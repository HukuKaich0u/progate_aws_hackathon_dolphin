COMPOSE ?= docker compose
FRONTEND_DIR := frontend
BACKEND_MANIFEST := backend/Cargo.toml

.PHONY: setup install frontend-install up down logs ps restart frontend-dev dev backend-test backend-check frontend-test frontend-typecheck frontend-build verify

setup:
	prek install

install: frontend-install

frontend-install:
	cd $(FRONTEND_DIR) && npm install

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f app postgres

ps:
	$(COMPOSE) ps

restart: down up

frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev -- --host

dev: up frontend-dev

backend-test:
	cargo test --manifest-path $(BACKEND_MANIFEST)

backend-check:
	cargo check --manifest-path $(BACKEND_MANIFEST)

frontend-test:
	cd $(FRONTEND_DIR) && npm run test -- --run

frontend-typecheck:
	cd $(FRONTEND_DIR) && npm run typecheck

frontend-build:
	cd $(FRONTEND_DIR) && npm run build

verify: frontend-test frontend-typecheck frontend-build backend-check
