import { test, expect } from '@playwright/test';

// Helper to navigate by tab label (bottom nav buttons have role button + label)
async function goToTab(page, label) {
  await page.getByRole('button', { name: label, exact: true }).click();
}

// Reusable function to create a client + single timed entry for a new job
async function createClientAndJobEntry(page, { clientName, jobName }) {
  await goToTab(page, 'Clients');
  await page.getByRole('button', { name: '➕ Add Client' }).click();
  await page.getByLabel('Client Name').fill(clientName);
  await page.getByLabel('Contact Info').fill(clientName.toLowerCase().replace(/\s+/g,'') + '@example.com');
  await page.getByLabel('Hourly Rate ($)').fill('100');
  await page.locator('form').getByRole('button', { name: /Add Client/ }).click();
  await expect(page.getByText(clientName)).toBeVisible();

  await goToTab(page, 'Timer');
  const clientSelect = page.locator('.form-group').locator('label:has-text("Client")').first().locator('..').locator('select');
  await clientSelect.selectOption({ label: clientName });
  await page.getByPlaceholder('Type new job name...').fill(jobName);
  await page.getByRole('button', { name: '▶️ START' }).click();
  await page.waitForTimeout(1200); // allow >1s for non-zero duration
  await page.getByRole('button', { name: '⏹️ STOP' }).click();
  // Assert via Recent Activity item, not the Job select option
  await expect(page.locator('.activity-main').filter({ hasText: jobName })).toBeVisible();
}

