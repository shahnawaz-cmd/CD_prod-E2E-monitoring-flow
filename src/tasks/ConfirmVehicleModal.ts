import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { SelfHealing } from '../utils/SelfHealing';

export type VehicleModalDecision = 'Yes' | 'No';

/**
 * Task: ConfirmVehicleModal
 * Dedicated task that inspects the live DOM for the "Is this your vehicle?" suggestion modal
 * and clicks either "Yes" (confirm) or "No" (reject).
 */
export class ConfirmVehicleModal implements Task {
  constructor(
    private readonly decision: VehicleModalDecision = 'Yes',
    private readonly timeoutMs: number = 12_000
  ) {}

  static yes(timeoutMs: number = 12_000): ConfirmVehicleModal {
    return new ConfirmVehicleModal('Yes', timeoutMs);
  }

  static no(timeoutMs: number = 12_000): ConfirmVehicleModal {
    return new ConfirmVehicleModal('No', timeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    console.log(`[ConfirmVehicleModal] Waiting for vehicle suggestion modal (Choice: "${this.decision}")...`);

    const noBtn = page.getByRole('dialog').getByRole('button', { name: /^No$/i })
      .or(page.getByRole('button', { name: /^No$/i, exact: true }))
      .or(page.locator('button, [role="button"]').filter({ hasText: /^No$/i }))
      .or(page.locator('[role="dialog"] button:has-text("No"), div:has-text("Is this your vehicle?") >> .. >> button:has-text("No")'))
      .first();

    const yesBtn = page.getByRole('dialog').getByRole('button', { name: /^Yes$/i })
      .or(page.getByRole('button', { name: /^Yes$/i, exact: true }))
      .or(page.locator('button, [role="button"]').filter({ hasText: /^Yes$/i }))
      .or(page.locator('[role="dialog"] button:has-text("Yes"), div:has-text("Is this your vehicle?") >> .. >> button:has-text("Yes")'))
      .first();

    const targetBtn = this.decision === 'Yes' ? yesBtn : noBtn;
    const isModalVisible = await targetBtn.waitFor({ state: 'visible', timeout: this.timeoutMs })
      .then(() => true)
      .catch(() => false);

    if (isModalVisible) {
      console.log(`[ConfirmVehicleModal] Modal visible! Clicking "${this.decision}"...`);
      await SelfHealing.click(targetBtn, `"${this.decision}" vehicle button`, 5000);
      await page.waitForTimeout(1200);
    } else {
      console.log('[ConfirmVehicleModal] No vehicle suggestion modal appeared. Proceeding on direct flow.');
    }
  }
}
