import { expect, test, type Page } from '@playwright/test';

const tones = ['yellow', 'coral', 'mint', 'blue'] as const;
const spotifyEndpoint = 'https://api.joshspicer.com/api/spotify';

test.beforeEach(async ({ page }) => {
  await page.route(spotifyEndpoint, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        artistName: 'CI Artist',
        isPlaying: false,
        songName: 'CI Song',
      },
    });
  });
});

const chooseTone = async (page: Page, index: number) => {
  await page.addInitScript((randomValue) => {
    Math.random = () => randomValue;
  }, (index + 0.5) / tones.length);
};

const readTheme = (page: Page) =>
  page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      theme: document.documentElement.dataset.theme ?? null,
      paper: style.getPropertyValue('--paper').trim(),
      themeColor:
        document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
          ?.content ?? null,
    };
  });

for (const [index, tone] of tones.entries()) {
  test(`loads the ${tone} highlight before paint`, async ({ page }) => {
    await chooseTone(page, index);
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute(
      'data-highlight-tone',
      tone,
    );

    const highlights = await page.evaluate(() => {
      const heading = document.querySelector('.marker-heading span');
      const inline = document.querySelector('.marker-highlight');
      if (!(heading instanceof HTMLElement) || !(inline instanceof HTMLElement)) {
        throw new Error('Expected homepage highlights were not rendered.');
      }

      return {
        heading: getComputedStyle(heading).backgroundImage,
        inline: getComputedStyle(inline).backgroundImage,
      };
    });

    expect(highlights.heading).toBe(highlights.inline);
  });
}

test('clicking either highlight cycles every highlight together', async ({
  page,
}) => {
  await chooseTone(page, 0);
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-tone',
    'yellow',
  );
  await page.locator('.marker-heading span').click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-tone',
    'coral',
  );
  const inlineHighlight = page.locator('.marker-highlight');
  expect(await inlineHighlight.evaluate((node) => node.tagName)).toBe('SPAN');
  await expect(inlineHighlight).not.toHaveAttribute('href', /.+/);
  await inlineHighlight.click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-tone',
    'mint',
  );

  const backgrounds = await page
    .locator('.marker-heading span, .marker-highlight')
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).backgroundImage),
    );
  expect(new Set(backgrounds).size).toBe(1);
});

test('Spotify status renders from the expected API response shape', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');

  await expect(page.locator('[data-listening-status]')).toHaveText(
    '♪ Last played CI Song by CI Artist.',
  );
  await expect(page.locator('[data-now-listening]')).toHaveAttribute(
    'data-state',
    'idle',
  );
  expect(consoleErrors).toEqual([]);
});

test('system dark mode and explicit theme choices stay synchronized', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  expect(await readTheme(page)).toEqual({
    theme: null,
    paper: '#383934',
    themeColor: '#383934',
  });
  await expect(page.locator('[data-theme-toggle]')).toHaveAttribute(
    'aria-label',
    'Switch to light theme',
  );

  await page.locator('[data-theme-toggle]').click();
  expect(await readTheme(page)).toEqual({
    theme: 'light',
    paper: '#f6f3eb',
    themeColor: '#f6f3eb',
  });
  expect(await page.evaluate(() => localStorage.getItem('site-theme'))).toBe(
    'light',
  );

  await page.reload();
  expect(await readTheme(page)).toEqual({
    theme: 'light',
    paper: '#f6f3eb',
    themeColor: '#f6f3eb',
  });

  await page.locator('[data-theme-toggle]').click();
  expect(await readTheme(page)).toEqual({
    theme: 'dark',
    paper: '#383934',
    themeColor: '#383934',
  });
  expect(await page.evaluate(() => localStorage.getItem('site-theme'))).toBe(
    'dark',
  );
});

