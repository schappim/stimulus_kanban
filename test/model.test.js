import { describe, it, expect } from 'vitest';
import {
  normaliseCards,
  normaliseColumns,
  cardsInColumn,
  applyColumnSort,
  applyQuickFilter,
  applyPredicate,
  bucketBySwimlane,
  computeWipState,
  moveCard,
  moveCards,
  reorderCardWithinColumn,
  applyTransaction,
  buildDisplayList,
} from '../src/lib/model.js';

const ids = (cards) => cards.map((c) => String(c.id));

const baseCards = [
  { id: 1, column_id: 'todo',  title: 'A', order: 0 },
  { id: 2, column_id: 'todo',  title: 'B', order: 1 },
  { id: 3, column_id: 'doing', title: 'C', order: 0 },
  { id: 4, column_id: 'doing', title: 'D', order: 1 },
  { id: 5, column_id: 'done',  title: 'E', order: 0 },
];

const baseColumns = [
  { id: 'todo',  title: 'To do',  wip: 3 },
  { id: 'doing', title: 'Doing',  wip: 2 },
  { id: 'done',  title: 'Done',   wip: null },
];

describe('normaliseCards', () => {
  it('stringifies id and column_id and fills missing order from position', () => {
    const out = normaliseCards([{ id: 10, column_id: 'a' }, { id: 11, column_id: 'a' }]);
    expect(out[0].id).toBe('10');
    expect(out[0].column_id).toBe('a');
    expect(out[0].order).toBe(0);
    expect(out[1].order).toBe(1);
  });
  it('preserves explicit order across the column', () => {
    const out = normaliseCards([
      { id: 'x', column_id: 'a', order: 5 },
      { id: 'y', column_id: 'a', order: 1 },
    ]);
    const a = out.find((c) => c.id === 'y');
    const b = out.find((c) => c.id === 'x');
    expect(a.order).toBe(1);
    expect(b.order).toBe(5);
  });
});

describe('normaliseColumns', () => {
  it('coerces wip / accept_from / collapsed sensibly', () => {
    const out = normaliseColumns([
      { id: 'x', wip: '5', accept_from: ['a', 1], collapsed: 'true' },
    ]);
    expect(out[0].wip).toBe(5);
    expect(out[0].accept_from).toEqual(['a', '1']);
    expect(out[0].collapsed).toBe(true);
  });
});

describe('cardsInColumn', () => {
  it('returns only the cards in the asked column', () => {
    expect(ids(cardsInColumn(baseCards, 'todo'))).toEqual(['1', '2']);
    expect(ids(cardsInColumn(baseCards, 'doing'))).toEqual(['3', '4']);
  });
});

describe('applyColumnSort', () => {
  it('asc:<field> sorts naturally', () => {
    const list = [{ title: 'B' }, { title: 'A' }, { title: 'C' }];
    expect(applyColumnSort(list, 'asc:title').map((c) => c.title)).toEqual(['A', 'B', 'C']);
  });
  it('desc:<field> reverses', () => {
    const list = [{ title: 'B' }, { title: 'A' }, { title: 'C' }];
    expect(applyColumnSort(list, 'desc:title').map((c) => c.title)).toEqual(['C', 'B', 'A']);
  });
  it('manual sorts by order', () => {
    const list = [{ title: 'B', order: 2 }, { title: 'A', order: 1 }];
    expect(applyColumnSort(list, 'manual').map((c) => c.title)).toEqual(['A', 'B']);
  });
});

describe('applyQuickFilter', () => {
  it('case-insensitive contains match across string fields', () => {
    expect(ids(applyQuickFilter(baseCards, 'b'))).toEqual(['2']);
  });
  it('returns input untouched when query is empty', () => {
    expect(applyQuickFilter(baseCards, '')).toBe(baseCards);
  });
});

describe('applyPredicate', () => {
  it('keeps cards the predicate returns truthy for', () => {
    expect(ids(applyPredicate(baseCards, (c) => c.column_id === 'todo'))).toEqual(['1', '2']);
  });
  it('swallows predicate errors without dropping the whole list', () => {
    expect(ids(applyPredicate(baseCards, (c) => { if (c.id === 3) throw new Error('boom'); return true; })))
      .toEqual(['1', '2', '4', '5']);
  });
});

describe('bucketBySwimlane', () => {
  it('groups by the named field, preserving insertion order', () => {
    const cards = [
      { id: 1, assignee: 'alice' },
      { id: 2, assignee: 'bob' },
      { id: 3, assignee: 'alice' },
      { id: 4 },                       // → "" / Unassigned bucket
    ];
    const out = bucketBySwimlane(cards, 'assignee');
    expect(Array.from(out.keys())).toEqual(['alice', 'bob', '']);
    expect(out.get('alice').map((c) => c.id)).toEqual([1, 3]);
    expect(out.get('').map((c) => c.id)).toEqual([4]);
  });
  it('without a field returns one bucket', () => {
    const out = bucketBySwimlane(baseCards, '');
    expect(out.size).toBe(1);
    expect(out.get('').length).toBe(baseCards.length);
  });
});

