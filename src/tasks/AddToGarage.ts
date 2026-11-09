import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { EmailGenerator } from './GenerateEmail';
import { PasswordGenerator, PhoneGenerator } from './GenerateCredentials';
import { SelfHealing } from '../utils/SelfHealing';

export interface GarageSignupCredentials {
  email?: string;
  password?: string;
  phone?: string;
}

export interface GarageLoginCredentials {
  email?: string;
  password?: string;
}

/**
 * Task: AddToGarageWithSignup
 * Performs the 'Add to garage' signup flow on the Preview page using self-healing interactions.
 */
export class AddToGarageWithSignup implements Task {
  constructor(
    private readonly credentials: GarageSignupCredentials = {},
    private readonly timeoutMs: number = 30_000
  ) {}

  static withCredentials(
    credentials: GarageSignupCredentials = {},
    timeoutMs: number = 30_000
  ): AddToGarageWithSignup {
    return new AddToGarageWithSignup(credentials, timeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;

    const email = this.credentials.email || EmailGenerator.generate('instant.vinreport22@gmail.com');
    const password = this.credentials.password || PasswordGenerator.generate('321654');
    const phone = this.credentials.phone || PhoneGenerator.generate('0315');

    console.log(`[AddToGarageWithSignup] Executing signup flow (Email: "${email}", Phone: "${phone}")...`);

    // Wait for JS hydration
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(1500);

    const addToGarageBtn = page.locator('header button', { hasText: 'Add to garage' })
      .or(page.locator('header').getByRole('button', { name: 'Add to garage' }))
      .or(page.getByRole('button', { name: 'Add to garage' }))
      .first();

    await SelfHealing.click(addToGarageBtn, 'Add to garage button', this.timeoutMs);

    const signupBtn = page.getByRole('button', { name: 'Signup' })
      .or(page.locator('button, [role="button"], a, span, div').filter({ hasText: /^Signup$/i }))
      .first();

    await SelfHealing.click(signupBtn, 'Signup tab button', 5000);

    // Resilient input fills
    await SelfHealing.fill(page.getByRole('textbox', { name: 'Email' }).first(), email, 'Email input');
    await SelfHealing.fill(page.getByRole('textbox', { name: 'Password', exact: true }).first(), password, 'Password input');
    await SelfHealing.fill(page.getByRole('textbox', { name: 'Confirm Password' }).first(), password, 'Confirm Password input');
    await SelfHealing.fill(page.getByRole('textbox', { name: 'Phone' }).first(), phone, 'Phone input');

    const submitSignupBtn = page.getByRole('button', { name: 'Signup' }).first();
    await SelfHealing.click(submitSignupBtn, 'Submit Signup button');

    await page.goto('https://classicdecoder.com/members/my-garage');
    console.log(`[AddToGarageWithSignup] Successfully landed on My Garage: ${page.url()}`);
  }
}

/**
 * Task: AddToGarageWithLogin
 * Performs the 'Add to garage' login flow on the Preview page for existing users with self-healing interactions.
 */
export class AddToGarageWithLogin implements Task {
  constructor(
    private readonly credentials: GarageLoginCredentials = {},
    private readonly timeoutMs: number = 30_000
  ) {}

  static withCredentials(
    credentials: GarageLoginCredentials = {},
    timeoutMs: number = 30_000
  ): AddToGarageWithLogin {
    return new AddToGarageWithLogin(credentials, timeoutMs);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.page;

    const email = this.credentials.email || 'instant.vinreport22@gmail.com';
    const password = this.credentials.password || '321654';

    console.log(`[AddToGarageWithLogin] Executing Add to Garage login flow (Email: "${email}")...`);

    // 1. Wait for JS hydration
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(1500);

    // 2. Click "Add to garage" button inside header
    const addToGarageBtn = page.locator('header button', { hasText: 'Add to garage' })
      .or(page.locator('header').getByRole('button', { name: 'Add to garage' }))
      .or(page.getByRole('button', { name: 'Add to garage' }))
      .first();

    await SelfHealing.click(addToGarageBtn, 'Add to garage button', this.timeoutMs);

    // 3. Click "Login" tab button in modal
    const loginTabBtn = page.getByRole('button', { name: 'Login' })
      .or(page.locator('button, [role="button"], a, span, div').filter({ hasText: /^Login$/i }))
      .first();

    await SelfHealing.click(loginTabBtn, 'Login tab button', 5000);

    // 4. Fill credentials
    await SelfHealing.fill(page.getByRole('textbox', { name: 'Email' }).first(), email, 'Email input');
    await SelfHealing.fill(page.getByRole('textbox', { name: 'Password' }).first(), password, 'Password input');

    // 5. Submit Login
    const submitBtn = page.getByRole('button', { name: 'Login' }).first();
    await SelfHealing.click(submitBtn, 'Submit Login button');

    // 6. Navigate to My Garage page
    await page.goto('https://classicdecoder.com/members/my-garage');
    console.log(`[AddToGarageWithLogin] Successfully landed on My Garage: ${page.url()}`);
  }
}
