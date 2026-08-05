import { test } from '@playwright/test';
import { Actor } from '../src/actors/Actor';
import { MappedVinGenerator, UnmappedVinGenerator } from '../src/tasks/GenerateVIN';
import { SelectVehicleSpecs, SafariSelectVehicleSpecs, PreviewVehicleDetail, NavigateToPreviewWithVin } from '../src/tasks/DecodeVIN';
import { CaptureDecodeApiResponse, CaptureUpdateDecodeApiResponse } from '../src/tasks/CaptureDecodeApi';
import { EmailGenerator } from '../src/tasks/GenerateEmail';
import { VHRPreviewToCheckout, BuildSheetPreviewToCheckout } from '../src/tasks/PreviewToCheckout';
import { EditVehicleSpecsOnPreview } from '../src/tasks/EditVehicleSpecs';

test.describe('Classic Decoder VIN Flows', () => {
  // Set suite timeout to 3 minutes (180s) to handle unmapped VIN decode calls (up to 2 mins)
  test.setTimeout(180_000);

  test('TC_01: Decode Mapped VIN', async ({ page }) => {
    const client = Actor.named('Customer', page);

    const mappedVin = MappedVinGenerator.getVin();
    console.log(`[Test] Mapped VIN generated for run: ${mappedVin}`);

    // 1. Start capturing /api/classic/decode JSON response in parallel (2-min condition timeout)
    const apiCaptureTask = CaptureDecodeApiResponse.withTimeout(120_000);
    const apiPromise = client.attemptsTo(apiCaptureTask);

    // 2. Navigate directly to preview URL with dynamic VIN
    await client.attemptsTo(
      new NavigateToPreviewWithVin(mappedVin)
    );

    await apiPromise;

    // 3. Extract and verify details on preview page
    await client.attemptsTo(
      new PreviewVehicleDetail()
    );
  });

  test('TC_02: Decode Unmapped VIN (Safari Flow)', async ({ page }) => {
    const client = Actor.named('Customer', page);

    const unmappedVin = UnmappedVinGenerator.getVin();
    console.log(`[Test TC_02] Unmapped VIN generated for run: ${unmappedVin}`);

    // 1. Start capturing /api/classic/decode JSON response in parallel (30s timeout)
    const apiCaptureTask = CaptureDecodeApiResponse.withTimeout(30_000);
    const apiPromise = client.attemptsTo(apiCaptureTask);

    // 2. Navigate directly to preview URL with unmapped dynamic VIN
    await client.attemptsTo(
      new NavigateToPreviewWithVin(unmappedVin)
    );

    await apiPromise;

    // 3. Unmapped VIN Flow: Wait up to 20 seconds for "Select Your Preferred Vehicle" screen / comboboxes
    console.log('[Test TC_02] Waiting up to 20s for "Select Your Preferred Vehicle" screen or comboboxes...');

    const selectionScreenLocator = page.getByRole('heading', { name: /Select Your Preferred Vehicle/i })
      .or(page.locator('text=/Select Your Preferred Vehicle/i'))
      .or(page.getByRole('combobox'))
      .first();

    const isSelectionScreenPresent = await selectionScreenLocator.waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (isSelectionScreenPresent) {
      console.log('[Test TC_02] "Select Your Preferred Vehicle" screen detected! Executing SafariSelectVehicleSpecs...');
      await client.attemptsTo(
        new SafariSelectVehicleSpecs({
          year: '1936',
          brand: 'Oldsmobile',
          model: 'L-Series Eight',
          version: 'Business Coupe'
        })
      );
    } else {
      console.log('[Test TC_02] 20s wait completed without dropdown form. Proceeding with last fallback (PreviewVehicleDetail)...');
      await client.attemptsTo(
        new PreviewVehicleDetail()
      );
    }
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

    // 1. Start listening for 'update-classic-decode' POST API response in parallel (30s condition timeout)
    const apiUpdateCaptureTask = CaptureUpdateDecodeApiResponse.withTimeout(30_000);
    const apiPromise = client.attemptsTo(apiUpdateCaptureTask);

    // 2. Navigate directly to preview URL with dynamic mapped VIN
    await client.attemptsTo(
      new NavigateToPreviewWithVin(mappedVin)
    );

    // 3. Perform Edit Vehicle Specs task on Preview page with condition timeout
    await client.attemptsTo(
      EditVehicleSpecsOnPreview.withYMM('1966', 'Aermacchi', 'ALA Verde Serie 1', 'Base', 30_000)
    );

    // 4. Await update-classic-decode POST API response capture
    await apiPromise;
  });

});







