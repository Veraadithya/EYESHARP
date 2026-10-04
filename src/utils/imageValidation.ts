export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
  'image/webp',
];

export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp'];

export interface ImageValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export function validateImageFile(file: File): ImageValidationResult {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  const isMimeSupported = SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType);
  const isExtSupported = SUPPORTED_IMAGE_EXTENSIONS.includes(extension);

  if (isMimeSupported || isExtSupported) {
    return { isValid: true };
  }

  return {
    isValid: false,
    errorMessage: `Unsupported image format: "${file.name}". EYESHARP supports JPG, JPEG, PNG, TIFF, and WEBP.`,
  };
}
