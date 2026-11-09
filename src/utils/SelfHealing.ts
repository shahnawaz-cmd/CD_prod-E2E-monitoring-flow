import { Page, Locator } from '@playwright/test';

/**
 * SelfHealing: Resilient Multi-Strategy Playwright Self-Healing Engine
 * Automatically recovers from broken selectors, unexpected overlays,
 * custom comboboxes, and hydration delays without hardcoding flaky fallbacks.
 */
export class SelfHealing {
  private static attachedPages = new WeakSet<Page>();

  /**
   * Attaches background handlers for ambient overlays (e.g. Cookie/GDPR consent banners).
   */
  static attachHandlers(page: Page): void {
    if (this.attachedPages.has(page)) return;
    this.attachedPages.add(page);

    try {
      page.addLocatorHandler(
        page.locator('button, [role="button"]').filter({ hasText: /^Accept All|^Accept Cookies|^I Agree|^Got it$/i }),
        async (acceptButton) => {
          console.log('[SelfHealing Agent] Auto-dismissed ambient Cookie Consent overlay.');
          await acceptButton.click({ force: true }).catch(() => {});
        }
      );
    } catch {
      // Locator handlers supported in modern Playwright
    }
  }

  /**
   * Clears any unexpected backdrop or blocking overlay obstructing user actions.
   */
  private static async clearBlockers(page: Page): Promise<void> {
    try {
      const blocker = page.locator('.modal-backdrop, .overlay, [data-state="open"] > .fixed').first();
      if (await blocker.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log('[SelfHealing Agent] Detected blocking backdrop. Attempting dismissal...');
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(300);
      }
    } catch {
      // Safe ignore
    }
  }

  /**
   * Smart Multi-Strategy Click:
   * 1. Attempts standard Playwright actionability click.
   * 2. If blocked, clears overlays/backdrops & scrolls into view.
   * 3. If primary selector fails, generates semantic candidate selectors from description.
   * 4. Dispatches native DOM click as ultimate guarantee.
   */
  static async click(
    locator: Locator,
    description: string = 'element',
    timeoutMs: number = 8_000
  ): Promise<void> {
    const page = locator.page();
    this.attachHandlers(page);

    // Strategy 1: Standard Actionable Click
    try {
      await locator.waitFor({ state: 'visible', timeout: timeoutMs });
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.click({ timeout: Math.min(timeoutMs, 5000) });
      return;
    } catch {
      console.log(`[SelfHealing Agent] Primary click failed on "${description}". Engaging self-healing recovery...`);
    }

    // Strategy 2: Clear potential overlays/modals & retry with force
    await this.clearBlockers(page);
    try {
      if (await locator.count() > 0) {
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        await locator.click({ force: true, timeout: 3000 });
        console.log(`[SelfHealing Agent] Successfully recovered "${description}" via force click.`);
        return;
      }
    } catch {
      // Continue to heuristic healing
    }

    // Strategy 3: Semantic Heuristic Locator Discovery
    const candidates = [
      page.getByRole('button', { name: new RegExp(description, 'i') }),
      page.locator(`button:has-text("${description}"), [role="button"]:has-text("${description}")`),
      page.locator(`a:has-text("${description}"), span:has-text("${description}"), div:has-text("${description}")`),
      page.locator(`[aria-label*="${description}" i], [title*="${description}" i]`),
      page.locator(`input[type="submit"][value*="${description}" i], input[type="button"][value*="${description}" i]`)
    ];

    for (const candidate of candidates) {
      try {
        const firstMatch = candidate.first();
        if (await firstMatch.isVisible({ timeout: 1500 }).catch(() => false)) {
          await firstMatch.scrollIntoViewIfNeeded().catch(() => {});
          await firstMatch.click({ timeout: 2000 });
          console.log(`[SelfHealing Agent] Healed "${description}" using semantic candidate locator.`);
          return;
        }
      } catch {
        continue;
      }
    }

    // Strategy 4: Direct DOM dispatch evaluation fallback
    try {
      await locator.evaluate((el: any) => {
        (el as HTMLElement).scrollIntoView();
        (el as HTMLElement).click();
      });
      console.log(`[SelfHealing Agent] Successfully dispatched DOM click for "${description}".`);
    } catch (err: any) {
      throw new Error(`[SelfHealing Agent] All self-healing strategies exhausted for click("${description}"): ${err?.message || err}`);
    }
  }

