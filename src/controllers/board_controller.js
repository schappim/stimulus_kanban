import { Controller } from '@hotwired/stimulus';
import {
  normaliseCards, normaliseColumns,
  applyColumnSort, cardsInColumn,
  applyQuickFilter, applyPredicate, bucketBySwimlane,
  computeWipState, moveCard as moveCardModel, moveCards as moveCardsModel,
  reorderCardWithinColumn as reorderModel,
  applyTransaction as applyTransactionModel,
  DEFAULT_GET_CARD_ID, DEFAULT_GET_COLUMN_ID, DEFAULT_ORDER_FIELD,
} from '../lib/model.js';
import { createBoardApi } from '../lib/api.js';
import { createDnd } from '../lib/dnd.js';
import { createVirtualColumn, shouldVirtualise } from '../lib/virtual.js';
import { el, setAttrs, cloneTemplate, emit, applyBindings, ancestor, rafThrottle } from '../lib/dom.js';
import { getRenderer } from '../lib/renderers.js';

const DEFAULT_COLUMN_WIDTH = 280;
const DEFAULT_GAP = 8;

export default class BoardController extends Controller {
  static values = {
    cardData:                    { type: Array,  default: [] },
    cardDataUrl:                 { type: String, default: '' },
    cardSelection:               { type: String, default: '' },
    cardMultiSelectWithClick:    { type: Boolean, default: false },
    suppressCardClickSelection:  { type: Boolean, default: false },
    cardHeight:                  { type: String, default: 'auto' },
    columnWidth:                 { type: Number, default: DEFAULT_COLUMN_WIDTH },
    gap:                         { type: Number, default: DEFAULT_GAP },
    virtual:                     { type: Boolean, default: false },
    virtualThreshold:            { type: Number, default: 200 },
    height:                      { type: String, default: '' },
    getCardId:                   { type: String, default: DEFAULT_GET_CARD_ID },
    getColumnId:                 { type: String, default: DEFAULT_GET_COLUMN_ID },
    orderField:                  { type: String, default: DEFAULT_ORDER_FIELD },
    domLayout:                   { type: String, default: '' },
    serverSide:                  { type: Boolean, default: false },
    swimlaneField:               { type: String, default: '' },
    swimlaneDisplay:             { type: String, default: 'row' },
    wipLimits:                   { type: Object, default: {} },
    quickFilter:                 { type: String, default: '' },
    filterMode:                  { type: String, default: 'hide' }, // 'hide' | 'dim'
    cardRenderer:                { type: String, default: '' },
    cardEditor:                  { type: String, default: '' },
    cardDetailTemplate:          { type: String, default: '' },
    detailLayout:                { type: String, default: 'popover' }, // 'popover' | 'rail'
    detailWidth:                 { type: Number, default: 360 },
    dragHandleSelector:          { type: String, default: '' },
    readOnly:                    { type: Boolean, default: false },
    persistKey:                  { type: String, default: '' },
    addCard:                     { type: Boolean, default: false },
    addColumn:                   { type: Boolean, default: false },
    acceptFiles:                 { type: Boolean, default: false },
    attachmentsField:            { type: String, default: 'attachments' },
  };

  initialize() {
    this.state = {
      cards: [],
      columns: [],
      columnOrder: [],          // explicit ordering, mutated by moveColumn/reorder
      columnCounts: new Map(),  // server-side: total per column
      selection: new Set(),
      lastSelectedId: null,
      activeCardId: null,
      activeColumnId: null,
      quickFilter: '',
      predicate: null,
      swimlaneField: '',
      collapsedSwimlanes: new Set(),
      editing: null,            // { cardId, editorEl, originalSnapshot }
      openDetailCardId: null,
      wipExceeded: new Set(),   // colIds currently over-WIP (for "fire once" semantics)
      stuckCards: new Set(),    // cardIds currently stuck per column.stuck_after_days
      enteredColumnAt: new Map(),// cardId → ISO timestamp of when card entered current column
      virtualColumns: new Map(),// columnId → virtual instance
      ready: false,
    };
    this._renderScheduled = false;
    this._renderColumnDirty = new Set(); // colIds needing refresh; empty = full
    this._persistTimer = null;
    this._scheduleRender = rafThrottle(() => this._renderNow());
  }

  connect() {
    this.element.classList.add('sk-board');
    if (this.heightValue) this.element.style.height = this.heightValue;
    if (this.domLayoutValue === 'autoHeight') this.element.classList.add('sk-board-auto-height');
    if (!this.element.hasAttribute('tabindex')) this.element.tabIndex = 0;

    // Card data sources, in resolution order:
    //   1. Pre-rendered HTML (parsed at connect — the spec says HTML is the
    //      source of truth).
    //   2. data-board-card-data-value (Stimulus JSON value).
    //   3. data-board-card-data-url-value (one fetch on connect).
    // After connect, setCardData / applyTransaction wins.
    this._parseColumnsFromDom();
    const parsedCards = this._parseCardsFromDom();
    if (parsedCards.length > 0) {
      this.state.cards = normaliseCards(parsedCards, this._modelOpts());
    } else if (Array.isArray(this.cardDataValue) && this.cardDataValue.length > 0) {
      this.state.cards = normaliseCards(this.cardDataValue, this._modelOpts());
    } else if (this.cardDataUrlValue) {
      this._loadFromUrl(this.cardDataUrlValue);
    }

    this.state.swimlaneField = this.swimlaneFieldValue || '';
    this.state.quickFilter   = this.quickFilterValue   || '';

    this._installDnd();
    this._installKeyboard();
    this._installFileDrop();

    this.api = createBoardApi(this);
    this.element.boardApi = this.api;

    this._restorePersistedState();
    this._scheduleRender();

    // ready event fires once initial render has flushed, so handlers attached
    // in response have a working DOM to inspect.
    queueMicrotask(() => {
      this.state.ready = true;
      emit(this.element, 'board:ready', { api: this.api });
    });
  }

  disconnect() {
    this._dnd?.destroy?.();
    document.removeEventListener('click', this._onDocumentClick);
    for (const v of this.state.virtualColumns.values()) v.destroy?.();
    delete this.element.boardApi;
  }

  /* ---------------- Parsing ---------------- */

