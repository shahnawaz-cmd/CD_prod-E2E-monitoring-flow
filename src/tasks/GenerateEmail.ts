import { Actor } from '../actors/Actor';
import { Task } from './Task';

/**
 * Utility and Task class for generating unique dynamic emails from a valid base email.
 * Prevents IP reputation degradation and email bounce rates by appending dynamic numbers
 * before the '@' symbol (e.g. 'shahnawaz@gmail.com' -> 'shahnawaz1722894123@gmail.com').
 */
export class EmailGenerator implements Task {
  private generatedEmail: string = '';

  constructor(
    private readonly baseEmail: string = 'instant.vinreport22@gmail.com',
    private readonly targetInputSelector?: string
  ) {}

  /**
   * Helper method to generate a dynamic unique email address using Gmail Subaddressing (+ alias).
   * Format: 'instant.vinreport22+1722894123@gmail.com'
   *
   * WHY PLUS ADDRESSING (+):
   * 1. 0% Bounce Rate: Gmail automatically routes all '+tag' emails to the primary 'instant.vinreport22@gmail.com' inbox.
   * 2. Preserves SMTP IP Reputation: Since the inbox exists, SMTP servers do NOT mark messages as bounced or fake.
   * 3. Fully RFC 5233 Compliant: Accepted by all modern payment gateways and checkout forms.
   */
  static generate(baseEmail: string = 'instant.vinreport22@gmail.com'): string {
    const atIndex = baseEmail.indexOf('@');
    if (atIndex === -1) {
      return `${baseEmail}+${Date.now()}`;
    }

    const username = baseEmail.substring(0, atIndex);
    const domain = baseEmail.substring(atIndex); // includes '@'
    const dynamicTag = `${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

    return `${username}+${dynamicTag}${domain}`;
  }

  static from(baseEmail: string, inputSelector?: string): EmailGenerator {
    return new EmailGenerator(baseEmail, inputSelector);
  }

  getGeneratedEmail(): string {
    return this.generatedEmail;
  }

  async performAs(actor: Actor): Promise<void> {
    this.generatedEmail = EmailGenerator.generate(this.baseEmail);
    console.log(`[EmailGenerator] Generated valid dynamic email: ${this.generatedEmail}`);

    // If an input selector is specified, fill it directly on the active page
    if (this.targetInputSelector) {
      const page = actor.page;
      const inputLocator = page.locator(this.targetInputSelector).first();
      await inputLocator.waitFor({ state: 'visible', timeout: 15000 });
      await inputLocator.fill(this.generatedEmail);
      console.log(`[EmailGenerator] Typed ${this.generatedEmail} into selector "${this.targetInputSelector}"`);
    }
  }
}
