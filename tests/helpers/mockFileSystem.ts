// Minimal in-memory stand-in for the File System Access API, just enough
// surface for cardFileSync.ts: getDirectoryHandle/getFileHandle(create),
// createWritable().write/close, getFile().text()/size/lastModified,
// removeEntry. Not a full spec implementation.
class MockFile {
  constructor(public text_: string, public lastModified: number) {}
  get size() { return this.text_.length; }
  async text() { return this.text_; }
}

class MockWritable {
  private buffer = '';
  constructor(private onClose: (text: string) => void) {}
  async write(data: string) { this.buffer += data; }
  async close() { this.onClose(this.buffer); }
}

export class MockFileHandle {
  kind = 'file' as const;
  private content: string;
  private modifiedAt: number;
  constructor(content = '', modifiedAt = Date.now()) {
    this.content = content;
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
