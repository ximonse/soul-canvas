# QA Checklist (30-60s)

Run this after layout/interaction changes or before a push.

1) Sanity script
   - `npm run sanity`

2) Manual smoke checks (canvas)
   - Zoom with wheel: no wobble or jitter.
   - Minimap: visible, correct bounds in "Alla kort".
   - Copy/paste in a session: Ctrl+C -> g+v (copies stay in active session).
   - Week/Eternal views: tags/comments/captions toggles behave.
   - Text clarity: no unintended opacity/blur in cards.

3) If something feels off
   - Check `src/utils/featureFlags.ts` and toggle flags.
