import { fileURLToPath } from 'node:url';
import { getImageSize } from './imageSize.mjs';

const IMAGE_INDEX_KEY = '__proseMediaImageIndex';
const PORTRAIT_RATIO = 1.2;
const LANDSCAPE_RATIO = 0.85;
const IMG_TAG = /<img\b[^>]*>/gi;
const ATTRIBUTE =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
// Elements that only accept phrasing content, where a <figure> would break out
// of its parent when the browser parses the markup.
const PHRASING_CONTAINERS = new Set([
  'p',
  'a',
  'span',
  'em',
  'strong',
  'b',
  'i',
  's',
  'u',
  'small',
  'sub',
  'sup',
  'code',
  'label',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'figcaption',
  'dt',
]);

const isWhitespaceText = (child) =>
  child.type === 'text' && child.value.trim() === '';

const isImageElement = (child) =>
  child.type === 'element' && child.tagName === 'img';

const isLinkedImage = (child) =>
  child.type === 'element' &&
  child.tagName === 'a' &&
  child.children.filter((grandChild) => !isWhitespaceText(grandChild)).every(isImageElement);

const escapeAttribute = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeText = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const toPositiveNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const orientationOf = (width, height) => {
  const ratio = height / width;
  if (ratio >= PORTRAIT_RATIO) return 'portrait';
  if (ratio <= LANDSCAPE_RATIO) return 'landscape';
  return 'square';
};

const nextImageIndex = (ctx) => {
  const index = ctx.data[IMAGE_INDEX_KEY] ?? 0;
  ctx.data[IMAGE_INDEX_KEY] = index + 1;
  return index;
};

const resolveIntrinsicSize = (src, publicDir) => {
  if (typeof src !== 'string' || !src.startsWith('/') || src.startsWith('//')) {
    return undefined;
  }

  const [pathname] = src.split(/[?#]/);
  let decoded = pathname;
  try {
    decoded = decodeURI(pathname);
  } catch {
    // Keep the raw pathname when it isn't valid percent-encoding.
  }

  return getImageSize(fileURLToPath(new URL(`.${decoded}`, publicDir)));
};

/**
 * Normalizes an image's attributes: intrinsic dimensions (so the browser can
 * reserve space before the file loads), lazy loading for everything below the
 * fold, and an orientation hint the stylesheet uses for layout.
 */
const enhanceImageProperties = (properties, ctx, publicDir) => {
  const next = { ...properties };
  const index = nextImageIndex(ctx);
  const intrinsic = resolveIntrinsicSize(next.src, publicDir);
  const declaredWidth = toPositiveNumber(next.width);
  const declaredHeight = toPositiveNumber(next.height);

  if (intrinsic && !(declaredWidth && declaredHeight)) {
    if (declaredWidth) {
      next.height = Math.round((declaredWidth * intrinsic.height) / intrinsic.width);
    } else if (declaredHeight) {
      next.width = Math.round((declaredHeight * intrinsic.width) / intrinsic.height);
    } else {
      next.width = intrinsic.width;
      next.height = intrinsic.height;
    }
  }

  const width = toPositiveNumber(next.width) ?? intrinsic?.width;
  const height = toPositiveNumber(next.height) ?? intrinsic?.height;
  if (width && height) {
    next['data-orientation'] = orientationOf(width, height);
  }

  if (!next.loading) {
    // The first image is the likely LCP element, so it should never be deferred.
    next.loading = index === 0 ? 'eager' : 'lazy';
  }
  if (!next.decoding) {
    next.decoding = index === 0 ? 'sync' : 'async';
  }
  if (index === 0 && !next.fetchpriority) {
    next.fetchpriority = 'high';
  }
  if (next.alt === undefined || next.alt === null) {
    next.alt = '';
  }

  return next;
};

const captionOf = (properties) => {
  const caption = properties['data-caption'] ?? properties.title;
  return typeof caption === 'string' && caption.trim() ? caption.trim() : undefined;
};

const withoutCaptionProperties = (properties) => {
  const { title, 'data-caption': _dataCaption, ...rest } = properties;
  return rest;
};

const element = (tagName, properties, children = []) => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const buildFigure = (properties, linkProperties) => {
  const caption = captionOf(properties);
  const imageProperties = caption ? withoutCaptionProperties(properties) : properties;
  const image = element('img', imageProperties, []);
  const content = linkProperties ? element('a', linkProperties, [image]) : image;

  const children = [content];
  if (caption) {
    children.push(
      element('figcaption', { className: ['prose-caption'] }, [
        { type: 'text', value: caption },
      ]),
    );
  }

  const figureProperties = { className: ['prose-figure'] };
  if (properties['data-orientation']) {
    figureProperties['data-orientation'] = properties['data-orientation'];
  }
  if (linkProperties) {
    figureProperties['data-linked'] = 'true';
  }

  return element('figure', figureProperties, children);
};

const buildImageHtml = (properties) => {
  const imageProperties = captionOf(properties)
    ? withoutCaptionProperties(properties)
    : properties;
  const attributes = Object.entries(imageProperties)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) =>
      value === true ? key : `${key}="${escapeAttribute(value)}"`,
    )
    .join(' ');

  return `<img ${attributes}>`;
};

