import { expect, test, type Page } from '@playwright/test';

const tones = ['yellow', 'coral', 'mint', 'blue'] as const;
const animations = {
  a: 'highlight-shuffle-tick',
  b: 'highlight-jackpot-land',
  c: 'highlight-step-reel',
  d: 'highlight-marker-wipe',
} as const;
const analyticsScript =
  'https://www.googletagmanager.com/gtag/js?id=UA-43238538-1';
const spotifyEndpoint = 'https://api.joshspicer.com/api/spotify';
const repositoryEditorUrl =
  'https://github.dev/joshspicer/joshspicer.github.io';

test.beforeEach(async ({ page }) => {
  await page.route(analyticsScript, async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: '',
    });
  });
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

const captureEditorNavigation = async (page: Page, expectedUrl: string) => {
  const navigation = page.waitForRequest(expectedUrl);
  await page.route('https://github.dev/**', async (route) => {
    await route.abort();
  });

  await page.keyboard.press('.');
  expect((await navigation).url()).toBe(expectedUrl);
};

test('period opens the repository root from the home page', async ({ page }) => {
  await page.goto('/');

  await captureEditorNavigation(page, repositoryEditorUrl);
});

test('period opens the current post source from a post page', async ({
  page,
}) => {
  await page.goto('/tankgame/');

  await captureEditorNavigation(
    page,
    `${repositoryEditorUrl}/blob/master/src/content/blog/2026-01-24-tankgame.md`,
  );
});

test('period does not navigate while typing in an editable element', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Shortcut test input');
    document.body.append(input);
  });
  const input = page.getByLabel('Shortcut test input');

  await input.press('.');

  await expect(input).toHaveValue('.');
  await expect(page).toHaveURL('/');
});

test('the legacy Google Analytics tag initializes on every page', async ({
  page,
}) => {
  await page.goto('/');

  const loader = page.locator(`script[src="${analyticsScript}"]`);
  await expect(loader).toHaveCount(1);
  await expect(loader).toHaveAttribute('async', '');

  const analytics = await page.evaluate(() => {
    const analyticsWindow = window as typeof window & {
      dataLayer: IArguments[];
      gtag: (...args: unknown[]) => void;
    };
    return {
      configuredProperty: Array.from(analyticsWindow.dataLayer[1] ?? []),
      dataLayerLength: analyticsWindow.dataLayer.length,
      hasGtag: typeof analyticsWindow.gtag === 'function',
    };
  });

  expect(analytics).toEqual({
    configuredProperty: ['config', 'UA-43238538-1'],
    dataLayerLength: 2,
    hasGtag: true,
  });
});

const chooseTone = async (page: Page, index: number) => {
  await page.addInitScript((randomValue) => {
    Math.random = () => randomValue;
  }, (index + 0.5) / tones.length);
};

const traceHighlightIntro = async (page: Page) => {
  await page.addInitScript(() => {
    const trace = {
      animations: [] as string[],
      motions: [] as string[],
      nodeSpins: 0,
      tones: [] as string[],
    };
    Object.assign(window, { __highlightIntroTrace: trace });
    document.addEventListener(
      'animationstart',
      (event) => trace.animations.push(event.animationName),
      true,
    );
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        new MutationObserver((records) => {
          for (const record of records) {
            if (record.attributeName === 'data-highlight-node-spinning') {
              trace.nodeSpins += 1;
            }
            if (
              record.attributeName === 'data-highlight-motion' &&
              document.documentElement.dataset.highlightMotion
            ) {
              trace.motions.push(
                document.documentElement.dataset.highlightMotion,
              );
            }
            if (
              record.attributeName === 'data-highlight-tone' &&
              document.documentElement.dataset.highlightTone
            ) {
              trace.tones.push(document.documentElement.dataset.highlightTone);
            }
          }
        }).observe(document.documentElement, {
          attributeFilter: [
            'data-highlight-motion',
            'data-highlight-node-spinning',
            'data-highlight-tone',
          ],
          subtree: true,
        });
      },
      { once: true },
    );
  });
};

const readHighlightTrace = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as typeof window & {
          __highlightIntroTrace: {
            animations: string[];
            motions: string[];
            nodeSpins: number;
            tones: string[];
          };
        }
      ).__highlightIntroTrace,
  );

const openSettings = async (page: Page) => {
  const button = page.locator('[data-settings-toggle]');
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-settings-menu]')).toBeVisible();
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
    await page.emulateMedia({ reducedMotion: 'reduce' });
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

