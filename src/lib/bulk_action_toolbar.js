/* Bulk action toolbar — a floating UI that appears when the board's
 * multi-card selection grows past a threshold and disappears when it
 * empties. Pure DOM helper; no Stimulus controller dependency.
 *
 * Usage:
 *   import { attachBulkActionToolbar } from '@ninjaai/stimulus_kanban/bulk';
 *   attachBulkActionToolbar(boardEl, {
 *     actions: [
 *       { id: 'move',    label: 'Move to…',  onClick: (ids, api) => {...} },
 *       { id: 'tag',     label: 'Tag',       onClick: (ids, api) => {...} },
 *       { id: 'delete',  label: 'Delete',    onClick: (ids, api) => {...}, danger: true },
 *     ],
 *     minSelection: 1,   // show when at least N are selected (default 1)
 *     position: 'bottom', // 'bottom' | 'top'
 *   });
 *
 * Returns a `{ destroy() }` handle so hot-reloading hosts can clean up.
 */

import { el } from './dom.js';

const DEFAULTS = { minSelection: 1, position: 'bottom' };

export function attachBulkActionToolbar(boardEl, opts = {}) {
  if (!boardEl) throw new Error('attachBulkActionToolbar: boardEl is required');
  const cfg = { ...DEFAULTS, ...opts };
  const actions = Array.isArray(cfg.actions) ? cfg.actions.slice() : [];

  const bar = el('div', { class: 'sk-bulk-toolbar', role: 'toolbar', 'aria-label': 'Bulk actions' });
  bar.style.display = 'none';

  // Build a left-hand label + each action button + a clear-selection on the right.
  const label = el('span', { class: 'sk-bulk-label' });
  bar.appendChild(label);

  // Re-render buttons on every selection change so action.disabled() updates.
  function renderActions(ids) {
    [...bar.querySelectorAll('button.sk-bulk-btn,button.sk-bulk-clear')].forEach((b) => b.remove());
    for (const a of actions) {
      const btn = el('button', {
        class: `sk-bulk-btn${a.danger ? ' sk-bulk-btn-danger' : ''}${a.primary ? ' sk-bulk-btn-primary' : ''}`,
        type: 'button',
        'data-bulk-action': a.id || a.label,
        text: a.label || a.id || '',
      });
      const disabled = typeof a.disabled === 'function' ? a.disabled(ids, boardEl.boardApi) : false;
      if (disabled) btn.setAttribute('disabled', '');
      btn.addEventListener('click', () => {
        try { a.onClick?.(boardEl.boardApi.getSelectedCardIds(), boardEl.boardApi, boardEl); }
        catch (err) { console.error('[bulk-toolbar] action failed', err); }
      });
      bar.appendChild(btn);
    }
    const clear = el('button', {
      class: 'sk-bulk-clear', type: 'button', 'aria-label': 'Clear selection', text: '×',
    });
    clear.addEventListener('click', () => boardEl.boardApi?.clearSelection?.());
    bar.appendChild(clear);
  }

  function onSelection() {
    const ids = boardEl.boardApi?.getSelectedCardIds?.() || [];
    if (ids.length < cfg.minSelection) {
      bar.style.display = 'none';
      return;
    }
    label.textContent = `${ids.length} selected`;
    renderActions(ids);
    bar.style.display = '';
  }

  boardEl.addEventListener('board:cardSelectionChanged', onSelection);

  // Attach to the document body so we can position the toolbar over any
  // board layout (the board element itself may be inside a grid/flex column).
  document.body.appendChild(bar);
  bar.classList.add(`sk-bulk-toolbar-${cfg.position}`);

  // Initial render in case selection already exists when we attach
  setTimeout(onSelection, 0);

  return {
    destroy() {
      boardEl.removeEventListener('board:cardSelectionChanged', onSelection);
      bar.remove();
    },
    el: bar,
    update: onSelection,
  };
}
