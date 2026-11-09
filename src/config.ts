declare const process: any;

export const CLASSIC_DECODER_URL = 'https://classicdecoder.com/';
export const DEFAULT_API_TIMEOUT_MS = 120_000;

/**
 * Returns the dynamic API timeout in milliseconds.
 * Configurable via process.env.API_TIMEOUT_MS, defaulting to 120s for slow decodes.
 */
export function getApiTimeoutMs(): number {
  return typeof process !== 'undefined' && process.env?.API_TIMEOUT_MS
    ? parseInt(process.env.API_TIMEOUT_MS, 10)
    : DEFAULT_API_TIMEOUT_MS;
}

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


