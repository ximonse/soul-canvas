import { del as delDb, get as getDb, set as setDb } from 'idb-keyval';
import { useBrainStore } from '../store/useBrainStore';
import type { MindNode, OmnicalConflict, PendingOmnicalFile, Session } from '../types/types';
import {
  bodyHash,
  fingerprintForPending,
  metaHash,
  normalizeTags,
  parseOmnicalMarkdown,
  planSharedMerge,
  tagsHash,
  writeSharedMarkdown,
  type OmnicalMarkdownNote,
  type OmnicalMeta,
} from './omnicalNotes';

function metaOf(note: Pick<MindNode, 'done' | 'archived' | 'area' | 'remindAt'>): OmnicalMeta {
  return {
    done: note.done ?? false,
    archived: note.archived ?? false,
    area: note.area ?? '',
    remindAt: note.remindAt ?? '',
  };
}

const HANDLE_KEY = 'soul-omnical-folder-handle';
const OMNICAL_SESSION_ID = 'soul-omnical-shared-session';
const IGNORED_FOLDERS = new Set(['.git', '.omnical-duplicates', '.omnical-import-backups', '.revisions', 'revisions']);
const SYNC_REQUEST_EVENT = 'soul-canvas:omnical-sync-request';

let activeHandle: FileSystemDirectoryHandle | null = null;
let syncInFlight: Promise<void> | null = null;

interface ScanResult {
  notes: Map<string, OmnicalMarkdownNote>;
  notesByPath: Map<string, OmnicalMarkdownNote>;
  rawPaths: Set<string>;
  errors: string[];
}

async function ensurePermission(handle: FileSystemDirectoryHandle, request: boolean) {
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  if (permission === 'granted') return true;
  return request && await handle.requestPermission({ mode: 'readwrite' }) === 'granted';
}

async function readMarkdownFiles(directory: FileSystemDirectoryHandle, prefix = ''): Promise<Array<{ path: string; source: string }>> {
  const files: Array<{ path: string; source: string }> = [];
  for await (const [name, handle] of directory.entries()) {
    if (handle.kind === 'directory') {
      if (IGNORED_FOLDERS.has(name)) continue;
      files.push(...await readMarkdownFiles(handle, prefix + name + '/'));
    } else if (name.endsWith('.md')) {
      files.push({ path: prefix + name, source: await (await handle.getFile()).text() });
    }
  }
  return files;
}

async function scanFolder(handle: FileSystemDirectoryHandle): Promise<ScanResult> {
  const parsed: OmnicalMarkdownNote[] = [];
  const rawPaths = new Set<string>();
  const errors: string[] = [];
  for (const file of await readMarkdownFiles(handle)) {
    const note = parseOmnicalMarkdown(file.source, file.path);
    if (note) parsed.push(note);
    else {
      rawPaths.add(file.path);
      if (file.source.includes('omnicalId:')) errors.push('Trasig Omnical-Markdown: ' + file.path);
    }
  }

  const groups = new Map<string, OmnicalMarkdownNote[]>();
  for (const note of parsed) groups.set(note.id, [...(groups.get(note.id) ?? []), note]);
  const notes = new Map<string, OmnicalMarkdownNote>();
  const notesByPath = new Map<string, OmnicalMarkdownNote>();
  for (const [id, copies] of groups) {
    if (copies.length > 1) {
      errors.push('Dubbelt omnicalId ' + id + ': ' + copies.map((copy) => copy.path).join(', '));
      continue;
    }
    notes.set(id, copies[0]);
    notesByPath.set(copies[0].path, copies[0]);
  }
  return { notes, notesByPath, rawPaths, errors };
}

async function directoryForPath(root: FileSystemDirectoryHandle, parts: string[]) {
  let directory = root;
  for (const part of parts) directory = await directory.getDirectoryHandle(part);
  return directory;
}

async function writeRelative(root: FileSystemDirectoryHandle, path: string, value: string) {
  const parts = path.split('/');
  const filename = parts.pop();
  if (!filename) throw new Error('Ogiltig filsökväg.');
  const directory = await directoryForPath(root, parts);
  const file = await directory.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  await writable.write(value);
  await writable.close();
}

async function rootFilenameAvailable(root: FileSystemDirectoryHandle, preferred: string) {
  const stem = preferred.replace(/\.md$/i, '');
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const name = stem + (suffix ? '-' + suffix : '') + '.md';
    try {
      await root.getFileHandle(name);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') return name;
      throw error;
    }
  }
  throw new Error('Kunde inte skapa ett unikt Markdown-filnamn.');
}

