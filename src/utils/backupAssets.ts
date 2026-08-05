export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Kunde inte läsa bilagan.'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mime = header.match(/^data:([^;]+);base64$/)?.[1];
  if (comma < 0 || !mime || !payload) throw new Error('Bilagan har ogiltigt dataformat.');
  const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

export async function collectAssetDataUrls(assets: Record<string, string>): Promise<Record<string, string>> {
  const entries = await Promise.all(Object.entries(assets).map(async ([path, url]) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Kunde inte läsa ${path}.`);
    return [path, await blobToDataUrl(await response.blob())] as const;
  }));
  return Object.fromEntries(entries);
}
