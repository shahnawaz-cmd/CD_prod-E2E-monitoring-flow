import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { ConfirmVehicleModal } from './ConfirmVehicleModal';
import { SelectBuyerSellerRole } from './SelectBuyerSellerRole';
import { DynamicDropdownSelection } from './DynamicDropdownSelection';
import { PreviewVehicleDetail } from './DecodeVIN';

/**
 * Task: DecodeUnmappedVIN
 * Dedicated task for unmapped VINs.
 * - Fallback Path: If unmapped VIN directly lands on Preview (backend returns mapped data) -> extracts vehicle specs.
 * - 1st Tier Primary Path: Yes/No pop-up appears -> clicks "No" -> selects Buyer/Seller role ->
 *   dynamic YMMT dropdown selection (1960-1980) -> lands on Preview page -> extracts vehicle specs.
 */
export class DecodeUnmappedVIN implements Task {
  constructor(private readonly modalTimeoutMs: number = 8000) {}

  static auto(modalTimeoutMs: number = 8000): DecodeUnmappedVIN {
    return new DecodeUnmappedVIN(modalTimeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    console.log('[DecodeUnmappedVIN] Checking page state for unmapped VIN...');

    // Fallback: Check if directly landed on Preview page (e.g. backend returned mapping data)
    const previewHeader = page.locator('h1, h2, h3, [class*="title"], [class*="header"]')
      .filter({ hasNotText: /Select Your Preferred Vehicle|Loading|Submitting|Is this your vehicle/i })
      .first();

    const isDirectOnPreview = await previewHeader.isVisible({ timeout: 2500 }).catch(() => false);
    if (isDirectOnPreview) {
      console.log('[DecodeUnmappedVIN] [Fallback] Directly landed on Preview page. Extracting vehicle specs...');
      await new PreviewVehicleDetail().performAs(actor);
      return;
    }

    // 1st Tier Primary Path: Clicks "No" -> Buyer/Seller Role -> YMMT Dropdowns -> Preview
    console.log('[DecodeUnmappedVIN] [1st Tier] Executing "No" -> Buyer/Seller Role -> Dropdowns -> Preview...');
    await new ConfirmVehicleModal('No', this.modalTimeoutMs).performAs(actor);
    await new SelectBuyerSellerRole(6000).performAs(actor);

    // Check if dynamic dropdown comboboxes are visible before selecting
    const hasDropdowns = await page.getByRole('combobox').first().isVisible({ timeout: 4000 }).catch(() => false);
    if (hasDropdowns) {
      await new DynamicDropdownSelection().performAs(actor);
    } else {
      console.log('[DecodeUnmappedVIN] Dropdowns not present, proceeding to Preview...');
    }

    await new PreviewVehicleDetail().performAs(actor);
  }
}
