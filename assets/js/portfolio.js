(() => {
  const carousel = document.querySelector('[data-feature-carousel]');
  if (!carousel) return;

  const track = carousel.querySelector('[data-feature-track]');
  const cards = Array.from(track.querySelectorAll('.fp-feature'));
  const position = document.querySelector('[data-feature-position]');
  if (!track || cards.length < 2) return;

  let index = 0;
  let offset = 0;
  let startX = 0;
  let startOffset = 0;
  let activePointer = null;
  let dragged = false;

  const cardStep = () => cards[0].getBoundingClientRect().width + 18;
  const minimumOffset = () => Math.min(0, carousel.clientWidth - track.scrollWidth);
  const clamp = (value) => Math.max(minimumOffset(), Math.min(0, value));

  const updatePosition = () => {
    const step = cardStep();
    index = Math.max(0, Math.min(cards.length - 1, Math.round(Math.abs(offset) / step)));
    if (position) {
      position.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    }
  };

  const setOffset = (value, animate = true) => {
    offset = clamp(value);
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
    updatePosition();
  };

  carousel.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    activePointer = event.pointerId;
    startX = event.clientX;
    startOffset = offset;
    dragged = false;
    carousel.classList.add('is-dragging');
    carousel.setPointerCapture(activePointer);
  });

  carousel.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointer) return;
    const distance = event.clientX - startX;
    if (Math.abs(distance) > 6) dragged = true;
    setOffset(startOffset + distance, false);
  });

  const finishDrag = (event) => {
    if (event.pointerId !== activePointer) return;
    const distance = event.clientX - startX;
    const step = cardStep();
    const movedCards = Math.abs(distance) > step * .18 ? (distance < 0 ? 1 : -1) : 0;
    index = Math.max(0, Math.min(cards.length - 1, Math.round(Math.abs(startOffset) / step) + movedCards));
    activePointer = null;
    carousel.classList.remove('is-dragging');
    setOffset(-index * step, true);
  };

  carousel.addEventListener('pointerup', finishDrag);
  carousel.addEventListener('pointercancel', finishDrag);
  carousel.addEventListener('click', (event) => {
    if (dragged) {
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    }
  }, true);

  window.addEventListener('resize', () => setOffset(-index * cardStep(), false));
  updatePosition();
})();
