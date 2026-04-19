# Amplify Frontend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Terraform-managed Amplify Hosting for the Vite frontend in `frontend/`

**Architecture:** Add a reusable `amplify_frontend` module, extend Cognito with a frontend app client and hosted UI domain, and wire both through `infra/environment/dev`. Keep repo connection manual after apply.

**Tech Stack:** Terraform, AWS Amplify Hosting, Amazon Cognito

---

## Chunk 1: Infra wiring

### Task 1: Add reusable Amplify module

**Files:**
- Create: `infra/modules/amplify_frontend/main.tf`
- Create: `infra/modules/amplify_frontend/variables.tf`
- Create: `infra/modules/amplify_frontend/outputs.tf`

- [ ] Define `aws_amplify_app`
- [ ] Define `aws_amplify_branch`
- [ ] Output app id, default domain, branch url

### Task 2: Extend Cognito for frontend auth settings

**Files:**
- Modify: `infra/modules/cognito/main.tf`
- Modify: `infra/modules/cognito/variables.tf`
- Modify: `infra/modules/cognito/outputs.tf`

- [ ] Add frontend app client inputs
- [ ] Add hosted UI domain resource
- [ ] Output frontend client id and domain

## Chunk 2: Environment integration

### Task 3: Wire dev environment

**Files:**
- Modify: `infra/environment/dev/main.tf`
- Modify: `infra/environment/dev/variables.tf`
- Modify: `infra/environment/dev/outputs.tf`
- Modify: `infra/environment/dev/terraform.tfvars.example`

- [ ] Add frontend-related variables
- [ ] Pass backend / Cognito values into Amplify env vars
- [ ] Require explicit HTTPS API base URL
- [ ] Expose outputs for follow-up manual setup

### Task 4: Update operator docs

**Files:**
- Modify: `infra/README.md`

- [ ] Document first apply flow
- [ ] Document repo connect step in Amplify Console
- [ ] Document when `frontend_base_url` needs a second apply
