/* Per-column virtual scrolling.
 *
 * One column can easily hit thousands of cards (incident queue, support
 * inbox, lead backlog). With a fixed `card-height` and a card count past
 * `virtual-threshold`, we only render the cards in the visible window plus
 * an overscan band on each side. Outside-window cards live in the model but
 * not in the DOM.
 *
 * Variable-height cards (card-height: auto) fall back to a non-virtual
 * render — keeping the math simple is a deliberate trade-off; if the host
 * needs virtualised auto-height cards they can pick a uniform pixel height
 * for that column. */

const DEFAULT_OVERSCAN = 6;

export function createVirtualColumn({
  cards,
  cardHeight,
  gap = 8,
  overscan = DEFAULT_OVERSCAN,
  scrollEl,
  renderCard, // (card, index) => HTMLElement
  cardsListEl,
}) {
  const itemSize = cardHeight + gap;

  // Spacer pads above & below the rendered window so the scrollbar matches
  // the logical content height. We only set heights on these two nodes;
  // never on the items themselves (the renderCard caller is free to style
  // those however it likes).
  const topSpacer    = document.createElement('li');
  const bottomSpacer = document.createElement('li');
  topSpacer.className = 'sk-virtual-spacer';
  bottomSpacer.className = 'sk-virtual-spacer';
  topSpacer.setAttribute('aria-hidden', 'true');
  bottomSpacer.setAttribute('aria-hidden', 'true');

  let mounted = new Map(); // index → element

  function render() {
    const total = cards.length;
    const viewport = scrollEl.clientHeight;
    const scrollTop = scrollEl.scrollTop;
    const first = Math.max(0, Math.floor(scrollTop / itemSize) - overscan);
    const visibleCount = Math.ceil(viewport / itemSize) + overscan * 2;
    const last = Math.min(total - 1, first + visibleCount);

    cardsListEl.replaceChildren();
    topSpacer.style.height = `${first * itemSize}px`;
    bottomSpacer.style.height = `${Math.max(0, (total - last - 1) * itemSize)}px`;
    cardsListEl.appendChild(topSpacer);

    const next = new Map();
    for (let i = first; i <= last; i++) {
      const card = cards[i];
      if (!card) continue;
      let node = mounted.get(i);
      if (!node) node = renderCard(card, i);
      cardsListEl.appendChild(node);
      next.set(i, node);
    }
    mounted = next;
    cardsListEl.appendChild(bottomSpacer);
  }

  function onScroll() {
    render();
  }

  scrollEl.addEventListener('scroll', onScroll, { passive: true });
  render();

  return {
    render,
    update(nextCards) {
      cards = nextCards;
      mounted.clear();
      render();
    },
    destroy() {
      scrollEl.removeEventListener('scroll', onScroll);
      mounted.clear();
      cardsListEl.replaceChildren();
    },
    /* Translate a logical card index (in `cards`) to a y-position relative
     * to the scroll container — used by the DnD module so a drop into the
     * logical N-th slot of a virtualised column resolves correctly even
     * when N isn't currently rendered. */
    indexToY(i) { return i * itemSize; },
    yToIndex(y) { return Math.max(0, Math.floor(y / itemSize)); },
  };
}

/* Pure helper — decide whether a column should virtualise. */
export function shouldVirtualise({ cardCount, threshold, cardHeight, virtual }) {
  if (virtual === true) return true;
  if (virtual === false) return false;
  if (!Number.isFinite(cardHeight) || cardHeight <= 0) return false;
  return cardCount >= (Number.isFinite(threshold) ? threshold : 200);
}