for (const [animation, expectedKeyframe] of Object.entries(animations)) {
  test(`animation ${animation} lands on the selected session tone`, async ({
    page,
  }) => {
    await chooseTone(page, 2);
    await traceHighlightIntro(page);
    await page.goto(`/?animation=${animation}`);

    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-highlight-animation', animation);
    await expect(root).not.toHaveAttribute('data-highlight-intro', /.+/, {
      timeout: 3_000,
    });
    await expect(root).toHaveAttribute('data-highlight-tone', 'mint');

    const trace = await readHighlightTrace(page);
    expect(trace.animations).toContain(expectedKeyframe);
    expect(await page.evaluate(
      () => sessionStorage.getItem('site-highlight-tone'),
    )).toBe('mint');
  });
}

test('wipe stays synchronized on pages with many highlights', async ({ page }) => {
  await chooseTone(page, 2);
  await traceHighlightIntro(page);
  await page.goto('/josh-top-songs-2019/?animation=d');

  expect(await page.locator('.prose strong').count()).toBeGreaterThanOrEqual(100);
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-highlight-intro',
    /.+/,
    { timeout: 3_000 },
  );
  const trace = await readHighlightTrace(page);
  expect(trace.animations).toContain(
    'highlight-marker-wipe',
  );
  expect(trace.motions).toEqual(Array(9).fill('wipe'));
  expect(trace.nodeSpins).toBe(0);
  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-tone',
    'mint',
  );
});

test('direct arrivals and explicit reloads animate with the default shuffle', async ({
  page,
}) => {
  await chooseTone(page, 2);
  await traceHighlightIntro(page);
  await page.goto('/');

  const root = page.locator('html');
  await expect(root).not.toHaveAttribute('data-highlight-intro', /.+/, {
    timeout: 3_000,
  });
  expect((await readHighlightTrace(page)).animations).toContain(
    'highlight-shuffle-tick',
  );

  await page.reload();
  await expect(root).not.toHaveAttribute('data-highlight-intro', /.+/, {
    timeout: 3_000,
  });
  expect((await readHighlightTrace(page)).animations).toContain(
    'highlight-shuffle-tick',
  );
  await expect(root).toHaveAttribute('data-highlight-tone', 'mint');
});

test('internal navigation skips the intro, but reloading that page plays it', async ({
  page,
}) => {
  await traceHighlightIntro(page);
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-highlight-intro',
    /.+/,
    { timeout: 3_000 },
  );

  await page.locator('.all-posts').click();
  await expect(page).toHaveURL(/\/posts\/$/);
  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-animation',
    'a',
  );
  expect((await readHighlightTrace(page)).animations).toEqual([]);

  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-highlight-intro',
    /.+/,
    { timeout: 3_000 },
  );
  expect((await readHighlightTrace(page)).animations).toContain(
    'highlight-shuffle-tick',
  );
});

test('an unknown animation query falls back to the default shuffle', async ({
  page,
}) => {
  await traceHighlightIntro(page);
  await page.goto('/?animation=unknown');

  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-animation',
    'a',
  );
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-highlight-intro',
    /.+/,
    { timeout: 3_000 },
  );
  expect((await readHighlightTrace(page)).animations).toContain(
    'highlight-shuffle-tick',
  );
});

