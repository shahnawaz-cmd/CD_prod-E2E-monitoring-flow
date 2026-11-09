import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { SelfHealing } from '../utils/SelfHealing';

/**
 * Task: SelectBuyerSellerRole
 * Dedicated task that dynamically inspects the live DOM for the Seller / Buyer / Owner
 * verification modal and selects an available role.
 */
export class SelectBuyerSellerRole implements Task {
  constructor(private readonly timeoutMs: number = 10_000) {}

  static auto(timeoutMs: number = 10_000): SelectBuyerSellerRole {
    return new SelectBuyerSellerRole(timeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;
    console.log('[SelectBuyerSellerRole] Waiting for Seller/Buyer/Owner verification modal...');

    // Match buttons, radio cards, labels, or clickable divs with Owner/Buyer/Seller text
    const roleOption = page.locator('[role="dialog"] button, [data-state="open"] button, .modal button, [role="dialog"] [role="radio"], [role="dialog"] label, [role="dialog"] div[class*="card"], [role="dialog"] div[class*="cursor-pointer"]')
      .filter({ hasText: /Owner|Buyer|Seller/i })
      .or(page.getByRole('button', { name: /Owner|Buyer|Seller/i }))
      .or(page.locator('button, [role="button"]').filter({ hasText: /Owner|Buyer|Seller/i }))
      .first();

    const isRoleVisible = await roleOption.waitFor({ state: 'visible', timeout: this.timeoutMs })
      .then(() => true)
      .catch(() => false);

    if (isRoleVisible) {
      const roleName = (await roleOption.innerText().catch(() => 'Buyer/Owner')).trim().replace(/\n+/g, ' ');
      console.log(`[SelectBuyerSellerRole] Detected role option. Dynamically selecting: "${roleName}"...`);
      await SelfHealing.click(roleOption, `Role "${roleName}" option`, 5000);
      await page.waitForTimeout(1000);

      // Check if a "Continue" / "Next" / "Confirm" button is present to finalize selection
      const continueBtn = page.locator('[role="dialog"] button, [data-state="open"] button')
        .filter({ hasText: /Continue|Next|Confirm|Submit|Proceed/i })
        .or(page.getByRole('button', { name: /Continue|Next|Confirm|Submit|Proceed/i }))
        .first();

      if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('[SelectBuyerSellerRole] Clicking "Continue" button after role selection...');
        await SelfHealing.click(continueBtn, '"Continue" button', 3000);
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('[SelectBuyerSellerRole] No Buyer/Seller role modal detected. Proceeding...');
    }
  }
}
