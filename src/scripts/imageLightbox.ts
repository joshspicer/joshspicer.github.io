const ZOOMABLE_SELECTOR =
  '.prose-figure:not([data-linked]) > img, .prose-figure:not([data-linked]) > picture > img';

let dialog: HTMLDialogElement | undefined;
let dialogImage: HTMLImageElement;
let dialogCaption: HTMLElement;
let dialogCounter: HTMLElement;
let images: HTMLImageElement[] = [];
let activeIndex = 0;

const captionFor = (image: HTMLImageElement): string =>
  image.closest('figure')?.querySelector('.prose-caption')?.textContent?.trim() ?? '';

const sourceFor = (image: HTMLImageElement): string =>
  image.dataset.zoomSrc || image.currentSrc || image.src;

const render = () => {
  const image = images[activeIndex];
  if (!dialog || !image) return;

  dialogImage.src = sourceFor(image);
  dialogImage.alt = image.alt;
  dialogCaption.textContent = captionFor(image);
  dialogCounter.textContent = `${activeIndex + 1} / ${images.length}`;
  dialog.dataset.single = images.length > 1 ? 'false' : 'true';
};

const step = (offset: number) => {
  if (images.length < 2) return;
  activeIndex = (activeIndex + offset + images.length) % images.length;
  render();
};

const createDialog = (): HTMLDialogElement => {
  const element = document.createElement('dialog');
  element.className = 'lightbox';
  element.setAttribute('aria-label', 'Image viewer');
  element.innerHTML = `
    <figure class="lightbox-figure">
      <img class="lightbox-image" alt="" decoding="async" />
      <figcaption class="lightbox-caption"></figcaption>
    </figure>
    <button class="lightbox-button lightbox-close" type="button" aria-label="Close image viewer">✕</button>
    <button class="lightbox-button lightbox-previous" type="button" aria-label="Previous image">←</button>
    <button class="lightbox-button lightbox-next" type="button" aria-label="Next image">→</button>
    <p class="lightbox-counter" aria-hidden="true"></p>
  `;

  dialogImage = element.querySelector('.lightbox-image') as HTMLImageElement;
  dialogCaption = element.querySelector('.lightbox-caption') as HTMLElement;
  dialogCounter = element.querySelector('.lightbox-counter') as HTMLElement;

  element
    .querySelector('.lightbox-close')
    ?.addEventListener('click', () => element.close());
  element
    .querySelector('.lightbox-previous')
    ?.addEventListener('click', () => step(-1));
  element
    .querySelector('.lightbox-next')
    ?.addEventListener('click', () => step(1));

  element.addEventListener('click', (event) => {
    // Only clicks on the surrounding backdrop area should dismiss the viewer.
    if (event.target === element || event.target === dialogImage.parentElement) {
      element.close();
    }
  });

  element.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  });

  let swipeStartX = 0;
  element.addEventListener(
    'touchstart',
    (event) => {
      swipeStartX = event.changedTouches[0]?.clientX ?? 0;
    },
    { passive: true },
  );
  element.addEventListener(
    'touchend',
    (event) => {
      const distance = (event.changedTouches[0]?.clientX ?? 0) - swipeStartX;
      if (Math.abs(distance) > 60) step(distance < 0 ? 1 : -1);
    },
    { passive: true },
  );

  document.body.append(element);
  return element;
};

const open = (index: number) => {
  const image = images[index];
  if (!image || !sourceFor(image)) return;

  dialog ??= createDialog();
  activeIndex = index;
  render();
  dialog.showModal();
};

/**
 * Turns article images into an accessible click-to-zoom viewer. Everything it
 * adds is progressive enhancement: without JavaScript the figures stay plain,
 * static images.
 */
export function initImageLightbox(): void {
  images = Array.from(document.querySelectorAll<HTMLImageElement>(ZOOMABLE_SELECTOR));
  if (images.length === 0) return;

  images.forEach((image, index) => {
    image.dataset.zoomable = 'true';
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute(
      'aria-label',
      image.alt ? `Expand image: ${image.alt}` : 'Expand image',
    );

    image.addEventListener('click', () => open(index));
    image.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      open(index);
    });
  });
}
