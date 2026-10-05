// Minimal in-memory stand-in for the File System Access API, just enough
// surface for cardFileSync.ts: getDirectoryHandle/getFileHandle(create),
// createWritable().write/close, getFile().text()/size/lastModified,
// removeEntry. Not a full spec implementation.
class MockFile extends Blob {
  constructor(content: Blob, public lastModified: number) {
    super([content], { type: content.type });
  }
}

class MockWritable {
  private buffer: Blob = new Blob();
  constructor(private onClose: (blob: Blob) => void) {}
  async write(data: string | Blob) {
    this.buffer = new Blob([this.buffer, data], { type: typeof data === 'string' ? 'text/plain' : data.type });
  }
  async close() { this.onClose(this.buffer); }
}

export class MockFileHandle {
  kind = 'file' as const;
  private content: Blob;
  private modifiedAt: number;
  constructor(content: string | Blob = '', modifiedAt = Date.now()) {
    this.content = typeof content === 'string' ? new Blob([content], { type: 'text/plain' }) : content;
    this.modifiedAt = modifiedAt;
  }
  async getFile() { return new MockFile(this.content, this.modifiedAt); }
  async createWritable() {
    return new MockWritable((text) => {
      this.content = text;
      this.modifiedAt = Date.now() + Math.floor(Math.random() * 1000) + 1;
    });
  }
}

export class MockDirectoryHandle {
  kind = 'directory' as const;
  files = new Map<string, MockFileHandle>();
  dirs = new Map<string, MockDirectoryHandle>();

  async getFileHandle(name: string, opts?: { create?: boolean }) {
    const existing = this.files.get(name);
    if (existing) return existing;
    if (!opts?.create) throw new DOMException('not found', 'NotFoundError');
    const created = new MockFileHandle();
    this.files.set(name, created);
    return created;
  }

  async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
    const existing = this.dirs.get(name);
    if (existing) return existing;
    if (!opts?.create) throw new DOMException('not found', 'NotFoundError');
    const created = new MockDirectoryHandle();
    this.dirs.set(name, created);
    return created;
  }

  async removeEntry(name: string) {
    this.files.delete(name);
  }

  async *entries(): AsyncGenerator<[string, MockFileHandle | MockDirectoryHandle]> {
    for (const [name, handle] of this.files) yield [name, handle];
    for (const [name, handle] of this.dirs) yield [name, handle];
  }
}
