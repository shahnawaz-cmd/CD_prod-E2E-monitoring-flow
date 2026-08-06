import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { EmailGenerator } from './GenerateEmail';
import { PasswordGenerator, PhoneGenerator } from './GenerateCredentials';

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
 * Performs the 'Add to garage' signup flow on the Preview page using the exact simple locator sequence provided.
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

    console.log(`[AddToGarageWithSignup] Executing signup flow with unique data (Email: "${email}", Password: "${password}", Phone: "${phone}")...`);

    // Wait for JS hydration
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(2000);

    const addToGarageBtn = page.locator('header button', { hasText: 'Add to garage' })
      .or(page.locator('header').getByRole('button', { name: 'Add to garage' }))
      .or(page.getByRole('button', { name: 'Add to garage' }))
      .first();

    await addToGarageBtn.waitFor({ state: 'visible', timeout: this.timeoutMs });
    await addToGarageBtn.click({ force: true }).catch(async () => {
      await addToGarageBtn.click();
    });

    const signupBtn = page.getByRole('button', { name: 'Signup' })
      .or(page.locator('button, [role="button"], a, span, div').filter({ hasText: /^Signup$/i }))
      .first();

    const isModalOpen = await signupBtn.waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    if (!isModalOpen) {
      await addToGarageBtn.evaluate((el: any) => (el as HTMLElement).click());
      await page.waitForTimeout(1000);
    }

    await signupBtn.click({ force: true }).catch(async () => {
      await signupBtn.click();
    });

    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill(email);

    await page.getByRole('textbox', { name: 'Password', exact: true }).click();
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);

    await page.getByRole('textbox', { name: 'Confirm Password' }).click();
    await page.getByRole('textbox', { name: 'Confirm Password' }).fill(password);

    await page.getByRole('textbox', { name: 'Phone' }).click();
    await page.getByRole('textbox', { name: 'Phone' }).fill(phone);

    await page.getByRole('button', { name: 'Signup' }).click();

    await page.goto('https://classicdecoder.com/members/my-garage');
    console.log(`[AddToGarageWithSignup] Successfully executed page.goto('https://classicdecoder.com/members/my-garage'). Current URL: ${page.url()}`);
  }
}

/**
 * Task: AddToGarageWithLogin
 * Performs the 'Add to garage' login flow on the Preview page for existing users with 2s JS hydration wait and JS click guard.
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

    console.log(`[AddToGarageWithLogin] Executing Add to Garage login flow for existing user (Email: "${email}")...`);

    // 1. Wait for JS framework hydration on Preview page landing
    console.log('[AddToGarageWithLogin] Waiting for JS framework hydration pause (2s)...');
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(2000);

    // 2. Click "Add to garage" button inside header
    const addToGarageBtn = page.locator('header button', { hasText: 'Add to garage' })
      .or(page.locator('header').getByRole('button', { name: 'Add to garage' }))
      .or(page.getByRole('button', { name: 'Add to garage' }))
      .first();

    await addToGarageBtn.waitFor({ state: 'visible', timeout: this.timeoutMs });
    await addToGarageBtn.click({ force: true }).catch(async () => {
      await addToGarageBtn.click();
    });

    // Guard: If modal is not open yet, dispatch direct JS DOM click
    const loginTabBtn = page.getByRole('button', { name: 'Login' })
      .or(page.locator('button, [role="button"], a, span, div').filter({ hasText: /^Login$/i }))
      .first();

    const isModalOpen = await loginTabBtn.waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    if (!isModalOpen) {
      console.log('[AddToGarageWithLogin] Modal not open yet. Re-dispatching direct JS click on "Add to garage"...');
      await addToGarageBtn.evaluate((el: any) => (el as HTMLElement).click());
      await page.waitForTimeout(1000);
    }

    // 3. Click "Login" button in modal
    console.log('[AddToGarageWithLogin] Clicking "Login" button in modal...');
    await loginTabBtn.click({ force: true }).catch(async () => {
      await loginTabBtn.click();
    });

    // 4. Fill Email field
    console.log('[AddToGarageWithLogin] Filling Email...');
    const emailField = page.getByRole('textbox', { name: 'Email' }).first();
    await emailField.click();
    await emailField.fill(email);

    // 5. Fill Password field
    console.log('[AddToGarageWithLogin] Filling Password...');
    const passwordField = page.getByRole('textbox', { name: 'Password' }).first();
    await passwordField.click();
    await passwordField.fill(password);

    // 6. Click Login submission button
    console.log('[AddToGarageWithLogin] Submitting Login form...');
    const submitBtn = page.getByRole('button', { name: 'Login' }).first();
    await submitBtn.click({ force: true }).catch(async () => {
      await submitBtn.click();
    });

    // 7. Navigate to My Garage page
    await page.goto('https://classicdecoder.com/members/my-garage');
    console.log(`[AddToGarageWithLogin] Successfully executed page.goto('https://classicdecoder.com/members/my-garage'). Current URL: ${page.url()}`);
  }
}
