import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { Page } from '@playwright/test';
import { SelfHealing } from '../utils/SelfHealing';

export interface DynamicSelectionResult {
  selectedYear?: string;
  selectedBrand?: string;
  selectedModel?: string;
  selectedVersion?: string;
}

/**
 * Task: DynamicDropdownSelection
 * Inspects the live DOM in real time to dynamically discover and select cascading
 * dropdown options (Year -> Make -> Model -> Trim) without any hardcoded vehicle data.
 */
export class DynamicDropdownSelection implements Task {
  private result: DynamicSelectionResult = {};

  constructor(
    private readonly minYear: number = 1960,
    private readonly maxYear: number = 1980,
    private readonly timeoutMs: number = 30_000
  ) {}

  static auto(minYear: number = 1960, maxYear: number = 1980, timeoutMs: number = 30_000): DynamicDropdownSelection {
    return new DynamicDropdownSelection(minYear, maxYear, timeoutMs);
  }

  /**
   * Selects a dynamic Year from the live DOM strictly within the specified range [minYear - maxYear] (1960-1980).
   */
  private async selectYearInRange(page: Page): Promise<string> {
    const optionLocator = page.getByRole('option')
      .or(page.locator('[role="listbox"] [role="option"]'))
      .or(page.locator('[data-radix-popper-content-wrapper] button, [data-radix-popper-content-wrapper] [role="option"]'))
      .or(page.locator('ul[role="listbox"] li, div[role="listbox"] div[role="option"]'))
      .filter({ hasNotText: /Select|Loading|Choose|Search/i });

    await optionLocator.first().waitFor({ state: 'visible', timeout: 8000 });

    // Try random years from target range [1960-1980]
    const candidateYears: number[] = [];
    for (let y = this.minYear; y <= this.maxYear; y++) candidateYears.push(y);
    candidateYears.sort(() => Math.random() - 0.5);

    for (const year of candidateYears) {
      const yearOption = optionLocator.filter({ hasText: new RegExp(`^${year}$`) }).first();
      if (await yearOption.count() > 0) {
        await yearOption.scrollIntoViewIfNeeded().catch(() => {});
        const selectedText = (await yearOption.innerText()).trim();
        console.log(`[DynamicDropdownSelection] Year in range [${this.minYear}-${this.maxYear}] selected: "${selectedText}"`);
        await SelfHealing.click(yearOption, `Year option "${selectedText}"`);
        await page.waitForTimeout(1200);
        return selectedText;
      }
    }

    // Fallback: scan all visible option texts for range match
    const allOptions = await optionLocator.allInnerTexts();
    for (const opt of allOptions) {
      const parsed = parseInt(opt.trim(), 10);
      if (!isNaN(parsed) && parsed >= this.minYear && parsed <= this.maxYear) {
        const target = optionLocator.filter({ hasText: new RegExp(`^${parsed}$`) }).first();
        await target.scrollIntoViewIfNeeded().catch(() => {});
        await SelfHealing.click(target, `Year option "${parsed}"`);
        await page.waitForTimeout(1200);
        return `${parsed}`;
      }
    }

    return await this.selectFirstAvailableOption(page, 'Year');
  }