const buildFigureHtml = (properties) => {
  const caption = captionOf(properties);
  const orientation = properties['data-orientation'];
  const figureAttributes = [
    'class="prose-figure"',
    orientation ? `data-orientation="${orientation}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const figcaption = caption
    ? `<figcaption class="prose-caption">${escapeText(caption)}</figcaption>`
    : '';

  return `<figure ${figureAttributes}>${buildImageHtml(properties)}${figcaption}</figure>`;
};

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

const decodeEntities = (value) =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, reference) => {
    if (reference.startsWith('#x') || reference.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(reference.slice(2), 16));
    }
    if (reference.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(reference.slice(1), 10));
    }
    return NAMED_ENTITIES[reference.toLowerCase()] ?? match;
  });

const parseImageAttributes = (tag) => {
  const inner = tag.replace(/^<img\b/i, '').replace(/\/?>$/, '');
  const properties = {};
  ATTRIBUTE.lastIndex = 0;

  let match = ATTRIBUTE.exec(inner);
  while (match) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    const value = doubleQuoted ?? singleQuoted ?? unquoted;
    // Values arrive still encoded; they are re-escaped when serialized back out.
    properties[name] = value === undefined ? true : decodeEntities(value);
    match = ATTRIBUTE.exec(inner);
  }

  return properties;
};

/**
 * Collects the images of a paragraph that contains nothing but images, which is
 * how Markdown renders a standalone image (or a row of them).
 */
const collectStandaloneImages = (node) => {
  const meaningful = node.children.filter((child) => !isWhitespaceText(child));
  if (meaningful.length === 0) return undefined;

  const images = [];
  for (const child of meaningful) {
    if (isImageElement(child)) {
      images.push({ properties: child.properties ?? {} });
      continue;
    }
    if (isLinkedImage(child)) {
      const image = child.children.find(isImageElement);
      if (!image) return undefined;
      images.push({
        properties: image.properties ?? {},
        linkProperties: child.properties ?? {},
      });
      continue;
    }
    if (child.type === 'element' && child.tagName === 'br') continue;
    return undefined;
  }

  return images.length > 0 ? images : undefined;
};

/** Paragraphs are the only container the paragraph visitor rebuilds. */
const isStandaloneImageParagraph = (node) =>
  node?.type === 'element' &&
  node.tagName === 'p' &&
  Boolean(collectStandaloneImages(node));

const buildMediaBlock = (images, ctx, publicDir, toFigure) => {
  const figures = images.map(({ properties, linkProperties }) =>
    toFigure(enhanceImageProperties(properties, ctx, publicDir), linkProperties),
  );

  return { figures, isGallery: figures.length > 1 };
};

/**
 * Markdown/HTML post-processing that turns bare images into accessible,
 * layout-stable figures, groups adjacent images into a responsive gallery, and
 * promotes image titles to visible captions.
 */
export function proseMedia({ publicDir = new URL('../../public/', import.meta.url) } = {}) {
  const publicDirUrl =
    typeof publicDir === 'string' ? new URL(`file://${publicDir}`) : publicDir;
  // Touch the path once so a bad value fails at config time, not mid-build.
  fileURLToPath(publicDirUrl);

  return {
    name: 'prose-media',
    element: [
      {
        filter: ['p'],
        visit(node, ctx) {
          const images = collectStandaloneImages(node);
          if (!images) return;

          const { figures, isGallery } = buildMediaBlock(
            images,
            ctx,
            publicDirUrl,
            buildFigure,
          );

          if (!isGallery) return figures[0];

          return element(
            'div',
            { className: ['prose-gallery'], 'data-count': figures.length },
            figures,
          );
        },
      },
      {
        filter: ['img'],
        visit(node, ctx) {
          const parent = ctx.parent(node);
          const container =
            parent?.type === 'element' && parent.tagName === 'a'
              ? ctx.parent(parent)
              : parent;
          // Standalone images are rebuilt as figures by the paragraph visitor.
          if (isStandaloneImageParagraph(container)) return;

          const properties = enhanceImageProperties(
            node.properties ?? {},
            ctx,
            publicDirUrl,
          );
          for (const [key, value] of Object.entries(properties)) {
            if (value !== node.properties?.[key]) {
              ctx.setProperty(node, key, value);
            }
          }
        },
      },
    ],
    raw(node, ctx) {
      const value = node.value ?? '';
      const trimmed = value.trim();
      if (!trimmed.toLowerCase().startsWith('<img')) return;

      IMG_TAG.lastIndex = 0;
      const tags = trimmed.match(IMG_TAG);
      if (!tags) return;
      // Only rewrite raw blocks that are made up entirely of images.
      if (trimmed.replace(IMG_TAG, '').trim() !== '') return;

      const parent = ctx.parent(node);
      // A figure is flow content, so it may only replace a block-level image.
      const asFigure = !(
        parent?.type === 'element' && PHRASING_CONTAINERS.has(parent.tagName)
      );

      const html = tags
        .map((tag) => {
          const properties = enhanceImageProperties(
            parseImageAttributes(tag),
            ctx,
            publicDirUrl,
          );
          return asFigure ? buildFigureHtml(properties) : buildImageHtml(properties);
        })
        .join('');

      return {
        type: 'raw',
        value:
          asFigure && tags.length > 1
            ? `<div class="prose-gallery" data-count="${tags.length}">${html}</div>`
            : html,
      };
    },
  };
}
