export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)));
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(parts.join(''))}`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mime = header.match(/^data:([^;]+);base64$/)?.[1];
  if (comma < 0 || !mime || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload)) {
    throw new Error('Bilagan har ogiltigt dataformat.');
  }
  const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

// Originals/nested files are absent from the render cache, but belong in backups.
export async function collectDirectoryAssetDataUrls(directory: FileSystemDirectoryHandle): Promise<Record<string, string>> {
  const assets: Record<string, string> = {};
  let root: FileSystemDirectoryHandle;
  try {
    root = await directory.getDirectoryHandle('assets');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return assets;
    throw error;
  }
  async function visit(dir: FileSystemDirectoryHandle, prefix: string) {
    for await (const [name, handle] of dir.entries()) {
      const path = `${prefix}/${name}`;
      if (handle.kind === 'directory') await visit(handle, path);
      else assets[path] = await blobToDataUrl(await handle.getFile());
    }
  }
  await visit(root, 'assets');
  return assets;
}

export async function collectAssetDataUrls(assets: Record<string, string>): Promise<Record<string, string>> {
  const entries = await Promise.all(Object.entries(assets).map(async ([path, url]) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Kunde inte läsa ${path}.`);
    return [path, await blobToDataUrl(await response.blob())] as const;
  }));
  return Object.fromEntries(entries);
}
