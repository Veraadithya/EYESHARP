import type { ImageForensicIndicator } from '../types';

export interface VisualAnalysisResult {
  engineName: string;
  isModelLoaded: boolean;
  statusMessage: string;
  indicators: Array<{
    category: string;
    title: string;
    description: string;
    confidence?: number;
    evidence?: Record<string, unknown>;
  }>;
}

/**
 * Modular abstraction service for Computer Vision (CV) visual indicator analysis.
 * Designed to integrate with real computer-vision models (e.g. TensorFlow.js, ONNX WebGL, PyTorch Web Workers).
 * If no CV model is active, it returns a clean readiness interface state without generating fake AI results.
 */
export class VisualAnalysisService {
  static async analyzeVisualContent(
    _imageDataUrl: string,
    _imageId: string
  ): Promise<VisualAnalysisResult> {
    // Simulated async model inference pass
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      engineName: 'EYESHARP Visual Analysis Abstraction (WebGL Ready)',
      isModelLoaded: false,
      statusMessage: 'Advanced computer-vision visual model unavailable. Engine ready for model weights.',
      indicators: [],
    };
  }

  /**
   * Helper to convert raw visual detection outputs into standard neutral forensic indicators.
   */
  static formatVisualIndicator(
    caseId: string,
    imageArtifactId: string,
    evidenceId: string,
    category: string,
    title: string,
    description: string,
    confidence?: number,
    evidenceDetails?: Record<string, unknown>
  ): ImageForensicIndicator {
    return {
      id: `ind-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caseId,
      imageArtifactId,
      evidenceId,
      severity: 'REVIEW',
      code: category.toUpperCase().replace(/[^A_Z0-9]/g, '_'),
      category,
      source: 'Visual analysis',
      title,
      description,
      confidence,
      evidence: evidenceDetails,
      createdAt: new Date().toISOString(),
    };
  }
}