  _parseColumnsFromDom() {
    const out = [];
    const colEls = this.element.querySelectorAll('[data-controller~="board-column"]');
    for (const el of colEls) {
      const id = el.getAttribute('data-board-column-id-value') || '';
      if (!id) continue;
      out.push({
        id,
        title: el.getAttribute('data-board-column-title-value') || id,
        wip: this._numOrNull(el.getAttribute('data-board-column-wip-value')),
        min_count: this._numOrNull(el.getAttribute('data-board-column-min-count-value')),
        width: this._numOrNull(el.getAttribute('data-board-column-width-value')),
        collapsed: el.getAttribute('data-board-column-collapsed-value') === 'true',
        hidden: el.getAttribute('data-board-column-hidden-value') === 'true',
        accept_from: this._jsonOrNull(el.getAttribute('data-board-column-accept-cards-from-value')),
        disallow_drag: el.getAttribute('data-board-column-disallow-drag-value') === 'true',
        sort: el.getAttribute('data-board-column-sort-value') || 'manual',
        stuck_after_days: this._numOrNull(el.getAttribute('data-board-column-stuck-after-days-value')),
        card_renderer: el.getAttribute('data-board-column-card-renderer-value') || null,
        card_editor:   el.getAttribute('data-board-column-card-editor-value') || null,
        add_card_label: el.getAttribute('data-board-column-add-card-label-value') || null,
        color: el.getAttribute('data-board-column-color-value') || null,
        icon:  el.getAttribute('data-board-column-icon-value') || null,
      });
    }
    this.state.columns = normaliseColumns(out);
    // WIP overrides from board-level JSON
    const overrides = this.wipLimitsValue || {};
    for (const c of this.state.columns) {
      if (Object.prototype.hasOwnProperty.call(overrides, c.id)) c.wip = overrides[c.id];
    }
    this.state.columnOrder = this.state.columns.map((c) => c.id);
  }

  _parseCardsFromDom() {
    const out = [];
    const cardEls = this.element.querySelectorAll('[data-card-id]');
    for (const cardEl of cardEls) {
      const id = cardEl.getAttribute('data-card-id');
      const colEl = ancestor(cardEl, '[data-board-column-id-value]');
      const columnId = colEl?.getAttribute('data-board-column-id-value') || cardEl.getAttribute('data-column-id') || '';
      const orderAttr = cardEl.getAttribute('data-card-order');
      const jsonAttr = cardEl.getAttribute('data-card-json');
      let card = { [this.getCardIdValue]: id, [this.getColumnIdValue]: columnId };
      if (jsonAttr) {
        try { Object.assign(card, JSON.parse(jsonAttr)); } catch { /* ignore malformed inline JSON */ }
      }
      if (orderAttr != null) card[this.orderFieldValue] = Number(orderAttr);
      // Fallback display text — the renderer can read it as `card.title`
      // when the host hasn't given us anything else to render.
      if (card.title == null) card.title = cardEl.textContent.trim();
      const swimlane = cardEl.getAttribute('data-card-swimlane');
      if (swimlane != null) card.__swimlane = swimlane;
      const locked = cardEl.getAttribute('data-card-locked');
      if (locked === 'true') card.__locked = true;
      const color = cardEl.getAttribute('data-card-color');
      if (color) card.__color = color;
      const renderer = cardEl.getAttribute('data-card-renderer');
      if (renderer) card.__renderer = renderer;
      const editor = cardEl.getAttribute('data-card-editor');
      if (editor) card.__editor = editor;
      out.push(card);
    }
    return out;
  }

