# Hubbie Delivery Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable Codex profiles for quality validation, Angular UI work and safe review/commit workflows.

**Architecture:** Each profile is a repository-scoped skill under
`.codex/skills/`, composed of concise instructions and UI metadata. The profiles
are independent, share existing project contracts and never authorize external
state changes by implication.

**Tech Stack:** Codex skill format, YAML metadata, Node.js workspaces, Vitest,
Angular 22 and Angular Material.

## Global Constraints

- Work only on `dev`; create a local commit only, with no push or pull request.
- Preserve the existing repository architecture and user-owned changes.
- DAST may target only local, test or explicitly authorized non-production environments.
- New front-end guidance uses Angular Material as explicitly directed.

---

### Task 1: Define the QA profile

**Files:**

- Create: `.codex/skills/qa-validation/SKILL.md`
- Create: `.codex/skills/qa-validation/agents/openai.yaml`

**Interfaces:**

- Consumes: approved specs, OpenAPI contract and workspace scripts.
- Produces: an evidence-based validation decision and redacted findings.

- [ ] Define API, integration, E2E, SAST, DAST, security and performance responsibilities.
- [ ] Require authorized non-production dynamic testing and reproducible metrics.
- [ ] Validate with the Skill Creator validator; when its `PyYAML` dependency is unavailable, run `npx prettier --check .codex/skills/qa-validation/SKILL.md .codex/skills/qa-validation/agents/openai.yaml` and confirm there is no `[TODO:` marker.

### Task 2: Define the Angular profile

**Files:**

- Create: `.codex/skills/angular-frontend-engineer/SKILL.md`
- Create: `.codex/skills/angular-frontend-engineer/agents/openai.yaml`

**Interfaces:**

- Consumes: front-end specs, `apps/web` implementation and API contracts.
- Produces: accessible, responsive Angular Material UI with test/build evidence.

- [ ] Record Angular 22, standalone, OnPush, Signals, RxJS and reactive-form practices.
- [ ] Require WCAG 2.2 AA, Angular Material consistency and safe server-content rendering.
- [ ] Validate with the Skill Creator validator; when its `PyYAML` dependency is unavailable, run `npx prettier --check .codex/skills/angular-frontend-engineer/SKILL.md .codex/skills/angular-frontend-engineer/agents/openai.yaml` and confirm there is no `[TODO:` marker.

### Task 3: Define the review and commit profile

**Files:**

- Create: `.codex/skills/code-review-commit/SKILL.md`
- Create: `.codex/skills/code-review-commit/agents/openai.yaml`

**Interfaces:**

- Consumes: diff, relevant spec, contracts and verification evidence.
- Produces: severity-ranked review and an authorized local Conventional Commit.

- [ ] Require diff review, staged-diff inspection and concise Conventional Commit messages.
- [ ] Forbid push, PR, deploy, `main` changes and history rewrites without separate explicit authorization.
- [ ] Validate with the Skill Creator validator; when its `PyYAML` dependency is unavailable, run `npx prettier --check .codex/skills/code-review-commit/SKILL.md .codex/skills/code-review-commit/agents/openai.yaml` and confirm there is no `[TODO:` marker.

### Task 4: Verify and commit the profiles

**Files:**

- Create: `docs/superpowers/specs/2026-08-28-hubbie-delivery-agents-design.md`
- Create: `docs/superpowers/plans/2026-08-28-hubbie-delivery-agents.md`

**Interfaces:**

- Consumes: all three skill definitions.
- Produces: validated repository-scoped profiles committed locally to `dev`.

- [ ] Run all three Skill Creator validators, or the documented Prettier/no-placeholder fallback when `PyYAML` is unavailable.
- [ ] Run `npm test`, `npm run lint` and `npm run build -w @hubbie/web`.
- [ ] Inspect `git diff --check`, `git diff --staged --check` and the final staged diff.
- [ ] Commit only the six profile files and two design/planning documents with `feat(agents): add delivery specialists`.
