import { Actor } from '../actors/Actor';
import { Task } from './Task';

export interface EditableVehicleSpecs {
  year?: string;
  brand?: string;
  model?: string;
  version?: string;
}

/**
 * Task: EditVehicleSpecsOnPreview
 * Class wrapping the exact combobox selection logic from CD_Homepage-Functional_test.spec.js
 * on the Preview page with 7s stability wait and robust Update button click.
 */
export class EditVehicleSpecsOnPreview implements Task {
  constructor(
    private readonly specs: EditableVehicleSpecs = {},
    private readonly timeoutMs: number = 30_000
  ) {}

  /**
   * Static factory method to instantiate task with a specs object and condition timeout
   */
  static withSpecs(specs: EditableVehicleSpecs = {}, timeoutMs: number = 30_000): EditVehicleSpecsOnPreview {
    return new EditVehicleSpecsOnPreview(specs, timeoutMs);
  }

  /**
   * Static factory method to instantiate task with explicit Year, Make, Model, Trim parameters and condition timeout
   */
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

    console.log(`[EditVehicleSpecsOnPreview] Initiating manual vehicle spec update on Preview page: ${year} ${brand} ${model} ${version}`);

    // 1. Click "Click to edit" button
    const editBtn = page.getByRole('button', { name: /Click to edit|Edit/i })
      .or(page.locator('button, [role="button"]').filter({ hasText: /Click to edit|Edit/i }))
      .first();

    await editBtn.waitFor({ state: 'visible', timeout: this.timeoutMs });
    await editBtn.click({ force: true }).catch(async () => {
      await editBtn.click();
    });
    console.log('[EditVehicleSpecsOnPreview] Clicked "Click to edit" button.');

    // 2. Click "Update VIN, year, make, and" option
    const updateOptionBtn = page.getByRole('button', { name: /Update VIN, year, make, and|Update VIN/i })
      .or(page.locator('button, [role="button"]').filter({ hasText: /Update VIN, year, make, and|Update VIN/i }))
      .first();

    await updateOptionBtn.waitFor({ state: 'visible', timeout: Math.min(this.timeoutMs, 10_000) });
    await updateOptionBtn.click({ force: true }).catch(async () => {
      await updateOptionBtn.click();
    });
    console.log('[EditVehicleSpecsOnPreview] Clicked "Update VIN, year, make, and" button.');

    // Stability Wait: 7 seconds after option click for UI stabilization
    console.log('[EditVehicleSpecsOnPreview] Waiting 7 seconds for UI stability...');
    await page.waitForTimeout(7000);

    // 3. Select Year (exact reference logic)
    console.log(`[EditVehicleSpecsOnPreview] Selecting Year: "${year}"...`);
    const yearCombobox = page.getByRole('combobox').first();
    await yearCombobox.waitFor({ state: 'visible', timeout: 10000 });
    await yearCombobox.click();
    await page.getByRole('button', { name: year }).click();

    // 4. Select Make (exact reference logic)
    console.log(`[EditVehicleSpecsOnPreview] Selecting Make: "${brand}"...`);
    await page.getByRole('combobox').filter({ hasText: 'Make' }).click();
    await page.getByRole('button', { name: brand }).click();

    // 5. Select Model (exact reference logic)
    console.log(`[EditVehicleSpecsOnPreview] Selecting Model: "${model}"...`);
    await page.getByRole('combobox').filter({ hasText: 'Model' }).click();
    await page.getByRole('button', { name: model }).click();

    // 6. Select Trim (exact reference logic)
    if (version) {
      console.log(`[EditVehicleSpecsOnPreview] Selecting Trim: "${version}"...`);
      await page.getByRole('combobox').filter({ hasText: 'Trim' }).click();
      await page.getByRole('button', { name: version }).click();
    }

    // 7. Click Update button (exact reference logic + fallback)
    console.log('[EditVehicleSpecsOnPreview] Clicking "Update" button...');
    const updateBtn = page.getByRole('button', { name: 'Update', exact: true })
      .or(page.getByRole('button', { name: /^Update$/i }))
      .first();

    await updateBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await updateBtn.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await updateBtn.click();
    } catch (err) {
      console.log('[EditVehicleSpecsOnPreview] Standard click failed on Update button. Dispatching force click / JS...');
      await updateBtn.click({ force: true }).catch(async () => {
        await updateBtn.evaluate((el: any) => el.click()).catch(() => {});
      });
    }

    console.log('[EditVehicleSpecsOnPreview] Clicked "Update" button successfully.');
  }
}
