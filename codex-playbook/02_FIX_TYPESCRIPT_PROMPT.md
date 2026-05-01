# Fix TypeScript Prompt

You are working in `/workspace/soul-canvas`.

Objective:
Fix TypeScript errors with minimal, targeted code changes while preserving behavior.

Allowed scope (edit only what is needed):
- `src/**/*.ts`
- `src/**/*.tsx`
- `types/**/*.d.ts`
- config files directly related to TypeScript resolution/compilation (`tsconfig*.json`, eslint/biome configs if strictly required)

Required checks:
- Run `npm run sanity` and report result.

Output format:
1. Summary
   - What errors were addressed and the approach used.
2. Changed files
   - File-by-file list with one-line reason per file.
3. Risks
   - Any remaining type uncertainty, TODOs, or edge cases.