  async _loadFromUrl(url) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (Array.isArray(body)) {
        this.setCardData(body);
      } else {
        if (Array.isArray(body.columns)) this.setColumnData(body.columns);
        if (Array.isArray(body.cards))   this.setCardData(body.cards);
      }
    } catch (err) {
      emit(this.element, 'board:loadError', { url, error: String(err) });
    }
  }

  /* ---------------- Public methods backing the boardApi ---------------- */

  setCardData(cards) {
    this.state.cards = normaliseCards(cards, this._modelOpts());
    this._reseedEnteredColumnAt();
    this._scheduleRender();
    emit(this.element, 'board:cardDataChanged', { cards: this.getCardData() });
  }

  getCardData() {
    return this.state.cards.map((c) => ({ ...c }));
  }

  setColumnData(columns) {
    this.state.columns = normaliseColumns(columns);
    this.state.columnOrder = this.state.columns.map((c) => c.id);
    this._scheduleRender();
    emit(this.element, 'board:columnDataChanged', { columns: this.getColumnData() });
  }

  getColumnData() {
    return this._orderedColumns().filter((c) => !c.__synthetic).map((c) => ({ ...c }));
  }

  applyTransaction(tx) {
    // Snapshot pre-state to detect column transitions for aging tracker.
    const beforeCol = new Map(this.state.cards.map((c) => [String(c[this.getCardIdValue]), String(c[this.getColumnIdValue])]));
    this.state.cards = applyTransactionModel(this.state.cards, tx, this._modelOpts());
    this._trackEnteredColumnDelta(beforeCol);
    this._scheduleRender();
    if (Array.isArray(tx?.add))    tx.add.forEach((a) => emit(this.element, 'board:cardAdded', { cardId: a[this.getCardIdValue], columnId: a[this.getColumnIdValue], card: a }));
    if (Array.isArray(tx?.remove)) tx.remove.forEach((r) => emit(this.element, 'board:cardRemoved', { cardId: typeof r === 'object' ? r[this.getCardIdValue] : r }));
    this._checkWipStateChanges();
    return this.getCardData();
  }

  setColumnCounts(counts) {
    this.state.columnCounts = new Map(Object.entries(counts || {}).map(([k, v]) => [String(k), Number(v)]));
    this._scheduleRender();
  }

  getColumnCounts() {
    return Object.fromEntries(this.state.columnCounts);
  }

  /* selection */

  selectCard(id) {
    if (!this.cardSelectionValue) return;
    if (this.cardSelectionValue === 'single') this.state.selection.clear();
    this.state.selection.add(String(id));
    this.state.lastSelectedId = String(id);
    this._refreshSelectionDecorations();
    emit(this.element, 'board:cardSelectionChanged', { selectedCardIds: this.getSelectedCardIds() });
  }
  deselectCard(id) {
    this.state.selection.delete(String(id));
    this._refreshSelectionDecorations();
    emit(this.element, 'board:cardSelectionChanged', { selectedCardIds: this.getSelectedCardIds() });
  }
  toggleSelection(id) {
    const s = String(id);
    if (this.state.selection.has(s)) this.deselectCard(s);
    else this.selectCard(s);
  }
  selectAllInColumn(colId) {
    if (this.cardSelectionValue !== 'multiple') return;
    const ids = cardsInColumn(this.state.cards, colId, this._modelOpts())
      .map((c) => String(c[this.getCardIdValue]));
    for (const id of ids) this.state.selection.add(id);
    this._refreshSelectionDecorations();
    emit(this.element, 'board:cardSelectionChanged', { selectedCardIds: this.getSelectedCardIds() });
  }
  clearSelection() {
    if (this.state.selection.size === 0) return;
    this.state.selection.clear();
    this._refreshSelectionDecorations();
    emit(this.element, 'board:cardSelectionChanged', { selectedCardIds: [] });
  }
  getSelectedCardIds() { return Array.from(this.state.selection); }
  getSelectedCards() {
    const ids = this.state.selection;
    return this.state.cards.filter((c) => ids.has(String(c[this.getCardIdValue]))).map((c) => ({ ...c }));
  }

  _refreshSelectionDecorations() {
    for (const el of this.element.querySelectorAll('[data-card-id]')) {
      const id = el.getAttribute('data-card-id');
      el.classList.toggle('sk-card-selected', this.state.selection.has(id));
      el.setAttribute('aria-selected', this.state.selection.has(id) ? 'true' : 'false');
    }
  }

  /* movement */

  moveCard(cardId, target) {
    const before = this._snapshotCard(cardId);
    if (!this._beforeMoveOk([cardId], before?.[this.getColumnIdValue], target.toColumnId, target.toIndex)) return false;
    const fromIndex = this._currentVisibleIndex(cardId);
    this.state.cards = moveCardModel(this.state.cards, cardId, target, this._modelOpts());
    const fromCol = before?.[this.getColumnIdValue];
    const toCol   = target.toColumnId ?? fromCol;
    if (String(fromCol) !== String(toCol)) this._markEnteredColumn(cardId);
    this._scheduleRender();
    emit(this.element, 'board:cardMoved', {
      cardId,
      fromColumnId: fromCol,
      toColumnId: target.toColumnId,
      fromIndex,
      toIndex: target.toIndex,
    });
    this._checkWipStateChanges();
    return true;
  }

  moveCards(cardIds, target) {
    if (!cardIds?.length) return false;
    const sample = this._snapshotCard(cardIds[0]);
    if (!this._beforeMoveOk(cardIds, sample?.[this.getColumnIdValue], target.toColumnId, target.toIndex)) return false;
    const fromCol = sample?.[this.getColumnIdValue];
    this.state.cards = moveCardsModel(this.state.cards, cardIds, target, this._modelOpts());
    if (String(fromCol) !== String(target.toColumnId)) {
      for (const id of cardIds) this._markEnteredColumn(id);
    }
    this._scheduleRender();
    emit(this.element, 'board:cardsMoved', {
      cardIds,
      fromColumnId: fromCol,
      toColumnId: target.toColumnId,
      toIndex: target.toIndex,
    });
    this._checkWipStateChanges();
    return true;
  }

  reorderCardWithinColumn(cardId, toIndex) {
    const before = this._snapshotCard(cardId);
    if (!before) return false;
    this.state.cards = reorderModel(this.state.cards, cardId, toIndex, this._modelOpts());
    this._scheduleRender();
    emit(this.element, 'board:cardMoved', {
      cardId,
      fromColumnId: before[this.getColumnIdValue],
      toColumnId: before[this.getColumnIdValue],
      fromIndex: null,
      toIndex,
    });
    return true;
  }

  _beforeMoveOk(cardIds, fromColumnId, toColumnId, toIndex) {
    if (this.readOnlyValue) return false;
    const ev = emit(this.element, 'board:beforeMove',
      { cardIds, fromColumnId, toColumnId, toIndex },
      { cancellable: true });
    if (ev.defaultPrevented) return false;
    const col = this._columnById(toColumnId);
    if (col?.accept_from && fromColumnId && !col.accept_from.includes(String(fromColumnId))) return false;
    return true;
  }

  _snapshotCard(cardId) {
    return this.state.cards.find((c) => String(c[this.getCardIdValue]) === String(cardId)) || null;
  }

  _currentVisibleIndex(cardId) {
    const c = this._snapshotCard(cardId);
    if (!c) return -1;
    const list = cardsInColumn(this.state.cards, c[this.getColumnIdValue], this._modelOpts());
    const sorted = applyColumnSort(list, this._columnById(c[this.getColumnIdValue])?.sort, this.orderFieldValue);
    return sorted.findIndex((x) => String(x[this.getCardIdValue]) === String(cardId));
  }

  /* columns */

  setColumnVisible(colId, visible) {
    const c = this._columnById(colId); if (!c) return;
    c.hidden = !visible;
    this._scheduleRender();
    emit(this.element, 'board:columnVisibleChanged', { columnId: colId, visible: !!visible });
  }
  setColumnCollapsed(colId, on) {
    const c = this._columnById(colId); if (!c) return;
    c.collapsed = !!on;
    this._scheduleRender();
    emit(this.element, 'board:columnCollapsedChanged', { columnId: colId, collapsed: !!on });
  }
  setColumnWidth(colId, px) {
    const c = this._columnById(colId); if (!c) return;
    c.width = Number(px);
    this._scheduleRender();
    emit(this.element, 'board:columnResized', { columnId: colId, width: c.width });
  }
  moveColumn(colId, toIndex) {
    const order = this.state.columnOrder.slice();
    const i = order.indexOf(String(colId));
    if (i === -1) return;
    order.splice(i, 1);
    order.splice(Math.max(0, Math.min(toIndex, order.length)), 0, String(colId));
    this.state.columnOrder = order;
    this._scheduleRender();
    emit(this.element, 'board:columnMoved', { columnId: colId, fromIndex: i, toIndex });
  }
  setColumnWip(colId, limit) {
    const c = this._columnById(colId); if (!c) return;
    c.wip = limit == null ? null : Number(limit);
    this._scheduleRender();
    this._checkWipStateChanges();
  }
  setColumnAcceptFrom(colId, ids) {
    const c = this._columnById(colId); if (!c) return;
    c.accept_from = Array.isArray(ids) ? ids.map(String) : null;
  }
  sizeColumnsToFit() {
    const wrap = this.element.querySelector('.sk-columns');
    if (!wrap) return;
    const cols = this._orderedColumns().filter((c) => !c.hidden && !c.__synthetic);
    if (cols.length === 0) return;
    const w = Math.floor((wrap.clientWidth - (cols.length + 1) * this.gapValue) / cols.length);
    for (const c of cols) c.width = w;
    this._scheduleRender();
  }
  getColumnSort(colId) { return this._columnById(colId)?.sort || 'manual'; }
  setColumnSort(colId, sort) {
    const c = this._columnById(colId); if (!c) return;
    c.sort = sort || 'manual';
    this._scheduleRender();
    emit(this.element, 'board:columnSortChanged', { columnId: colId, sort: c.sort });
  }

  /* swimlanes */

  setSwimlaneField(field) {
    this.state.swimlaneField = field || '';
    this._scheduleRender();
    emit(this.element, 'board:swimlaneChanged', { swimlaneField: this.state.swimlaneField });
  }
  setSwimlaneCollapsed(value, on) {
    const v = String(value ?? '');
    if (on) this.state.collapsedSwimlanes.add(v);
    else    this.state.collapsedSwimlanes.delete(v);
    this._scheduleRender();
  }

  /* filter */

  setQuickFilter(q) {
    this.state.quickFilter = q || '';
    this._scheduleRender();
    emit(this.element, 'board:filterChanged', { quickFilter: this.state.quickFilter, predicate: this.state.predicate });
  }
  setCardFilter(predicate) {
    this.state.predicate = typeof predicate === 'function' ? predicate : null;
    this._scheduleRender();
    emit(this.element, 'board:filterChanged', { quickFilter: this.state.quickFilter, predicate: this.state.predicate });
  }

  /* editing */

  startEditingCard(cardId) {
    if (this.readOnlyValue) return false;
    if (this.state.editing) this.cancelEditing();
    const card = this._snapshotCard(cardId);
    if (!card || card.__locked) return false;
    const cardEl = this._cardEl(cardId);
    if (!cardEl) return false;
    const editorTplId = card.__editor || this._columnById(card[this.getColumnIdValue])?.card_editor || this.cardEditorValue;
    const editorEl = editorTplId ? cloneTemplate(editorTplId) : this._defaultEditor(card);
    if (!editorEl) return false;
    editorEl.dataset.controller = (editorEl.dataset.controller || '') + ' card-editor';
    editorEl.dataset.cardEditorCardIdValue = String(cardId);
    cardEl.replaceChildren(editorEl);
    this._seedEditor(editorEl, card);
    this.state.editing = { cardId: String(cardId), editorEl, original: { ...card } };
    queueMicrotask(() => {
      const focusEl = editorEl.querySelector('[data-editor-input], [data-editor-field]');
      focusEl?.focus?.();
      focusEl?.select?.();
    });
    emit(this.element, 'board:cardEditStarted', { cardId });
    return true;
  }
  commitEditing() {
    const e = this.state.editing; if (!e) return false;
    const newCard = this._readEditor(e.editorEl, e.original);
    this.applyTransaction({ update: [newCard] });
    emit(this.element, 'board:cardValueChanged', { cardId: e.cardId, oldCard: e.original, newCard });
    this.state.editing = null;
    return true;
  }
  cancelEditing() {
    const e = this.state.editing; if (!e) return false;
    this.state.editing = null;
    this._scheduleRender();
    emit(this.element, 'board:cardEditCancelled', { cardId: e.cardId });
    return true;
  }
  _defaultEditor(card) {
    const form = el('form', { class: 'sk-card-editor' }, [
      el('input', { class: 'sk-card-editor-input', 'data-editor-input': '', 'data-editor-field': 'title', value: card.title || '' }),
      el('div', { class: 'sk-card-editor-actions' }, [
        el('button', { type: 'submit', 'data-editor-commit': '', class: 'sk-button sk-button-primary' }, 'Save'),
        el('button', { type: 'button', 'data-editor-cancel': '', class: 'sk-button' }, 'Cancel'),
      ]),
    ]);
    return form;
  }
  _seedEditor(editorEl, card) {
    for (const node of editorEl.querySelectorAll('[data-editor-field]')) {
      const field = node.getAttribute('data-editor-field');
      if (!field) continue;
      const v = card[field];
      if (node.tagName === 'SELECT') node.value = v == null ? '' : String(v);
      else if (node.type === 'checkbox') node.checked = !!v;
      else node.value = v == null ? '' : String(v);
    }
  }
  _readEditor(editorEl, baseline) {
    const updated = { ...baseline };
    for (const node of editorEl.querySelectorAll('[data-editor-field]')) {
      const field = node.getAttribute('data-editor-field');
      if (!field) continue;
      if (node.type === 'checkbox') updated[field] = !!node.checked;
      else if (node.type === 'number') updated[field] = node.value === '' ? null : Number(node.value);
      else updated[field] = node.value;
    }
    return updated;
  }

  /* programmatic drag */

  beginDrag(cardIds, fromColumnId) {
    return this._dnd?.beginDrag(Array.isArray(cardIds) ? cardIds : [cardIds], fromColumnId);
  }
  endDrag(target = {}) {
    return this._dnd?.endDrag(target);
  }

  /* WIP */

  getWipState() {
    return computeWipState(this._orderedColumns(), this.state.cards, this._modelOpts());
  }
  _checkWipStateChanges() {
    const next = new Set();
    for (const w of this.getWipState()) {
      if (w.over) next.add(String(w.colId));
    }
    // Fire once per crossing — for each colId newly in `next`, dispatch.
    for (const id of next) {
      if (!this.state.wipExceeded.has(id)) {
        const w = this.getWipState().find((x) => String(x.colId) === id);
        emit(this.element, 'board:wipExceeded', { columnId: id, count: w?.count, limit: w?.limit });
      }
    }
    this.state.wipExceeded = next;
  }

  /* Aging / time-in-column tracking
   * ---------------------------------
   * The board keeps a Map<cardId, ISO timestamp> recording when each card
   * entered its current column. Hosts can read this via getCardEnteredAt /
   * getCardAgeInColumn / getStuckCardIds, and any column with
   * `data-board-column-stuck-after-days-value="N"` will mark its old cards
   * as data-card-stuck="true" each render. The set of stuck cards is
   * compared between renders so a `board:cardStuck` event fires once per
   * crossing. */

  _markEnteredColumn(cardId, isoStamp) {
    const id = String(cardId);
    const ts = isoStamp || this._aging_now();
    this.state.enteredColumnAt.set(id, ts);
  }
  _reseedEnteredColumnAt() {
    // After setCardData, anything we don't have a record for inherits a
    // synthetic timestamp from `entered_at` / `created_at` if the host
    // provided one, else now (we don't know how long it's been sitting).
    const next = new Map();
    const now  = this._aging_now();
    for (const c of this.state.cards) {
      const id = String(c[this.getCardIdValue]);
      const prev = this.state.enteredColumnAt.get(id);
      // Host can supply per-card `entered_column_at` / `entered_at` ISO.
      const fromHost = c.entered_column_at || c.entered_at;
      next.set(id, prev || fromHost || now);
    }
    this.state.enteredColumnAt = next;
  }
  _trackEnteredColumnDelta(beforeCol) {
    // Compare per-card column membership between `beforeCol` and the current
    // cards list. New rows get `now`; cross-column rows get `now`.
    const now = this._aging_now();
    for (const c of this.state.cards) {
      const id     = String(c[this.getCardIdValue]);
      const newCol = String(c[this.getColumnIdValue]);
      const oldCol = beforeCol.get(id);
      if (oldCol == null)              this.state.enteredColumnAt.set(id, c.entered_column_at || c.entered_at || now);
      else if (oldCol !== newCol)      this.state.enteredColumnAt.set(id, now);
    }
    // Drop entries for removed cards.
    const presentIds = new Set(this.state.cards.map((c) => String(c[this.getCardIdValue])));
    for (const k of this.state.enteredColumnAt.keys()) {
      if (!presentIds.has(k)) this.state.enteredColumnAt.delete(k);
    }
  }
  _aging_now() {
    // Hookable for tests — the demo can stub `boardController._aging_now`
    // to fix "now" without having to rewire Date.
    return new Date().toISOString();
  }

  getCardEnteredAt(cardId) {
    return this.state.enteredColumnAt.get(String(cardId)) || null;
  }
  /* Whole-day delta. `2026-05-26T10:00:00Z` → `2026-05-28T11:00:00Z` is 2 days. */
  getCardAgeInColumn(cardId, now = this._aging_now()) {
    const enteredIso = this.getCardEnteredAt(cardId);
    if (!enteredIso) return null;
    const ms = new Date(now) - new Date(enteredIso);
    if (Number.isNaN(ms)) return null;
    return Math.max(0, Math.floor(ms / 86400000));
  }
  getStuckCardIds(now = this._aging_now()) {
    const out = [];
    for (const col of this._orderedColumns()) {
      if (!col.stuck_after_days) continue;
      for (const c of cardsInColumn(this.state.cards, col.id, this._modelOpts())) {
        const id = String(c[this.getCardIdValue]);
        const age = this.getCardAgeInColumn(id, now);
        if (age != null && age >= col.stuck_after_days) out.push(id);
      }
    }
    return out;
  }
  _decorateStuckCards() {
    // Run after each render. Builds the next stuck-set, diffs against the
    // last one so board:cardStuck fires once per crossing (mirrors WIP).
    const cols = this._orderedColumns();
    if (!cols.some((c) => c.stuck_after_days)) return;
    const nowIso = this._aging_now();
    const next = new Set(this.getStuckCardIds(nowIso));
    // Apply DOM markers
    for (const cardEl of this.element.querySelectorAll('[data-card-id]')) {
      const id = cardEl.getAttribute('data-card-id');
      const stuck = next.has(String(id));
      cardEl.setAttribute('data-card-stuck', stuck ? 'true' : 'false');
      if (stuck) {
        const age = this.getCardAgeInColumn(id, nowIso);
        if (age != null) cardEl.setAttribute('data-card-age-days', String(age));
      } else {
        cardEl.removeAttribute('data-card-age-days');
      }
    }
    // Fire once per crossing
    for (const id of next) {
      if (!this.state.stuckCards.has(id)) {
        const card = this.state.cards.find((c) => String(c[this.getCardIdValue]) === id);
        emit(this.element, 'board:cardStuck', {
          cardId: id,
          columnId: card?.[this.getColumnIdValue],
          ageDays: this.getCardAgeInColumn(id, nowIso),
        });
      }
    }
    this.state.stuckCards = next;
  }

  /* persistence */

  getBoardState() {
    return {
      columnOrder: this.state.columnOrder.slice(),
      columns: this._orderedColumns().filter((c) => !c.__synthetic).map((c) => ({
        id: c.id,
        width: c.width ?? null,
        collapsed: !!c.collapsed,
        hidden: !!c.hidden,
        wip: c.wip ?? null,
        sort: c.sort || 'manual',
      })),
      swimlaneField: this.state.swimlaneField || '',
      collapsedSwimlanes: Array.from(this.state.collapsedSwimlanes),
      quickFilter: this.state.quickFilter || '',
      readOnly: !!this.readOnlyValue,
    };
  }
  applyBoardState(state) {
    if (!state) return;
    if (Array.isArray(state.columnOrder)) this.state.columnOrder = state.columnOrder.slice();
    if (Array.isArray(state.columns)) {
      for (const cfg of state.columns) {
        const c = this._columnById(cfg.id); if (!c) continue;
        if (cfg.width != null) c.width = cfg.width;
        c.collapsed = !!cfg.collapsed;
        c.hidden = !!cfg.hidden;
        if (cfg.wip != null) c.wip = cfg.wip;
        if (cfg.sort) c.sort = cfg.sort;
      }
    }
    this.state.swimlaneField = state.swimlaneField || '';
    this.state.collapsedSwimlanes = new Set(state.collapsedSwimlanes || []);
    this.state.quickFilter = state.quickFilter || '';
    this._scheduleRender();
    emit(this.element, 'board:boardStateApplied', { state });
  }
  clearPersistedState() {
    if (!this.persistKeyValue) return;
    try { localStorage.removeItem(`skanban:${this.persistKeyValue}`); } catch { /* private mode / no storage */ }
  }
  _restorePersistedState() {
    if (!this.persistKeyValue) return;
    try {
      const raw = localStorage.getItem(`skanban:${this.persistKeyValue}`);
      if (!raw) return;
      this.applyBoardState(JSON.parse(raw));
    } catch { /* malformed — skip */ }
  }
  _schedulePersist() {
    if (!this.persistKeyValue) return;
    if (this._persistTimer) clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      try { localStorage.setItem(`skanban:${this.persistKeyValue}`, JSON.stringify(this.getBoardState())); } catch { /* over quota / no storage */ }
    }, 200);
  }

  /* export */

  getDataAsJson() {
    return { columns: this.getColumnData(), cards: this.getCardData() };
  }
  getDataAsCsv({ columns: columnIds, swimlanes = false } = {}) {
    const cols = columnIds && columnIds.length
      ? this._orderedColumns().filter((c) => columnIds.includes(c.id))
      : this._orderedColumns().filter((c) => !c.__synthetic && !c.hidden);
    const headers = ['card_id', 'column', ...(swimlanes && this.state.swimlaneField ? [this.state.swimlaneField] : []), 'title'];
    const rows = [headers.join(',')];
    for (const col of cols) {
      const list = applyColumnSort(
        cardsInColumn(this.state.cards, col.id, this._modelOpts()),
        col.sort,
        this.orderFieldValue,
      );
      for (const c of list) {
        const cells = [
          this._csvCell(c[this.getCardIdValue]),
          this._csvCell(col.title),
          ...(swimlanes && this.state.swimlaneField ? [this._csvCell(c[this.state.swimlaneField])] : []),
          this._csvCell(c.title || ''),
        ];
        rows.push(cells.join(','));
      }
    }
    return rows.join('\n');
  }
  _csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  /* card detail panel */

  openCardDetail(cardId) {
    const card = this._snapshotCard(cardId);
    if (!card) return false;
    this.closeCardDetail();
    const tplId = this.cardDetailTemplateValue;
    const panel = tplId ? cloneTemplate(tplId) : this._defaultDetailPanel(card);
    if (!panel) return false;
    panel.classList.add('sk-card-detail');
    panel.dataset.cardId = String(cardId);
    applyBindings(panel, card);
    if (this.detailLayoutValue === 'rail') {
      panel.classList.add('sk-card-detail-rail');
      panel.style.width = `${this.detailWidthValue}px`;
      this.element.appendChild(panel);
    } else {
      panel.classList.add('sk-card-detail-popover');
      const cardEl = this._cardEl(cardId);
      const r = cardEl?.getBoundingClientRect();
      if (r) {
        panel.style.position = 'fixed';
        panel.style.top = `${Math.max(8, r.top)}px`;
        panel.style.left = `${Math.min(window.innerWidth - 360, r.right + 8)}px`;
      }
      document.body.appendChild(panel);
    }
    this.state.openDetailCardId = String(cardId);
    panel.addEventListener('click', (ev) => {
      if (ev.target?.matches('[data-detail-close]')) this.closeCardDetail();
    });
    this._onDocumentClick = (ev) => {
      if (!panel.contains(ev.target) && !this._cardEl(cardId)?.contains(ev.target)) this.closeCardDetail();
    };
    setTimeout(() => document.addEventListener('click', this._onDocumentClick), 0);
    emit(this.element, 'board:cardDetailOpened', { cardId, card, panelEl: panel });
    return true;
  }
  closeCardDetail() {
    const id = this.state.openDetailCardId;
    if (!id) return false;
    const panel = document.querySelector(`.sk-card-detail[data-card-id="${id}"]`);
    panel?.remove();
    this.state.openDetailCardId = null;
    document.removeEventListener('click', this._onDocumentClick);
    emit(this.element, 'board:cardDetailClosed', { cardId: id });
    return true;
  }
  _defaultDetailPanel(card) {
    return el('aside', { class: 'sk-card-detail-default' }, [
      el('header', {}, [el('h3', { text: card.title || `Card ${card[this.getCardIdValue]}` }), el('button', { 'data-detail-close': '', text: '×', class: 'sk-button' })]),
      el('dl', {}, Object.entries(card).filter(([k]) => !k.startsWith('__')).flatMap(([k, v]) => [
        el('dt', { text: k }),
        el('dd', { text: v == null ? '' : String(v) }),
      ])),
    ]);
  }

  /* ---------------- Internals: rendering ---------------- */

  _modelOpts() {
    return {
      getCardId: this.getCardIdValue,
      getColumnId: this.getColumnIdValue,
      orderField: this.orderFieldValue,
    };
  }

  _orderedColumns() {
    const idx = new Map(this.state.columns.map((c) => [c.id, c]));
    const out = [];
    for (const id of this.state.columnOrder) {
      const c = idx.get(id);
      if (c) out.push(c);
    }
    // Columns not in order list (added via API after init) come at the end.
    for (const c of this.state.columns) if (!this.state.columnOrder.includes(c.id)) out.push(c);
    return out;
  }

  _columnById(id) {
    return this.state.columns.find((c) => String(c.id) === String(id)) || null;
  }

  _cardEl(cardId) {
    return this.element.querySelector(`[data-card-id="${CSS.escape(String(cardId))}"]`);
  }

  _renderNow() {
    this._renderScheduled = false;
    const wasReady = this.state.ready;
    const useSwimlane = !!this.state.swimlaneField;

    // 1. Filter pipeline
    let filtered = this.state.cards;
    if (this.state.quickFilter) filtered = applyQuickFilter(filtered, this.state.quickFilter);
    if (typeof this.state.predicate === 'function') filtered = applyPredicate(filtered, this.state.predicate);
    const filterMode = this.filterModeValue || 'hide';

    // 2. Build / reuse the .sk-columns scroller — we keep one root and patch
    //    its children rather than blowing away the DOM each render. This makes
    //    keyboard focus and DnD pointer captures survive partial updates.
    let scroller = this.element.querySelector('.sk-columns');
    if (!scroller) {
      scroller = el('ol', { class: 'sk-columns' });
      this.element.replaceChildren(scroller);
    }
    scroller.style.gap = `${this.gapValue}px`;

    // 3. Render columns (× swimlanes, if any)
    const visibleCols = this._orderedColumns().filter((c) => !c.hidden);
    const swimlaneBuckets = useSwimlane ? bucketBySwimlane(filtered, this.state.swimlaneField) : new Map([['', filtered]]);

    // Layout: one row per swimlane (each row a flex of columns), or
    // a single row of columns when swimlanes are off.
    scroller.replaceChildren();
    if (useSwimlane && swimlaneBuckets.size > 0) {
      for (const [value, bucket] of swimlaneBuckets) {
        const lane = el('li', {
          class: 'sk-swimlane',
          'data-swimlane-value': value || '',
        });
        const isCollapsed = this.state.collapsedSwimlanes.has(value);
        const header = el('div', {
          class: 'sk-swimlane-header',
          'data-controller': 'swimlane-header',
          'data-swimlane-header-value-value': value || '',
          // The whole header is the click target — chevron, label, and count.
          // Keyboard parity (Enter / Space) is wired in the controller's
          // keydown handler so the header is a real WAI-ARIA button.
          'data-action': 'click->swimlane-header#toggle keydown->swimlane-header#keydown',
          role: 'button',
          tabindex: '0',
          'aria-expanded': isCollapsed ? 'false' : 'true',
        }, [
          el('span', { class: 'sk-swimlane-toggle', 'aria-hidden': 'true', text: isCollapsed ? '▶' : '▼' }),
          el('span', { class: 'sk-swimlane-label', text: value || 'Unassigned' }),
          el('span', { class: 'sk-swimlane-count', text: `${bucket.length}` }),
        ]);
        const rowCols = el('div', { class: 'sk-swimlane-cols', style: `gap:${this.gapValue}px` });
        for (const col of visibleCols) {
          const list = cardsInColumn(bucket, col.id, this._modelOpts());
          rowCols.appendChild(this._renderColumn(col, list, filterMode));
        }
        lane.append(header, rowCols);
        if (this.state.collapsedSwimlanes.has(value)) lane.classList.add('sk-swimlane-collapsed');
        scroller.appendChild(lane);
      }
    } else {
      for (const col of visibleCols) {
        const list = cardsInColumn(filtered, col.id, this._modelOpts());
        scroller.appendChild(this._renderColumn(col, list, filterMode));
      }
    }

    this._refreshSelectionDecorations();
    this._decorateStuckCards();
    if (wasReady) this._schedulePersist();
  }

  _renderColumn(col, cards, filterMode) {
    const sortedCards = applyColumnSort(cards, col.sort, this.orderFieldValue);
    const liveCount = sortedCards.length;
    const serverTotal = this.serverSideValue ? this.state.columnCounts.get(String(col.id)) ?? liveCount : liveCount;
    const overWip = col.wip != null && liveCount > col.wip;

    const colEl = el('li', {
      class: 'sk-column' + (col.collapsed ? ' sk-column-collapsed' : ''),
      'data-controller': 'board-column',
      'data-board-column-id-value': col.id,
      'data-board-column-title-value': col.title,
      'data-board-column-wip-value': col.wip ?? '',
      'data-board-column-sort-value': col.sort || 'manual',
      'data-over-wip': overWip ? 'true' : null,
      style: {
        width: `${col.width || this.columnWidthValue}px`,
        ...(col.color ? { '--sk-column-accent': col.color } : {}),
      },
    });

    const header = el('header', { class: 'sk-column-header' }, [
      col.icon ? el('span', { class: 'sk-column-icon', text: col.icon }) : null,
      el('span', { class: 'sk-column-title', text: col.title }),
      el('span', {
        class: 'sk-column-count' + (overWip ? ' sk-column-count-over-wip' : ''),
        text: col.wip != null ? `${liveCount} / ${col.wip}` : String(serverTotal),
      }),
    ].filter(Boolean));

    const list = el('ol', { class: 'sk-cards', style: `gap:${this.gapValue}px` });

    if (col.collapsed) {
      // Collapsed columns show only the header + count
      colEl.appendChild(header);
      return colEl;
    }

    for (const card of sortedCards) {
      const node = this._renderCard(card, col);
      if (filterMode === 'dim' && this.state.quickFilter && !this._cardMatchesQuick(card)) {
        node.classList.add('sk-card-dimmed');
      }
      list.appendChild(node);
    }

    // Server-side window: a "+N more" pill at the bottom of any column that
    // has been windowed. Scrolling near it fires board:columnFetchMore so the
    // host can applyTransaction more rows.
    if (this.serverSideValue) {
      const total = this.state.columnCounts.get(String(col.id)) ?? liveCount;
      if (total > liveCount) {
        const pill = el('li', { class: 'sk-column-more-pill' }, [
          el('button', {
            type: 'button',
            class: 'sk-button sk-button-ghost',
            onclick: () => emit(this.element, 'board:columnFetchMore', { columnId: col.id, loadedCount: liveCount, totalCount: total }),
            text: `+${total - liveCount} more…`,
          }),
        ]);
        list.appendChild(pill);
      }
    }

    if (this.addCardValue) {
      const label = col.add_card_label || '+ Add card';
      const addBtn = el('li', { class: 'sk-add-card-row' }, [
        el('button', {
          type: 'button',
          class: 'sk-button sk-button-ghost',
          onclick: () => emit(this.element, 'board:addCardRequested', { columnId: col.id }),
          text: label,
        }),
      ]);
      list.appendChild(addBtn);
    }

    colEl.append(header, list);

    // Virtualise this column if eligible.
    const cardHeightPx = Number(this.cardHeightValue);
    if (shouldVirtualise({
      cardCount: sortedCards.length,
      threshold: this.virtualThresholdValue,
      cardHeight: cardHeightPx,
      virtual: this.virtualValue,
    })) {
      // Replace direct child rendering with the virtual scroller
      const prev = this.state.virtualColumns.get(col.id);
      prev?.destroy?.();
      list.replaceChildren();
      const inst = createVirtualColumn({
        cards: sortedCards,
        cardHeight: cardHeightPx,
        gap: this.gapValue,
        scrollEl: list,
        cardsListEl: list,
        renderCard: (c) => this._renderCard(c, col),
      });
      this.state.virtualColumns.set(col.id, inst);
    } else {
      const prev = this.state.virtualColumns.get(col.id);
      prev?.destroy?.();
      this.state.virtualColumns.delete(col.id);
    }

    return colEl;
  }

  _renderCard(card, col) {
    const id = String(card[this.getCardIdValue]);
    const rendererName = card.__renderer || col?.card_renderer || this.cardRendererValue;
    let body = null;
    if (rendererName) {
      // template id takes precedence; if not a template, treat as renderer name
      const tpl = document.getElementById(rendererName);
      if (tpl && tpl.tagName === 'TEMPLATE') {
        body = cloneTemplate(rendererName);
        if (body) applyBindings(body, card);
      } else {
        const fn = getRenderer(rendererName);
        if (fn) body = fn({ card, columnId: col?.id, defaultEl: el('article', { class: 'sk-card' }) });
      }
    }
    if (!body) {
      // Fallback: title (or numeric id) on a default card chrome.
      body = el('article', { class: 'sk-card' }, [
        el('div', { class: 'sk-card-body', text: card.title ?? id }),
      ]);
    }
    const wrapper = el('li', {
      class: 'sk-card-wrapper' + (this.state.selection.has(id) ? ' sk-card-selected' : ''),
      'data-controller': 'card',
      'data-card-id': id,
      'data-column-id': card[this.getColumnIdValue] || '',
      'data-card-order': card[this.orderFieldValue] ?? '',
      'data-card-locked': card.__locked ? 'true' : null,
      'data-card-color': card.__color || null,
      draggable: !card.__locked && !this.readOnlyValue ? 'true' : 'false',
      role: 'option',
      tabindex: '-1',
      'aria-selected': this.state.selection.has(id) ? 'true' : 'false',
    });
    if (card.__color) wrapper.style.setProperty('--sk-card-accent', card.__color);
    wrapper.appendChild(body);
    return wrapper;
  }

  _cardMatchesQuick(card) {
    const q = String(this.state.quickFilter || '').toLowerCase();
    if (!q) return true;
    for (const v of Object.values(card)) {
      if (v == null) continue;
      if (typeof v === 'string' || typeof v === 'number') {
        if (String(v).toLowerCase().includes(q)) return true;
      }
    }
    return false;
  }

  /* ---------------- DnD wiring ---------------- */

  _installDnd() {
    this._dnd = createDnd({
      root: this.element,
      hooks: {
        isColumnDisallowDrag: (colId) => !!this._columnById(colId)?.disallow_drag,
        canAcceptDrop: (fromColId, toColId) => {
          if (this.readOnlyValue) return false;
          const c = this._columnById(toColId);
          if (!c) return false;
          if (c.accept_from && fromColId && !c.accept_from.includes(String(fromColId))) return false;
          return true;
        },
        expandSelection: (id, fromColId) => {
          if (!this.state.selection.has(String(id))) return [String(id)];
          // Multi-card drag: only the selected cards in the same column come.
          return this.getSelectedCards()
            .filter((c) => String(c[this.getColumnIdValue]) === String(fromColId))
            .map((c) => String(c[this.getCardIdValue]));
        },
        onDragStart: ({ ids, fromColumnId }) => {
          emit(this.element, 'board:dragStarted', { cardIds: ids, fromColumnId });
        },
        onDrop: ({ cardIds, fromColumnId, toColumnId, toIndex, cancelled }) => {
          if (cancelled || toColumnId == null) {
            emit(this.element, 'board:dragEnded', { cardIds, fromColumnId, cancelled: true });
            return;
          }
          if (cardIds.length === 1) this.moveCard(cardIds[0], { toColumnId, toIndex });
          else this.moveCards(cardIds, { toColumnId, toIndex });
        },
      },
    });
  }

  /* ---------------- Keyboard nav ---------------- */

  _installKeyboard() {
    this.element.addEventListener('keydown', (ev) => {
      // Don't intercept keys inside an inline editor — the editor controller
      // handles its own Enter / Tab / Esc.
      if (ancestor(ev.target, '.sk-card-editor')) return;
      const k = ev.key;
      const meta = ev.metaKey || ev.ctrlKey;
      const active = this.state.activeCardId;

      if (!active) {
        // Bootstrap an active card from the first visible card on first arrow.
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) {
          const first = this.element.querySelector('[data-card-id]');
          if (first) this._setActive(first.getAttribute('data-card-id'));
          ev.preventDefault();
          return;
        }
        return;
      }

      if (meta && (k === 'ArrowUp' || k === 'ArrowDown')) {
        ev.preventDefault();
        return this._moveActiveWithinColumn(k === 'ArrowUp' ? -1 : 1);
      }
      if (meta && (k === 'ArrowLeft' || k === 'ArrowRight')) {
        ev.preventDefault();
        return this._moveActiveAcrossColumns(k === 'ArrowLeft' ? -1 : 1);
      }
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        ev.preventDefault();
        return this._navWithinColumn(k === 'ArrowUp' ? -1 : 1);
      }
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        ev.preventDefault();
        return this._navAcrossColumns(k === 'ArrowLeft' ? -1 : 1);
      }
      if (k === 'Enter') {
        ev.preventDefault();
        if (this.cardDetailTemplateValue) this.openCardDetail(active);
        else this.startEditingCard(active);
        return;
      }
      if (k === ' ') {
        ev.preventDefault();
        return this.toggleSelection(active);
      }
      if (meta && k.toLowerCase() === 'a') {
        ev.preventDefault();
        if (this.state.activeColumnId) this.selectAllInColumn(this.state.activeColumnId);
        return;
      }
      if (meta && k.toLowerCase() === 'c') {
        const sel = this.getSelectedCards();
        if (sel.length > 0) {
          ev.preventDefault();
          navigator.clipboard?.writeText(JSON.stringify(sel, null, 2)).catch(() => {});
        }
        return;
      }
    });
  }

  _setActive(id) {
    this.state.activeCardId = String(id);
    const c = this._snapshotCard(id);
    this.state.activeColumnId = c ? String(c[this.getColumnIdValue]) : null;
    for (const el of this.element.querySelectorAll('[data-card-id]')) {
      el.classList.toggle('sk-card-active', el.getAttribute('data-card-id') === String(id));
    }
    const focusEl = this._cardEl(id);
    focusEl?.focus?.();
  }
  _columnVisibleCards(colId) {
    const list = cardsInColumn(this.state.cards, colId, this._modelOpts());
    return applyColumnSort(list, this._columnById(colId)?.sort, this.orderFieldValue);
  }
  _navWithinColumn(delta) {
    const cards = this._columnVisibleCards(this.state.activeColumnId);
    const i = cards.findIndex((c) => String(c[this.getCardIdValue]) === this.state.activeCardId);
    const next = cards[Math.max(0, Math.min(cards.length - 1, i + delta))];
    if (next) this._setActive(next[this.getCardIdValue]);
  }
  _navAcrossColumns(delta) {
    const cols = this._orderedColumns().filter((c) => !c.hidden);
    const i = cols.findIndex((c) => String(c.id) === this.state.activeColumnId);
    const next = cols[Math.max(0, Math.min(cols.length - 1, i + delta))];
    if (!next) return;
    const cards = this._columnVisibleCards(next.id);
    if (cards[0]) this._setActive(cards[0][this.getCardIdValue]);
  }
  _moveActiveWithinColumn(delta) {
    const cards = this._columnVisibleCards(this.state.activeColumnId);
    const i = cards.findIndex((c) => String(c[this.getCardIdValue]) === this.state.activeCardId);
    if (i === -1) return;
    const j = Math.max(0, Math.min(cards.length - 1, i + delta));
    if (i === j) return;
    this.reorderCardWithinColumn(this.state.activeCardId, j);
  }
  _moveActiveAcrossColumns(delta) {
    const cols = this._orderedColumns().filter((c) => !c.hidden);
    const i = cols.findIndex((c) => String(c.id) === this.state.activeColumnId);
    const next = cols[Math.max(0, Math.min(cols.length - 1, i + delta))];
    if (!next || String(next.id) === this.state.activeColumnId) return;
    this.moveCard(this.state.activeCardId, { toColumnId: next.id, toIndex: 0 });
    this.state.activeColumnId = String(next.id);
  }

  /* ---------------- File drop ---------------- */

  _installFileDrop() {
    if (!this.acceptFilesValue) return;
    this.element.addEventListener('dragover', (ev) => {
      if (!ev.dataTransfer?.types?.includes('Files')) return;
      const cardEl = ancestor(ev.target, '[data-card-id]');
      if (cardEl) ev.preventDefault();
    });
    this.element.addEventListener('drop', (ev) => {
      if (!ev.dataTransfer?.files?.length) return;
      const cardEl = ancestor(ev.target, '[data-card-id]');
      if (!cardEl) return;
      ev.preventDefault();
      const id = cardEl.getAttribute('data-card-id');
      const card = this._snapshotCard(id);
      const files = Array.from(ev.dataTransfer.files);
      const detailEv = emit(this.element, 'board:fileAttached',
        { cardId: id, files, card, dataTransfer: ev.dataTransfer },
        { cancellable: true });
      if (detailEv.defaultPrevented) return;
      const field = this.attachmentsFieldValue || 'attachments';
      const existing = Array.isArray(card?.[field]) ? card[field].slice() : [];
      const meta = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
      this.applyTransaction({ update: [{ [this.getCardIdValue]: id, [field]: existing.concat(meta) }] });
    });
  }

  /* ---------------- Misc helpers ---------------- */

  _numOrNull(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  _jsonOrNull(v) {
    if (!v) return null;
    try { return JSON.parse(v); } catch { return null; }
  }
}
