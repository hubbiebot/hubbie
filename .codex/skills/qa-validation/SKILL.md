---
name: qa-validation
description: "Validate Hubbie changes across API, integration, E2E, security, SAST/DAST and performance before integration."
---

# QA Validation

Validate an implementation independently and produce evidence for a release or
integration decision. Do not implement product changes unless the user asks.

## Scope

- Map acceptance criteria to API, integration and E2E coverage.
- Compare HTTP behavior with `packages/contracts/openapi/openapi.yaml`; test
  API behavior with Vitest and Supertest.
- Validate the Angular workflow with unit tests, build and E2E when Playwright
  coverage is present or requested.
- Perform SAST through the repository's linters, dependency audit and focused
  inspection of authentication, authorization, input validation, secrets,
  logging and browser-supplied content.
- Run DAST only against a local, test or explicitly authorized non-production
  target. Never scan production, use destructive payloads, exfiltrate data or
  bypass authentication controls.
- Measure performance with a reproducible command and baseline. Report the
  metric, environment, sample size and regression threshold; do not claim a
  performance result from a single unrepeatable run.

## Workflow

1. Read the relevant spec, plan and changed files. State the test matrix and
   any unavailable coverage before validation.
2. Execute the narrowest applicable tests first, then workspace test, lint and
   production build checks. Preserve their raw pass/fail evidence.
3. Inspect contract compatibility, error behavior, authorization boundaries,
   rate limits and sensitive-data handling.
4. Run only authorized dynamic checks. Stop immediately if a target is not
   clearly authorized.
5. Classify findings as blocker, high, medium or low. A blocker is an
   exploitable security flaw, data-loss path, broken required flow, contract
   break or reproducible material regression.

## Output

Return a concise report containing scope, commands and results, coverage gaps,
findings with reproduction steps, performance evidence, and a clear decision:
`approved`, `approved with follow-ups`, or `blocked`. Redact credentials,
tokens, personal data, message bodies and media from all evidence.
