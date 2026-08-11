export const HIGHLIGHT_TONES = ['yellow', 'coral', 'mint', 'blue'] as const;
export const HIGHLIGHT_ANIMATIONS = ['a', 'b', 'c', 'd'] as const;
export const DEFAULT_HIGHLIGHT_ANIMATION = 'a';
export const HIGHLIGHT_ANIMATION_STORAGE_KEY = 'site-highlight-animation';

type HighlightTone = (typeof HIGHLIGHT_TONES)[number];
type HighlightAnimation = (typeof HIGHLIGHT_ANIMATIONS)[number];

const highlightSelector = [
  '.marker-heading span',
  '.marker-highlight',
  '.page-title span',
  '.post-title-large span',
  '.prose strong',
].join(',');
const toneStorageKey = 'site-highlight-tone';
const skipIntroStorageKey = 'site-highlight-skip-next-intro';

interface AnimationController {
  readonly finalTone: HighlightTone;
  readonly finalToneIndex: number;
  cancel: () => void;
  finishAfter: (delay: number) => void;
  schedule: (callback: () => void, delay: number) => void;
  setTone: (tone: HighlightTone, persist?: boolean) => void;
  spinRoot: (
    motion: 'jackpot' | 'reel' | 'shuffle' | 'wipe',
    from: HighlightTone,
    to: HighlightTone,
    duration: number,
  ) => void;
}

type AnimationStrategy = (controller: AnimationController) => void;

const isHighlightTone = (
  value: string | null | undefined,
): value is HighlightTone =>
  HIGHLIGHT_TONES.includes(value as HighlightTone);

const isHighlightAnimation = (
  value: string | undefined,
): value is HighlightAnimation =>
  HIGHLIGHT_ANIMATIONS.includes(value as HighlightAnimation);

const nextTone = (index: number): HighlightTone =>
  HIGHLIGHT_TONES[index % HIGHLIGHT_TONES.length];

const runShuffle: AnimationStrategy = (controller) => {
  const delays = [55, 62, 72, 84, 102, 126, 158, 205, 275];
  let elapsed = 80;
  let toneIndex = controller.finalToneIndex + 1;

  for (const delay of delays) {
    controller.schedule(() => {
      const from = nextTone(toneIndex);
      toneIndex += 1;
      const to = nextTone(toneIndex);
      controller.setTone(to, false);
      controller.spinRoot('shuffle', from, to, Math.min(delay, 150));
    }, elapsed);
    elapsed += delay;
  }

  controller.schedule(() => {
    const from = nextTone(toneIndex);
    controller.setTone(controller.finalTone, false);
    controller.spinRoot('shuffle', from, controller.finalTone, 220);
  }, elapsed + 20);
  controller.finishAfter(elapsed + 260);
};

const runReel: AnimationStrategy = (controller) => {
  const delays = [55, 62, 72, 84, 102, 126, 158, 205, 275];
  let elapsed = 80;
  let toneIndex = controller.finalToneIndex + 1;

  for (const delay of delays) {
    controller.schedule(() => {
      const from = nextTone(toneIndex);
      toneIndex += 1;
      const to = nextTone(toneIndex);
      controller.setTone(to, false);
      controller.spinRoot('reel', from, to, delay);
    }, elapsed);
    elapsed += delay;
  }

  const landingDuration = 320;
  controller.schedule(() => {
    const from = nextTone(toneIndex);
    controller.setTone(controller.finalTone, false);
    controller.spinRoot('reel', from, controller.finalTone, landingDuration);
  }, elapsed + 20);
  controller.finishAfter(elapsed + landingDuration + 20);
};

const runWipe: AnimationStrategy = (controller) => {
  const passDuration = 240;
  const passes = 4;
  let toneIndex = controller.finalToneIndex + 1;

  for (let pass = 0; pass < passes; pass += 1) {
    controller.schedule(() => {
      const from = nextTone(toneIndex);
      toneIndex += 1;
      const to = nextTone(toneIndex);
      controller.setTone(to, false);
      controller.spinRoot('wipe', from, to, passDuration);
    }, 80 + pass * passDuration);
  }

  const landingTime = 80 + passes * passDuration + 80;
  const landingDuration = 380;
  controller.schedule(() => {
    const from = nextTone(toneIndex);
    controller.setTone(controller.finalTone, false);
    controller.spinRoot('wipe', from, controller.finalTone, landingDuration);
  }, landingTime);
  controller.finishAfter(landingTime + landingDuration);
};

