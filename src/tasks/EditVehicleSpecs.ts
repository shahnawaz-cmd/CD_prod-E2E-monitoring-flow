import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { SelfHealing } from '../utils/SelfHealing';

export interface EditableVehicleSpecs {
  year?: string;
  brand?: string;
  model?: string;
  version?: string;
}

/**
 * Task: EditVehicleSpecsOnPreview
 * Edits vehicle specifications on the Preview page using resilient SelfHealing interactions.
 */
export class EditVehicleSpecsOnPreview implements Task {
  constructor(
    private readonly specs: EditableVehicleSpecs = {},
    private readonly timeoutMs: number = 30_000
  ) {}

  static withSpecs(specs: EditableVehicleSpecs = {}, timeoutMs: number = 30_000): EditVehicleSpecsOnPreview {
    return new EditVehicleSpecsOnPreview(specs, timeoutMs);
  }

  static withYMM(
    year: string = '1966',
    brand: string = 'Aermacchi',
    model: string = 'ALA Verde Serie 1',
    version: string = 'Base',
    timeoutMs: number = 30_000
  ): EditVehicleSpecsOnPreview {
    return new EditVehicleSpecsOnPreview({ year, brand, model, version }, timeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    const {
      year = '1966',
      brand = 'Aermacchi',
      model = 'ALA Verde Serie 1',
      version = 'Base'
    } = this.specs;

    console.log(`[EditVehicleSpecsOnPreview] Initiating vehicle spec update: ${year} ${brand} ${model} ${version}`);

    // 1. Click "Click to edit" button
    const editBtn = page.getByRole('button', { name: /Click to edit|Edit/i })
      .or(page.locator('button, [role="button"]').filter({ hasText: /Click to edit|Edit/i }))
      .first();

    await SelfHealing.click(editBtn, '"Click to edit" button', this.timeoutMs);

    // 2. Click "Update VIN, year, make, and" option
    const updateOptionBtn = page.getByRole('button', { name: /Update VIN, year, make, and|Update VIN/i })
      .or(page.locator('button, [role="button"]').filter({ hasText: /Update VIN, year, make, and|Update VIN/i }))
      .first();

    await SelfHealing.click(updateOptionBtn, '"Update VIN" option button', 10_000);

    // Dynamic wait for comboboxes to appear
    const yearCombobox = page.getByRole('combobox').first();
    await yearCombobox.waitFor({ state: 'visible', timeout: 10_000 });

    // 3. Resilient Selects for Year, Make, Model, Trim
    await SelfHealing.selectOption(page, yearCombobox, year, 'Year');

    const makeCombobox = page.getByRole('combobox').filter({ hasText: 'Make' })
      .or(page.getByRole('combobox').nth(1))
      .first();
    await SelfHealing.selectOption(page, makeCombobox, brand, 'Make/Brand');

    const modelCombobox = page.getByRole('combobox').filter({ hasText: 'Model' })
      .or(page.getByRole('combobox').nth(2))
      .first();
    await SelfHealing.selectOption(page, modelCombobox, model, 'Model');

    if (version) {
      const trimCombobox = page.getByRole('combobox').filter({ hasText: 'Trim' })
        .or(page.getByRole('combobox').nth(3))
        .first();
      if (await trimCombobox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await SelfHealing.selectOption(page, trimCombobox, version, 'Trim/Version');
      }
    }

    // 4. Click Update button
    console.log('[EditVehicleSpecsOnPreview] Submitting update...');
    const updateBtn = page.getByRole('button', { name: 'Update', exact: true })
      .or(page.getByRole('button', { name: /^Update$/i }))
      .first();

    await SelfHealing.click(updateBtn, 'Final Update button', 15_000);
    console.log('[EditVehicleSpecsOnPreview] Updated vehicle specs successfully.');
  }
}
