/* stimulus_kanban — pure model reducers.
 *
 * No DOM. No `document`. Everything in this file takes plain JS data in and
 * returns plain JS data out, so the same code drives the rendered board, the
 * test suite, and the server-side card model. The controller layer is the
 * only place that touches the DOM.
 *
 * Shapes:
 *   card    = { id, column_id, title?, order?, ...arbitraryFields }
 *   column  = { id, title?, wip?, accept_from?, sort?, color?, icon?, width?,
 *               collapsed?, hidden?, disallow_drag?, min_count?, ... }
 *   sort    = "manual" | "asc:<field>" | "desc:<field>"
 *
 * Conventions:
 *   - `getCardId(card)`    → string identity. Pulled from `boardOptions.getCardId`
 *                            (default "id") so host apps that key on `uuid` /
 *                            `key` / `__id` don't need to munge their payload.
 *   - `getColumnId(card)`  → which column the card lives in (default "column_id").
 *   - Synthetic columns (swimlane group rows) carry `__synthetic: true` and are
 *     excluded from `getColumnData()` / persistence.
 */

export const DEFAULT_GET_CARD_ID   = 'id';
export const DEFAULT_GET_COLUMN_ID = 'column_id';
export const DEFAULT_ORDER_FIELD   = 'order';

export function getCardId(card, field = DEFAULT_GET_CARD_ID) {
  if (card == null) return null;
  const v = card[field];
  return v == null ? null : String(v);
}

export function getColumnId(card, field = DEFAULT_GET_COLUMN_ID) {
  if (card == null) return null;
  const v = card[field];
  return v == null ? null : String(v);
}

/* ---------- Normalisation ------------------------------------------------- */

/* Coerce arbitrary card input into a stable shape:
 *   - card.id, card.column_id stringified (DOM data-* attributes are strings,
 *     so we make IDs comparable from JS and HTML alike).
 *   - missing `order` becomes the position within its column at parse time
 *     (so a host that ignores `order` still gets stable drag positions).
 */
export function normaliseCards(cards, options = {}) {
  const idField     = options.getCardId   || DEFAULT_GET_CARD_ID;
  const colField    = options.getColumnId || DEFAULT_GET_COLUMN_ID;
  const orderField  = options.orderField  || DEFAULT_ORDER_FIELD;
  const list = Array.isArray(cards) ? cards.filter((c) => c != null) : [];
  const byCol = new Map();
  for (const c of list) {
    const cid = String(c[colField] ?? '');
    if (!byCol.has(cid)) byCol.set(cid, []);
    byCol.get(cid).push(c);
  }
  const out = [];
  for (const [cid, group] of byCol) {
    const ordered = group.slice().sort((a, b) => {
      const oa = a[orderField]; const ob = b[orderField];
      if (oa == null && ob == null) return 0;
      if (oa == null) return 1;
      if (ob == null) return -1;
      return Number(oa) - Number(ob);
    });
    ordered.forEach((c, i) => {
      const next = { ...c };
      next[idField]    = String(c[idField] ?? '');
      next[colField]   = cid;
      next[orderField] = c[orderField] == null ? i : Number(c[orderField]);
      out.push(next);
    });
  }
  return out;
}

export function normaliseColumns(columns) {
  if (!Array.isArray(columns)) return [];
  return columns.filter((c) => c != null).map((c) => ({
    ...c,
    id: String(c.id ?? ''),
    title: c.title ?? c.id ?? '',
    wip: c.wip == null ? null : Number(c.wip),
    accept_from: Array.isArray(c.accept_from) ? c.accept_from.map(String) : null,
    sort: c.sort ?? 'manual',
    collapsed: !!c.collapsed,
    hidden: !!c.hidden,
    disallow_drag: !!c.disallow_drag,
    min_count: c.min_count == null ? null : Number(c.min_count),
  }));
}

/* ---------- Lookups ------------------------------------------------------- */

export function indexCards(cards, idField = DEFAULT_GET_CARD_ID) {
  const m = new Map();
  for (const c of cards) m.set(String(c[idField]), c);
  return m;
}

export function indexColumns(columns) {
  const m = new Map();
  for (const c of columns) m.set(String(c.id), c);
  return m;
}

export function cardsInColumn(cards, columnId, options = {}) {
  const colField = options.getColumnId || DEFAULT_GET_COLUMN_ID;
  return cards.filter((c) => String(c[colField]) === String(columnId));
}

/* ---------- Sort ---------------------------------------------------------- */

const NATURAL_CMP = (a, b) =>
  String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });

function compareField(a, b, field) {
  const av = a?.[field]; const bv = b?.[field];
  if (av == null && bv == null) return 0;
  if (av == null) return -1;
  if (bv == null) return 1;
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return NATURAL_CMP(av, bv);
}

/* Apply column.sort to a list of cards already filtered to one column.
 * "manual" preserves input order; "asc:<field>"/"desc:<field>" stable-sorts. */
