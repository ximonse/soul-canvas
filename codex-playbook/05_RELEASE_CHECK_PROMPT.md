# Release Check Prompt

You are working in `/workspace/soul-canvas`.

Objective:
Perform a pre-release confidence check and summarize readiness, issues, and go/no-go risks.

Allowed scope:
- read any repository files needed for assessment
- only make minimal documentation/checklist updates if explicitly necessary

Required checks:
- Run `npm run sanity` and report result.

Output format:
1. Summary
   - Release readiness status with key signals.
2. Changed files
   - List any files changed (or `None`).
3. Risks
   - Outstanding blockers, known issues, and mitigation suggestions.
