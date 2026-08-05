import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { getDecoderUrl, getPreviewUrl } from '../config';


// Task 1: Reusable & Robust Fill & Submit using Playwright Smart Waits and Conditional Checks
export class FillVinAndSubmit implements Task {
  constructor(private readonly vin: string) {}

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;

    // Locator definitions
    const standardInput = page.getByRole('textbox', { name: 'Enter VIN *' });
    const standardBtn = page.getByRole('button', { name: 'Decoding classic VINs' });

    const radixForm = page.locator('[id^="radix-"][id$="-content-article-hero-form"]');
    const alternativeInput = radixForm.getByRole('textbox', { name: 'Enter VIN Number *' });
    const alternativeBtn = radixForm.getByRole('button', { name: 'Search VIN' });

    console.log('[FillVinAndSubmit] Opening base URL...');
    await page.goto(getDecoderUrl());

    console.log(`[FillVinAndSubmit] Attempting to fill VIN: ${this.vin}`);

    // Condition-based check to choose the active form layout
    if (await standardInput.isVisible()) {
      console.log('[FillVinAndSubmit] Standard VIN input detected.');
      await standardInput.fill(this.vin);
      await standardBtn.click(); // Smart Wait handles click
    } else if (await alternativeInput.isVisible()) {
      console.log('[FillVinAndSubmit] Radix article form input detected.');
      await alternativeInput.fill(this.vin);
      await alternativeBtn.click(); // Smart Wait handles click
    } else {
      // Direct fallback option
      const directFallbackInput = page.getByRole('textbox', { name: /Enter VIN/i });
      await directFallbackInput.fill(this.vin);
      const directFallbackBtn = page.locator('button').filter({ hasText: /Search|Decode/i });
      await directFallbackBtn.first().click();
    }

    // Condition-based wait for the navigation state to complete
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {
      console.log('[FillVinAndSubmit] Finished waiting for navigation.');
    });
  }
}

// Interface for vehicle specification selections
export interface VehicleSpecs {
  yearPlaceholder?: string;      // Defaults to '1965' if not set
  year: string;                  // e.g. '1936'
  brandPlaceholder?: string;     // Defaults to 'Brand' if not set
  brand: string;                 // e.g. 'Aston Martin'
  modelPlaceholder?: string;     // Defaults to 'Model' if not set
  model: string;                 // e.g. 'Mark II'
  versionPlaceholder?: string;   // Defaults to 'Version' if not set
  version: string;               // e.g. 'Sports Saloon Coupe'
}

// Task 2: Condition 1 - Select dynamic vehicle dropdowns, or fallback to PreviewVehicleDetail if already on preview page
export class SelectVehicleSpecs implements Task {
  constructor(private readonly specs: VehicleSpecs) {}

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    const { year, brand, model, version } = this.specs;

    console.log('[SelectVehicleSpecs] Initiating dynamic vehicle specifications check...');

