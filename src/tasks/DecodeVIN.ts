import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { getDecoderUrl, getPreviewUrl } from '../config';
import { SelfHealing } from '../utils/SelfHealing';
import { ConfirmVehicleModal } from './ConfirmVehicleModal';
import { SelectBuyerSellerRole } from './SelectBuyerSellerRole';
import { DynamicDropdownSelection } from './DynamicDropdownSelection';

export { ConfirmVehicleModal } from './ConfirmVehicleModal';
export { SelectBuyerSellerRole } from './SelectBuyerSellerRole';
export { DynamicDropdownSelection } from './DynamicDropdownSelection';

// Task 1: Reusable & Robust Fill & Submit using Playwright Smart Waits
export class FillVinAndSubmit implements Task {
  constructor(private readonly vin: string) {}

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;

    const standardInput = page.getByRole('textbox', { name: /Enter VIN/i })
      .or(page.locator('input[placeholder*="VIN"], input[name*="vin"]'))
      .first();

    const standardBtn = page.getByRole('button', { name: /Search VIN|Decoding classic VINs|Decode/i })
      .or(page.locator('button').filter({ hasText: /Search|Decode/i }))
      .first();

    console.log('[FillVinAndSubmit] Opening base URL...');
    await page.goto(getDecoderUrl());
    console.log(`[FillVinAndSubmit] Filling VIN: ${this.vin}`);

    await SelfHealing.fill(standardInput, this.vin, 'VIN Input');
    await SelfHealing.click(standardBtn, 'Decode/Search VIN Button');
  }
}

// Interface for vehicle specification selections
export interface VehicleSpecs {
  yearPlaceholder?: string;
  year?: string;
  brandPlaceholder?: string;
  brand?: string;
  modelPlaceholder?: string;
  model?: string;
  versionPlaceholder?: string;
  version?: string;
  confirmVehicleIfSuggested?: boolean; // Set to true to click 'Yes' if suggested vehicle popup appears
}

/**
 * Task 2: SmartDecodeVIN & SelectVehicleSpecs
 * Handles both Mapped and Unmapped VINs dynamically:
 * - If Mapped: Lands directly on Preview without any modal.
 * - If Unmapped ("Is this your vehicle?" popup appears):
 *     - If confirmVehicleIfSuggested === true -> Clicks "Yes" -> Lands on Preview.
 *     - If confirmVehicleIfSuggested === false (default) -> Clicks "No" -> Selects Buyer/Owner -> Real-time DOM Dynamic Dropdown Selection -> Lands on Preview.
 */
export class SelectVehicleSpecs implements Task {
  constructor(private readonly specs: VehicleSpecs = {}) {}

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    const { confirmVehicleIfSuggested = false } = this.specs;
    console.log(`[SelectVehicleSpecs] Initiating dynamic vehicle specifications resolution (confirmVehicleIfSuggested: ${confirmVehicleIfSuggested})...`);

    // 1. Direct Mapped Check: If already on Preview page, skip modals
    const previewHeader = page.locator('h1, h2, h3, [class*="title"], [class*="header"]')
      .filter({ hasNotText: /Select Your Preferred Vehicle|Loading|Submitting|Is this your vehicle/i })
      .first();

    const isDirectOnPreview = await previewHeader.isVisible({ timeout: 2500 }).catch(() => false);
    if (isDirectOnPreview) {
      console.log('[SelectVehicleSpecs] [DIRECT MAPPED] Directly landed on Preview page. Skipping modals...');
      await new PreviewVehicleDetail().performAs(actor);
      return;
    }

    if (confirmVehicleIfSuggested) {
      // YES FLOW: Confirm suggestion -> Dynamic Buyer/Owner role -> Preview Page
      await new ConfirmVehicleModal('Yes', 8000).performAs(actor);
      await new SelectBuyerSellerRole(6000).performAs(actor);
    } else {
      // NO FLOW: Reject suggestion -> Dynamic Buyer/Owner role -> Live DOM YMMT Dropdowns -> Preview Page
      await new ConfirmVehicleModal('No', 8000).performAs(actor);
      await new SelectBuyerSellerRole(6000).performAs(actor);
      await new DynamicDropdownSelection().performAs(actor);
    }

    // Capture final preview details
    await new PreviewVehicleDetail().performAs(actor);
  }
}

// Backward-compatible alias for Safari unmapped flow
export class SafariSelectVehicleSpecs extends SelectVehicleSpecs {}

