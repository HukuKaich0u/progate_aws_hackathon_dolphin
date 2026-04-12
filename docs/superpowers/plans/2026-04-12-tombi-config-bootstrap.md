# Tombi Config Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal root `tombi.toml` so this repository has a stable home for future TOML formatting policy.

**Architecture:** Keep the change intentionally small. Add a root `tombi.toml` as the single configuration entry point and optionally mention it in the README so the TOML toolchain location is obvious to contributors.

**Tech Stack:** `tombi`, TOML, Markdown

---

## Chunk 1: Add root config

### Task 1: Create the initial `tombi` config file

**Files:**
- Create: `tombi.toml`

- [ ] **Step 1: Add the root config file**

Create `tombi.toml` with a minimal placeholder structure that can be extended later.

- [ ] **Step 2: Verify the file exists**

Run: `sed -n '1,120p' tombi.toml`
Expected: the minimal TOML config is printed without shell errors

## Chunk 2: Keep docs aligned

### Task 2: Mention the config location

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add one short note**

Update the setup section with a brief note that TOML formatting policy will live in `tombi.toml`.

- [ ] **Step 2: Verify the README text**

Run: `sed -n '1,160p' README.md`
Expected: the setup section mentions `tombi.toml`

## Chunk 3: Final verification and commit

### Task 3: Confirm repository state

**Files:**
- Verify: `tombi.toml`
- Verify: `README.md`

- [ ] **Step 1: Check changed files**

Run: `git status --short`
Expected: only `tombi.toml`, `README.md`, and this plan file are listed

- [ ] **Step 2: Commit the change**

```bash
git add tombi.toml README.md docs/superpowers/plans/2026-04-12-tombi-config-bootstrap.md
git commit -m "tombi設定を追加"
```
