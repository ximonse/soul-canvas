# Baseline Prompt

You are working in `/workspace/soul-canvas`.

Objective:
Create a safe baseline by reviewing repo guardrails and validating current health before any feature or refactor work.

Allowed scope (files you may read; no edits unless explicitly requested later):
- `AGENTS.md`
- `docs/SAFETY.md`
- `docs/QA_CHECKLIST.md`
- `src/utils/featureFlags.ts`
- existing scripts/config needed to run checks

Required checks:
- Run `npm run sanity` and capture pass/fail output.

Output format:
1. Summary
   - 3-6 bullets on current baseline status.
2. Changed files
   - List files changed (or `None`).
3. Risks
   - List any immediate risks/blockers discovered.
