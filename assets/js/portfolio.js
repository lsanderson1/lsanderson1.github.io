(() => {
  const carousel = document.querySelector('[data-feature-carousel]');
  if (!carousel) return;

  const track = carousel.querySelector('[data-feature-track]');
  const cards = Array.from(track.querySelectorAll('.fp-feature'));
  const position = document.querySelector('[data-feature-position]');
  const previous = document.querySelector('[data-feature-prev]');
  const next = document.querySelector('[data-feature-next]');
  if (!track || cards.length < 2) return;

  const dragThreshold = 10;
  let index = 0;
  let offset = 0;
  let startX = 0;
  let startOffset = 0;
  let startIndex = 0;
  let activePointer = null;
  let dragged = false;
  let suppressClick = false;

  const cardStep = () => {
    const gap = Number.parseFloat(window.getComputedStyle(track).gap) || 18;
    return cards[0].getBoundingClientRect().width + gap;
  };
  const minimumOffset = () => -(cards.length - 1) * cardStep();
  const clamp = (value) => Math.max(minimumOffset(), Math.min(0, value));

  const updatePosition = () => {
    const step = cardStep();
    index = Math.max(0, Math.min(cards.length - 1, Math.round(Math.abs(offset) / step)));
    if (position) {
      position.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    }
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === cards.length - 1;
  };

  const setOffset = (value, animate = true) => {
    offset = clamp(value);
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
    updatePosition();
  };

  const goTo = (targetIndex, animate = true) => {
    index = Math.max(0, Math.min(cards.length - 1, targetIndex));
    setOffset(-index * cardStep(), animate);
  };

  carousel.addEventListener('dragstart', (event) => event.preventDefault());

  carousel.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    activePointer = event.pointerId;
    startX = event.clientX;
    startOffset = offset;
    startIndex = index;
    dragged = false;
  });

  carousel.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointer) return;
    const distance = event.clientX - startX;
    if (!dragged && Math.abs(distance) <= dragThreshold) return;
    if (!dragged) {
      dragged = true;
      carousel.classList.add('is-dragging');
      carousel.setPointerCapture(activePointer);
    }
    setOffset(startOffset + distance, false);
  });

  const finishDrag = (event) => {
    if (event.pointerId !== activePointer) return;

    if (dragged) {
      const distance = event.clientX - startX;
      let targetIndex = Math.round(Math.abs(clamp(startOffset + distance)) / cardStep());
      if (Math.abs(distance) > 48 && targetIndex === startIndex) {
        targetIndex += distance < 0 ? 1 : -1;
      }
      suppressClick = true;
      window.setTimeout(() => { suppressClick = false; }, 0);
      goTo(targetIndex, true);
    } else {
      setOffset(startOffset, true);
    }

    if (carousel.hasPointerCapture(activePointer)) carousel.releasePointerCapture(activePointer);
    activePointer = null;
    dragged = false;
    carousel.classList.remove('is-dragging');
  };

  carousel.addEventListener('pointerup', finishDrag);
  carousel.addEventListener('pointercancel', finishDrag);
  carousel.addEventListener('click', (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);

  if (previous) previous.addEventListener('click', () => goTo(index - 1));
  if (next) next.addEventListener('click', () => goTo(index + 1));
  window.addEventListener('resize', () => goTo(index, false));
  updatePosition();
})();