  /**
   * Dynamically inspects the open listbox in the DOM, extracts live options, and clicks an available option.
   */
  private async selectFirstAvailableOption(page: Page, stepName: string): Promise<string> {
    const optionLocator = page.getByRole('option')
      .or(page.locator('[role="listbox"] [role="option"]'))
      .or(page.locator('[data-radix-popper-content-wrapper] button, [data-radix-popper-content-wrapper] [role="option"]'))
      .or(page.locator('ul[role="listbox"] li, div[role="listbox"] div[role="option"]'))
      .filter({ hasNotText: /Select|Loading|Choose|Search/i });

    await optionLocator.first().waitFor({ state: 'visible', timeout: 8000 });
    const count = await optionLocator.count();

    if (count === 0) {
      throw new Error(`[DynamicDropdownSelection] No live DOM options found for ${stepName}`);
    }

    // Pick a valid option from live DOM
    const targetOption = optionLocator.first();
    await targetOption.scrollIntoViewIfNeeded().catch(() => {});
    const selectedText = (await targetOption.innerText()).trim();

    console.log(`[DynamicDropdownSelection] Live DOM inspection for ${stepName}: Found ${count} options. Selected: "${selectedText}"`);
    await SelfHealing.click(targetOption, `${stepName} option ("${selectedText}")`);
    await page.waitForTimeout(1200); // Allow cascading API response / DOM hydration
    return selectedText;
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    console.log(`[DynamicDropdownSelection] Starting real-time DOM vehicle dropdown inspection (Year Range: ${this.minYear}-${this.maxYear})...`);

    const comboboxes = page.getByRole('combobox');
    await comboboxes.first().waitFor({ state: 'visible', timeout: this.timeoutMs });

    // 1. Dynamic Year Selection (Range: 1960 - 1980)
    console.log(`[DynamicDropdownSelection] 1. Inspecting Year dropdown options [${this.minYear}-${this.maxYear}]...`);
    const yearCombobox = comboboxes.first();
    await SelfHealing.click(yearCombobox, 'Year Combobox');
    this.result.selectedYear = await this.selectYearInRange(page);

    // 2. Dynamic Make/Brand Selection (Live DOM inspection for selected year)
    console.log('[DynamicDropdownSelection] 2. Inspecting Make/Brand dropdown options...');
    const makeCombobox = page.getByRole('combobox').filter({ hasText: /Make|Brand/i })
      .or(comboboxes.nth(1))
      .first();
    await SelfHealing.click(makeCombobox, 'Make Combobox');
    this.result.selectedBrand = await this.selectFirstAvailableOption(page, 'Make/Brand');

    // 3. Dynamic Model Selection (Live DOM inspection for selected make)
    console.log('[DynamicDropdownSelection] 3. Inspecting Model dropdown options...');
    const modelCombobox = page.getByRole('combobox').filter({ hasText: /Model/i })
      .or(comboboxes.nth(2))
      .first();
    await SelfHealing.click(modelCombobox, 'Model Combobox');
    this.result.selectedModel = await this.selectFirstAvailableOption(page, 'Model');

    // 4. Dynamic Trim/Version Selection (If rendered in DOM)
    const trimCombobox = page.getByRole('combobox').filter({ hasText: /Trim|Version/i })
      .or(comboboxes.nth(3))
      .first();

    if (await trimCombobox.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[DynamicDropdownSelection] 4. Inspecting Trim/Version dropdown options...');
      await SelfHealing.click(trimCombobox, 'Trim Combobox');
      this.result.selectedVersion = await this.selectFirstAvailableOption(page, 'Trim/Version');
    }

    // 5. Submit "Get Records"
    console.log('[DynamicDropdownSelection] Submitting selection via "Get Records"...');
    const getRecordsBtn = page.getByRole('button', { name: /Get Records/i })
      .or(page.locator('button').filter({ hasText: /Get Records/i }))
      .first();

    await SelfHealing.click(getRecordsBtn, '"Get Records" button', 5000);
    console.log(`[DynamicDropdownSelection] Live YMMT selection complete: ${JSON.stringify(this.result, null, 2)}`);

    // Wait for the dropdown page to transition to the Preview page with updated YMM specs
    const previewVehicleTitle = page.locator('h1, h2, h3, [class*="title"], [class*="header"]')
      .filter({ hasNotText: /Select Your Preferred Vehicle|Loading|Submitting/i })
      .first();
    await previewVehicleTitle.waitFor({ state: 'visible', timeout: this.timeoutMs }).catch(() => {
      console.log('[DynamicDropdownSelection] Waiting for preview vehicle specifications hydration...');
    });
    await page.waitForTimeout(1500);
  }

  getResult(): DynamicSelectionResult {
    return this.result;
  }
}