  /**
   * Smart Multi-Strategy Fill:
   * 1. Standard fill with actionability check.
   * 2. Focus + sequenced keyboard typing.
   * 3. Semantic candidate input discovery (placeholder, name, id, label).
   * 4. Direct DOM input value assignment with event dispatching.
   */
  static async fill(
    locator: Locator,
    value: string,
    description: string = 'input',
    timeoutMs: number = 8_000
  ): Promise<void> {
    const page = locator.page();
    this.attachHandlers(page);

    // Strategy 1: Standard Fill
    try {
      await locator.waitFor({ state: 'visible', timeout: timeoutMs });
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.fill(value, { timeout: Math.min(timeoutMs, 5000) });
      return;
    } catch {
      console.log(`[SelfHealing Agent] Primary fill failed on "${description}". Engaging self-healing recovery...`);
    }

    // Strategy 2: Focus + Press Sequentially
    try {
      if (await locator.count() > 0) {
        await locator.click({ force: true, timeout: 2000 });
        await locator.fill('');
        await locator.pressSequentially(value, { delay: 15 });
        console.log(`[SelfHealing Agent] Successfully recovered "${description}" via sequential typing.`);
        return;
      }
    } catch {
      // Continue to heuristic healing
    }

    // Strategy 3: Semantic Heuristic Input Discovery
    const inputCandidates = [
      page.getByRole('textbox', { name: new RegExp(description, 'i') }),
      page.locator(`input[placeholder*="${description}" i]`),
      page.locator(`input[name*="${description}" i]`),
      page.locator(`input[id*="${description}" i]`),
      page.locator(`input[type="${description.toLowerCase()}"]`)
    ];

    for (const candidate of inputCandidates) {
      try {
        const firstMatch = candidate.first();
        if (await firstMatch.isVisible({ timeout: 1500 }).catch(() => false)) {
          await firstMatch.fill(value);
          console.log(`[SelfHealing Agent] Healed "${description}" using semantic input candidate.`);
          return;
        }
      } catch {
        continue;
      }
    }

    // Strategy 4: Direct DOM Value Dispatch
    try {
      await locator.evaluate((el: any, val: string) => {
        (el as HTMLInputElement).value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
      console.log(`[SelfHealing Agent] Successfully set DOM input value for "${description}".`);
    } catch (err: any) {
      throw new Error(`[SelfHealing Agent] All self-healing strategies exhausted for fill("${description}"): ${err?.message || err}`);
    }
  }

  /**
   * Smart Multi-Strategy Select Option:
   * Handles native <select>, Radix UI comboboxes, React portals, and virtualized listboxes.
   */
  static async selectOption(
    page: Page,
    comboboxLocator: Locator,
    optionText: string,
    description: string = 'dropdown',
    timeoutMs: number = 8_000
  ): Promise<void> {
    this.attachHandlers(page);

    try {
      await comboboxLocator.waitFor({ state: 'visible', timeout: timeoutMs });
      await comboboxLocator.scrollIntoViewIfNeeded().catch(() => {});

      // 1. Native HTML <select> support
      const tagName = await comboboxLocator.evaluate((el: any) => el.tagName.toLowerCase()).catch(() => '');
      if (tagName === 'select') {
        await comboboxLocator.selectOption({ label: optionText }).catch(async () => {
          await comboboxLocator.selectOption({ value: optionText });
        });
        return;
      }

      // 2. Custom ARIA / Radix UI Combobox
      await SelfHealing.click(comboboxLocator, `${description} combobox`, timeoutMs);
      await page.waitForTimeout(400); // Allow portal animation

      // Find option inside open listbox / portal
      const optionLocator = page.getByRole('option', { name: new RegExp(`^${optionText}$`, 'i') })
        .or(page.locator('[role="listbox"] [role="option"]').filter({ hasText: new RegExp(`^${optionText}$`, 'i') }))
        .or(page.locator('[data-radix-popper-content-wrapper] [role="option"], [data-radix-popper-content-wrapper] button').filter({ hasText: new RegExp(`^${optionText}$`, 'i') }))
        .or(page.locator('li, button, [role="option"]').filter({ hasText: new RegExp(`^${optionText}$`, 'i') }))
        .first();

      await optionLocator.waitFor({ state: 'visible', timeout: 5000 });
      await optionLocator.scrollIntoViewIfNeeded().catch(() => {});
      await SelfHealing.click(optionLocator, `${description} option "${optionText}"`, 4000);
      console.log(`[SelfHealing Agent] Selected "${optionText}" in ${description}.`);
    } catch (err: any) {
      console.log(`[SelfHealing Agent] Combobox selection failed for "${description}" (${optionText}). Attempting text search fallback...`);
      const directOption = page.locator(`[role="option"]:has-text("${optionText}"), li:has-text("${optionText}")`).first();
      await SelfHealing.click(directOption, `direct option "${optionText}"`, 4000);
    }
  }
}

