# Prek Setup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Share `prek` configuration in this repository and make `make setup` install Git hooks locally for every developer.

**Architecture:** Keep the integration minimal at the repository root. Store the shared `prek` config in the root, add a `Makefile` entry point that runs `prek install`, and document `make setup` as the required first step in the root README.

**Tech Stack:** `prek`, `Makefile`, Markdown

---

## Chunk 1: Root tooling files

### Task 1: Add shared `prek` configuration

**Files:**
- Create: `.pre-commit-config.yaml`

- [ ] **Step 1: Add the root `prek` config file**

Create `.pre-commit-config.yaml` with the minimal valid structure for future hook expansion.

- [ ] **Step 2: Verify the file exists and is readable**

Run: `sed -n '1,120p' .pre-commit-config.yaml`
Expected: the config content is printed without shell errors

### Task 2: Add setup entry point

**Files:**
- Create: `Makefile`

- [ ] **Step 1: Add a `setup` target**

Create `Makefile` with a `setup` target that runs `prek install`.

- [ ] **Step 2: Verify the target is listed**

Run: `make -n setup`
Expected: the command prints the `prek install` invocation without executing it

## Chunk 2: Repository documentation

### Task 3: Document required setup flow

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add setup instructions**

Update the root README to state that developers must run `make setup` after cloning and that this installs shared Git hooks via `prek`.

- [ ] **Step 2: Verify the README text**

Run: `sed -n '1,160p' README.md`
Expected: the setup section and `make setup` instructions are present

## Chunk 3: Final verification and commit

### Task 4: Confirm repository state

**Files:**
- Verify: `.pre-commit-config.yaml`
- Verify: `Makefile`
- Verify: `README.md`

- [ ] **Step 1: Check the changed files**

Run: `git status --short`
Expected: only the intended files are listed as modified or new

- [ ] **Step 2: Smoke-check setup command**

Run: `make -n setup`
Expected: the output shows the exact `prek install` command path that developers will run

- [ ] **Step 3: Commit the change**

```bash
git add .pre-commit-config.yaml Makefile README.md
git commit -m "prek導入を追加"
```