test.describe('CrickTime Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Fresh storage each test
    await page.goto('about:blank');
    // Auto-accept any confirm dialogs
    page.on('dialog', async (dialog) => {
      try { await dialog.accept(); } catch {}
    });
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
  });

  test('Add client, track time, create job invoice', async ({ page }) => {
    await createClientAndJobEntry(page, { clientName: 'Acme Motors', jobName: 'Brake Replacement' });

    // Confirm job visible in Jobs tab before invoicing (guards against race condition)
    await goToTab(page, 'Jobs');
    await expect(page.getByText('Brake Replacement')).toBeVisible();

    // Go invoice by job
    await goToTab(page, 'Invoice');
    await page.getByRole('button', { name: 'By Job' }).click();
    const invoiceClientSelect = page.locator('label:has-text("Client")').first().locator('..').locator('select');
    await invoiceClientSelect.selectOption({ label: 'Acme Motors' });

    const today = new Date().toISOString().slice(0,10);
    await page.getByLabel('Start Date').fill(today);
    await page.getByLabel('End Date').fill(today);

    const jobSelect = page.locator('label:has-text("Job")').first().locator('..').locator('select');
    // Wait for dropdown population via entries filter
    await expect(jobSelect.locator('option')).toContainText(['-- Select Job --','Brake Replacement']);
    await jobSelect.selectOption({ label: 'Brake Replacement' });

  await page.getByRole('button', { name: /Generate Job Invoice/ }).click();
    await expect(page.getByRole('heading', { name: 'Invoice' })).toBeVisible();
    await expect(page.locator('.job-title').filter({ hasText: 'Brake Replacement' })).toBeVisible();
    // Wait for line items to render
    await expect(page.locator('.individual-job-card').first()).toBeVisible();
    // Ensure items are selected to enable finalize and wait for button to be enabled
    const selectAllBtn = page.getByRole('button', { name: 'Select All' });
    if (await selectAllBtn.isVisible()) {
      await selectAllBtn.click();
    }
  const finalizeBtn = page.getByRole('button', { name: 'Finalize invoice and mark entries invoiced' });
    await expect(finalizeBtn).toBeEnabled();
    await finalizeBtn.click();
    await expect(page.getByText(/Finalized/)).toBeVisible();
  });

  test('Close job on finalize invoice (checkbox)', async ({ page }) => {
    await createClientAndJobEntry(page, { clientName: 'Beta Auto', jobName: 'Oil Change' });

    // Invoice flow with Close Job
    await goToTab(page, 'Invoice');
    await page.getByRole('button', { name: 'By Job' }).click();
    const clientSel = page.locator('label:has-text("Client")').first().locator('..').locator('select');
    await clientSel.selectOption({ label: 'Beta Auto' });
    const today = new Date().toISOString().slice(0,10);
    await page.getByLabel('Start Date').fill(today);
    await page.getByLabel('End Date').fill(today);
    const jobSel = page.locator('label:has-text("Job")').first().locator('..').locator('select');
    await expect(jobSel.locator('option')).toContainText(['Oil Change']);
    await jobSel.selectOption({ label: 'Oil Change' });
  await page.getByRole('button', { name: /Generate Job Invoice/ }).click();
  await expect(page.getByRole('heading', { name: 'Invoice' })).toBeVisible();
    // Enable Close Job checkbox then finalize
    const closeJobCheckbox = page.locator('label:has-text("Close Job") input[type="checkbox"]');
    await closeJobCheckbox.check();
    const selectAllBtn2 = page.getByRole('button', { name: 'Select All' });
    if (await selectAllBtn2.isVisible()) {
      await selectAllBtn2.click();
    }
  const finalizeBtn2 = page.getByRole('button', { name: 'Finalize invoice and mark entries invoiced' });
    await expect(finalizeBtn2).toBeEnabled();
    await finalizeBtn2.click();
    await expect(page.getByText(/Finalized/)).toBeVisible();
    // Back and verify job moved to Closed Jobs
    await page.getByRole('button', { name: 'Back' }).click();
    await goToTab(page, 'Jobs');
    // Oil Change should appear under Closed Jobs section (opacity-70 class)
    await expect(page.getByText('Closed Jobs')).toBeVisible();
    await expect(page.getByText('Oil Change')).toBeVisible();
  });

  test('Charges-only job invoicing', async ({ page }) => {
    // Add client
    await goToTab(page, 'Clients');
    await page.getByRole('button', { name: '➕ Add Client' }).click();
    await page.getByLabel('Client Name').fill('Gamma Garage');
    await page.getByLabel('Contact Info').fill('gamma@example.com');
    await page.getByLabel('Hourly Rate ($)').fill('120');
    await page.locator('form').getByRole('button', { name: /Add Client/ }).click();
    await expect(page.getByText('Gamma Garage')).toBeVisible();

  // Create a job via Timer, then delete the entry to keep job without entries
  await goToTab(page, 'Timer');
  const clientSelect2 = page.locator('.form-group').locator('label:has-text("Client")').first().locator('..').locator('select');
  await clientSelect2.selectOption({ label: 'Gamma Garage' });
  await page.getByPlaceholder('Type new job name...').fill('Alternator Swap');
  await page.getByRole('button', { name: '▶️ START' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '⏹️ STOP' }).click();
  // Delete the created entry
  await goToTab(page, 'Entries');
  await page.getByRole('button', { name: 'Delete entry' }).first().click();
  // Confirm dialog is auto-accepted in beforeEach via page.on('dialog')
  await page.waitForTimeout(250);

    // Add a charge to that job
  await goToTab(page, 'Jobs');
  // Wait for Jobs content and the new job to appear
  await expect(page.getByRole('heading', { name: /Open Jobs/ })).toBeVisible();
  await expect(page.locator('.job-title').filter({ hasText: 'Alternator Swap' })).toBeVisible();
  // Open charges panel for the job
  await page.getByRole('button', { name: 'Toggle charges for job Alternator Swap' }).click();
    // Fill charge form
    await page.getByPlaceholder('Description').fill('Alternator');
    await page.getByPlaceholder('Qty').fill('1');
    await page.getByPlaceholder('Cost').fill('150');
    await page.getByPlaceholder('Price').fill('250');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  // Verify charge listed and subtotal (avoid strict mode by matching detailed row text)
  await expect(page.getByText('Alternator (1 x $250.00)')).toBeVisible();
    await expect(page.getByText('Charges Total')).toBeVisible();

    // Generate invoice by job for charges-only
    await goToTab(page, 'Invoice');
    await page.getByRole('button', { name: 'By Job' }).click();
    const invoiceClientSel = page.locator('label:has-text("Client")').first().locator('..').locator('select');
  await invoiceClientSel.selectOption({ label: 'Gamma Garage' });
  const today = new Date().toISOString().slice(0,10);
  await page.getByLabel('Start Date').fill(today);
  await page.getByLabel('End Date').fill(today);
    const jobSel = page.locator('label:has-text("Job")').first().locator('..').locator('select');
    await expect(jobSel.locator('option')).toContainText(['Alternator Swap']);
    await jobSel.selectOption({ label: 'Alternator Swap' });
    await page.getByRole('button', { name: /Generate Job Invoice/ }).click();
  await expect(page.getByRole('heading', { name: 'Invoice' })).toBeVisible();
  await expect(page.locator('.individual-job-card').first()).toBeVisible();
  await expect(page.locator('.job-title').filter({ hasText: 'Alternator' })).toBeVisible();
    const selectAllBtn = page.getByRole('button', { name: 'Select All' });
    if (await selectAllBtn.isVisible()) {
      await selectAllBtn.click();
    }
    const finalizeBtn = page.getByRole('button', { name: 'Finalize invoice and mark entries invoiced' });
    await expect(finalizeBtn).toBeEnabled();
    await finalizeBtn.click();
    await expect(page.getByText(/Finalized/)).toBeVisible();
  });
});
