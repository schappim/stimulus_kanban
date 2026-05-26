/* Drag-and-drop state machine for stimulus_kanban.
 *
 * Design notes:
 *
 * - HTML5 DnD is the primary code path on desktop (browser-native drag image,
 *   keyboard cancel via Esc, accessibility tree integration). It does *not*
 *   fire on touch, so for pointer / touch we run a parallel
 *   pointerdown→pointermove→pointerup machine that mirrors the same lifecycle
 *   and ends in the same {fromColumnId, toColumnId, toIndex} resolution call.
 *
 * - Multi-card drag: the controller calls beginDrag([id1, id2, …]); the rest
 *   of the machine doesn't care whether the pile is one or many.
 *
 * - Drop indicator is a 2px insertion bar inserted between cards (or pinned
 *   to the top/bottom of an empty column) — see _showIndicator. We never
 *   highlight the target column itself; per UX research that competes with
 *   the per-card hover-state styling.
 *
 * - Auto-scroll: when the pointer is within `edge` px of a column's vertical
 *   edge *or* the board's horizontal edge, we tick the appropriate scroll
 *   container on rAF. Cleared on drop / cancel.
 *
 * - This module knows nothing about the boardApi or the card data model. It
 *   takes a `hooks` object from the controller and calls back into it. That
 *   keeps the controller free to defer the actual data mutation to whatever
 *   reducer it likes (local model.js, server round-trip, Turbo Stream echo).
 */

import { ancestor } from './dom.js';

const SCROLL_EDGE_PX     = 48;   // distance from edge that triggers autoscroll
const SCROLL_VELOCITY_MAX = 24;  // px per rAF tick at the very edge