// Universal Smart Decode Task combining navigation + resolution
export class SmartDecodeVIN implements Task {
  constructor(
    private readonly vin: string,
    private readonly specs?: VehicleSpecs,
    private readonly wpPage: string = 'homepage',
    private readonly type: string = 'vhr'
  ) {}

  static for(
    vin: string,
    specs?: VehicleSpecs,
    wpPage: string = 'homepage',
    type: string = 'vhr'
  ): SmartDecodeVIN {
    return new SmartDecodeVIN(vin, specs, wpPage, type);
  }

  async performAs(actor: Actor): Promise<void> {
    const previewUrl = getPreviewUrl(this.vin, this.wpPage, this.type);
    console.log(`[SmartDecodeVIN] Navigating to preview URL: ${previewUrl}`);
    await actor.page.goto(previewUrl);

    const defaultSpecs: VehicleSpecs = this.specs || {
      year: '1936',
      brand: 'Oldsmobile',
      model: 'L-Series Eight',
      version: 'Business Coupe',
      confirmVehicleIfSuggested: false
    };

    await new SelectVehicleSpecs(defaultSpecs).performAs(actor);
  }
}

// Task 3: Verify and extract vehicle details from the preview page
export class PreviewVehicleDetail implements Task {
  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;

    const vehicleHeader = page.locator('h1, h2, h3, [class*="title"], [class*="header"]')
      .filter({ hasNotText: /Select Your Preferred Vehicle|Loading|Submitting/i })
      .first();

    await vehicleHeader.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {
      console.log('[PreviewVehicleDetail] Warning: Timeout waiting for vehicle title on preview page.');
    });

    const vehicleName = (await vehicleHeader.innerText().catch(() => 'Vehicle Details')).trim();
    console.log(`\n================== [Preview Page Landed: Vehicle Details] ==================`);
    console.log(`Vehicle Title: ${vehicleName}`);

    // Extract structured vehicle specs from DOM
    const structuredDetails = await page.evaluate(() => {
      const result: Record<string, string> = {};
      const bodyText = document.body?.innerText || '';
      const vinMatch = bodyText.match(/VIN:\s*([A-Z0-9]+)/i);
      if (vinMatch) result['VIN'] = vinMatch[1];

      const specLines = bodyText.split('\n').map((s) => s.trim()).filter(Boolean);
      for (let i = 0; i < specLines.length - 1; i++) {
        if (specLines[i].endsWith(':') && specLines[i].length < 30) {
          const key = specLines[i].replace(':', '');
          const val = specLines[i + 1];
          if (val && !val.endsWith(':') && val.length < 100) {
            result[key] = val;
          }
        }
      }
      return result;
    }).catch(() => ({}));

    console.log('Structured Specifications:');
    console.log(JSON.stringify(structuredDetails, null, 2));
    console.log(`============================================================================\n`);
  }
}

// Task 4: Directly navigate to the preview URL with dynamic VIN, wpPage, and type parameters
// Automatically confirms suggested vehicle popup with "Yes" & Buyer/Seller role if present
export class NavigateToPreviewWithVin implements Task {
  constructor(
    private readonly vin: string,
    private readonly wpPage: string = 'homepage',
    private readonly type: string = 'vhr',
    private readonly autoConfirmSuggested: boolean = true
  ) {}

  static forUnmapped(
    vin: string,
    wpPage: string = 'homepage',
    type: string = 'vhr'
  ): NavigateToPreviewWithVin {
    return new NavigateToPreviewWithVin(vin, wpPage, type, false);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    const previewUrl = getPreviewUrl(this.vin, this.wpPage, this.type);
    console.log(`[NavigateToPreviewWithVin] Navigating to preview URL: ${previewUrl}`);
    await page.goto(previewUrl);

    // If autoConfirmSuggested is enabled (default for standard mapped test flows like TC_03 to TC_07):
    if (this.autoConfirmSuggested) {
      const previewHeader = page.locator('h1, h2, h3, [class*="title"], [class*="header"]')
        .filter({ hasNotText: /Select Your Preferred Vehicle|Loading|Submitting|Is this your vehicle/i })
        .first();

      const isDirectOnPreview = await previewHeader.isVisible({ timeout: 2500 }).catch(() => false);
      if (!isDirectOnPreview) {
        console.log('[NavigateToPreviewWithVin] Suggested vehicle modal / role selection detected. Resolving "Yes" + Buyer/Seller role...');
        await new ConfirmVehicleModal('Yes', 6000).performAs(actor);
        await new SelectBuyerSellerRole(6000).performAs(actor);
      }
    }
  }
}
