import { expect, type Page, test } from '@playwright/test';

import { seriousViolations, settled } from './support/axe';
import { PORT } from './support/servers';

// Admin › Map / Committees (M8a). Tests create committees with names of their own and delete
// them again; the public map test reads its counts from the page.

async function signInAs(page: Page, persona: 'super-admin' | 'editor' | 'event-manager') {
  await page
    .context()
    .addCookies([{ name: 'eestec_mock_persona', value: persona, url: `http://localhost:${PORT}` }]);
}

const unique = () => Math.random().toString(36).slice(2, 8);
const table = (page: Page) => page.getByRole('table', { name: 'Map / Committees' });
const row = (page: Page, text: string) => table(page).getByRole('row').filter({ hasText: text });
const toast = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const dialog = (page: Page) => page.getByRole('dialog');

async function fillCommittee(
  page: Page,
  values: { name: string; city: string; country: string; lat: string; lng: string },
) {
  const form = dialog(page);
  await form.getByLabel('Name').fill(values.name);
  await form.getByLabel(/^City/).fill(values.city);
  await form.getByLabel('Country').selectOption({ label: values.country });
  await form.getByLabel('Latitude').fill(values.lat);
  await form.getByLabel('Longitude').fill(values.lng);
}

test.describe('committees admin (M8a)', () => {
  test('lists the committees with their type, country and the hint about the Home numbers', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'table columns are checked on desktop; phones get cards');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/map?size=100');
    await expect(page.getByRole('heading', { level: 1, name: 'Map / Committees' })).toBeVisible();
    await expect(page.getByText(/The big numbers on Home/)).toContainText(/\d+ committees in \d+ countries/);
    await expect(page.getByRole('link', { name: 'Home page › Statistics' })).toHaveAttribute(
      'href',
      '/admin/pages/home',
    );

    const skopje = row(page, 'LC Skopje');
    await expect(skopje).toContainText('North Macedonia');
    await expect(skopje).toContainText('Our committee');
    await expect(skopje).toContainText('eestec.mk');
    await expect(row(page, 'Observer Podgorica')).toContainText('Montenegro');
    await expect(page.getByRole('link', { name: /^All \d+$/ })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('link', { name: /^Observer \d+$/ }).click();
    await expect(page).toHaveURL(/status=observer/);
    await expect(row(page, 'Observer Podgorica')).toBeVisible();
    await expect(row(page, 'LC Belgrade')).toHaveCount(0);

    expect(await seriousViolations(page)).toEqual([]);
  });

  test('searches by name, city or country name, and shows the empty state', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/map?q=montenegro');
    await expect(row(page, 'Observer Podgorica')).toBeVisible();
    await page.goto('/admin/pages/map?q=zzz-nothing');
    await expect(page.getByRole('heading', { name: 'No committees match' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/q=/);
  });

  test('adds, edits and deletes a committee, with errors on the way', async ({ page, isMobile }) => {
    test.skip(isMobile, 'changes data: run once');
    const name = `LC Admin ${unique()}`;
    await signInAs(page, 'super-admin');
    await page.goto(`/admin/pages/map?q=${encodeURIComponent('admin ')}`);
    await page.getByRole('button', { name: 'Add committee' }).click();
    const form = dialog(page);

    // Empty form: every missing field is named.
    await form.getByRole('button', { name: 'Save committee' }).click();
    await expect(form.getByText('Fill in this field.').first()).toBeVisible();
    await expect(form.getByLabel('Name')).toBeFocused();
    await form.getByLabel('Name').fill(name);
    await form.getByLabel(/^City/).fill('Reykjavík');
    await form.getByLabel('Country').selectOption({ label: 'Iceland' });
    await form.getByLabel('Latitude').fill('north');
    await form.getByLabel('Longitude').fill('200');
    await form.getByRole('button', { name: 'Save committee' }).click();
    await expect(form.getByText('Enter a number, like 41.9981.')).toBeVisible();
    await form.getByLabel('Latitude').fill('64,15');
    await form.getByLabel('Longitude').fill('-21.94');
    await form.getByLabel('Type').selectOption({ label: 'Observer' });
    await form.getByLabel('Website or social page').fill('https://example.org/reykjavik');
    await settled(form);
    expect(await seriousViolations(page)).toEqual([]);
    await form.getByRole('button', { name: 'Save committee' }).click();
    await expect(toast(page, 'Committee added')).toBeVisible();
    await expect(row(page, name)).toContainText('Iceland');
    await expect(row(page, name)).toContainText('Observer');
    await expect(row(page, name)).toContainText('example.org');

    // The same name in the same country is refused.
    await page.getByRole('button', { name: 'Add committee' }).click();
    await fillCommittee(page, {
      name: name.toUpperCase(),
      city: 'Elsewhere',
      country: 'Iceland',
      lat: '1',
      lng: '2',
    });
    await dialog(page).getByRole('button', { name: 'Save committee' }).click();
    await expect(
      dialog(page).getByText('There is already a committee with this name in this country.'),
    ).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();

    // Edit.
    await row(page, name).getByRole('button', { name, exact: true }).click();
    await expect(dialog(page).getByLabel('Latitude')).toHaveValue('64.15');
    await dialog(page).getByLabel('Latitude').fill('64.14');
    await dialog(page).getByRole('button', { name: 'Save committee' }).click();
    await expect(toast(page, 'Committee saved')).toBeVisible();

    // The public map got it (pins are the committees).
    await page.goto('/en/design-system');
    await expect(
      page
        .locator('#committee-map')
        .getByRole('button', { name: new RegExp(`^${name} — Iceland, Observer$`) }),
    ).toBeAttached();

    // Delete.
    await page.goto(`/admin/pages/map?q=${encodeURIComponent(name)}`);
    await row(page, name)
      .getByRole('button', { name: /More actions/ })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const confirm = page.getByRole('alertdialog', { name: `Delete ${name}?` });
    await confirm.getByLabel(/Type DELETE/).fill('DELETE');
    await confirm.getByRole('button', { name: 'Delete committee' }).click();
    await expect(toast(page, 'Committee deleted')).toBeVisible();
    await expect(row(page, name)).toHaveCount(0);
  });

  test('our own committee (the red pin) can not be deleted', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one browser is enough');
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/map?q=skopje');
    await row(page, 'LC Skopje')
      .getByRole('button', { name: /More actions/ })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Delete LC Skopje?' });
    await expect(confirm).toContainText("Our own committee (the red pin) can't be deleted");
    await confirm.getByLabel(/Type DELETE/).fill('DELETE');
    await confirm.getByRole('button', { name: 'Delete committee' }).click();
    await expect(toast(page, "Our own committee can't be deleted")).toBeVisible();
    await expect(row(page, 'LC Skopje')).toBeVisible();
    // Its "ours" switch is locked.
    await row(page, 'LC Skopje').getByRole('button', { name: 'LC Skopje', exact: true }).click();
    await expect(dialog(page).getByRole('switch', { name: /This is our committee/ })).toBeDisabled();
  });

  test('imports a CSV: valid rows are added, the failed rows are listed with the problem', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'changes data: run once');
    const tag = unique();
    const good = `LC Import ${tag}`;
    const csv =
      'name;type;city;country;lat;lng;link\r\n' +
      `${good};LC;Tórshavn;Denmark;62,01;-6,77;https://example.org\r\n` +
      `Observer Import ${tag};observer;Tórshavn;Iceland;62.01;-6.77;\r\n` +
      `LC Bad Country ${tag};LC;Nowhere;Atlantis;1;2;\r\n` +
      `LC Bad Latitude ${tag};LC;North;Iceland;95;2;\r\n` +
      `LC Bad Type ${tag};Member;Here;Iceland;1;2;\r\n` +
      `;LC;No name;Iceland;1;2;\r\n`;
    await signInAs(page, 'super-admin');
    await page.goto('/admin/pages/map');
    await page.getByRole('button', { name: 'Import CSV' }).click();
    const form = dialog(page);

    // A file without the needed columns is explained.
    await form
      .locator('input[type="file"]')
      .setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('name,city\nLC A,B\n') });
    await expect(form.getByRole('alert')).toContainText('The file has no type, country, lat, lng column.');
    await expect(form.getByRole('button', { name: /^Import 0 committees$/ })).toBeDisabled();

    await form
      .locator('input[type="file"]')
      .setInputFiles({ name: 'committees.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await expect(form.getByRole('status')).toContainText('2 rows are ready to import; 4 rows have problems.');
    const failed = form.getByRole('table');
    await expect(failed.getByRole('row').filter({ hasText: `LC Bad Country ${tag}` })).toContainText(
      'Country: Choose one of the listed countries',
    );
    await expect(failed.getByRole('row').filter({ hasText: `LC Bad Country ${tag}` })).toContainText('4');
    await expect(failed.getByRole('row').filter({ hasText: `LC Bad Latitude ${tag}` })).toContainText(
      'Latitude: This is outside the possible range.',
    );
    await expect(failed.getByRole('row').filter({ hasText: `LC Bad Type ${tag}` })).toContainText(
      'Type: Use LC, Observer or JLC.',
    );
    await expect(
      failed
        .getByRole('row')
        .filter({ hasText: 'No name' })
        .or(failed.getByRole('row').filter({ hasText: /^\s*7/ })),
    ).toContainText('Name: Fill in this field.');
    await settled(form);
    expect(await seriousViolations(page)).toEqual([]);

    await form.getByRole('button', { name: 'Import 2 committees' }).click();
    await expect(toast(page, '2 committees added')).toBeVisible();
    await page.goto(`/admin/pages/map?q=${tag}`);
    await expect(row(page, good)).toContainText('Denmark');
    await expect(row(page, `Observer Import ${tag}`)).toContainText('Iceland');
    await expect(row(page, `LC Bad`)).toHaveCount(0);

    // Importing the same file again updates instead of adding.
    await page.getByRole('button', { name: 'Import CSV' }).click();
    await dialog(page)
      .locator('input[type="file"]')
      .setInputFiles({ name: 'committees.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await dialog(page).getByRole('button', { name: 'Import 2 committees' }).click();
    await expect(toast(page, '2 updated')).toBeVisible();

    // Clean up.
    await page.goto(`/admin/pages/map?q=${tag}`);
    await table(page)
      .getByRole('checkbox', { name: /Select all/ })
      .check();
    await page.getByRole('region', { name: 'Bulk actions' }).getByRole('button', { name: 'Delete' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Delete 2 committees?' });
    await confirm.getByLabel(/Type DELETE/).fill('DELETE');
    await confirm.getByRole('button', { name: 'Delete committees' }).click();
    await expect(toast(page, '2 committees deleted')).toBeVisible();
  });

  test('exports a CSV that can be imported again', async ({ page }) => {
    await signInAs(page, 'super-admin');
    const response = await page.request.get('/api/export/committees?q=montenegro');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-disposition']).toMatch(
      /^attachment; filename="committees-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    const csv = await response.text();
    expect(csv).toContain('name,type,city,country,lat,lng,link');
    expect(csv).toContain('Observer Podgorica,Observer,Podgorica,Montenegro,42.44,19.26,');
  });

  test('editors may change committees; event managers may not even open the page', async ({ page }) => {
    await signInAs(page, 'editor');
    await page.goto('/admin/pages/map');
    await expect(page.getByRole('button', { name: 'Add committee' })).toBeVisible();
    await signInAs(page, 'event-manager');
    await page.goto('/admin/pages/map');
    await expect(page).toHaveURL(/\/admin\?forbidden=1/);
    expect((await page.request.get('/api/export/committees')).status()).toBe(403);
  });
});
