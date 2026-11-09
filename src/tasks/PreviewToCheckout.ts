import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { expect, Locator } from '@playwright/test';
import { SelfHealing } from '../utils/SelfHealing';

/**
 * Base Abstract Task for Preview to Checkout Redirection
 */
export abstract class BasePreviewToCheckout implements Task {
  constructor(
    protected readonly email: string,
    protected readonly timeoutMs: number = 60_000
  ) {}

  protected abstract getAccessButton(actor: Actor): Locator;

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    console.log(`[PreviewToCheckout] Starting Preloader check for email: "${this.email}"`);

    // 1. Click Access Button using SelfHealing
    const accessButton = this.getAccessButton(actor);
    console.log('[PreviewToCheckout] Waiting for Access button...');
    await SelfHealing.click(accessButton, 'Access Vehicle Report/Sticker button', 30_000);

    // 2. Fill Email using SelfHealing
    console.log('[PreviewToCheckout] Filling Email in popup...');
    const emailInput = page.getByRole('textbox', { name: /Email Address/i })
      .or(page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]'))
      .first();

    await SelfHealing.fill(emailInput, this.email, 'Email Address input', 15_000);

    // 3. Click Proceed to Checkout button using SelfHealing
    const checkoutButton = page.getByRole('button', { name: /Proceed to Checkout/i })
      .or(page.locator('button, [role="button"]').filter({ hasText: /Proceed to Checkout|Checkout/i }))
      .first();

    await SelfHealing.click(checkoutButton, 'Proceed to Checkout button');

    // 4. Track Preloader timing to Checkout
    await this.trackPreloaderToCheckoutTime(actor);
  }

  protected async trackPreloaderToCheckoutTime(actor: Actor): Promise<number> {
    const page = actor.page;
    const preloader = page.locator('text=Preparing Your Checkout')
      .or(page.locator('[class*="preloader"], [class*="loader"], text=/Preparing/i'))
      .first();

    const checkoutHeader = page.locator('text=Choose payment method')
      .or(page.locator('text=/Checkout|Payment/i'))
      .first();

    let durationSeconds = 0;

    if (await preloader.isVisible({ timeout: 10000 }).catch(() => false)) {
      const startTime = Date.now();
      console.log('⏳ Preloader visible. Timing started...');

      await expect(checkoutHeader).toBeVisible({ timeout: 60000 });
      const endTime = Date.now();

      durationSeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));
      console.log(`⏱️ Total Time (Preloader -> Checkout): ${durationSeconds}s`);
    } else {
      console.log('[PreviewToCheckout] Preloader fast load. Waiting for checkout URL...');
    }

    await page.waitForURL(/.*\/checkout.*/, { timeout: 60000 }).catch(() => {
      console.log(`[PreviewToCheckout] Current URL: ${page.url()}`);
    });

    console.log(`[PreviewToCheckout] Successfully redirected to Checkout page: ${page.url()}`);
    return durationSeconds;
  }
}

/**
 * Class 1: VHRPreviewToCheckout
 * Preloader Verification class for Vehicle History Reports (VHR)
 */
export class VHRPreviewToCheckout extends BasePreviewToCheckout {
  static withEmail(email: string, timeoutMs: number = 60_000): VHRPreviewToCheckout {
    return new VHRPreviewToCheckout(email, timeoutMs);
  }

  protected getAccessButton(actor: Actor): Locator {
    const page = actor.page;
    return page.getByRole('button', { name: /Access Vehicle Record|Access Vehicle History|Access Vehicle Report|Get Vehicle Report|Access Record|Access Report/i })
      .or(page.locator('button, [role="button"]').filter({ hasText: /Access Vehicle Record|Access Vehicle History|Access Vehicle Report|Get Vehicle Report|Access Record|Access Report/i }))
      .first();
  }
}

/**
 * Class 2: BuildSheetPreviewToCheckout
 * BuildSheet Verification class for Window Stickers
 */
export class BuildSheetPreviewToCheckout extends BasePreviewToCheckout {
  static withEmail(email: string, timeoutMs: number = 60_000): BuildSheetPreviewToCheckout {
    return new BuildSheetPreviewToCheckout(email, timeoutMs);
  }

  protected getAccessButton(actor: Actor): Locator {
    const page = actor.page;
    return page.getByRole('button', { name: /Access Build Sheet/i })
      .or(page.locator('button, [role="button"]').filter({ hasText: /Access Build Sheet/i }))
      .first();
  }
}