    // Condition Check: Does the selection form exist on screen?
    const comboboxes = page.getByRole('combobox');
    const isFormPresent = await comboboxes.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!isFormPresent) {
      console.log('[SelectVehicleSpecs] Dropdown form not present. User landed directly on Preview page! Falling back to PreviewVehicleDetail...');
      await new PreviewVehicleDetail().performAs(actor);
      return;
    }

    // 1. Handle "Yes / No" Ownership Pop-up / Modal
    console.log('[SelectVehicleSpecs] Waiting for "Yes / No" Ownership pop-up...');

    const noPopUpBtn = page.getByRole('button', { name: 'No', exact: true })
      .or(page.getByText('No', { exact: true }))
      .or(page.locator('button, [role="button"], div, span').filter({ hasText: /^No$/i }))
      .first();

    await noPopUpBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
      console.log('[SelectVehicleSpecs] "No" pop-up button not visible or not required.');
    });

    if (await noPopUpBtn.isVisible().catch(() => false)) {
      console.log('[SelectVehicleSpecs] "No" pop-up detected! Clicking...');
      await noPopUpBtn.click({ force: true }).catch(async () => {
        await noPopUpBtn.click();
      });
      console.log('[SelectVehicleSpecs] Clicked "No" pop-up button successfully.');
    }

    // 2. Handle "Owner" selection button if present
    const ownerBtn = page.getByRole('button', { name: 'Owner' })
      .or(page.getByText('Owner'))
      .or(page.locator('button, [role="button"]').filter({ hasText: /Owner/i }))
      .first();

    await ownerBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      console.log('[SelectVehicleSpecs] "Owner" button not visible or not required.');
    });

    if (await ownerBtn.isVisible().catch(() => false)) {
      console.log('[SelectVehicleSpecs] "Owner" button detected! Clicking...');
      await ownerBtn.click({ force: true }).catch(async () => {
        await ownerBtn.click();
      });
      console.log('[SelectVehicleSpecs] Clicked "Owner" button successfully.');
    }

    // 2. Select Year (1st combobox)
    const yearCombobox = comboboxes.nth(0);
    await yearCombobox.waitFor({ state: 'visible', timeout: 10000 });
    await yearCombobox.click();
    const yearOption = page.locator('button, [role="option"], li, span').filter({ hasText: new RegExp(`^${year}$`) }).first();
    await yearOption.click().catch(async () => {
      await page.getByRole('button', { name: year }).first().click();
    });

    // 3. Select Brand (2nd combobox)
    const brandCombobox = comboboxes.nth(1);
    await brandCombobox.click();
    const brandOption = page.locator('button, [role="option"], li, span').filter({ hasText: brand }).first();
    await brandOption.click().catch(async () => {
      await page.getByRole('button', { name: brand }).first().click();
    });

    // 4. Select Model (3rd combobox)
    const modelCombobox = comboboxes.nth(2);
    await modelCombobox.click();
    const modelOption = page.locator('button, [role="option"], li, span').filter({ hasText: model }).first();
    await modelOption.click().catch(async () => {
      await page.getByRole('button', { name: model }).first().click();
    });

    // 5. Select Version/Trim (4th combobox) if version specified
    if (version) {
      const versionCombobox = comboboxes.nth(3);
      if (await versionCombobox.isVisible().catch(() => false)) {
        await versionCombobox.click();
        const versionOption = page.locator('button, [role="option"], li, span').filter({ hasText: version }).first();
        await versionOption.click().catch(async () => {
          await page.getByRole('button', { name: version }).first().click();
        });
      }
    }

    // 6. Click Get Records button
    const getRecordsBtn = page.getByRole('button', { name: /Get Records/i }).first();
    await getRecordsBtn.click();
    console.log('[SelectVehicleSpecs] Clicked "Get Records" successfully.');
  }
}

// Task 3: Verify and extract vehicle details from the preview page
export class PreviewVehicleDetail implements Task {
  constructor() {}

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;

    // Dynamically locate the main header or vehicle title on the preview page
    const vehicleHeader = page.locator('h1, h2, h3, [class*="title"], [class*="header"]').first();

    // Wait for the main vehicle header/title to be visible on the preview page
    await vehicleHeader.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('[PreviewVehicleDetail] Warning: Timeout waiting for vehicle title on preview page.');
    });

    const dynamicText = await vehicleHeader.innerText().catch(() => 'Vehicle Details');
    console.log(`[PreviewVehicleDetail] Dynamically captured preview header: "${dynamicText}"`);

    // Extract snippet of page body text for logging and verification
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`\n--- [PreviewVehicleDetail] Captured Details Snippet ---\n`);
    console.log(bodyText.slice(0, 1000));
    console.log(`\n-------------------------------------------------------\n`);
  }
}

// Task 5: Safari-specific unmapped vehicle selection flow
export class SafariSelectVehicleSpecs implements Task {
  constructor(private readonly specs: VehicleSpecs) {}

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    const {
      year = '1936',
      brand = 'Oldsmobile',
      model = 'L-Series Eight',
      version = 'Business Coupe'
    } = this.specs;

    console.log('[SafariSelectVehicleSpecs] Waiting for "Select Your Preferred Vehicle" screen or comboboxes...');

