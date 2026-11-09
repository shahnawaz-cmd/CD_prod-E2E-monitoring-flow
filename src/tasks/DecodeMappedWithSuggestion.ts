import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { ConfirmVehicleModal } from './ConfirmVehicleModal';
import { SelectBuyerSellerRole } from './SelectBuyerSellerRole';
import { PreviewVehicleDetail } from './DecodeVIN';

/**
 * Task: DecodeMappedWithSuggestion
 * Dedicated task for mapped VIN variants that trigger the suggested vehicle confirmation modal.
 * Flow: Clicks "Yes" -> Dynamically selects Buyer/Owner role -> Verifies Preview vehicle details.
 */
export class DecodeMappedWithSuggestion implements Task {
  constructor(private readonly timeoutMs: number = 10_000) {}

  static auto(timeoutMs: number = 10_000): DecodeMappedWithSuggestion {
    return new DecodeMappedWithSuggestion(timeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    console.log('[DecodeMappedWithSuggestion] Handling suggested vehicle flow (Choice: "Yes")...');
    await new ConfirmVehicleModal('Yes', this.timeoutMs).performAs(actor);
    await new SelectBuyerSellerRole(this.timeoutMs).performAs(actor);
    await new PreviewVehicleDetail().performAs(actor);
  }
}
