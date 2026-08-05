import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { Response } from '@playwright/test';

/**
 * Task: CaptureDecodeApiResponse
 * Listens for and captures the '/api/classic/decode' JSON API response
 * with a condition-based timeout.
 */
export class CaptureDecodeApiResponse implements Task {
  private capturedJson: any = null;

  constructor(private readonly timeoutMs: number = 120_000) {}

  static withTimeout(timeoutMs: number = 120_000): CaptureDecodeApiResponse {
    return new CaptureDecodeApiResponse(timeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    console.log(`[CaptureDecodeApiResponse] Waiting for '/api/classic/decode' API response (Timeout: ${this.timeoutMs / 1000}s)...`);

    try {
      const response: Response = await page.waitForResponse(
        (res) => res.url().includes('/api/classic/decode'),
        { timeout: this.timeoutMs }
      );

      const status = response.status();
      this.capturedJson = await response.json().catch(() => null);

      console.log(`\n=== [/api/classic/decode JSON Response Captured (Status: ${status})] ===\n`);
      console.log(JSON.stringify(this.capturedJson, null, 2));
      console.log(`\n========================================================================\n`);
    } catch (err) {
      console.log(`[CaptureDecodeApiResponse] Warning: API response not captured within ${this.timeoutMs / 1000}s.`);
    }
  }

  getCapturedJson(): any {
    return this.capturedJson;
  }
}

/**
 * Task: CaptureUpdateDecodeApiResponse
 * Listens for and captures the 'update-classic-decode' POST JSON API response
 * when vehicle specs are edited on the preview page.
 */
export class CaptureUpdateDecodeApiResponse implements Task {
  private capturedJson: any = null;

  constructor(private readonly timeoutMs: number = 30_000) {}

  static withTimeout(timeoutMs: number = 30_000): CaptureUpdateDecodeApiResponse {
    return new CaptureUpdateDecodeApiResponse(timeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    console.log(`[CaptureUpdateDecodeApiResponse] Waiting for 'update-classic-decode' POST API response (Timeout: ${this.timeoutMs / 1000}s)...`);

    try {
      const response: Response = await page.waitForResponse(
        (res) => res.url().includes('update-classic-decode') && res.request().method() === 'POST',
        { timeout: this.timeoutMs }
      );

      const status = response.status();
      this.capturedJson = await response.json().catch(() => null);

      console.log(`\n=== [update-classic-decode POST JSON Response Captured (Status: ${status})] ===\n`);
      console.log(JSON.stringify(this.capturedJson, null, 2));
      console.log(`\n==================================================================================\n`);
    } catch (err) {
      console.log(`[CaptureUpdateDecodeApiResponse] Warning: update-classic-decode API response not captured within ${this.timeoutMs / 1000}s.`);
    }
  }

  getCapturedJson(): any {
    return this.capturedJson;
  }
}
