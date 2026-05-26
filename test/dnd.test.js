/* Programmatic DnD via beginDrag / endDrag — the harness path the spec calls
 * out in §6 so tests don't need synthetic pointer events. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Application } from '@hotwired/stimulus';
import { start } from '../src/index.js';

async function mount(html) {
  document.body.innerHTML = html;
  const app = Application.start();
  start(app);
  const root = document.querySelector('[data-controller~="board"]');
  if (root.boardApi) return { app, root, api: root.boardApi };
  return new Promise((resolve) => {
    root.addEventListener('board:ready', (ev) => resolve({ app, root, api: ev.detail.api }), { once: true });
  });
}

describe('programmatic drag', () => {
  let app, root, api;
  beforeEach(async () => {
    ({ app, root, api } = await mount(`
      <div data-controller="board" style="height:400px">
        <ol class="sk-columns">
          <li data-controller="board-column" data-board-column-id-value="a" data-board-column-title-value="A">
            <ol class="sk-cards">
              <li data-card-id="1">one</li>
              <li data-card-id="2">two</li>
            </ol>
          </li>
          <li data-controller="board-column" data-board-column-id-value="b" data-board-column-title-value="B">
            <ol class="sk-cards"></ol>
          </li>
        </ol>
      </div>
    `));
  });
  afterEach(() => app.stop());

  it('beginDrag + endDrag with a target moves the card', () => {
    api.beginDrag(['1'], 'a');
    api.endDrag({ toColumnId: 'b', toIndex: 0 });
    expect(api.getCardData().find((c) => c.id === '1').column_id).toBe('b');
  });

  it('endDrag with cancelled:true keeps the card in place', () => {
    api.beginDrag(['1'], 'a');
    api.endDrag({ cancelled: true });
    expect(api.getCardData().find((c) => c.id === '1').column_id).toBe('a');
  });

  it('moveCards moves a pile preserving relative order', () => {
    api.moveCards(['1', '2'], { toColumnId: 'b', toIndex: 0 });
    const order = api.getCardData()
      .filter((c) => c.column_id === 'b')
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id);
    expect(order).toEqual(['1', '2']);
  });
});
