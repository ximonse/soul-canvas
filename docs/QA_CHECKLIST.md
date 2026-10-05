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

3) Stable local v1 core flow (use disposable folders, never the live vault)
   - Import a text note, image and multi-page PDF. Create a session and filter by tag.
   - Edit while autosave is writing; the latest edit must survive reload.
   - Save, reload, and compare card contents, positions, session membership and links.
   - Export Backup; restore into a **new empty folder**. Verify images and `assets/originals/`.
   - A malformed/checksum-mismatched backup must fail before creating any files.
   - Test missing AI keys, provider failure, partial embeddings and batch cancel.
   - In a separate test Omnical folder, edit each direction and verify conflict handling.
   - Record actual browser results separately from automated checks.
   - Automated coverage: `workspaceFlow`, `portableBackup`, `saveSnapshot`,
     `embeddings`, `cardFileSync`, `omnicalSync`, and `sharedMarkdownContract` tests.

4) If something feels off
   - Check `src/utils/featureFlags.ts` and toggle flags.
