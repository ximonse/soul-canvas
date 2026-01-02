# Safety Routines

These guardrails keep Soul Canvas stable when we optimize or refactor.

## Always use
- Run `npm run sanity` before pushes or after layout/perf changes.
- Use the QA checklist: `docs/QA_CHECKLIST.md`.
- Keep experiments behind feature flags in `src/utils/featureFlags.ts`.

## Feature flags
Edit `src/utils/featureFlags.ts` to quickly disable new behavior:
- `viewCommitDelayMs`: set to 0 to remove delayed view commits.
- `useCursorRaf`: set to false to avoid cursor RAF batching.

## When using other AI
Ask it to read:
- `AGENTS.md`
- `docs/QA_CHECKLIST.md`
- `docs/SAFETY.md`
- `src/utils/featureFlags.ts`
