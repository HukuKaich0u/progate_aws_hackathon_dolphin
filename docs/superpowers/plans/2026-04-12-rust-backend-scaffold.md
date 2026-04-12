# Rust Backend Scaffold Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `backend/` に `axum + sqlx + PostgreSQL + serde + Docker` の最小 scaffold を作る

**Architecture:** `feature-first` の最小縦スライスとして `health` feature を作り、`app` に起動導線、`infra/db` に接続導線を置く。ドメイン未確定のため、抽象化は増やしすぎず、設定・エラー・router・DB 接続の責務を明確に分離する。

**Tech Stack:** Rust, axum, tokio, sqlx, postgres, serde, thiserror, tracing, Docker, docker compose

---

## Chunk 1: Project Skeleton

### Task 1: Initialize cargo project

**Files:**
- Create: `backend/Cargo.toml`
- Create: `backend/src/main.rs`

- [ ] Initialize the Cargo binary project in `backend/`
- [ ] Add core dependencies for `axum`, `tokio`, `sqlx`, `serde`, `thiserror`, `tracing`
- [ ] Verify `cargo fmt` can run

### Task 2: Add app/config/error skeleton

**Files:**
- Create: `backend/src/app/mod.rs`
- Create: `backend/src/app/router.rs`
- Create: `backend/src/app/state.rs`
- Create: `backend/src/config.rs`
- Create: `backend/src/error.rs`

- [ ] Add app module boundaries
- [ ] Add env-based config loader
- [ ] Add `AppError` with `thiserror`
- [ ] Add router and shared state types

## Chunk 2: Health Vertical Slice

### Task 3: Add health feature

**Files:**
- Create: `backend/src/features/mod.rs`
- Create: `backend/src/features/health/mod.rs`
- Create: `backend/src/features/health/dto.rs`
- Create: `backend/src/features/health/handler.rs`
- Create: `backend/src/features/health/service.rs`

- [ ] Write failing tests for health responses
- [ ] Implement `/health`
- [ ] Implement `/health/db`
- [ ] Verify tests pass

## Chunk 3: Database and Runtime

### Task 4: Add database integration

**Files:**
- Create: `backend/src/infra/mod.rs`
- Create: `backend/src/infra/db/mod.rs`
- Create: `backend/migrations/.gitkeep`

- [ ] Add Postgres pool creation with `sqlx`
- [ ] Wire pool into `AppState`
- [ ] Use a simple `SELECT 1` health check

### Task 5: Add local runtime support

**Files:**
- Create: `backend/.env.example`
- Create: `backend/Dockerfile`
- Create: `compose.yaml`
- Modify: `backend/README.md`

- [ ] Add env example
- [ ] Add Dockerfile for backend
- [ ] Add compose services for app and postgres
- [ ] Document startup and migration flow

## Chunk 4: Verification

### Task 6: Verify scaffold

**Files:**
- Test only

- [ ] Run `cargo fmt --check`
- [ ] Run `cargo test`
- [ ] Run `cargo check`
- [ ] Report any verification gaps if Docker image pull or crate download is blocked
