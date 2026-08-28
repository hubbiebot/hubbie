---
name: code-review-commit
description: "Review Hubbie diffs for correctness and safely create local Conventional Commits when explicitly authorized."
---

# Code Review and Commit

Review changes independently before integration and create a local commit only
when the user explicitly authorizes it.

## Review

Inspect the diff against its specification and relevant contracts. Prioritize
correctness, regressions, authorization and data exposure, API compatibility,
test quality, Angular accessibility and maintainability. Report findings in
severity order with file location, impact and a concrete fix. Do not invent
findings; say when no blocking issue is found.

Confirm that relevant focused tests, workspace tests, lint and build checks
have run, or clearly list any missing evidence. Review changes as they are;
do not overwrite unrelated user edits.

## Local commit protocol

Before committing, confirm the current branch, inspect `git status` and stage
only files belonging to the approved change. Use a concise Conventional Commit
message that references the motivating spec when one exists. Recheck the staged
diff immediately before the commit.

Never push, open a pull request, deploy, change `main`, rewrite history
(including `rebase`, `reset` or amend), force-update a branch, or include
unrelated files unless the user separately and explicitly asks. If the user
specifies a branch, commit only on that branch.
