# Store Refactor Prompt

You are working in `/workspace/soul-canvas`.

Objective:
Refactor store/state-management code for clarity and maintainability without changing observable behavior.

Allowed scope:
- store/state files under `src/**` (including selectors, actions, reducers, hooks)
- closely related types/utilities required by the refactor
- tests for impacted store behavior

Required checks:
- Run `npm run sanity` and report result.

Output format:
1. Summary
   - Refactor intent and key structural improvements.
2. Changed files
   - Each file changed and what was simplified/cleaned up.
3. Risks
   - Behavioral parity concerns, migration notes, or follow-ups.
