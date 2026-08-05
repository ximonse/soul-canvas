export interface PersistenceState {
  pendingSave: boolean;
  documentRevision: number;
  lastSavedRevision: number;
}

export const persistenceInitialState: PersistenceState = {
  pendingSave: false,
  documentRevision: 0,
  lastSavedRevision: 0,
};

export const markDocumentChanged = (state: Pick<PersistenceState, 'documentRevision'>) => ({
  pendingSave: true,
  documentRevision: state.documentRevision + 1,
});