export function createDnd({ root, hooks }) {
  const state = {
    dragging: false,
    cardIds: [],
    fromColumnId: null,
    pointerActive: false,           // touch / pointer fallback running
    indicatorEl: null,
    targetColumnId: null,
    targetIndex: null,
    rafToken: null,
    pointer: { x: 0, y: 0 },
    ghostEl: null,
  };

  /* ---- HTML5 DnD hooks attached at the board root ---- */

  function onDragStart(ev) {
    const cardEl = ancestor(ev.target, '[data-card-id]');
    if (!cardEl) return;
    const fromColEl = ancestor(cardEl, '[data-board-column-id-value]');
    if (!fromColEl) return;
    if (cardEl.getAttribute('data-card-locked') === 'true') {
      ev.preventDefault();
      return;
    }
    const fromColumnId = fromColEl.getAttribute('data-board-column-id-value');
    if (hooks.isColumnDisallowDrag?.(fromColumnId)) {
      ev.preventDefault();
      return;
    }
    // If the dragged card isn't selected, treat it as a single-card drag.
    // If it IS selected, the whole selected pile in the same source column
    // comes along (cross-column piles are split — UX convention).
    const id = cardEl.getAttribute('data-card-id');
    const ids = hooks.expandSelection?.(id, fromColumnId) ?? [id];
    state.dragging = true;
    state.cardIds = ids;
    state.fromColumnId = fromColumnId;
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', JSON.stringify({ ids })); } catch { /* Safari old */ }
    if (ids.length > 1) _attachStackBadge(ev, ids.length);
    hooks.onDragStart?.({ ids, fromColumnId });
    cardEl.classList.add('sk-card-dragging');
  }

  function onDragOver(ev) {
    if (!state.dragging) return;
    const colEl = ancestor(ev.target, '[data-board-column-id-value]');
    if (!colEl) return;
    const toColumnId = colEl.getAttribute('data-board-column-id-value');
    if (!hooks.canAcceptDrop?.(state.fromColumnId, toColumnId)) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    state.pointer.x = ev.clientX;
    state.pointer.y = ev.clientY;
    const toIndex = _computeDropIndex(colEl, ev.clientY);
    _setTarget(colEl, toColumnId, toIndex);
    _scheduleAutoscroll();
  }

  function onDrop(ev) {
    if (!state.dragging) return;
    ev.preventDefault();
    _finishDrop({ cancelled: false });
  }

  function onDragEnd(_ev) {
    // dragend always fires — whether dropped or cancelled (Esc / outside).
    if (state.dragging && state.targetColumnId == null) {
      _finishDrop({ cancelled: true });
    }
    _cleanup();
  }

  /* ---- Pointer / touch fallback ---- */
  // dragstart never fires on touch in most mobile browsers; this is the
  // parallel path. We only kick into pointer mode if the user has actually
  // moved a few pixels — a tap-to-click stays a click.

  let pointerSeed = null;

  function onPointerDown(ev) {
    if (ev.pointerType !== 'touch' && ev.pointerType !== 'pen') return;
    const cardEl = ancestor(ev.target, '[data-card-id]');
    if (!cardEl) return;
    if (cardEl.getAttribute('data-card-locked') === 'true') return;
    pointerSeed = {
      cardEl,
      id: cardEl.getAttribute('data-card-id'),
      x: ev.clientX, y: ev.clientY,
      pointerId: ev.pointerId,
    };
  }

  function onPointerMove(ev) {
    if (pointerSeed && !state.pointerActive) {
      const dx = ev.clientX - pointerSeed.x;
      const dy = ev.clientY - pointerSeed.y;
      if (Math.hypot(dx, dy) < 6) return;
      _beginPointerDrag(pointerSeed, ev);
    }
    if (!state.pointerActive) return;
    state.pointer.x = ev.clientX;
    state.pointer.y = ev.clientY;
    const colEl = _columnAtPoint(ev.clientX, ev.clientY);
    if (!colEl) return;
    const toColumnId = colEl.getAttribute('data-board-column-id-value');
    if (!hooks.canAcceptDrop?.(state.fromColumnId, toColumnId)) return;
    const toIndex = _computeDropIndex(colEl, ev.clientY);
    _setTarget(colEl, toColumnId, toIndex);
    _moveGhost(ev.clientX, ev.clientY);
    _scheduleAutoscroll();
  }

  function onPointerUp(ev) {
    if (!state.pointerActive) { pointerSeed = null; return; }
    pointerSeed = null;
    _finishDrop({ cancelled: state.targetColumnId == null });
    _cleanup();
  }

  function onPointerCancel(_ev) {
    pointerSeed = null;
    if (state.pointerActive) {
      _finishDrop({ cancelled: true });
      _cleanup();
    }
  }

  function _beginPointerDrag(seed, ev) {
    const fromColEl = ancestor(seed.cardEl, '[data-board-column-id-value]');
    if (!fromColEl) return;
    const fromColumnId = fromColEl.getAttribute('data-board-column-id-value');
    if (hooks.isColumnDisallowDrag?.(fromColumnId)) return;
    const ids = hooks.expandSelection?.(seed.id, fromColumnId) ?? [seed.id];
    state.dragging = true;
    state.pointerActive = true;
    state.cardIds = ids;
    state.fromColumnId = fromColumnId;
    seed.cardEl.classList.add('sk-card-dragging');
    state.ghostEl = _spawnGhost(seed.cardEl, ids.length);
    _moveGhost(ev.clientX, ev.clientY);
    try { seed.cardEl.setPointerCapture?.(seed.pointerId); } catch { /* no-op */ }
    hooks.onDragStart?.({ ids, fromColumnId });
  }

  /* ---- Esc cancel during HTML5 drag ---- */

  function onKeyDown(ev) {
    if (!state.dragging) return;
    if (ev.key !== 'Escape') return;
    // The browser's dragend fires after, which will call _finishDrop —
    // but we explicitly cancel to avoid the late-arriving drop being honored.
    state.targetColumnId = null;
    state.targetIndex = null;
    _hideIndicator();
  }

  /* ---- Programmatic API (test harness + boardApi.beginDrag/endDrag) ---- */

  function beginDrag(cardIds, fromColumnId) {
    state.dragging = true;
    state.cardIds = Array.isArray(cardIds) ? cardIds.slice() : [cardIds];
    state.fromColumnId = fromColumnId;
    hooks.onDragStart?.({ ids: state.cardIds, fromColumnId });
  }

  function endDrag(target = {}) {
    const cancelled = !!target.cancelled;
    if (!cancelled) {
      state.targetColumnId = target.toColumnId ?? null;
      state.targetIndex    = target.toIndex == null ? null : Number(target.toIndex);
    }
    _finishDrop({ cancelled });
    _cleanup();
  }

  /* ---- Internals ---- */

  function _finishDrop({ cancelled }) {
    if (!state.dragging) return;
    const detail = {
      cardIds: state.cardIds.slice(),
      fromColumnId: state.fromColumnId,
      toColumnId: cancelled ? null : state.targetColumnId,
      toIndex: cancelled ? null : state.targetIndex,
      cancelled,
    };
    hooks.onDrop?.(detail);
  }

  function _cleanup() {
    state.dragging = false;
    state.pointerActive = false;
    state.cardIds = [];
    state.fromColumnId = null;
    state.targetColumnId = null;
    state.targetIndex = null;
    if (state.ghostEl) {
      state.ghostEl.remove();
      state.ghostEl = null;
    }
    _hideIndicator();
    _stopAutoscroll();
    for (const el of root.querySelectorAll('.sk-card-dragging')) {
      el.classList.remove('sk-card-dragging');
    }
  }

  function _setTarget(colEl, toColumnId, toIndex) {
    state.targetColumnId = toColumnId;
    state.targetIndex = toIndex;
    _showIndicator(colEl, toIndex);
  }

  function _computeDropIndex(colEl, clientY) {
    const list = colEl.querySelector('.sk-cards');
    if (!list) return 0;
    const cards = Array.from(list.querySelectorAll(':scope > [data-card-id]'))
      .filter((el) => !el.classList.contains('sk-card-dragging'));
    if (cards.length === 0) return 0;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return cards.length;
  }

  function _showIndicator(colEl, toIndex) {
    const list = colEl.querySelector('.sk-cards');
    if (!list) return;
    if (!state.indicatorEl) {
      state.indicatorEl = document.createElement('li');
      state.indicatorEl.className = 'sk-drop-indicator';
      state.indicatorEl.setAttribute('aria-hidden', 'true');
    }
    const indicator = state.indicatorEl;
    const cards = Array.from(list.querySelectorAll(':scope > [data-card-id]'))
      .filter((el) => !el.classList.contains('sk-card-dragging'));
    if (toIndex >= cards.length) list.appendChild(indicator);
    else list.insertBefore(indicator, cards[toIndex]);
  }

  function _hideIndicator() {
    if (state.indicatorEl?.parentNode) state.indicatorEl.parentNode.removeChild(state.indicatorEl);
  }

  /* ---- Auto-scroll ---- */

  function _scheduleAutoscroll() {
    if (state.rafToken != null) return;
    const tick = () => {
      state.rafToken = null;
      if (!state.dragging) return;
      const { x, y } = state.pointer;
      _autoscrollBoard(x);
      _autoscrollColumn(x, y);
      state.rafToken = requestAnimationFrame(tick);
    };
    state.rafToken = requestAnimationFrame(tick);
  }

  function _stopAutoscroll() {
    if (state.rafToken != null) {
      cancelAnimationFrame(state.rafToken);
      state.rafToken = null;
    }
  }

  function _autoscrollBoard(x) {
    const wrap = root.querySelector('.sk-columns');
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    if (x < r.left + SCROLL_EDGE_PX) {
      const v = _velocity(r.left + SCROLL_EDGE_PX - x);
      wrap.scrollLeft -= v;
    } else if (x > r.right - SCROLL_EDGE_PX) {
      const v = _velocity(x - (r.right - SCROLL_EDGE_PX));
      wrap.scrollLeft += v;
    }
  }

  function _autoscrollColumn(x, y) {
    const colEl = _columnAtPoint(x, y);
    if (!colEl) return;
    const list = colEl.querySelector('.sk-cards');
    if (!list) return;
    const r = list.getBoundingClientRect();
    if (y < r.top + SCROLL_EDGE_PX) {
      const v = _velocity(r.top + SCROLL_EDGE_PX - y);
      list.scrollTop -= v;
    } else if (y > r.bottom - SCROLL_EDGE_PX) {
      const v = _velocity(y - (r.bottom - SCROLL_EDGE_PX));
      list.scrollTop += v;
    }
  }

  function _velocity(d) {
    const t = Math.max(0, Math.min(1, d / SCROLL_EDGE_PX));
    return Math.ceil(t * SCROLL_VELOCITY_MAX);
  }

  function _columnAtPoint(x, y) {
    const nodes = root.querySelectorAll('[data-board-column-id-value]');
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el;
    }
    return null;
  }

  /* ---- Ghost + stack badge (multi-card drag) ---- */

  function _spawnGhost(srcEl, count) {
    const g = srcEl.cloneNode(true);
    g.classList.add('sk-card-ghost');
    g.style.position = 'fixed';
    g.style.pointerEvents = 'none';
    g.style.opacity = '0.85';
    g.style.zIndex = '99999';
    g.style.left = '0px';
    g.style.top = '0px';
    if (count > 1) {
      const badge = document.createElement('span');
      badge.className = 'sk-card-stack-badge';
      badge.textContent = String(count);
      g.appendChild(badge);
    }
    document.body.appendChild(g);
    return g;
  }

  function _moveGhost(x, y) {
    if (!state.ghostEl) return;
    state.ghostEl.style.transform = `translate(${x + 8}px, ${y + 8}px)`;
  }

  function _attachStackBadge(ev, count) {
    // For HTML5 DnD we don't get a custom drag image without preparing a
    // node off-screen first; the browser snapshot of the card is fine for v1.
    // We do, however, mark the dataTransfer so multi-card consumers know.
    try { ev.dataTransfer.setData('application/x-stimulus-kanban-count', String(count)); } catch { /* no-op */ }
  }

  /* ---- Wiring ---- */

  root.addEventListener('dragstart', onDragStart);
  root.addEventListener('dragover',  onDragOver);
  root.addEventListener('drop',      onDrop);
  root.addEventListener('dragend',   onDragEnd);
  root.addEventListener('pointerdown', onPointerDown);
  // Pointer move/up must be window-level — once the pointer leaves the source
  // card mid-drag, the per-card listeners stop firing.
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  document.addEventListener('keydown', onKeyDown);

  return {
    beginDrag,
    endDrag,
    destroy() {
      root.removeEventListener('dragstart', onDragStart);
      root.removeEventListener('dragover',  onDragOver);
      root.removeEventListener('drop',      onDrop);
      root.removeEventListener('dragend',   onDragEnd);
      root.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      document.removeEventListener('keydown', onKeyDown);
      _cleanup();
    },
    isDragging() { return state.dragging; },
    getState() { return { ...state, cardIds: state.cardIds.slice() }; },
  };
}