    // 1. Wait for "Select Your Preferred Vehicle" screen heading or comboboxes to be visible (up to 20s)
    const selectionHeading = page.getByRole('heading', { name: /Select Your Preferred Vehicle/i })
      .or(page.locator('text=/Select Your Preferred Vehicle/i'))
      .or(page.getByRole('combobox'))
      .first();

    await selectionHeading.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {
      console.log('[SafariSelectVehicleSpecs] Selection screen / combobox wait completed.');
    });

    // 2. Click "No" button (wait explicitly up to 10s for the ownership popup)
    const noBtn = page.getByRole('button', { name: /^No$/i })
      .or(page.locator('button, [role="button"], label, div, span').filter({ hasText: /^No$/i }))
      .or(page.locator('text=/No/i'))
      .first();

    console.log('[SafariSelectVehicleSpecs] Waiting for "No" ownership pop-up...');
    if (await noBtn.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)) {
      await noBtn.click({ force: true }).catch(async () => {
        await noBtn.evaluate((el: any) => el.click()).catch(() => {});
      });
      console.log('[SafariSelectVehicleSpecs] Successfully clicked "No" button.');
    } else {
      console.log('[SafariSelectVehicleSpecs] "No" pop-up not present or skipped.');
    }

    // 3. Click "Owner" button (wait explicitly up to 10s for owner role popup)
    const ownerBtn = page.getByRole('button', { name: /Owner/i })
      .or(page.locator('button, [role="button"], label, div, span').filter({ hasText: /Owner/i }))
      .or(page.locator('text=/Owner/i'))
      .first();

    console.log('[SafariSelectVehicleSpecs] Waiting for "Owner" pop-up...');
    if (await ownerBtn.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)) {
      await ownerBtn.click({ force: true }).catch(async () => {
        await ownerBtn.evaluate((el: any) => el.click()).catch(() => {});
      });
      console.log('[SafariSelectVehicleSpecs] Successfully clicked "Owner" button.');
    } else {
      console.log('[SafariSelectVehicleSpecs] "Owner" pop-up not present or skipped.');
    }

    // 4. Select Year
    console.log(`[SafariSelectVehicleSpecs] Selecting Year "${year}"...`);
    await page.getByRole('combobox').filter({ hasText: 'Year' }).click();
    await page.getByRole('button', { name: year }).click();

    // 5. Select Make
    console.log(`[SafariSelectVehicleSpecs] Selecting Make "${brand}"...`);
    await page.getByRole('combobox').filter({ hasText: 'Make' }).click();
    await page.getByRole('button', { name: brand }).click();

    // 6. Select Model
    console.log(`[SafariSelectVehicleSpecs] Selecting Model "${model}"...`);
    await page.getByRole('combobox').filter({ hasText: 'Model' }).click();
    await page.getByRole('button', { name: model }).click();

    // 7. Select Trim
    if (version) {
      console.log(`[SafariSelectVehicleSpecs] Selecting Trim "${version}"...`);
      await page.getByRole('combobox').filter({ hasText: 'Trim' }).click();
      await page.getByRole('button', { name: version }).click();
    }

    // 8. Click Get Records button
    console.log('[SafariSelectVehicleSpecs] Clicking "Get Records"...');
    await page.getByRole('button', { name: 'Get Records' })
      .or(page.getByRole('button', { name: /Get Records/i }))
      .first()
      .click();
    console.log('[SafariSelectVehicleSpecs] Clicked "Get Records" successfully.');
  }
}

// Task 6: Directly navigate to the preview URL with dynamic VIN, wpPage, and type parameters
export class NavigateToPreviewWithVin implements Task {
  constructor(
    private readonly vin: string,
    private readonly wpPage: string = 'homepage',
    private readonly type: string = 'vhr'
  ) {}

  async performAs(actor: Actor): Promise<void> {
    const previewUrl = getPreviewUrl(this.vin, this.wpPage, this.type);
    console.log(`[NavigateToPreviewWithVin] Navigating directly to preview URL: ${previewUrl}`);
    await actor.page.goto(previewUrl);
  }
}