export function applyColumnSort(cards, sort, orderField = DEFAULT_ORDER_FIELD) {
  if (!sort || sort === 'manual') {
    // Stable order by the explicit order field — handles round-tripped data
    // where the host still wants the visible order to follow `position`.
    return cards.slice().sort((a, b) => {
      const oa = a[orderField]; const ob = b[orderField];
      if (oa == null && ob == null) return 0;
      if (oa == null) return 1;
      if (ob == null) return -1;
      return Number(oa) - Number(ob);
    });
  }
  const [dir, field] = String(sort).split(':');
  if (!field) return cards.slice();
  const mul = dir === 'desc' ? -1 : 1;
  return cards.slice().sort((a, b) => mul * compareField(a, b, field));
}

/* ---------- Filter / search ---------------------------------------------- */

/* Quick filter: case-insensitive substring match across every string field
 * on the card. Returns the subset that matches. */
export function applyQuickFilter(cards, query) {
  if (!query) return cards;
  const q = String(query).toLowerCase();
  return cards.filter((c) => cardMatchesQuery(c, q));
}

export function cardMatchesQuery(card, q) {
  if (!q) return true;
  const needle = String(q).toLowerCase();
  for (const v of Object.values(card)) {
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number') {
      if (String(v).toLowerCase().includes(needle)) return true;
    }
  }
  return false;
}

/* Predicate filter: an arbitrary `(card) => boolean`. Errors are swallowed
 * (a host shouldn't be able to break the board by throwing in a predicate). */
export function applyPredicate(cards, predicate) {
  if (typeof predicate !== 'function') return cards;
  return cards.filter((c) => {
    try { return !!predicate(c); } catch { return false; }
  });
}

/* ---------- Swimlanes ---------------------------------------------------- */

/* Bucket cards by a field. Returns { value → [card, …] } in stable insertion
 * order (first time we see a value, that's its position). Null / undefined
 * are bucketed under the sentinel "" so callers can render an "Unassigned"
 * lane without losing data. */
export function bucketBySwimlane(cards, field) {
  const out = new Map();
  if (!field) {
    out.set('', cards.slice());
    return out;
  }
  for (const c of cards) {
    const raw = c[field];
    const key = raw == null || raw === '' ? '' : String(raw);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(c);
  }
  return out;
}

/* ---------- WIP ---------------------------------------------------------- */