const runJackpot: AnimationStrategy = (controller) => {
  const tickDuration = 72;
  let toneIndex = controller.finalToneIndex + 1;

  for (let tick = 0; tick < 8; tick += 1) {
    controller.schedule(() => {
      const from = nextTone(toneIndex);
      toneIndex += 1;
      const to = nextTone(toneIndex);
      controller.setTone(to, false);
      controller.spinRoot('reel', from, to, tickDuration);
    }, 70 + tick * tickDuration);
  }

  const falseStopTime = 70 + 8 * tickDuration + 150;
  const falseStop = nextTone(controller.finalToneIndex + 3);
  controller.schedule(() => {
    const from = nextTone(toneIndex);
    controller.setTone(falseStop, false);
    controller.spinRoot('reel', from, falseStop, 260);
  }, falseStopTime);

  const landingTime = falseStopTime + 390;
  controller.schedule(() => {
    controller.setTone(controller.finalTone, false);
    controller.spinRoot('jackpot', falseStop, controller.finalTone, 520);
  }, landingTime);
  controller.finishAfter(landingTime + 520);
};

const animationStrategies: Record<HighlightAnimation, AnimationStrategy> = {
  a: runShuffle,
  b: runJackpot,
  c: runReel,
  d: runWipe,
};

const initInternalNavigationTracking = () => {
  let pendingInternalNavigation = false;
  let pendingReset: number | undefined;

  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    const link = target instanceof Element ? target.closest('a[href]') : null;
    if (!(link instanceof HTMLAnchorElement)) return;
    if (
      link.download ||
      (link.target && link.target.toLowerCase() !== '_self')
    ) {
      return;
    }

    const destination = new URL(link.href, window.location.href);
    if (
      destination.origin !== window.location.origin ||
      (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
    ) {
      return;
    }

    pendingInternalNavigation = true;
    window.clearTimeout(pendingReset);
    pendingReset = window.setTimeout(() => {
      pendingInternalNavigation = false;
    }, 1_000);
  });

  window.addEventListener('pagehide', () => {
    if (pendingInternalNavigation) {
      sessionStorage.setItem(skipIntroStorageKey, 'true');
    }
  });
};

export const initHighlightAnimations = () => {
  const root = document.documentElement;
  const savedTone = sessionStorage.getItem(toneStorageKey);
  const finalTone = isHighlightTone(savedTone)
    ? savedTone
    : HIGHLIGHT_TONES[0];
  const requestedAnimation = root.dataset.highlightAnimation;
  const animation = isHighlightAnimation(requestedAnimation)
    ? requestedAnimation
    : DEFAULT_HIGHLIGHT_ANIMATION;
  const highlights = Array.from(
    document.querySelectorAll<HTMLElement>(highlightSelector),
  );
  const timers = new Set<number>();

  const setTone = (tone: HighlightTone, persist = true) => {
    root.dataset.highlightTone = tone;
    if (persist) sessionStorage.setItem(toneStorageKey, tone);
  };

  const clearMotion = () => {
    delete root.dataset.highlightMotion;
    root.style.removeProperty('--highlight-motion-duration');
    root.style.removeProperty('--highlight-motion-from');
    root.style.removeProperty('--highlight-motion-to');
  };

  const cancel = () => {
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    clearMotion();
    delete root.dataset.highlightIntro;
  };

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  };

  const restartRootMotion = (
    motion: 'jackpot' | 'reel' | 'shuffle' | 'wipe',
    from: HighlightTone,
    to: HighlightTone,
    duration: number,
  ) => {
    root.style.setProperty(
      '--highlight-motion-from',
      `var(--highlight-${from})`,
    );
    root.style.setProperty(
      '--highlight-motion-to',
      `var(--highlight-${to})`,
    );
    root.style.setProperty('--highlight-motion-duration', `${duration}ms`);
    delete root.dataset.highlightMotion;
    void root.offsetWidth;
    root.dataset.highlightMotion = motion;
  };

  const controller: AnimationController = {
    finalTone,
    finalToneIndex: HIGHLIGHT_TONES.indexOf(finalTone),
    cancel,
    finishAfter: (delay) => schedule(() => {
      setTone(finalTone, false);
      cancel();
    }, delay),
    schedule,
    setTone,
    spinRoot: restartRootMotion,
  };

  if (root.dataset.highlightIntro === 'pending' && highlights.length > 0) {
    animationStrategies[animation](controller);
  } else {
    setTone(finalTone, false);
    delete root.dataset.highlightIntro;
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(highlightSelector)) {
      return;
    }

    cancel();
    const currentTone = root.dataset.highlightTone;
    const currentIndex = isHighlightTone(currentTone)
      ? HIGHLIGHT_TONES.indexOf(currentTone)
      : -1;
    setTone(nextTone(currentIndex + 1));
  });

  initInternalNavigationTracking();
};
