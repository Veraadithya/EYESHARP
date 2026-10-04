/**
 * dHash (Difference Hash) Perceptual Hashing Implementation
 *
 * Algorithm Steps:
 * 1. Load image into HTMLImageElement / ImageBitmap.
 * 2. Draw onto a 9x8 canvas (72 pixels) scaled in grayscale.
 * 3. Compare left-to-right adjacent pixel brightness (9 pixels wide = 8 comparisons per row x 8 rows = 64 bits).
 * 4. Generate a 64-bit binary string (represented as a 16-character hex string).
 */

export interface PerceptualHashProvider {
  algorithm: string;
  computeFromDataUrl(dataUrl: string): Promise<string>;
  distance(hashA: string, hashB: string): number;
  calculateSimilarity(hashA: string, hashB: string): number;
}

export const dHashProvider: PerceptualHashProvider = {
  algorithm: 'dHash',

  async computeFromDataUrl(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 9;
          canvas.height = 8;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to create 2d canvas context'));
            return;
          }

          // Render image onto 9x8 canvas
          ctx.drawImage(img, 0, 0, 9, 8);
          const imageData = ctx.getImageData(0, 0, 9, 8);
          const pixels = imageData.data;

          // Convert each pixel to grayscale value (0-255)
          const grays: number[][] = [];
          for (let row = 0; row < 8; row++) {
            const rowGrays: number[] = [];
            for (let col = 0; col < 9; col++) {
              const idx = (row * 9 + col) * 4;
              const r = pixels[idx] || 0;
              const g = pixels[idx + 1] || 0;
              const b = pixels[idx + 2] || 0;
              // Luminance formula
              const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
              rowGrays.push(gray);
            }
            grays.push(rowGrays);
          }

          // Build 64-bit binary string comparing adjacent pixels (left vs right)
          let binaryHash = '';
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              const left = grays[row]![col]!;
              const right = grays[row]![col + 1]!;
              binaryHash += left > right ? '1' : '0';
            }
          }

          // Convert 64-bit binary to 16-character hex string
          let hexHash = '';
          for (let i = 0; i < 64; i += 4) {
            const nibble = binaryHash.substring(i, i + 4);
            hexHash += parseInt(nibble, 2).toString(16);
          }

          resolve(hexHash);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    });
  },

  distance(hashA: string, hashB: string): number {
    if (!hashA || !hashB || hashA.length !== hashB.length) return 64;
    let dist = 0;
    // Compare nibbles by nibble in binary
    for (let i = 0; i < hashA.length; i++) {
      const valA = parseInt(hashA[i]!, 16);
      const valB = parseInt(hashB[i]!, 16);
      const xor = valA ^ valB;
      // Count set bits in 4-bit integer
      let bits = xor;
      while (bits > 0) {
        dist += bits & 1;
        bits >>= 1;
      }
    }
    return dist;
  },

  calculateSimilarity(hashA: string, hashB: string): number {
    const dist = this.distance(hashA, hashB);
    // Formula: Similarity % = max(0, (1 - distance / 64) * 100)
    const score = Math.max(0, (1 - dist / 64) * 100);
    return Math.round(score * 10) / 10;
  },
};
