const editableSelector =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

export const initRepositoryShortcut = (repositoryEditorUrl: string) => {
  document.addEventListener('keydown', (event) => {
    if (
      event.key !== '.' ||
      event.defaultPrevented ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest(editableSelector)) {
      return;
    }

    event.preventDefault();
    window.location.assign(repositoryEditorUrl);
  });
};
