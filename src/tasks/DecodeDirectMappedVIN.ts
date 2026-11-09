import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { PreviewVehicleDetail } from './DecodeVIN';
import { ConfirmVehicleModal } from './ConfirmVehicleModal';
import { SelectBuyerSellerRole } from './SelectBuyerSellerRole';

/**
 * Task: DecodeDirectMappedVIN
 * Dedicated task for mapped VINs.
 * - Primary Path: If vehicle directly navigates to Preview page -> extracts vehicle specs.
 * - Fallback Path: If Yes/No pop-up appears (API mapping []/null) -> selects "Yes" ->
 *   selects Buyer/Seller role -> lands on Preview page -> extracts vehicle specs.
 */
export class DecodeDirectMappedVIN implements Task {
  constructor(private readonly modalTimeoutMs: number = 8000) {}

  static auto(modalTimeoutMs: number = 8000): DecodeDirectMappedVIN {
    return new DecodeDirectMappedVIN(modalTimeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    console.log('[DecodeDirectMappedVIN] Checking page state for mapped VIN...');

    // Check if directly landed on Preview page
    const previewHeader = page.locator('h1, h2, h3, [class*="title"], [class*="header"]')
      .filter({ hasNotText: /Select Your Preferred Vehicle|Loading|Submitting|Is this your vehicle/i })
      .first();

    const isDirectOnPreview = await previewHeader.isVisible({ timeout: 2500 }).catch(() => false);

    if (isDirectOnPreview) {
      console.log('[DecodeDirectMappedVIN] Directly landed on Preview page (0ms modal overhead).');
    } else {
      // Fallback: If Yes/No modal appears, confirm "Yes" and select Buyer/Seller role
      console.log('[DecodeDirectMappedVIN] [Fallback] Checking for Yes/No modal & Buyer/Seller selection...');
      await new ConfirmVehicleModal('Yes', this.modalTimeoutMs).performAs(actor);
      await new SelectBuyerSellerRole(6000).performAs(actor);
    }

    await new PreviewVehicleDetail().performAs(actor);
  }
}
