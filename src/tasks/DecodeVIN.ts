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

    // Extract snippet of page body text safely with catch handler
    const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (bodyText) {
      console.log(`\n--- [PreviewVehicleDetail] Captured Details Snippet ---\n`);
      console.log(bodyText.slice(0, 1000));
      console.log(`\n-------------------------------------------------------\n`);
    }
  }
}

// Task 5: Safari-specific unmapped vehicle selection flow using robust wait + JS evaluate click
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

    console.log('[SafariSelectVehicleSpecs] Executing Condition 1 & dropdown selection flow...');

    // 1. Step 1: Click "No" button on "Is this your vehicle?" pop-up (wait up to 10s)
    console.log('[SafariSelectVehicleSpecs] Step 1: Waiting up to 10s for "No" button pop-up...');
    const noBtn = page.getByRole('button', { name: 'No', exact: true })
      .or(page.locator('button, [role="button"], div, span, label').filter({ hasText: /^No$/i }))
      .or(page.locator('text=/No/i'))
      .first();

    const isNoPresent = await noBtn.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);

    if (isNoPresent) {
      console.log('[SafariSelectVehicleSpecs] Step 1: "No" button detected! Executing click...');
      await noBtn.click({ force: true }).catch(async () => {
        await noBtn.evaluate((el: any) => (el as HTMLElement).click());
      });
      await noBtn.evaluate((el: any) => (el as HTMLElement).click()).catch(() => {});
      console.log('[SafariSelectVehicleSpecs] Clicked "No" button. Waiting 1.5s for Ownership screen...');
      await page.waitForTimeout(1500);
    } else {
      console.log('[SafariSelectVehicleSpecs] Step 1: "No" button pop-up not present or skipped.');
    }

    // 2. Step 2: Click "Seller" / "Owner" button on Ownership screen (wait up to 10s)
    console.log('[SafariSelectVehicleSpecs] Step 2: Waiting up to 10s for "Seller" / "Owner" pop-up...');
    const sellerOrOwnerBtn = page.getByRole('button', { name: 'Seller' })
      .or(page.getByRole('button', { name: 'Owner' }))
      .or(page.locator('button, [role="button"], div, span, label').filter({ hasText: /Seller|Owner/i }))
      .first();

    const isRolePresent = await sellerOrOwnerBtn.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);

    if (isRolePresent) {
      console.log('[SafariSelectVehicleSpecs] Step 2: "Seller" / "Owner" button detected! Executing click...');
      await sellerOrOwnerBtn.click({ force: true }).catch(async () => {
        await sellerOrOwnerBtn.evaluate((el: any) => (el as HTMLElement).click());
      });
      await sellerOrOwnerBtn.evaluate((el: any) => (el as HTMLElement).click()).catch(() => {});
      console.log('[SafariSelectVehicleSpecs] Clicked "Seller" / "Owner" button. Waiting 1.5s for Dropdown screen...');
      await page.waitForTimeout(1500);
    } else {
      console.log('[SafariSelectVehicleSpecs] Step 2: "Seller" / "Owner" pop-up not present or skipped.');
    }

    // 3. Step 3: Dropdown Selection Screen (Year -> Make -> Model -> Trim -> Get Records)
    console.log('[SafariSelectVehicleSpecs] Step 3: Selecting vehicle specifications from dropdowns...');

    // Select Year (1st combobox)
    console.log(`[SafariSelectVehicleSpecs] Selecting Year "${year}"...`);
    const yearCombobox = page.getByRole('combobox').first();
    await yearCombobox.waitFor({ state: 'visible', timeout: 10000 });
    await yearCombobox.click({ force: true }).catch(async () => await yearCombobox.click());
    
    const yearBtn = page.getByRole('button', { name: year })
      .or(page.getByText(year, { exact: true }))
      .first();
    await yearBtn.click({ force: true }).catch(async () => await yearBtn.click());

    // Select Make (2nd combobox)
    console.log(`[SafariSelectVehicleSpecs] Selecting Make "${brand}"...`);
    const makeCombobox = page.getByRole('combobox').filter({ hasText: 'Make' })
      .or(page.getByRole('combobox').nth(1))
      .first();
    await makeCombobox.click({ force: true }).catch(async () => await makeCombobox.click());
    
    const brandBtn = page.getByRole('button', { name: brand })
      .or(page.getByText(brand, { exact: true }))
      .first();
    await brandBtn.click({ force: true }).catch(async () => await brandBtn.click());

    // Select Model (3rd combobox)
    console.log(`[SafariSelectVehicleSpecs] Selecting Model "${model}"...`);
    const modelCombobox = page.getByRole('combobox').filter({ hasText: 'Model' })
      .or(page.getByRole('combobox').nth(2))
      .first();
    await modelCombobox.click({ force: true }).catch(async () => await modelCombobox.click());
    
    const modelBtn = page.getByRole('button', { name: model })
      .or(page.getByText(model, { exact: true }))
      .first();
    await modelBtn.click({ force: true }).catch(async () => await modelBtn.click());

    // Select Trim (4th combobox)
    if (version) {
      console.log(`[SafariSelectVehicleSpecs] Selecting Trim "${version}"...`);
      const trimCombobox = page.getByRole('combobox').filter({ hasText: 'Trim' })
        .or(page.getByRole('combobox').nth(3))
        .first();
      if (await trimCombobox.isVisible().catch(() => false)) {
        await trimCombobox.click({ force: true }).catch(async () => await trimCombobox.click());
        
        const versionBtn = page.getByRole('button', { name: version })
          .or(page.getByText(version, { exact: true }))
          .first();
        await versionBtn.click({ force: true }).catch(async () => await versionBtn.click());
      }
    }

    // Submit: Click "Get Records"
    console.log('[SafariSelectVehicleSpecs] Submitting form: Clicking "Get Records"...');
    const getRecordsBtn = page.getByRole('button', { name: 'Get Records' })
      .or(page.getByRole('button', { name: /Get Records/i }))
      .first();
    await getRecordsBtn.click({ force: true }).catch(async () => await getRecordsBtn.click());
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