function ensureOmnicalSession(sessions: Session[]) {
  const existing = sessions.find((session) => session.id === OMNICAL_SESSION_ID);
  if (existing) return { sessions, session: existing };
  const now = Date.now();
  const session: Session = {
    id: OMNICAL_SESSION_ID,
    name: 'Omnical',
    cardIds: [],
    viewState: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    lastOpened: now,
  };
  return { sessions: [...sessions, session], session };
}

function linkedNodeByOmnicalId(nodes: Map<string, MindNode>) {
  const groups = new Map<string, MindNode[]>();
  for (const node of nodes.values()) {
    const id = node.omnicalLink?.omnicalId;
    if (id) groups.set(id, [...(groups.get(id) ?? []), node]);
  }
  return groups;
}

async function publishShareRequests(handle: FileSystemDirectoryHandle, nodes: Map<string, MindNode>, pendingFiles: PendingOmnicalFile[]) {
  const nextPending = [...pendingFiles];
  for (const node of nodes.values()) {
    if (node.omnicalLink?.status !== 'share-requested') continue;
    const filename = await rootFilenameAvailable(handle, 'soul-' + Date.now() + '-' + node.id.slice(0, 8) + '.md');
    await writeRelative(handle, filename, node.content);
    const pending: PendingOmnicalFile = {
      nodeId: node.id,
      path: filename,
      fingerprint: fingerprintForPending(node.content),
      bodyHash: bodyHash(node.content),
      tagsHash: tagsHash(normalizeTags(node.tags, node.content)),
      createdAt: new Date().toISOString(),
    };
    nextPending.push(pending);
    nodes.set(node.id, {
      ...node,
      omnicalLink: {
        status: 'pending',
        path: filename,
        bodyHash: pending.bodyHash,
        tagsHash: pending.tagsHash,
      },
    });
  }
  return nextPending;
}

function adoptionCandidate(pending: PendingOmnicalFile, scan: ScanResult, linkedIds: Set<string>) {
  const byPath = scan.notesByPath.get(pending.path);
  if (byPath && !linkedIds.has(byPath.id)) return byPath;
  const candidates = [...scan.notes.values()].filter((note) => (
    !linkedIds.has(note.id) && bodyHash(note.body) === pending.fingerprint
  ));
  return candidates.length === 1 ? candidates[0] : null;
}

export function requestOmnicalSync() {
  window.dispatchEvent(new Event(SYNC_REQUEST_EVENT));
}

export async function connectOmnicalFolder() {
  if (!('showDirectoryPicker' in window)) {
    useBrainStore.getState().addNotification('Omnical-koppling kräver Chrome eller Edge på dator.', 'error');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    if (!await ensurePermission(handle, true)) return;
    const scan = await scanFolder(handle);
    if (!window.confirm('Canvas hittade ' + scan.notes.size + ' Omnical-anteckningar. Anslut och importera dem?')) return;
    activeHandle = handle;
    await setDb(HANDLE_KEY, handle);
    useBrainStore.setState({ omnicalSyncStatus: 'idle', omnicalSyncMessage: 'Omnical-mappen är ansluten.' });
    await syncOmnicalNotes();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    const message = error instanceof Error ? error.message : String(error);
    useBrainStore.setState({ omnicalSyncStatus: 'error', omnicalSyncMessage: message });
  }
}

export async function disconnectOmnicalFolder() {
  activeHandle = null;
  await delDb(HANDLE_KEY);
  useBrainStore.setState({ omnicalSyncStatus: 'disconnected', omnicalSyncMessage: null });
}

export async function restoreOmnicalFolder() {
  try {
    const handle = await getDb<FileSystemDirectoryHandle>(HANDLE_KEY);
    if (!handle || !await ensurePermission(handle, false)) {
      useBrainStore.setState({ omnicalSyncStatus: 'disconnected' });
      return;
    }
    activeHandle = handle;
    useBrainStore.setState({ omnicalSyncStatus: 'idle', omnicalSyncMessage: 'Omnical-mappen är ansluten.' });
    await syncOmnicalNotes();
  } catch {
    useBrainStore.setState({ omnicalSyncStatus: 'disconnected' });
  }
}

