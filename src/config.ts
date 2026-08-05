export const CLASSIC_DECODER_URL = 'https://classicdecoder.com/';

/**
 * Returns the base Classic Decoder URL.
 * Can be extended in the future to support environment-based configurations.
 */
export function getDecoderUrl(): string {
  return CLASSIC_DECODER_URL;
}

/**
 * Generates the preview URL with a dynamic VIN.
 * Uses the centralized base URL from getDecoderUrl().
 */
export function getPreviewUrl(vin: string, wpPage: string = 'homepage', type: string = 'vhr'): string {
  const baseUrl = getDecoderUrl().replace(/\/$/, '');
  return `${baseUrl}/preview?vin=${encodeURIComponent(vin)}&wpPage=${encodeURIComponent(wpPage)}&type=${encodeURIComponent(type)}`;
}


