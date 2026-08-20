const HEADING_SELECTOR = '.prose :is(h2, h3, h4, h5, h6)[id]';
const RESET_DELAY = 1_600;
const MARK = '#';
const COPIED_MARK = '✓';
const FAILED_MARK = '✕';

let status: HTMLElement | undefined;

const announce = (message: string) => {
  if (!status) {
    status = document.createElement('p');
    status.className = 'visually-hidden';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    document.body.append(status);
  }

  status.textContent = message;
  window.setTimeout(() => {
    if (status?.textContent === message) status.textContent = '';
  }, RESET_DELAY);
};

const copy = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Builds the link as a sibling of the heading, with the `#` hidden from
 * assistive technology and a real (visually hidden) label in its place. Keeping
 * the link out of the heading keeps screen reader heading lists clean.
 * @see https://amberwilson.co.uk/blog/are-your-anchor-links-accessible/
 */
const createAnchor = (heading: HTMLElement): HTMLAnchorElement => {
  const anchor = document.createElement('a');
  anchor.className = 'heading-anchor';
  anchor.href = `#${encodeURIComponent(heading.id)}`;

  const mark = document.createElement('span');
  mark.className = 'heading-anchor-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = MARK;

  const label = document.createElement('span');
  label.className = 'visually-hidden';
  label.textContent = `Copy link to section: ${heading.textContent?.trim() ?? heading.id}`;

  anchor.append(mark, label);
  return anchor;
};

/**
 * Gives every article heading a `#` in the margin that copies its deep link.
 * Headings are already addressable without JavaScript; this adds the visible
 * handle and the clipboard shortcut.
 */
export function initHeadingAnchors(): void {
  const headings = document.querySelectorAll<HTMLElement>(HEADING_SELECTOR);

  for (const heading of headings) {
    if (heading.parentElement?.classList.contains('heading-group')) continue;

    const group = document.createElement('div');
    group.className = 'heading-group';
    group.dataset.level = heading.tagName.slice(1);
    heading.replaceWith(group);

    const anchor = createAnchor(heading);
    group.append(heading, anchor);

    anchor.addEventListener('click', async (event) => {
      // Leave modified clicks alone so "open in new tab" and friends still work.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();

      const url = new URL(window.location.href);
      url.hash = heading.id;
      history.replaceState(null, '', url.hash);

      const mark = anchor.querySelector('.heading-anchor-mark');
      const copied = await copy(url.href);
      anchor.dataset.copied = String(copied);
      if (mark) mark.textContent = copied ? COPIED_MARK : FAILED_MARK;
      announce(copied ? 'Link copied to clipboard' : 'Copy failed');

      window.setTimeout(() => {
        delete anchor.dataset.copied;
        if (mark) mark.textContent = MARK;
      }, RESET_DELAY);
    });
  }
}