test('reduced motion skips every animation strategy', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await traceHighlightIntro(page);

  for (const animation of Object.keys(animations)) {
    await page.goto(`/?animation=${animation}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-highlight-animation',
      animation,
    );
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-highlight-intro',
      /.+/,
    );
    expect((await readHighlightTrace(page)).animations).toEqual([]);
  }
});

test('the footer settings menu selects animation variants through the URL', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await openSettings(page);

  await expect(page.locator('[data-animation-option]').first()).toHaveAttribute(
    'data-animation-option',
    'a',
  );
  await expect(page.locator('[data-animation-option="a"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'A Shuffle', exact: true }),
  ).toBeVisible();
  await page.locator('[data-animation-option="d"]').click();

  await expect(page).toHaveURL(/\?animation=d$/);
  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-animation',
    'd',
  );
  await openSettings(page);
  await expect(page.locator('[data-animation-option="d"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await page.evaluate(
    () => localStorage.getItem('site-highlight-animation'),
  )).toBe('d');

  await page.goto('/posts/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-animation',
    'd',
  );
  await openSettings(page);
  await expect(page.locator('[data-animation-option="d"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('/?animation=c');
  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-animation',
    'c',
  );
  expect(await page.evaluate(
    () => localStorage.getItem('site-highlight-animation'),
  )).toBe('d');
});

test('clearing saved settings resets local and session storage', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?animation=d');
  await page.evaluate(() => {
    localStorage.setItem('test-local-setting', 'saved');
    localStorage.setItem('site-highlight-animation', 'd');
    localStorage.setItem('site-theme', 'dark');
    sessionStorage.setItem('test-session-setting', 'saved');
  });
  await openSettings(page);

  await Promise.all([
    page.waitForEvent('framenavigated'),
    page.locator('[data-clear-site-storage]').click(),
  ]);

  expect(await page.evaluate(() => ({
    animation: localStorage.getItem('site-highlight-animation'),
    local: localStorage.getItem('test-local-setting'),
    session: sessionStorage.getItem('test-session-setting'),
    theme: localStorage.getItem('site-theme'),
    urlAnimation: new URL(window.location.href).searchParams.get('animation'),
  }))).toEqual({
    animation: null,
    local: null,
    session: null,
    theme: null,
    urlAnimation: null,
  });
  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-animation',
    'a',
  );
});

test('clicking either highlight cycles every highlight together', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
  expect(await page.evaluate(() => sessionStorage.getItem('site-highlight-tone'))).toBe(
    'mint',
  );

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute(
    'data-highlight-tone',
    'mint',
  );
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

  await openSettings(page);
  await expect(page.locator('[data-theme-option]').first()).toHaveAttribute(
    'data-theme-option',
    'system',
  );
  await expect(page.locator('[data-theme-option="system"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'System', exact: true }),
  ).toBeVisible();
  await page.locator('[data-theme-option="light"]').click();
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

  await openSettings(page);
  await expect(page.locator('[data-theme-option="light"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('[data-theme-option="dark"]').click();
  expect(await readTheme(page)).toEqual({
    theme: 'dark',
    paper: '#383934',
    themeColor: '#383934',
  });
  expect(await page.evaluate(() => localStorage.getItem('site-theme'))).toBe(
    'dark',
  );
  await page.locator('[data-theme-option="system"]').click();
  expect(await readTheme(page)).toEqual({
    theme: null,
    paper: '#383934',
    themeColor: '#383934',
  });
  await expect(page.locator('[data-theme-option="system"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await page.evaluate(() => localStorage.getItem('site-theme'))).toBeNull();
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
    const toggle = footer.querySelector('[data-settings-toggle]');
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
  await openSettings(page);
  const mobile = await page.locator('.site-footer').evaluate((footer) => {
    const meta = footer.querySelector('.footer-meta')?.getBoundingClientRect();
    const links = footer.querySelector('.footer-links')?.getBoundingClientRect();
    const settings = footer
      .querySelector('[data-settings-menu]')
      ?.getBoundingClientRect();

    return {
      socialLinksFirst: Boolean(meta && links && links.bottom <= meta.top),
      leftAligned: Boolean(
        meta && links && Math.abs(meta.left - links.left) < 1,
      ),
      visibleSocialActions: [...footer.querySelectorAll('.footer-links .icon-link')]
        .filter((action) => {
          const box = action.getBoundingClientRect();
          const style = getComputedStyle(action);
          return (
            box.width > 0 &&
            box.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden'
          );
        }).length,
      visibleSocialMarks: [
        ...footer.querySelectorAll('.footer-links .site-social-mark'),
      ].filter((mark) => {
        const box = mark.getBoundingClientRect();
        const style = getComputedStyle(mark);
        return (
          box.width > 0 &&
          box.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      }).length,
      blockerProneSocialClasses: footer.querySelectorAll('.social-icon').length,
      footerOverflow: footer.scrollWidth > footer.clientWidth,
      settingsWithinViewport: Boolean(
        settings &&
        settings.left >= 0 &&
        settings.right <= window.innerWidth &&
        settings.top >= 0 &&
        settings.bottom <= window.innerHeight,
      ),
      pageOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    };
  });
  expect(mobile).toEqual({
    socialLinksFirst: true,
    leftAligned: true,
    visibleSocialActions: 5,
    visibleSocialMarks: 5,
    blockerProneSocialClasses: 0,
    footerOverflow: false,
    settingsWithinViewport: true,
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
    .filter({ hasText: 'App Store' });
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