export function computeWipState(columns, cards, options = {}) {
  const colField = options.getColumnId || DEFAULT_GET_COLUMN_ID;
  const counts = new Map();
  for (const c of cards) {
    const k = String(c[colField] ?? '');
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return columns
    .filter((c) => !c.__synthetic)
    .map((col) => {
      const count = counts.get(String(col.id)) || 0;
      const limit = col.wip == null ? null : Number(col.wip);
      return {
        colId: col.id,
        count,
        limit,
        over: limit != null && count > limit,
      };
    });
}

/* ---------- Move / reorder ----------------------------------------------- */

/* Move a card to a target column at a given visible index. Returns a new
 * cards array (does not mutate the input). `toIndex` is interpreted against
 * the *target column* after the source removal, so callers don't have to
 * adjust for "moved one out of the same column" themselves. */
export function moveCard(cards, cardId, target, options = {}) {
  const idField  = options.getCardId   || DEFAULT_GET_CARD_ID;
  const colField = options.getColumnId || DEFAULT_GET_COLUMN_ID;
  const orderField = options.orderField || DEFAULT_ORDER_FIELD;
  const id = String(cardId);
  const out = cards.map((c) => ({ ...c }));
  const moving = out.find((c) => String(c[idField]) === id);
  if (!moving) return cards;
  const fromCol = String(moving[colField]);
  const toCol   = String(target.toColumnId ?? fromCol);
  const toIndex = target.toIndex == null ? Number.POSITIVE_INFINITY : Number(target.toIndex);

  moving[colField] = toCol;

  // Re-sequence both columns. We do this by rebuilding the per-column
  // ordering from scratch — simpler and correct than juggling indices.
  const fromList = out.filter((c) => String(c[colField]) === fromCol && String(c[idField]) !== id)
    .sort((a, b) => Number(a[orderField] ?? 0) - Number(b[orderField] ?? 0));
  const toList   = out.filter((c) => String(c[colField]) === toCol && String(c[idField]) !== id)
    .sort((a, b) => Number(a[orderField] ?? 0) - Number(b[orderField] ?? 0));

  const insertAt = Math.max(0, Math.min(toIndex, toList.length));
  toList.splice(insertAt, 0, moving);

  fromList.forEach((c, i) => { c[orderField] = i; });
  toList.forEach((c, i)   => { c[orderField] = i; });

  return out;
}

/* Multi-card move that preserves the source order. The pile lands together
 * at `toIndex` in the destination column; intra-pile order survives. */
export function moveCards(cards, cardIds, target, options = {}) {
  const idField  = options.getCardId   || DEFAULT_GET_CARD_ID;
  const colField = options.getColumnId || DEFAULT_GET_COLUMN_ID;
  const orderField = options.orderField || DEFAULT_ORDER_FIELD;
  if (!Array.isArray(cardIds) || cardIds.length === 0) return cards;
  const setIds = new Set(cardIds.map(String));
  const toCol  = String(target.toColumnId);
  const toIndex = target.toIndex == null ? Number.POSITIVE_INFINITY : Number(target.toIndex);

  const out = cards.map((c) => ({ ...c }));
  // Preserve original cross-column order so multi-select drags don't shuffle.
  const moving = out.filter((c) => setIds.has(String(c[idField])))
    .sort((a, b) => {
      const ai = out.indexOf(a); const bi = out.indexOf(b);
      return ai - bi;
    });
  if (moving.length === 0) return cards;

  // Group remaining cards by their column for re-sequencing.
  const byCol = new Map();
  for (const c of out) {
    if (setIds.has(String(c[idField]))) continue;
    const k = String(c[colField]);
    if (!byCol.has(k)) byCol.set(k, []);
    byCol.get(k).push(c);
  }

  // Sequence non-moved cards in each source column.
  for (const list of byCol.values()) {
    list.sort((a, b) => Number(a[orderField] ?? 0) - Number(b[orderField] ?? 0));
  }

  // Bind the moving pile to the target column.
  for (const c of moving) c[colField] = toCol;

  const targetList = byCol.get(toCol) || [];
  const insertAt = Math.max(0, Math.min(toIndex, targetList.length));
  targetList.splice(insertAt, 0, ...moving);
  byCol.set(toCol, targetList);

  // Re-sequence orders for every column we touched.
  for (const list of byCol.values()) {
    list.forEach((c, i) => { c[orderField] = i; });
  }

  return out;
}

/* Reorder a single card within its own column. */
export function reorderCardWithinColumn(cards, cardId, toIndex, options = {}) {
  const idField  = options.getCardId   || DEFAULT_GET_CARD_ID;
  const colField = options.getColumnId || DEFAULT_GET_COLUMN_ID;
  const id = String(cardId);
  const c = cards.find((x) => String(x[idField]) === id);
  if (!c) return cards;
  return moveCard(cards, id, { toColumnId: c[colField], toIndex }, options);
}

/* ---------- Transactions ------------------------------------------------- */

/* Apply { add, update, remove, move } to a cards array in a single pass.
 * Returns a new array; the original is untouched. */
export function applyTransaction(cards, tx, options = {}) {
  const idField  = options.getCardId   || DEFAULT_GET_CARD_ID;
  const colField = options.getColumnId || DEFAULT_GET_COLUMN_ID;
  let out = cards.slice();
  const t = tx || {};

  if (Array.isArray(t.remove)) {
    const remove = new Set(t.remove.map((c) => String(typeof c === 'object' ? c[idField] : c)));
    out = out.filter((c) => !remove.has(String(c[idField])));
  }

  if (Array.isArray(t.update)) {
    const byId = new Map();
    for (const u of t.update) byId.set(String(u[idField]), u);
    out = out.map((c) => byId.has(String(c[idField])) ? { ...c, ...byId.get(String(c[idField])) } : c);
  }

  if (Array.isArray(t.add)) {
    const have = new Set(out.map((c) => String(c[idField])));
    for (const a of t.add) {
      const id = String(a[idField] ?? '');
      if (id && !have.has(id)) {
        out.push({ ...a, [idField]: id, [colField]: String(a[colField] ?? '') });
        have.add(id);
      }
    }
  }

  if (Array.isArray(t.move)) {
    for (const m of t.move) {
      out = moveCard(out, m[idField] ?? m.id, { toColumnId: m.toColumnId, toIndex: m.toIndex }, options);
    }
  }

  return out;
}

/* ---------- Display list -------------------------------------------------- */

/* Build the rendered display list for a board:
 *
 *   { columns: [{ col, cards: [...] }], swimlanes: [{ value, label, columns }] | null }
 *
 * Filters and per-column sort are applied here, so the controller's only job
 * is to mount/recycle DOM nodes against this output. */
export function buildDisplayList({ cards, columns, options = {} } = {}) {
  const idField  = options.getCardId   || DEFAULT_GET_CARD_ID;
  const colField = options.getColumnId || DEFAULT_GET_COLUMN_ID;
  const orderField = options.orderField || DEFAULT_ORDER_FIELD;
  const visibleColumns = columns.filter((c) => !c.hidden);

  let filtered = cards;
  if (options.quickFilter) filtered = applyQuickFilter(filtered, options.quickFilter);
  if (typeof options.predicate === 'function') filtered = applyPredicate(filtered, options.predicate);

  const swimlaneField = options.swimlaneField || '';
  const buckets = swimlaneField
    ? bucketBySwimlane(filtered, swimlaneField)
    : new Map([['', filtered]]);

  const swimlanes = swimlaneField
    ? Array.from(buckets, ([value, group]) => ({
        value,
        label: value || 'Unassigned',
        columns: visibleColumns.map((col) => ({
          col,
          cards: applyColumnSort(cardsInColumn(group, col.id, { getColumnId: colField }), col.sort, orderField),
        })),
      }))
    : null;

  const flatColumns = visibleColumns.map((col) => ({
    col,
    cards: applyColumnSort(cardsInColumn(filtered, col.id, { getColumnId: colField }), col.sort, orderField),
  }));

  return { columns: flatColumns, swimlanes, filtered };
}
