/* End-to-end controller wiring: mount a board, exercise the boardApi,
 * check rendered DOM + event emissions. Runs in jsdom. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Application } from '@hotwired/stimulus';
import { start } from '../src/index.js';

function mountBoard(html) {
  document.body.innerHTML = html;
  const app = Application.start();
  start(app);
  // Stimulus connects on a microtask; flush.
  return new Promise((resolve) => {
    const root = document.querySelector('[data-controller~="board"]');
    if (root.boardApi) return resolve({ app, root, api: root.boardApi });
    root.addEventListener('board:ready', (ev) => resolve({ app, root, api: ev.detail.api }), { once: true });
  });
}

describe('boardApi — data + columns', () => {
  let app, root, api;
  beforeEach(async () => {
    ({ app, root, api } = await mountBoard(`
      <div data-controller="board" style="height:400px">
        <ol class="sk-columns">
          <li data-controller="board-column"
              data-board-column-id-value="todo"
              data-board-column-title-value="To do">
            <ol class="sk-cards">
              <li data-card-id="1" data-column-id="todo">A</li>
              <li data-card-id="2" data-column-id="todo">B</li>
            </ol>
          </li>
          <li data-controller="board-column"
              data-board-column-id-value="done"
              data-board-column-title-value="Done">
            <ol class="sk-cards"></ol>
          </li>
        </ol>
      </div>
    `));
  });
  afterEach(() => app.stop());

  it('exposes the api after board:ready', () => {
    expect(typeof api.setCardData).toBe('function');
    expect(typeof api.moveCard).toBe('function');
  });

  it('parses the HTML-first cards into getCardData()', () => {
    const cards = api.getCardData();
    expect(cards.map((c) => c.id).sort()).toEqual(['1', '2']);
    expect(cards.every((c) => c.column_id === 'todo')).toBe(true);
  });

  it('moveCard re-renders into the target column', async () => {
    api.moveCard('1', { toColumnId: 'done', toIndex: 0 });
    await new Promise((r) => requestAnimationFrame(r));
    const doneCards = root.querySelectorAll('[data-board-column-id-value="done"] [data-card-id]');
    const todoCards = root.querySelectorAll('[data-board-column-id-value="todo"] [data-card-id]');
    expect(Array.from(doneCards).map((el) => el.getAttribute('data-card-id'))).toEqual(['1']);
    expect(Array.from(todoCards).map((el) => el.getAttribute('data-card-id'))).toEqual(['2']);
  });

  it('emits board:cardMoved on a successful move', async () => {
    const events = [];
    root.addEventListener('board:cardMoved', (ev) => events.push(ev.detail));
    api.moveCard('1', { toColumnId: 'done', toIndex: 0 });
    expect(events).toHaveLength(1);
    expect(events[0].cardId).toBe('1');
    expect(events[0].toColumnId).toBe('done');
  });

  it('board:beforeMove is cancellable', () => {
    root.addEventListener('board:beforeMove', (ev) => ev.preventDefault(), { once: true });
    const moved = api.moveCard('1', { toColumnId: 'done', toIndex: 0 });
    expect(moved).toBe(false);
    expect(api.getCardData().find((c) => c.id === '1').column_id).toBe('todo');
  });

  it('applyTransaction handles add / update / remove', async () => {
    api.applyTransaction({
      add:    [{ id: 99, column_id: 'done', title: 'X' }],
      update: [{ id: 1, title: 'A!' }],
      remove: [2],
    });
    await new Promise((r) => requestAnimationFrame(r));
    const a = api.getCardData().find((c) => c.id === '1');
    expect(a.title).toBe('A!');
    expect(api.getCardData().find((c) => c.id === '2')).toBeUndefined();
    expect(api.getCardData().find((c) => c.id === '99')).toBeTruthy();
  });
});

describe('boardApi — selection + filter', () => {
  let app, root, api;
  beforeEach(async () => {
    ({ app, root, api } = await mountBoard(`
      <div data-controller="board"
           data-board-card-selection-value="multiple"
           style="height:400px">
        <ol class="sk-columns">
          <li data-controller="board-column" data-board-column-id-value="a" data-board-column-title-value="A">
            <ol class="sk-cards">
              <li data-card-id="1">red apple</li>
              <li data-card-id="2">green pear</li>
            </ol>
          </li>
          <li data-controller="board-column" data-board-column-id-value="b" data-board-column-title-value="B">
            <ol class="sk-cards">
              <li data-card-id="3">blue plum</li>
            </ol>
          </li>
        </ol>
      </div>
    `));
  });
  afterEach(() => app.stop());

  it('selectCard tracks state', () => {
    api.selectCard('1');
    expect(api.getSelectedCardIds()).toEqual(['1']);
    api.selectCard('3');
    expect(api.getSelectedCardIds().sort()).toEqual(['1', '3']);
    api.clearSelection();
    expect(api.getSelectedCardIds()).toEqual([]);
  });

  it('selectAllInColumn only acts in multi-select boards', () => {
    api.selectAllInColumn('a');
    expect(api.getSelectedCardIds().sort()).toEqual(['1', '2']);
  });

  it('setQuickFilter renders only matching cards', async () => {
    api.setQuickFilter('blue');
    await new Promise((r) => requestAnimationFrame(r));
    const visible = root.querySelectorAll('[data-card-id]');
    expect(Array.from(visible).map((el) => el.getAttribute('data-card-id'))).toEqual(['3']);
  });

  it('setCardFilter takes a predicate', async () => {
    api.setCardFilter((c) => c.title.includes('red'));
    await new Promise((r) => requestAnimationFrame(r));
    const visible = root.querySelectorAll('[data-card-id]');
    expect(Array.from(visible).map((el) => el.getAttribute('data-card-id'))).toEqual(['1']);
  });
});

describe('boardApi — WIP + accept_from', () => {
  let app, root, api;
  beforeEach(async () => {
    ({ app, root, api } = await mountBoard(`
      <div data-controller="board" style="height:400px">
        <ol class="sk-columns">
          <li data-controller="board-column"
              data-board-column-id-value="open"
              data-board-column-title-value="Open"
              data-board-column-wip-value="1">
            <ol class="sk-cards">
              <li data-card-id="a">A</li>
            </ol>
          </li>
          <li data-controller="board-column"
              data-board-column-id-value="close"
              data-board-column-title-value="Close"
              data-board-column-accept-cards-from-value='["open"]'>
            <ol class="sk-cards"></ol>
          </li>
        </ol>
      </div>
    `));
  });
  afterEach(() => app.stop());

  it('exposes WIP state including over flag', async () => {
    api.applyTransaction({ add: [{ id: 'b', column_id: 'open' }] });
    await new Promise((r) => requestAnimationFrame(r));
    const wip = api.getWipState().find((w) => w.colId === 'open');
    expect(wip.over).toBe(true);
    expect(wip.count).toBe(2);
  });

  it('board:wipExceeded fires once per crossing, not per card added', async () => {
    const events = [];
    root.addEventListener('board:wipExceeded', (ev) => events.push(ev.detail));
    api.applyTransaction({ add: [{ id: 'b', column_id: 'open' }] });
    api.applyTransaction({ add: [{ id: 'c', column_id: 'open' }] });
    // Both apply pushes count over WIP, but we only fire on the cross.
    expect(events.length).toBeGreaterThanOrEqual(1);
    // The board state didn't dip below the limit between adds, so no
    // second crossing fired.
    expect(events.length).toBe(1);
  });

  it('accept_from blocks moves from non-listed columns', () => {
    // No card in `open` has been told to come from another column-source,
    // so moving an alien card in should fail.
    api.applyTransaction({ add: [{ id: 'z', column_id: 'somewhere_else' }] });
    const ok = api.moveCard('z', { toColumnId: 'close', toIndex: 0 });
    expect(ok).toBe(false);
  });

  it('accept_from allows whitelisted moves', () => {
    const ok = api.moveCard('a', { toColumnId: 'close', toIndex: 0 });
    expect(ok).toBe(true);
  });
});
