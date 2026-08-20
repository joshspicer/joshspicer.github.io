import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const IMG_TAG = /<img\b[^>]*>/gi;
const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
const OPTIMIZABLE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const WIDTH_LADDER = [320, 480, 640, 960, 1280, 1920];
// Beyond this, extra pixels only pad the download; the lightbox never shows
// more than ~1400 CSS pixels wide.
const MAX_WIDTH = 1920;
// Small files cost more in requests than they save in bytes.
const MIN_SOURCE_BYTES = 24_000;
// Widest the prose column ever renders, in CSS pixels.
const COLUMN_WIDTH = 608;
const CONCURRENCY = 6;

const parseAttributes = (tag) => {
  const properties = {};
  const inner = tag.replace(/^<img\b/i, '').replace(/\/?>$/, '');
  ATTRIBUTE.lastIndex = 0;

  let match = ATTRIBUTE.exec(inner);
  while (match) {
    const [, name, doubleQuoted, singleQuoted] = match;
    properties[name] = doubleQuoted ?? singleQuoted ?? '';
    match = ATTRIBUTE.exec(inner);
  }

  return properties;
};

const listHtmlFiles = async (directory) => {
  const files = [];
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.html')) files.push(path);
    }
  };
  await walk(directory);
  return files;
};

/**
 * Estimates the widest CSS size an image is displayed at, mirroring the figure
 * rules in the stylesheet, so `sizes` doesn't ask for more pixels than the
 * layout can ever use.
 */
const displayWidthOf = ({ width, height, inGallery }) => {
  const ratio = width / height;
  const isLandscape = ratio >= 1 / 0.85;
  const heightCap = inGallery ? 384 : 480; // 24rem / 30rem
  const columnCap = inGallery ? COLUMN_WIDTH / 2 : COLUMN_WIDTH;

  return Math.min(
    width,
    columnCap,
    isLandscape ? Number.POSITIVE_INFINITY : Math.round(heightCap * ratio),
  );
};

const toUrl = (output, outputDirectory, base) =>
  `${base.replace(/\/$/, '')}/${relative(outputDirectory, output)
    .split(/[\\/]/)
    .map(encodeURIComponent)
    .join('/')}`;

/**
 * Encoding every variant on each build is slow, and the build output is wiped
 * between runs, so finished variants are kept in a cache keyed by the source
 * file's identity plus the encode settings.
 */
const createVariantCache = (cacheDirectory) => {
  let ready;

  return async (key, output, encode) => {
    ready ??= mkdir(cacheDirectory, { recursive: true });
    await ready;

    const cached = join(cacheDirectory, `${createHash('sha1').update(key).digest('hex')}.webp`);
    await mkdir(dirname(output), { recursive: true });

    try {
      await copyFile(cached, output);
      return (await stat(output)).size;
    } catch {
      const buffer = await encode();
      await writeFile(output, buffer);
      await writeFile(cached, buffer).catch(() => {});
      return buffer.length;
    }
  };
};

const runPool = async (items, worker) => {  const queue = [...items];
  const runners = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    let item = queue.shift();
    while (item) {
      await worker(item);
      item = queue.shift();
    }
  });
  await Promise.all(runners);
};

/**
 * Rewrites built `<img>` tags into `<picture>` elements backed by resized WebP
 * variants. Astro's asset pipeline only handles images imported from `src/`,
 * and this site keeps its images in `public/`, so the work happens on the
 * finished HTML instead. Original files stay in place as the fallback.
 */
