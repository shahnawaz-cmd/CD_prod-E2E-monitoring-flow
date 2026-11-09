import { test } from '@playwright/test';
import { Actor } from '../src/actors/Actor';
import { MappedVinGenerator, UnmappedVinGenerator } from '../src/tasks/GenerateVIN';
import { NavigateToPreviewWithVin } from '../src/tasks/DecodeVIN';
import { DecodeDirectMappedVIN } from '../src/tasks/DecodeDirectMappedVIN';
import { DecodeUnmappedVIN } from '../src/tasks/DecodeUnmappedVIN';
import { CaptureDecodeApiResponse, CaptureUpdateDecodeApiResponse, CaptureGarageApiResponse } from '../src/tasks/CaptureDecodeApi';
import { EmailGenerator } from '../src/tasks/GenerateEmail';
import { PasswordGenerator, PhoneGenerator } from '../src/tasks/GenerateCredentials';
import { VHRPreviewToCheckout, BuildSheetPreviewToCheckout } from '../src/tasks/PreviewToCheckout';
import { EditVehicleSpecsOnPreview } from '../src/tasks/EditVehicleSpecs';
import { AddToGarageWithSignup, AddToGarageWithLogin } from '../src/tasks/AddToGarage';

test.describe('Classic Decoder VIN Flows', () => {
  // Set suite timeout to 3 minutes (180s) to handle unmapped VIN decode calls (up to 2 mins)
  test.setTimeout(180_000);

  test('TC_01: Decode Mapped VIN', async ({ page }) => {
    const client = Actor.named('Customer', page);

    const mappedVin = MappedVinGenerator.getVin();
    console.log(`[Test TC_01] Mapped VIN generated for run: ${mappedVin}`);

    // 1. Start capturing /api/classic/decode JSON response in parallel
    const apiCaptureTask = new CaptureDecodeApiResponse();
    const apiPromise = client.attemptsTo(apiCaptureTask);

    // 2. Navigate to preview URL with dynamic VIN
    await client.attemptsTo(
      NavigateToPreviewWithVin.forUnmapped(mappedVin)
    );

    await apiPromise;

    // 3. Perform Mapped Decode Task (Direct Preview + Automatic Fallback for Yes -> Role -> Preview)
    await client.attemptsTo(new DecodeDirectMappedVIN());
  });

  test('TC_02: Decode Unmapped VIN (Safari Flow)', async ({ page }) => {
    const client = Actor.named('Customer', page);

    const unmappedVin = UnmappedVinGenerator.getVin();
    console.log(`[Test TC_02] Unmapped VIN generated for run: ${unmappedVin}`);

    // 1. Start capturing /api/classic/decode JSON response in parallel
    const apiCaptureTask = new CaptureDecodeApiResponse();
    const apiPromise = client.attemptsTo(apiCaptureTask);

    // 2. Navigate to preview URL with unmapped dynamic VIN (disables auto-yes confirmation)
    await client.attemptsTo(
      NavigateToPreviewWithVin.forUnmapped(unmappedVin)
    );

    await apiPromise;

    // 3. Perform Unmapped Decode Task (1st Tier: No -> Role -> YMMT Dropdowns -> Preview | Fallback: Direct Preview)
    await client.attemptsTo(new DecodeUnmappedVIN());
  });

  test('TC_03: Preview to Checkout Redirection Verification (VHR)', async ({ page }) => {
    const client = Actor.named('Customer', page);

    const mappedVin = MappedVinGenerator.getVin();
    const dynamicEmail = EmailGenerator.generate('instant.vinreport22@gmail.com');

    console.log(`[Test TC_03] Generated dynamic VIN: ${mappedVin}`);
    console.log(`[Test TC_03] Generated dynamic email: ${dynamicEmail}`);

    // 1. VIN decode via URL (land on Preview page with type=vhr)
    await client.attemptsTo(
      new NavigateToPreviewWithVin(mappedVin, 'homepage', 'vhr')
    );

    // 2. Perform Preview to Checkout task (click Access button, input email, proceed to checkout)
    await client.attemptsTo(
      VHRPreviewToCheckout.withEmail(dynamicEmail)
    );
  });

  test('TC_04: Build Sheet (Sticker) Preview to Checkout Redirection Verification', async ({ page }) => {
    const client = Actor.named('Customer', page);

    const mappedVin = MappedVinGenerator.getVin();
    const dynamicEmail = EmailGenerator.generate('instant.vinreport22@gmail.com');

    console.log(`[Test TC_04] Generated dynamic VIN: ${mappedVin}`);
    console.log(`[Test TC_04] Generated dynamic email: ${dynamicEmail}`);

    // 1. VIN decode via URL with type=sticker (land on Sticker Preview page)
    await client.attemptsTo(
      new NavigateToPreviewWithVin(mappedVin, 'homepage', 'sticker')
    );

    // 2. Perform Build Sheet Preview to Checkout task (click Access Build Sheet, input email, proceed to checkout)
    await client.attemptsTo(
      BuildSheetPreviewToCheckout.withEmail(dynamicEmail)
    );
  });

  test('TC_05: Edit Vehicle Specs on Preview Page Verification', async ({ page }) => {
    const client = Actor.named('Customer', page);

    const mappedVin = MappedVinGenerator.getVin();
    console.log(`[Test TC_05] Generated dynamic mapped VIN: ${mappedVin}`);

    // 1. Start listening for 'update-classic-decode' POST API response in parallel
    const apiUpdateCaptureTask = new CaptureUpdateDecodeApiResponse();
    const apiPromise = client.attemptsTo(apiUpdateCaptureTask);

    // 2. Navigate directly to preview URL with dynamic mapped VIN
    await client.attemptsTo(
      new NavigateToPreviewWithVin(mappedVin)
    );

    // 3. Perform Edit Vehicle Specs task on Preview page
    await client.attemptsTo(
      EditVehicleSpecsOnPreview.withYMM('1966', 'Aermacchi', 'ALA Verde Serie 1', 'Base')
    );

    // 4. Await update-classic-decode POST API response capture
    await apiPromise;
  });

  test('TC_06: Add to Garage Flow with Signup Verification', async ({ page }) => {
    const client = Actor.named('Customer', page);

    const mappedVin = MappedVinGenerator.getVin();
    console.log(`[Test TC_06] Generated dynamic mapped VIN: ${mappedVin}`);

    // 1. Start listening for '/api/garage' request payload & response in parallel
    const garageApiCapture = new CaptureGarageApiResponse();
    const garageApiPromise = client.attemptsTo(garageApiCapture);

    // 2. VIN decode via URL (land on Preview page)
    await client.attemptsTo(
      new NavigateToPreviewWithVin(mappedVin)
    );

    // 3. Perform Add to Garage with Signup flow (clicks Add to Garage, fills unique signup credentials, lands on /members/my-garage)
    await client.attemptsTo(
      AddToGarageWithSignup.withCredentials({})
    );

    await garageApiPromise;
  });

  test('TC_07: Add to Garage Flow with Existing User Login Verification', async ({ page }) => {
    const client = Actor.named('Customer', page);

    const mappedVin = MappedVinGenerator.getVin();
    const dynamicEmail = EmailGenerator.generate('instant.vinreport22@gmail.com');
    const dynamicPassword = PasswordGenerator.generate('Pass321654');
    const dynamicPhone = PhoneGenerator.generate('0315');

    console.log(`[Test TC_07] Generated dynamic VIN: ${mappedVin}`);
    console.log(`[Test TC_07] Registering credentials - Email: "${dynamicEmail}", Password: "${dynamicPassword}"`);

    // 1. Step 1: Register account via Add to Garage Signup flow
    await client.attemptsTo(
      new NavigateToPreviewWithVin(mappedVin)
    );

    await client.attemptsTo(
      AddToGarageWithSignup.withCredentials({
        email: dynamicEmail,
        password: dynamicPassword,
        phone: dynamicPhone
      })
    );

    // 2. Step 2: Clear cookies to log out and simulate returning user
    console.log('[Test TC_07] Clearing cookies to log out user...');
    await page.context().clearCookies();

    // 3. Step 3: Start listening for '/api/garage' during login flow & re-navigate to Preview page
    console.log('[Test TC_07] Testing Existing User Login flow...');

    const garageApiCapture = new CaptureGarageApiResponse();
    const garageApiPromise = client.attemptsTo(garageApiCapture);

    await client.attemptsTo(
      new NavigateToPreviewWithVin(mappedVin)
    );

    await client.attemptsTo(
      AddToGarageWithLogin.withCredentials({
        email: dynamicEmail,
        password: dynamicPassword
      })
    );

    await garageApiPromise;
  });

});