describe('computeWipState', () => {
  it('marks columns over their WIP limit', () => {
    const wips = computeWipState(baseColumns, baseCards);
    const doing = wips.find((w) => w.colId === 'doing');
    expect(doing.over).toBe(false);    // 2 / 2 — exact match is allowed
    expect(doing.count).toBe(2);
  });
  it('over = count > limit (strictly)', () => {
    const cards = baseCards.concat({ id: 99, column_id: 'doing' });
    const wips = computeWipState(baseColumns, cards);
    const doing = wips.find((w) => w.colId === 'doing');
    expect(doing.over).toBe(true);
    expect(doing.count).toBe(3);
  });
});

describe('moveCard', () => {
  it('reseats a card in a new column at the asked index', () => {
    const out = moveCard(baseCards, 1, { toColumnId: 'doing', toIndex: 1 });
    const list = cardsInColumn(out, 'doing');
    const order = applyColumnSort(list, 'manual').map((c) => String(c.id));
    expect(order).toEqual(['3', '1', '4']);
    // source column lost the card
    expect(ids(cardsInColumn(out, 'todo'))).toEqual(['2']);
  });
  it('reseating within the same column updates the order key', () => {
    const out = moveCard(baseCards, 2, { toColumnId: 'todo', toIndex: 0 });
    const order = applyColumnSort(cardsInColumn(out, 'todo'), 'manual').map((c) => String(c.id));
    expect(order).toEqual(['2', '1']);
  });
  it('is a no-op for unknown cards', () => {
    const out = moveCard(baseCards, 'nope', { toColumnId: 'doing', toIndex: 0 });
    expect(out).toBe(baseCards);
  });
});

describe('moveCards (multi-select)', () => {
  it('moves a pile together, preserving cross-column order', () => {
    const out = moveCards(baseCards, [1, 4], { toColumnId: 'done', toIndex: 0 });
    const done = applyColumnSort(cardsInColumn(out, 'done'), 'manual').map((c) => String(c.id));
    expect(done).toEqual(['1', '4', '5']);
  });
});

describe('reorderCardWithinColumn', () => {
  it('re-sequences without changing column membership', () => {
    const out = reorderCardWithinColumn(baseCards, 4, 0);
    const doing = applyColumnSort(cardsInColumn(out, 'doing'), 'manual').map((c) => String(c.id));
    expect(doing).toEqual(['4', '3']);
  });
});

describe('applyTransaction', () => {
  it('handles add / update / remove / move in one pass', () => {
    const out = applyTransaction(baseCards, {
      add:    [{ id: 10, column_id: 'todo', title: 'New', order: 5 }],
      update: [{ id: 1, title: 'A-renamed' }],
      remove: [5],
      move:   [{ id: 3, toColumnId: 'todo', toIndex: 0 }],
    });
    expect(out.find((c) => String(c.id) === '1').title).toBe('A-renamed');
    expect(out.find((c) => String(c.id) === '5')).toBeUndefined();
    expect(out.find((c) => String(c.id) === '10')).toBeTruthy();
    const todo = applyColumnSort(cardsInColumn(out, 'todo'), 'manual').map((c) => String(c.id));
    // Card 3 moved to head of `todo`; 1, 2 preserved; 10 appended.
    expect(todo).toEqual(['3', '1', '2', '10']);
  });
  it('add is idempotent against existing ids', () => {
    const out = applyTransaction(baseCards, { add: [{ id: 1, column_id: 'done' }] });
    expect(out.filter((c) => String(c.id) === '1').length).toBe(1);
  });
});

describe('buildDisplayList', () => {
  it('returns one column-group per visible column when no swimlane', () => {
    const dl = buildDisplayList({ cards: baseCards, columns: baseColumns });
    expect(dl.swimlanes).toBeNull();
    expect(dl.columns.map((c) => c.col.id)).toEqual(['todo', 'doing', 'done']);
    expect(dl.columns[0].cards.map((c) => String(c.id))).toEqual(['1', '2']);
  });
  it('with swimlaneField returns a band per bucket × column matrix', () => {
    const cards = baseCards.map((c) => ({ ...c, assignee: c.id % 2 === 0 ? 'bob' : 'alice' }));
    const dl = buildDisplayList({ cards, columns: baseColumns, options: { swimlaneField: 'assignee' } });
    expect(dl.swimlanes.map((s) => s.value)).toEqual(['alice', 'bob']);
    const aliceTodo = dl.swimlanes[0].columns.find((c) => c.col.id === 'todo').cards;
    expect(aliceTodo.map((c) => String(c.id))).toEqual(['1']);
  });
  it('quickFilter narrows the cards but keeps all visible columns', () => {
    // 'D' matches card 4 (title D) only — column_id "doing" / "done" are
    // structural metadata excluded from the filter scan (see model.js).
    const dl = buildDisplayList({ cards: baseCards, columns: baseColumns, options: { quickFilter: 'D' } });
    expect(dl.columns.map((c) => c.col.id)).toEqual(['todo', 'doing', 'done']);
    expect(dl.columns.find((c) => c.col.id === 'doing').cards.map((c) => String(c.id))).toEqual(['4']);
    expect(dl.columns.find((c) => c.col.id === 'done').cards).toEqual([]);
  });
});
