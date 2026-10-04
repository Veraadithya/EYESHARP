import exifr from 'exifr';
import { ImageArtifactRepository } from './imageArtifactRepository';
import { EvidenceRepository, AuditLogRepository } from './repositories';
import { validateImageFile } from '../utils/imageValidation';
import { generateThumbnail, getImageDimensions } from '../utils/thumbnailGenerator';
import type { ImageArtifact, ImageExifMetadata, ImageGpsMetadata } from '../types';

export function calculateSHA256WithWorker(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const worker = new Worker(new URL('../workers/imageHash.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (event: MessageEvent<{ sha256?: string; error?: string }>) => {
        worker.terminate();
        if (event.data.sha256) {
          resolve(event.data.sha256);
        } else {
          reject(new Error(event.data.error || 'Worker failed to calculate SHA-256 hash'));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      worker.postMessage({ arrayBuffer });
    };

    reader.onerror = () => reject(new Error(`Failed to read file for hashing: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

export class ImageAnalysisService {
  static async processImageEvidence(file: File, caseId: string): Promise<ImageArtifact> {
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errorMessage || 'Invalid image file');
    }

    const evidenceId = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const artifactId = `img-art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Create base EvidenceItem
    await EvidenceRepository.create({
      id: evidenceId,
      caseId,
      filename: file.name,
      type: file.type || 'image/jpeg',
      size: file.size,
      importedAt: new Date().toISOString(),
      source: 'Local Image Evidence Import',
      analysisStatus: 'ANALYZING',
      bookmarked: false,
    });

    await AuditLogRepository.log({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caseId,
      action: 'IMAGE_IMPORTED',
      description: `Image evidence "${file.name}" imported into case ${caseId}.`,
      entityType: 'EVIDENCE',
      entityId: evidenceId,
      timestamp: new Date().toISOString(),
    });

    // Create initial ImageArtifact shell
    const imageArtifact: ImageArtifact = {
      id: artifactId,
      evidenceId,
      caseId,
      filename: file.name,
      mimeType: file.type || 'image/jpeg',
      fileSize: file.size,
      createdAt: new Date().toISOString(),
      analysisStatus: 'ANALYZING',
      bookmarked: false,
    };

    await ImageArtifactRepository.create(imageArtifact);

    try {
      // 1. Calculate SHA-256 via Web Worker
      const sha256 = await calculateSHA256WithWorker(file);
      await EvidenceRepository.update(evidenceId, { hash: sha256 });

      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId,
        action: 'IMAGE_HASH_CALCULATED',
        description: `SHA-256 calculated for "${file.name}": ${sha256.substring(0, 12)}...`,
        entityType: 'IMAGE_ARTIFACT',
        entityId: artifactId,
        timestamp: new Date().toISOString(),
      });

      // 2. Extract dimensions & generate thumbnail
      let dimensions = { width: undefined as number | undefined, height: undefined as number | undefined, aspectRatio: undefined as number | undefined };
      let thumbnail: string | undefined;

      try {
        const dims = await getImageDimensions(file);
        dimensions = { width: dims.width, height: dims.height, aspectRatio: dims.aspectRatio };
        thumbnail = await generateThumbnail(file, 400);
      } catch (e) {
        console.warn('Thumbnail generation warning:', e);
      }

      // 3. Extract EXIF & GPS metadata via exifr
      let exifData: ImageExifMetadata | undefined;
      let gpsData: ImageGpsMetadata | undefined;

      try {
        const rawExif = await exifr.parse(file, {
          pick: [
            'Make',
            'Model',
            'LensModel',
            'DateTimeOriginal',
            'ExposureTime',
            'FNumber',
            'ISO',
            'FocalLength',
            'Software',
            'Orientation',
            'latitude',
            'longitude',
            'altitude',
          ],
          gps: true,
        });

        if (rawExif) {
          if (
            rawExif.Make ||
            rawExif.Model ||
            rawExif.LensModel ||
            rawExif.DateTimeOriginal ||
            rawExif.ExposureTime ||
            rawExif.FNumber ||
            rawExif.ISO ||
            rawExif.FocalLength ||
            rawExif.Software ||
            rawExif.Orientation
          ) {
            exifData = {
              make: rawExif.Make ? String(rawExif.Make).trim() : undefined,
              model: rawExif.Model ? String(rawExif.Model).trim() : undefined,
              lensModel: rawExif.LensModel ? String(rawExif.LensModel).trim() : undefined,
              dateTimeOriginal: rawExif.DateTimeOriginal
                ? new Date(rawExif.DateTimeOriginal).toISOString()
                : undefined,
              exposureTime: rawExif.ExposureTime ? `${rawExif.ExposureTime}s` : undefined,
              fNumber: rawExif.FNumber ? Number(rawExif.FNumber) : undefined,
              iso: rawExif.ISO ? Number(rawExif.ISO) : undefined,
              focalLength: rawExif.FocalLength ? Number(rawExif.FocalLength) : undefined,
              software: rawExif.Software ? String(rawExif.Software).trim() : undefined,
              orientation: rawExif.Orientation ? Number(rawExif.Orientation) : undefined,
            };
          }

          if (rawExif.latitude !== undefined && rawExif.longitude !== undefined) {
            gpsData = {
              latitude: Number(rawExif.latitude),
              longitude: Number(rawExif.longitude),
              altitude: rawExif.altitude !== undefined ? Number(rawExif.altitude) : undefined,
            };
          }
        }
      } catch (exifErr) {
        console.warn('EXIF parsing warning:', exifErr);
      }

      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId,
        action: 'IMAGE_METADATA_EXTRACTED',
        description: `EXIF/GPS metadata extraction completed for "${file.name}".`,
        entityType: 'IMAGE_ARTIFACT',
        entityId: artifactId,
        timestamp: new Date().toISOString(),
      });

      // Update final ImageArtifact record
      const updatedArtifact: ImageArtifact = {
        ...imageArtifact,
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: dimensions.aspectRatio,
        sha256,
        thumbnail,
        exif: exifData,
        gps: gpsData,
        analyzedAt: new Date().toISOString(),
        analysisStatus: 'COMPLETED',
        analysisVersion: 'v3.0-advanced',
      };

      // Calculate dHash perceptual hash if thumbnail is available
      if (thumbnail) {
        try {
          const { dHashProvider } = await import('../utils/perceptualHash');
          updatedArtifact.dhash = await dHashProvider.computeFromDataUrl(thumbnail);
        } catch (dhErr) {
          console.warn('dHash calculation warning:', dhErr);
        }
      }

      await ImageArtifactRepository.update(artifactId, updatedArtifact);
      await EvidenceRepository.update(evidenceId, { analysisStatus: 'COMPLETED' });

      // Generate neutral forensic indicators
      try {
        const { ImageIndicatorService } = await import('./imageIndicatorService');
        await ImageIndicatorService.generateIndicators(updatedArtifact);
      } catch (indErr) {
        console.warn('Indicator generation warning:', indErr);
      }

      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId,
        action: 'IMAGE_ANALYSIS_COMPLETED',
        description: `Image analysis completed successfully for "${file.name}".`,
        entityType: 'IMAGE_ARTIFACT',
        entityId: artifactId,
        timestamp: new Date().toISOString(),
      });

      return updatedArtifact;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Image analysis failed';

      await ImageArtifactRepository.update(artifactId, { analysisStatus: 'FAILED' });
      await EvidenceRepository.update(evidenceId, { analysisStatus: 'FAILED' });

      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId,
        action: 'IMAGE_ANALYSIS_FAILED',
        description: `Image analysis failed for "${file.name}": ${errorMessage}`,
        entityType: 'IMAGE_ARTIFACT',
        entityId: artifactId,
        timestamp: new Date().toISOString(),
      });

      throw err;
    }
  }
}
