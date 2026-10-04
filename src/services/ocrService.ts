import { createWorker } from 'tesseract.js';
import { ImageOcrRepository } from './advancedImageRepositories';
import { AuditLogRepository } from './repositories';
import type { ImageOcrResult } from '../types';

/**
 * Preprocesses an image DataURL for improved OCR accuracy.
 * Steps:
 *  1. Draw onto a canvas at 2x upscale (improves small text)
 *  2. Convert to greyscale
 *  3. Apply contrast boost
 *  4. Apply adaptive local threshold (binarization) to handle
 *     colored ink (red, blue, etc.) and handwritten script
 * Returns a new DataURL of the preprocessed image.
 */
async function preprocessImageForOcr(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Scale factor: 2x helps Tesseract on small / handwritten text
      const SCALE = 2;
      const W = img.naturalWidth * SCALE;
      const H = img.naturalHeight * SCALE;

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }

      // ── Step 1: Draw upscaled ────────────────────────────────
      ctx.drawImage(img, 0, 0, W, H);

      const imageData = ctx.getImageData(0, 0, W, H);
      const d = imageData.data;

      // ── Step 2: Greyscale ────────────────────────────────────
      // Use luminance weights.  For coloured ink (esp. red) we
      // boost the red channel slightly so it reads as *dark* text
      // rather than being washed out.
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        // Weighted luminance – red boosted to capture red ink
        const luma = 0.2126 * r + 0.5152 * g + 0.0722 * b;
        d[i] = d[i + 1] = d[i + 2] = luma;
      }

      // ── Step 3: Contrast stretch ─────────────────────────────
      let min = 255, max = 0;
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const range = max - min || 1;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.round(((d[i] - min) / range) * 255);
        d[i] = d[i + 1] = d[i + 2] = v;
      }

      // ── Step 4: Adaptive (Sauvola-like) threshold ───────────
      // For each pixel decide black (text) or white (background)
      // using the local neighbourhood mean, which handles
      // uneven lighting and handwritten strokes better than a
      // global threshold.
      const BLOCK = 31;                // neighbourhood half-size
      const K = 0.2;                  // sensitivity (0–0.5)
      const R = 128;                  // dynamic range of std-dev

      // Build integral image for fast local mean
      const integral = new Float64Array(W * H);
      const integralSq = new Float64Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const v = d[(y * W + x) * 4];
          const idx = y * W + x;
          const top   = y > 0 ? integral[idx - W] : 0;
          const left  = x > 0 ? integral[idx - 1] : 0;
          const topLeft = (y > 0 && x > 0) ? integral[idx - W - 1] : 0;
          integral[idx]   = v + top + left - topLeft;
          const topSq   = y > 0 ? integralSq[idx - W] : 0;
          const leftSq  = x > 0 ? integralSq[idx - 1] : 0;
          const topLeftSq = (y > 0 && x > 0) ? integralSq[idx - W - 1] : 0;
          integralSq[idx] = v * v + topSq + leftSq - topLeftSq;
        }
      }

      const half = Math.floor(BLOCK / 2);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const x1 = Math.max(0, x - half);
          const y1 = Math.max(0, y - half);
          const x2 = Math.min(W - 1, x + half);
          const y2 = Math.min(H - 1, y + half);
          const count = (x2 - x1 + 1) * (y2 - y1 + 1);

          const idx11 = y1 * W + x1;
          const idx12 = y1 * W + x2;
          const idx21 = y2 * W + x1;
          const idx22 = y2 * W + x2;

          const sum =
            integral[idx22] - integral[idx12] -
            integral[idx21] + integral[idx11];
          const sumSq =
            integralSq[idx22] - integralSq[idx12] -
            integralSq[idx21] + integralSq[idx11];

          const mean = sum / count;
          const variance = Math.max(0, sumSq / count - mean * mean);
          const stdDev = Math.sqrt(variance);
          const threshold = mean * (1 + K * (stdDev / R - 1));

          const pi = (y * W + x) * 4;
          const v = d[pi] < threshold ? 0 : 255;
          d[pi] = d[pi + 1] = d[pi + 2] = v;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original on error
    img.src = dataUrl;
  });
}

export const OcrService = {
  /**
   * Runs local Tesseract OCR on image data URL.
   * Applies preprocessing (greyscale, contrast boost, adaptive threshold)
   * to improve accuracy on handwritten and coloured-ink text.
   */
  async runOcr(
    imageId: string,
    caseId: string,
    imageDataUrl: string
  ): Promise<ImageOcrResult> {
    const timestamp = new Date().toISOString();

    await AuditLogRepository.log({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caseId,
      action: 'IMAGE_OCR_STARTED',
      description: `Started local Tesseract.js OCR text extraction for image ${imageId}.`,
      entityType: 'IMAGE_ARTIFACT',
      entityId: imageId,
      timestamp,
    });

    // Preprocess image for better OCR on handwritten / coloured text
    let processedDataUrl: string;
    try {
      processedDataUrl = await preprocessImageForOcr(imageDataUrl);
    } catch {
      processedDataUrl = imageDataUrl; // fallback to raw if preprocessing fails
    }

    const worker = await createWorker('eng');
    try {
      // Try preprocessed image first
      let ret = await worker.recognize(processedDataUrl);
      let text = ret.data.text.trim();
      let confidence = Math.round(ret.data.confidence);

      // If preprocessed gave poor result, also try original and merge
      if (confidence < 30 && processedDataUrl !== imageDataUrl) {
        const retRaw = await worker.recognize(imageDataUrl);
        const rawText = retRaw.data.text.trim();
        const rawConf = Math.round(retRaw.data.confidence);
        // Pick the better result
        if (rawConf > confidence && rawText.length > 0) {
          text = rawText;
          confidence = rawConf;
        } else if (rawText.length > text.length) {
          // Combine both if different content detected
          const combined = [text, rawText]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          text = combined;
        }
      }

      await worker.terminate();

      const result: ImageOcrResult = {
        id: `ocr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId,
        imageArtifactId: imageId,
        text,
        confidence,
        engine: 'Tesseract.js (Local Browser)',
        analyzedAt: new Date().toISOString(),
      };

      await ImageOcrRepository.saveResult(result);

      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId,
        action: 'IMAGE_OCR_COMPLETED',
        description: `Completed OCR text extraction for image ${imageId}. Extracted ${text.length} characters (Confidence: ${confidence}%).`,
        entityType: 'IMAGE_OCR_RESULT',
        entityId: result.id,
        timestamp: result.analyzedAt,
      });

      return result;
    } catch (error) {
      await worker.terminate();
      throw error;
    }
  },
};
