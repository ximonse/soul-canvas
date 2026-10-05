import type { useBrainStore } from '../store/useBrainStore';

type State = ReturnType<typeof useBrainStore.getState>;

// Compare the immutable store references used by the document serializer.
// Include sync baselines: an Omnical merge must never be acknowledged by
// an earlier save. Transient selection/processing state is intentionally absent.
const persistedKeys = [
  'nodes', 'synapses', 'conversations', 'sessions', 'trails', 'sequences',
  'activeSessionId', 'selectedTrailIds', 'showActiveTrailLine', 'omnical',
  'cardFiles', 'fileHandle',
] as const satisfies readonly (keyof State)[];

export async function writeSaveSnapshot(
  snapshot: State,
  getState: () => State,
  write: () => Promise<void>,
  setPendingSave: (pending: boolean) => void,
): Promise<boolean> {
  await write();
  const current = getState();
  // A completed write to the previous folder cannot acknowledge the new one.
  if (current.fileHandle !== snapshot.fileHandle) return current.pendingSave;
  const pending = persistedKeys.some((key) => current[key] !== snapshot[key]);
  setPendingSave(pending);
  return pending;
}
