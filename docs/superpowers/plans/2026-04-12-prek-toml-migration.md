# Prek TOML Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary YAML `prek` config with a root `prek.toml` that enables the first built-in hook set for this repository.

**Architecture:** Remove the placeholder `.pre-commit-config.yaml`, define the shared hook configuration in `prek.toml`, and keep the rest of the repository setup unchanged. Limit the hook set to safe built-ins so the config works before Rust or frontend tooling exists.

**Tech Stack:** `prek`, TOML, Markdown

---

## Chunk 1: Config migration

### Task 1: Replace YAML config with TOML config

**Files:**
- Delete: `.pre-commit-config.yaml`
- Create: `prek.toml`

- [ ] **Step 1: Remove the temporary YAML config**

Delete `.pre-commit-config.yaml` so the repository has a single source of truth for `prek`.

- [ ] **Step 2: Add the TOML config**

Create `prek.toml` with the built-in hooks:
- `trailing-whitespace`
- `end-of-file-fixer`
- `check-yaml`
- `check-toml`
- `check-json`

- [ ] **Step 3: Verify the config file**

Run: `sed -n '1,200p' prek.toml`
Expected: the TOML config prints with the five built-in hooks listed

## Chunk 2: Documentation adjustment

### Task 2: Keep setup documentation aligned

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Mention `prek.toml`**

Update the setup section so it refers to the shared `prek.toml` configuration rather than a generic config file.

- [ ] **Step 2: Verify the README text**

Run: `sed -n '1,160p' README.md`
Expected: the setup section still tells developers to run `make setup` and now references `prek.toml`

## Chunk 3: Final verification and commit

### Task 3: Confirm repository state

**Files:**
- Verify: `prek.toml`
- Verify: `README.md`

- [ ] **Step 1: Check the changed files**

Run: `git status --short`
Expected: the YAML config deletion plus the intended TOML and README changes are listed

- [ ] **Step 2: Validate setup command shape**

Run: `make -n setup`
Expected: the output still shows `prek install`

- [ ] **Step 3: Commit the change**

```bash
git add prek.toml README.md docs/superpowers/specs/2026-04-12-prek-toml-design.md docs/superpowers/plans/2026-04-12-prek-toml-migration.md
git rm .pre-commit-config.yaml
git commit -m "prek設定をtomlに移行"
```