export function responsiveImages() {
  let base = '/';

  return {
    name: 'responsive-images',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base ?? '/';
      },
      'astro:build:done': async ({ dir, logger }) => {
        const { default: sharp } = await import('sharp');
        const outputDirectory = fileURLToPath(dir);
        const cacheVariant = createVariantCache(
          fileURLToPath(new URL('../../node_modules/.cache/responsive-images/', import.meta.url)),
        );
        const htmlFiles = await listHtmlFiles(outputDirectory);

        const sources = new Map();
        const rewrites = [];

        for (const file of htmlFiles) {
          const html = await readFile(file, 'utf8');
          IMG_TAG.lastIndex = 0;
          const tags = html.match(IMG_TAG);
          if (!tags) continue;

          for (const tag of tags) {
            const attributes = parseAttributes(tag);
            const src = attributes.src;
            if (!src?.startsWith('/') || src.startsWith('//')) continue;
            if (!OPTIMIZABLE.has(extname(src).toLowerCase())) continue;

            const withoutBase =
              base !== '/' && src.startsWith(base) ? src.slice(base.length - 1) : src;
            const filePath = join(outputDirectory, decodeURI(withoutBase));
            if (!sources.has(filePath)) sources.set(filePath, src);
            rewrites.push({ file, tag, attributes, filePath });
          }
        }

        if (rewrites.length === 0) return;

        const variants = new Map();
        let originalBytes = 0;
        let variantBytes = 0;

        await runPool([...sources.keys()], async (filePath) => {
          let image;
          let metadata;
          try {
            image = sharp(filePath);
            metadata = await image.metadata();
          } catch {
            return; // Referenced file isn't on disk; leave the tag alone.
          }
          if (!metadata.width || !metadata.height) return;

          const sourceBytes = (await stat(filePath)).size;
          if (sourceBytes < MIN_SOURCE_BYTES) return;
          originalBytes += sourceBytes;

          const animated = (metadata.pages ?? 1) > 1;
          const height = animated ? (metadata.pageHeight ?? metadata.height) : metadata.height;
          const generated = [];
          const identity = `${relative(outputDirectory, filePath)}:${sourceBytes}:${metadata.width}x${height}`;

          if (animated) {
            // One frame-preserving variant: an animation ladder would multiply
            // encoding cost for sizes no layout asks for.
            const target = Math.min(
              metadata.width,
              Math.max(480, Math.round(displayWidthOf({
                width: metadata.width,
                height,
                inGallery: false,
              }) * 1.5)),
            );
            const output = filePath.replace(/\.[^.]+$/, `-${target}.webp`);
            const bytes = await cacheVariant(
              `${identity}:animated:${target}:q70`,
              output,
              () =>
                sharp(filePath, { animated: true })
                  .resize({ width: target, withoutEnlargement: true })
                  .webp({ quality: 70, effort: 4 })
                  .toBuffer(),
            );
            variantBytes += bytes;
            generated.push({ width: target, url: toUrl(output, outputDirectory, base) });
          } else {
            const ceiling = Math.min(metadata.width, MAX_WIDTH);
            const widths = WIDTH_LADDER.filter((width) => width < ceiling);
            widths.push(ceiling);

            for (const width of widths) {
              const output = filePath.replace(/\.[^.]+$/, `-${width}.webp`);
              const bytes = await cacheVariant(
                `${identity}:${width}:q78`,
                output,
                () =>
                  sharp(filePath)
                    .resize({ width, withoutEnlargement: true })
                    .webp({ quality: 78 })
                    .toBuffer(),
              );
              variantBytes += bytes;
              generated.push({ width, url: toUrl(output, outputDirectory, base) });
            }
          }

          variants.set(filePath, {
            width: metadata.width,
            height,
            animated,
            generated,
          });
        });

        const byFile = new Map();
        for (const rewrite of rewrites) {
          const list = byFile.get(rewrite.file) ?? [];
          list.push(rewrite);
          byFile.set(rewrite.file, list);
        }

        for (const [file, list] of byFile) {
          let html = await readFile(file, 'utf8');

          for (const { tag, attributes, filePath } of list) {
            const variant = variants.get(filePath);
            if (!variant || variant.generated.length === 0) continue;

            const inGallery = html.includes('prose-gallery') && isInGallery(html, tag);
            const displayWidth = displayWidthOf({ ...variant, inGallery });
            const largest = variant.generated.at(-1).url;

            let sourceAttributes;
            let extraImageAttributes = '';
            if (variant.animated) {
              sourceAttributes = `srcset="${largest}"`;
            } else {
              const sizes = `(max-width: 40rem) ${inGallery ? '46vw' : '92vw'}, ${Math.round(displayWidth)}px`;
              const srcset = variant.generated
                .map(({ url, width }) => `${url} ${width}w`)
                .join(', ');
              sourceAttributes = `srcset="${srcset}" sizes="${sizes}"`;
              extraImageAttributes = ` sizes="${sizes}"`;
            }

            // The viewer should open the optimized variant, not the original.
            if (!attributes['data-zoom-src']) {
              extraImageAttributes += ` data-zoom-src="${largest}"`;
            }

            const image = `${tag.replace(/\/?>$/, '')}${extraImageAttributes}>`;
            const picture =
              `<picture><source type="image/webp" ${sourceAttributes}>${image}</picture>`;

            html = html.replace(tag, picture);
          }

          await writeFile(file, html);
        }

        const saved = originalBytes - variantBytes;
        logger.info(
          `optimized ${variants.size} images: ${(originalBytes / 1e6).toFixed(1)}MB of originals ` +
            `→ ${(variantBytes / 1e6).toFixed(1)}MB of WebP variants ` +
            `(${saved > 0 ? Math.round((saved / originalBytes) * 100) : 0}% smaller, originals kept as fallback)`,
        );
      },
    },
  };
}

/** Cheap containment test: is this tag inside a gallery wrapper? */
const isInGallery = (html, tag) => {
  const index = html.indexOf(tag);
  if (index === -1) return false;
  const galleryStart = html.lastIndexOf('<div class="prose-gallery"', index);
  if (galleryStart === -1) return false;
  const galleryEnd = html.indexOf('</div>', galleryStart);
  return galleryEnd === -1 || galleryEnd > index;
};
