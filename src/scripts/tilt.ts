const MAX_TILT_DEG = 8;

const tiltTowards = (tile: HTMLElement, event: PointerEvent): void => {
  const box = tile.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width - 0.5;
  const y = (event.clientY - box.top) / box.height - 0.5;
  tile.style.transform = `perspective(40rem) rotateX(${(-y * MAX_TILT_DEG).toFixed(2)}deg) rotateY(${(x * MAX_TILT_DEG).toFixed(2)}deg) scale(0.98)`;
};

export const enableTileTilt = (root: Document): void => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.addEventListener('pointerdown', (event) => {
    if (reducedMotion.matches || !event.isPrimary || event.button !== 0) return;
    const tile = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tilt]') : null;
    if (tile === null) return;
    tiltTowards(tile, event);
    tile.dataset['pressed'] = '';
    const release = (): void => {
      tile.style.transform = '';
      delete tile.dataset['pressed'];
      root.removeEventListener('pointerup', release);
      root.removeEventListener('pointercancel', release);
      tile.removeEventListener('pointerleave', release);
    };
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    tile.addEventListener('pointerleave', release);
  });
};