test('dark theme text and every highlight tone meet contrast requirements', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  const contrast = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const parseHex = (value: string) =>
      [1, 3, 5].map((index) =>
        Number.parseInt(value.slice(index, index + 2), 16),
      );
    const luminance = (value: string) => {
      const channels = parseHex(value).map((entry) => {
        const channel = entry / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return (
        0.2126 * channels[0] +
        0.7152 * channels[1] +
        0.0722 * channels[2]
      );
    };
    const ratio = (first: string, second: string) => {
      const a = luminance(first);
      const b = luminance(second);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const token = (name: string) => style.getPropertyValue(name).trim();
    const paper = token('--paper');
    const highlightInk = token('--highlight-ink');
    const highlightTones = ['yellow', 'coral', 'mint', 'blue'];

    return {
      body: ratio(paper, token('--ink')),
      muted: ratio(paper, token('--muted')),
      highlights: highlightTones.map((tone) =>
        ratio(token(`--highlight-${tone}`), highlightInk),
      ),
    };
  });

  expect(contrast.body).toBeGreaterThanOrEqual(7);
  expect(contrast.muted).toBeGreaterThanOrEqual(4.5);
  for (const ratio of contrast.highlights) {
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
});

test('portrait-free homepage and footer remain responsive', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.portrait')).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Josh Spicer' }).getByRole('heading', {
      name: 'Josh Spicer',
      level: 1,
    }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktop = await page.locator('.site-footer').evaluate((footer) => {
    const meta = footer.querySelector('.footer-meta');
    const links = footer.querySelector('.footer-links');
    const toggle = footer.querySelector('[data-theme-toggle]');
    const toggleBox = toggle?.getBoundingClientRect();
    const linksBox = links?.getBoundingClientRect();

    return {
      toggleInMeta: Boolean(meta?.contains(toggle)),
      toggleInLinks: Boolean(links?.contains(toggle)),
      separated: Boolean(toggleBox && linksBox && toggleBox.right < linksBox.left),
    };
  });
  expect(desktop).toEqual({
    toggleInMeta: true,
    toggleInLinks: false,
    separated: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.locator('.site-footer').evaluate((footer) => {
    const meta = footer.querySelector('.footer-meta')?.getBoundingClientRect();
    const links = footer.querySelector('.footer-links')?.getBoundingClientRect();

    return {
      stacked: Boolean(meta && links && meta.bottom <= links.top),
      leftAligned: Boolean(
        meta && links && Math.abs(meta.left - links.left) < 1,
      ),
      footerOverflow: footer.scrollWidth > footer.clientWidth,
      pageOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    };
  });
  expect(mobile).toEqual({
    stacked: true,
    leftAligned: true,
    footerOverflow: false,
    pageOverflow: false,
  });
});

test('heading highlights grow without changing inline layout footprint', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const dimensions = await page.evaluate(() => {
    const measure = (selector: string) => {
      const node = document.querySelector(selector);
      if (!(node instanceof HTMLElement)) {
        throw new Error(`Missing highlight: ${selector}`);
      }
      const style = getComputedStyle(node);
      const padding = Number.parseFloat(style.paddingLeft);
      const margin = Number.parseFloat(style.marginLeft);
      return { padding, margin, footprint: padding + margin };
    };

    return {
      heading: measure('.marker-heading span'),
      inline: measure('.marker-highlight'),
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    };
  });

  expect(dimensions.heading.padding).toBeCloseTo(2.88, 2);
  expect(dimensions.inline.padding).toBeCloseTo(1.6, 2);
  expect(dimensions.heading.footprint).toBeCloseTo(3.52, 2);
  expect(dimensions.inline.footprint).toBeCloseTo(3.52, 2);
  expect(dimensions.overflow).toBe(false);
});

test('the SVG pepper is the only favicon and also powers the header mark', async ({
  page,
  request,
}) => {
  await page.goto('/');

  const iconLinks = page.locator('link[rel="icon"]');
  await expect(iconLinks).toHaveCount(1);
  await expect(iconLinks).toHaveAttribute('type', 'image/svg+xml');
  await expect(iconLinks).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('.site-mark img')).toHaveAttribute(
    'src',
    '/favicon.svg',
  );

  const svg = await request.get('/favicon.svg');
  expect(svg.status()).toBe(200);
  expect(svg.headers()['content-type']).toContain('image/svg+xml');
  expect(await svg.text()).toMatch(/^\s*<svg[\s>]/);

  const ico = await request.get('/favicon.ico');
  expect(ico.status()).toBe(404);
});

test('highlighted prose links use dark underlines in dark mode', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/tankgame/');

  const appStoreLink = page
    .locator('.prose a:has(> strong)')
    .filter({ hasText: 'App Store!' });
  await expect(appStoreLink).toBeVisible();

  const colors = await appStoreLink.evaluate((link) => {
    const strong = link.querySelector('strong');
    if (!(strong instanceof HTMLElement)) {
      throw new Error('Expected highlighted text inside the App Store link.');
    }
    return {
      underline: getComputedStyle(link).textDecorationColor,
      text: getComputedStyle(strong).color,
    };
  });
  expect(colors.underline).toBe(colors.text);
  expect(colors.underline).toBe('rgb(32, 32, 30)');
});
