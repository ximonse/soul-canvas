# AI Assistant Notes

Before making changes:
- Read `docs/SAFETY.md` and `docs/QA_CHECKLIST.md`.
- Review active toggles in `src/utils/featureFlags.ts`.
- Touching Markdown parsing, hashing or frontmatter? Read
  `docs/shared-markdown-contract.md` first. `src/utils/omnicalNotes.ts`,
  `src/utils/cardMarkdown.ts` and Omnical's `src/lib/folder-notes.ts` must
  behave alike — both apps write the same `.md` files, and drift between them
  destroys the user's notes. The functions are marked `DELAT MED OMNICAL`.

After changes:
- Run `npm run sanity` and report results.
- Changed anything under the shared Markdown contract? Mirror it in the Omnical
  repo in the same session, including the shared fixture block in
  `tests/sharedMarkdownContract.test.ts`.
