# Hubbie Delivery Agents Design

- **Status:** APPROVED
- **Date:** 2026-08-28
- **Decision:** user directive in this conversation

## Goal

Add three repository-scoped Codex skills that consistently support quality
validation, Angular front-end delivery and code review/local commits.

## Design

The skills live in `.codex/skills/`, each with `SKILL.md` operational guidance
and `agents/openai.yaml` UI metadata. Automatic discovery is enabled, but the
instructions inside each profile preserve human authorization for stateful or
risky actions.

| Skill                       | Responsibility                                                       | Required guardrail                                              |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `qa-validation`             | API, integration, E2E, SAST, DAST, security and performance evidence | Dynamic testing only against authorized non-production targets  |
| `angular-frontend-engineer` | Angular 22 and Angular Material interface delivery                   | WCAG 2.2 AA, responsive behavior and test/build evidence        |
| `code-review-commit`        | Independent diff review and local commit preparation                 | Commit only on explicit authorization; never push, PR or deploy |

## Repository alignment

The profiles use the existing workspaces (`apps/api`, `apps/web` and
`packages/contracts`) and their Vitest, Supertest and Angular test/build
commands. New front-end work follows the owner's Angular Material direction;
this is intentional despite older ADR references to PrimeNG.

## Acceptance criteria

- Each profile has valid frontmatter and UI metadata.
- QA requires contract, security and performance evidence and constrains DAST.
- Front-end guidance fits Angular 22 and Angular Material.
- The review profile forbids push, PR, deploy and history rewrites without a
  separate explicit request.
- Repository tests, lint and build pass before the local `dev` commit.
