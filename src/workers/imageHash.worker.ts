// Web Worker for multi-threaded non-blocking SHA-256 hash calculation

self.onmessage = async (event: MessageEvent<{ arrayBuffer: ArrayBuffer }>) => {
  try {
    const { arrayBuffer } = event.data;
    if (!arrayBuffer) {
      self.postMessage({ error: 'No ArrayBuffer provided for hashing' });
      return;
    }

    const hashBuffer = await self.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    self.postMessage({ sha256 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown hashing worker error';
    self.postMessage({ error: errorMessage });
  }
};