async function runSync() {
  if (!activeHandle) {
    useBrainStore.setState({ omnicalSyncStatus: 'disconnected', omnicalSyncMessage: 'Ingen Omnical-mapp är ansluten.' });
    return;
  }
  if (!await ensurePermission(activeHandle, false)) {
    useBrainStore.setState({ omnicalSyncStatus: 'disconnected', omnicalSyncMessage: 'Omnical-mappen behöver anslutas igen.' });
    return;
  }

  useBrainStore.setState({ omnicalSyncStatus: 'syncing', omnicalSyncMessage: 'Synkar Omnical…' });
  const state = useBrainStore.getState();
  const nodes = new Map(state.nodes);
  let sessions = state.sessions.map((session) => ({ ...session, cardIds: [...session.cardIds] }));
  const errors: string[] = [];

  let pendingFiles = await publishShareRequests(activeHandle, nodes, state.omnical.pendingFiles);
  const scan = await scanFolder(activeHandle);
  errors.push(...scan.errors);

  const linkedIds = new Set([...nodes.values()].flatMap((node) => node.omnicalLink?.omnicalId ? [node.omnicalLink.omnicalId] : []));
  const remainingPending: PendingOmnicalFile[] = [];
  for (const pending of pendingFiles) {
    const node = nodes.get(pending.nodeId);
    if (!node) continue;
    const adopted = adoptionCandidate(pending, scan, linkedIds);
    if (!adopted) {
      remainingPending.push(pending);
      continue;
    }
    linkedIds.add(adopted.id);
    nodes.set(node.id, {
      ...node,
      // Keep Soul's shared fields so explicit tags/meta can flow into the
      // newly adopted Omnical file during the same three-way sync.
      omnicalLink: {
        omnicalId: adopted.id,
        path: adopted.path,
        status: 'linked',
        bodyHash: bodyHash(adopted.body),
        tagsHash: tagsHash(adopted.tags),
        metaHash: metaHash(metaOf(adopted)),
      },
    });
  }
  pendingFiles = remainingPending;

  const conflicts: OmnicalConflict[] = [];
  const localGroups = linkedNodeByOmnicalId(nodes);
  for (const [omnicalId, localCopies] of localGroups) {
    if (localCopies.length > 1) {
      errors.push('Flera Soul-kort är kopplade till omnicalId ' + omnicalId + '.');
      continue;
    }
    const node = localCopies[0];
    const link = node.omnicalLink;
    if (!link) continue;
    const remote = scan.notes.get(omnicalId);
    if (!remote) {
      nodes.set(node.id, { ...node, omnicalLink: { ...link, status: 'detached' } });
      continue;
    }

    const plan = planSharedMerge(node, link, remote);
    if (plan.conflictFields.length > 0) {
      conflicts.push({
        id: omnicalId + ':' + node.id,
        nodeId: node.id,
        omnicalId,
        path: remote.path,
        fields: plan.conflictFields,
        remoteBody: remote.body,
        remoteTags: remote.tags,
      });
      continue;
    }

    if (plan.writeBody || plan.writeTags || plan.writeMeta) {
      try {
        const source = writeSharedMarkdown(remote, plan.body, plan.tags, plan.meta);
        await writeRelative(activeHandle, remote.path, source);
        const parsed = parseOmnicalMarkdown(source, remote.path);
        if (parsed) scan.notes.set(omnicalId, parsed);
      } catch (error) {
        errors.push('Kunde inte skriva ' + remote.path + ': ' + (error instanceof Error ? error.message : String(error)));
        continue;
      }
    }
    const metaChanged = metaHash(metaOf(node)) !== metaHash(plan.meta);
    nodes.set(node.id, {
      ...node,
      content: plan.body,
      tags: plan.tags,
      done: plan.meta.done,
      archived: plan.meta.archived,
      area: plan.meta.area || undefined,
      remindAt: plan.meta.remindAt || undefined,
      updatedAt: node.content !== plan.body || tagsHash(node.tags) !== tagsHash(plan.tags) || metaChanged
        ? new Date().toISOString()
        : node.updatedAt,
      omnicalLink: {
        omnicalId,
        path: remote.path,
        status: 'linked',
        bodyHash: bodyHash(plan.body),
        tagsHash: tagsHash(plan.tags),
        metaHash: metaHash(plan.meta),
      },
    });
  }

  const ignored = new Set(state.omnical.ignoredNoteIds);
  const existingLinkedIds = new Set([...nodes.values()].flatMap((node) => node.omnicalLink?.omnicalId ? [node.omnicalLink.omnicalId] : []));
  const sessionResult = ensureOmnicalSession(sessions);
  sessions = sessionResult.sessions;
  const omnicalCardIds = new Set(sessionResult.session.cardIds);
  for (const node of nodes.values()) {
    if (node.omnicalLink?.omnicalId) omnicalCardIds.add(node.id);
  }
  let gridIndex = omnicalCardIds.size;

  for (const note of scan.notes.values()) {
    if (ignored.has(note.id) || existingLinkedIds.has(note.id)) continue;
    const id = crypto.randomUUID();
    const firstLine = note.body.split(/\r?\n/, 1)[0].replace(/^\s*#+\s*/, '').trim();
    const node: MindNode = {
      id,
      content: note.body,
      title: firstLine || undefined,
      x: (gridIndex % 4) * 340,
      y: Math.floor(gridIndex / 4) * 240,
      z: 0,
      tags: note.tags,
      type: 'text',
      createdAt: new Date().toISOString(),
      done: note.done,
      archived: note.archived,
      area: note.area || undefined,
      remindAt: note.remindAt || undefined,
      omnicalLink: {
        omnicalId: note.id,
        path: note.path,
        status: 'linked',
        bodyHash: bodyHash(note.body),
        tagsHash: tagsHash(note.tags),
        metaHash: metaHash(metaOf(note)),
      },
    };
    gridIndex += 1;
    nodes.set(id, node);
    omnicalCardIds.add(id);
    existingLinkedIds.add(note.id);
  }

  sessions = sessions.map((session) => session.id === OMNICAL_SESSION_ID
    ? { ...session, cardIds: [...omnicalCardIds] }
    : session);

  useBrainStore.setState({
    nodes,
    sessions,
    omnical: { pendingFiles, ignoredNoteIds: [...ignored] },
    omnicalConflicts: conflicts,
    omnicalSyncStatus: errors.length ? 'error' : 'synced',
    omnicalSyncMessage: errors.length
      ? errors.join(' ')
      : 'Omnical synkad: ' + existingLinkedIds.size + ' länkade, ' + pendingFiles.length + ' väntar.',
    pendingSave: true,
  });
}

export function syncOmnicalNotes() {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

export async function resolveOmnicalConflict(conflictId: string, resolution: 'omnical' | 'soul' | 'both') {
  if (!activeHandle) return;
  const state = useBrainStore.getState();
  const conflict = state.omnicalConflicts.find((item) => item.id === conflictId);
  const node = conflict ? state.nodes.get(conflict.nodeId) : null;
  if (!conflict || !node) return;
  const scan = await scanFolder(activeHandle);
  const remote = scan.notes.get(conflict.omnicalId);
  if (!remote) {
    useBrainStore.setState({ omnicalSyncStatus: 'error', omnicalSyncMessage: 'Omnical-filen saknas nu.' });
    return;
  }

  const nodes = new Map(state.nodes);
  let sessions = state.sessions;
  if (resolution === 'soul') {
    const soulMeta = metaOf(node);
    const source = writeSharedMarkdown(remote, node.content, normalizeTags(node.tags, node.content), soulMeta);
    await writeRelative(activeHandle, remote.path, source);
    nodes.set(node.id, {
      ...node,
      omnicalLink: {
        omnicalId: remote.id,
        path: remote.path,
        status: 'linked',
        bodyHash: bodyHash(node.content),
        tagsHash: tagsHash(normalizeTags(node.tags, node.content)),
        metaHash: metaHash(soulMeta),
      },
    });
  } else {
    if (resolution === 'both') {
      const copyId = crypto.randomUUID();
      nodes.set(copyId, {
        ...node,
        id: copyId,
        x: node.x + 40,
        y: node.y + 40,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        copyRef: node.id,
        omnicalLink: undefined,
      });
      sessions = sessions.map((session) => session.id === OMNICAL_SESSION_ID
        ? session
        : session.cardIds.includes(node.id)
          ? { ...session, cardIds: [...session.cardIds, copyId] }
          : session);
    }
    const remoteMeta = metaOf(remote);
    nodes.set(node.id, {
      ...node,
      content: remote.body,
      tags: remote.tags,
      done: remoteMeta.done,
      archived: remoteMeta.archived,
      area: remoteMeta.area || undefined,
      remindAt: remoteMeta.remindAt || undefined,
      updatedAt: new Date().toISOString(),
      omnicalLink: {
        omnicalId: remote.id,
        path: remote.path,
        status: 'linked',
        bodyHash: bodyHash(remote.body),
        tagsHash: tagsHash(remote.tags),
        metaHash: metaHash(remoteMeta),
      },
    });
  }

  useBrainStore.setState({
    nodes,
    sessions,
    omnicalConflicts: state.omnicalConflicts.filter((item) => item.id !== conflictId),
    omnicalSyncStatus: 'synced',
    omnicalSyncMessage: 'Konflikten är löst.',
    pendingSave: true,
  });
}

export function registerOmnicalSyncListeners() {
  let timer: number | undefined;
  const syncSoon = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void syncOmnicalNotes(), 250);
  };
  window.addEventListener(SYNC_REQUEST_EVENT, syncSoon);
  window.addEventListener('focus', syncSoon);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener(SYNC_REQUEST_EVENT, syncSoon);
    window.removeEventListener('focus', syncSoon);
  };
}
