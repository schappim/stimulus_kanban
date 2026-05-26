var It = Object.defineProperty;
var Et = (r, t, e) => t in r ? It(r, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : r[t] = e;
var x = (r, t, e) => Et(r, typeof t != "symbol" ? t + "" : t, e);
import { Controller as $, Application as Dt } from "@hotwired/stimulus";
const R = "id", T = "column_id", q = "order";
function H(r, t = {}) {
  const e = t.getCardId || R, n = t.getColumnId || T, s = t.orderField || q, i = Array.isArray(r) ? r.filter((c) => c != null) : [], a = /* @__PURE__ */ new Map();
  for (const c of i) {
    const h = String(c[n] ?? "");
    a.has(h) || a.set(h, []), a.get(h).push(c);
  }
  const d = [];
  for (const [c, h] of a)
    h.slice().sort((b, y) => {
      const g = b[s], A = y[s];
      return g == null && A == null ? 0 : g == null ? 1 : A == null ? -1 : Number(g) - Number(A);
    }).forEach((b, y) => {
      const g = { ...b };
      g[e] = String(b[e] ?? ""), g[n] = c, g[s] = b[s] == null ? y : Number(b[s]), d.push(g);
    });
  return d;
}
function st(r) {
  return Array.isArray(r) ? r.filter((t) => t != null).map((t) => ({
    ...t,
    id: String(t.id ?? ""),
    title: t.title ?? t.id ?? "",
    wip: t.wip == null ? null : Number(t.wip),
    accept_from: Array.isArray(t.accept_from) ? t.accept_from.map(String) : null,
    sort: t.sort ?? "manual",
    collapsed: !!t.collapsed,
    hidden: !!t.hidden,
    disallow_drag: !!t.disallow_drag,
    min_count: t.min_count == null ? null : Number(t.min_count)
  })) : [];
}
function B(r, t, e = {}) {
  const n = e.getColumnId || T;
  return r.filter((s) => String(s[n]) === String(t));
}
const xt = (r, t) => String(r ?? "").localeCompare(String(t ?? ""), void 0, { numeric: !0, sensitivity: "base" });
function Ft(r, t, e) {
  const n = r?.[e], s = t?.[e];
  return n == null && s == null ? 0 : n == null ? -1 : s == null ? 1 : typeof n == "number" && typeof s == "number" ? n - s : xt(n, s);
}
function K(r, t, e = q) {
  if (!t || t === "manual")
    return r.slice().sort((a, d) => {
      const c = a[e], h = d[e];
      return c == null && h == null ? 0 : c == null ? 1 : h == null ? -1 : Number(c) - Number(h);
    });
  const [n, s] = String(t).split(":");
  if (!s) return r.slice();
  const i = n === "desc" ? -1 : 1;
  return r.slice().sort((a, d) => i * Ft(a, d, s));
}
function Vt(r, t) {
  return t ? r.filter((e) => Tt(e, t)) : r;
}
const Lt = /* @__PURE__ */ new Set([
  R,
  T,
  q,
  "id",
  "column_id",
  "order"
]);
function Tt(r, t) {
  if (!t) return !0;
  const e = String(t).toLowerCase();
  for (const [n, s] of Object.entries(r))
    if (s != null && !n.startsWith("__") && !Lt.has(n) && (typeof s == "string" || typeof s == "number") && String(s).toLowerCase().includes(e))
      return !0;
  return !1;
}
function Nt(r, t) {
  return typeof t != "function" ? r : r.filter((e) => {
    try {
      return !!t(e);
    } catch {
      return !1;
    }
  });
}
function Mt(r, t) {
  const e = /* @__PURE__ */ new Map();
  if (!t)
    return e.set("", r.slice()), e;
  for (const n of r) {
    const s = n[t], i = s == null || s === "" ? "" : String(s);
    e.has(i) || e.set(i, []), e.get(i).push(n);
  }
  return e;
}
function Ot(r, t, e = {}) {
  const n = e.getColumnId || T, s = /* @__PURE__ */ new Map();
  for (const i of t) {
    const a = String(i[n] ?? "");
    s.set(a, (s.get(a) || 0) + 1);
  }
  return r.filter((i) => !i.__synthetic).map((i) => {
    const a = s.get(String(i.id)) || 0, d = i.wip == null ? null : Number(i.wip);
    return {
      colId: i.id,
      count: a,
      limit: d,
      over: d != null && a > d
    };
  });
}
function z(r, t, e, n = {}) {
  const s = n.getCardId || R, i = n.getColumnId || T, a = n.orderField || q, d = String(t), c = r.map((_) => ({ ..._ })), h = c.find((_) => String(_[s]) === d);
  if (!h) return r;
  const m = String(h[i]), b = String(e.toColumnId ?? m), y = e.toIndex == null ? Number.POSITIVE_INFINITY : Number(e.toIndex);
  h[i] = b;
  const g = c.filter((_) => String(_[i]) === m && String(_[s]) !== d).sort((_, I) => Number(_[a] ?? 0) - Number(I[a] ?? 0)), A = c.filter((_) => String(_[i]) === b && String(_[s]) !== d).sort((_, I) => Number(_[a] ?? 0) - Number(I[a] ?? 0)), w = Math.max(0, Math.min(y, A.length));
  return A.splice(w, 0, h), g.forEach((_, I) => {
    _[a] = I;
  }), A.forEach((_, I) => {
    _[a] = I;
  }), c;
}
function Bt(r, t, e, n = {}) {
  const s = n.getCardId || R, i = n.getColumnId || T, a = n.orderField || q;
  if (!Array.isArray(t) || t.length === 0) return r;
  const d = new Set(t.map(String)), c = String(e.toColumnId), h = e.toIndex == null ? Number.POSITIVE_INFINITY : Number(e.toIndex), m = r.map((w) => ({ ...w })), b = m.filter((w) => d.has(String(w[s]))).sort((w, _) => {
    const I = m.indexOf(w), M = m.indexOf(_);
    return I - M;
  });
  if (b.length === 0) return r;
  const y = /* @__PURE__ */ new Map();
  for (const w of m) {
    if (d.has(String(w[s]))) continue;
    const _ = String(w[i]);
    y.has(_) || y.set(_, []), y.get(_).push(w);
  }
  for (const w of y.values())
    w.sort((_, I) => Number(_[a] ?? 0) - Number(I[a] ?? 0));
  for (const w of b) w[i] = c;
  const g = y.get(c) || [], A = Math.max(0, Math.min(h, g.length));
  g.splice(A, 0, ...b), y.set(c, g);
  for (const w of y.values())
    w.forEach((_, I) => {
      _[a] = I;
    });
  return m;
}
function Rt(r, t, e, n = {}) {
  const s = n.getCardId || R, i = n.getColumnId || T, a = String(t), d = r.find((c) => String(c[s]) === a);
  return d ? z(r, a, { toColumnId: d[i], toIndex: e }, n) : r;
}
function $t(r, t, e = {}) {
  const n = e.getCardId || R, s = e.getColumnId || T;
  let i = r.slice();
  const a = t || {};
  if (Array.isArray(a.remove)) {
    const d = new Set(a.remove.map((c) => String(typeof c == "object" ? c[n] : c)));
    i = i.filter((c) => !d.has(String(c[n])));
  }
  if (Array.isArray(a.update)) {
    const d = /* @__PURE__ */ new Map();
    for (const c of a.update) d.set(String(c[n]), c);
    i = i.map((c) => {
      const h = String(c[n]);
      if (!d.has(h)) return c;
      const m = { ...c, ...d.get(h) };
      return m[n] = h, m;
    });
  }
  if (Array.isArray(a.add)) {
    const d = new Set(i.map((c) => String(c[n])));
    for (const c of a.add) {
      const h = String(c[n] ?? "");
      h && !d.has(h) && (i.push({ ...c, [n]: h, [s]: String(c[s] ?? "") }), d.add(h));
    }
  }
  if (Array.isArray(a.move))
    for (const d of a.move)
      i = z(i, d[n] ?? d.id, { toColumnId: d.toColumnId, toIndex: d.toIndex }, e);
  return i;
}
function qt(r) {
  return {
    // ---- Data ----
    setCardData(t) {
      r.setCardData(t);
    },
    getCardData() {
      return r.getCardData();
    },
    setColumnData(t) {
      r.setColumnData(t);
    },
    getColumnData() {
      return r.getColumnData();
    },
    applyTransaction(t) {
      return r.applyTransaction(t);
    },
    setColumnCounts(t) {
      r.setColumnCounts(t);
    },
    getColumnCounts() {
      return r.getColumnCounts();
    },
    // ---- Card selection ----
    getSelectedCardIds() {
      return r.getSelectedCardIds();
    },
    getSelectedCards() {
      return r.getSelectedCards();
    },
    selectCard(t) {
      r.selectCard(t);
    },
    deselectCard(t) {
      r.deselectCard(t);
    },
    selectAllInColumn(t) {
      r.selectAllInColumn(t);
    },
    clearSelection() {
      r.clearSelection();
    },
    // ---- Movement ----
    moveCard(t, e) {
      return r.moveCard(t, e);
    },
    moveCards(t, e) {
      return r.moveCards(t, e);
    },
    reorderCardWithinColumn(t, e) {
      return r.reorderCardWithinColumn(t, e);
    },
    bulkMove({ fromIds: t, toColumnId: e, toIndex: n }) {
      return r.moveCards(t, { toColumnId: e, toIndex: n });
    },
    // ---- Columns ----
    setColumnVisible(t, e) {
      r.setColumnVisible(t, e);
    },
    setColumnCollapsed(t, e) {
      r.setColumnCollapsed(t, e);
    },
    setColumnWidth(t, e) {
      r.setColumnWidth(t, e);
    },
    moveColumn(t, e) {
      r.moveColumn(t, e);
    },
    setColumnWip(t, e) {
      r.setColumnWip(t, e);
    },
    setColumnAcceptFrom(t, e) {
      r.setColumnAcceptFrom(t, e);
    },
    sizeColumnsToFit() {
      r.sizeColumnsToFit();
    },
    // ---- Swimlanes ----
    setSwimlaneField(t) {
      r.setSwimlaneField(t);
    },
    getSwimlaneField() {
      return r.state.swimlaneField || "";
    },
    setSwimlaneCollapsed(t, e) {
      r.setSwimlaneCollapsed(t, e);
    },
    getSwimlaneCollapsedSet() {
      return new Set(r.state.collapsedSwimlanes);
    },
    // ---- Sort ----
    setColumnSort(t, e) {
      r.setColumnSort(t, e);
    },
    getColumnSort(t) {
      return r.getColumnSort(t);
    },
    // ---- Filter & search ----
    setQuickFilter(t) {
      r.setQuickFilter(t);
    },
    getQuickFilter() {
      return r.state.quickFilter || "";
    },
    setCardFilter(t) {
      r.setCardFilter(t);
    },
    getCardFilter() {
      return r.state.predicate || null;
    },
    // ---- Editing ----
    startEditingCard(t) {
      return r.startEditingCard(t);
    },
    commitEditing() {
      return r.commitEditing();
    },
    cancelEditing() {
      return r.cancelEditing();
    },
    // ---- Drag programmatic ----
    beginDrag(t, e) {
      return r.beginDrag(t, e);
    },
    endDrag(t) {
      return r.endDrag(t);
    },
    // ---- WIP ----
    getWipState() {
      return r.getWipState();
    },
    // ---- Aging / time-in-column ----
    getCardEnteredAt(t) {
      return r.getCardEnteredAt(t);
    },
    getCardAgeInColumn(t, e) {
      return r.getCardAgeInColumn(t, e);
    },
    getStuckCardIds(t) {
      return r.getStuckCardIds(t);
    },
    setAgingClock(t) {
      typeof t == "function" ? r._aging_now = t : r._aging_now = () => (/* @__PURE__ */ new Date()).toISOString(), r._decorateStuckCards();
    },
    // ---- Persistence ----
    getBoardState() {
      return r.getBoardState();
    },
    applyBoardState(t) {
      return r.applyBoardState(t);
    },
    clearPersistedState() {
      return r.clearPersistedState();
    },
    getPersistKey() {
      return r.persistKeyValue || "";
    },
    // ---- Export ----
    getDataAsJson() {
      return r.getDataAsJson();
    },
    getDataAsCsv(t = {}) {
      return r.getDataAsCsv(t);
    },
    // ---- Detail panel ----
    openCardDetail(t) {
      return r.openCardDetail(t);
    },
    closeCardDetail() {
      return r.closeCardDetail();
    },
    isCardDetailOpen() {
      return !!r.state.openDetailCardId;
    },
    // ---- Events (convenience) ----
    addEventListener(t, e) {
      r.element.addEventListener(t, e);
    },
    removeEventListener(t, e) {
      r.element.removeEventListener(t, e);
    }
  };
}
function p(r, t = {}, e = []) {
  const n = document.createElement(r);
  for (const [s, i] of Object.entries(t))
    i === !1 || i == null || (s === "class" ? n.className = i : s === "text" ? n.textContent = String(i) : s === "html" ? n.innerHTML = String(i) : s === "style" && typeof i == "object" ? Object.assign(n.style, i) : s.startsWith("on") && typeof i == "function" ? n.addEventListener(s.slice(2).toLowerCase(), i) : i === !0 ? n.setAttribute(s, "") : n.setAttribute(s, String(i)));
  for (const s of [].concat(e))
    s == null || s === !1 || n.appendChild(typeof s == "string" ? document.createTextNode(s) : s);
  return n;
}
function Y(r) {
  if (!r || typeof document > "u") return null;
  const t = document.getElementById(r);
  if (!t || t.tagName !== "TEMPLATE") return null;
  const e = t.content.firstElementChild;
  return e ? e.cloneNode(!0) : null;
}
function C(r, t, e = {}, { cancellable: n = !1 } = {}) {
  const s = new CustomEvent(t, { detail: e, bubbles: !0, cancelable: n });
  return r.dispatchEvent(s), s;
}
function U(r, t, e) {
  let n = r?.parentElement;
  for (; n; ) {
    if ((n.getAttribute("data-controller") || "").split(/\s+/).includes(t)) {
      const i = e.getControllerForElementAndIdentifier(n, t);
      if (i) return i;
    }
    n = n.parentElement;
  }
  return null;
}
function it(r, t, { format: e } = {}) {
  if (!r || !t) return r;
  for (const n of r.querySelectorAll("[data-bind]")) {
    const s = n.getAttribute("data-bind");
    if (!s) continue;
    const i = t[s];
    n.textContent = i == null ? "" : String(i);
  }
  for (const n of r.querySelectorAll("[data-bind-text]")) {
    const s = n.getAttribute("data-bind-text");
    if (!s) continue;
    const i = t[s];
    n.textContent = typeof e == "function" ? e(i, s, t) : i == null ? "" : String(i);
  }
  for (const n of r.querySelectorAll("[data-bind-attr]")) {
    const s = Pt(n);
    for (const [i, a] of s) {
      const d = t[a];
      d == null || d === !1 ? n.removeAttribute(i) : n.setAttribute(i, String(d));
    }
  }
  return r;
}
function Pt(r) {
  return (r.getAttribute("data-bind-attr") || "").split(",").map((e) => e.trim()).filter(Boolean).map((e) => {
    const n = e.indexOf(":");
    return n === -1 ? [e, e] : [e.slice(0, n).trim(), e.slice(n + 1).trim()];
  });
}
function L(r, t) {
  return r ? r.matches?.(t) ? r : r.closest?.(t) || null : null;
}
function Wt(r) {
  let t = !1, e = null;
  const n = (...s) => {
    if (e = s, t) return;
    t = !0, (typeof requestAnimationFrame == "function" ? requestAnimationFrame : (a) => setTimeout(a, 16))(() => {
      t = !1;
      const a = e;
      e = null, r(...a);
    });
  };
  return n.cancel = () => {
    t = !1, e = null;
  }, n;
}
const V = 48, Ut = 24;
function jt({ root: r, hooks: t }) {
  const e = {
    dragging: !1,
    cardIds: [],
    fromColumnId: null,
    pointerActive: !1,
    // touch / pointer fallback running
    indicatorEl: null,
    targetColumnId: null,
    targetIndex: null,
    rafToken: null,
    pointer: { x: 0, y: 0 },
    ghostEl: null
  };
  function n(o) {
    const u = L(o.target, "[data-card-id]");
    if (!u) return;
    const f = L(u, "[data-board-column-id-value]");
    if (!f) return;
    if (u.getAttribute("data-card-locked") === "true") {
      o.preventDefault();
      return;
    }
    const k = f.getAttribute("data-board-column-id-value");
    if (t.isColumnDisallowDrag?.(k)) {
      o.preventDefault();
      return;
    }
    const S = u.getAttribute("data-card-id"), E = t.expandSelection?.(S, k) ?? [S];
    e.dragging = !0, e.cardIds = E, e.fromColumnId = k, o.dataTransfer.effectAllowed = "move";
    try {
      o.dataTransfer.setData("text/plain", JSON.stringify({ ids: E }));
    } catch {
    }
    E.length > 1 && At(o, E.length), t.onDragStart?.({ ids: E, fromColumnId: k }), u.classList.add("sk-card-dragging");
  }
  function s(o) {
    if (!e.dragging) return;
    const u = L(o.target, "[data-board-column-id-value]");
    if (!u) return;
    const f = u.getAttribute("data-board-column-id-value");
    if (!t.canAcceptDrop?.(e.fromColumnId, f)) return;
    o.preventDefault(), o.dataTransfer.dropEffect = "move", e.pointer.x = o.clientX, e.pointer.y = o.clientY;
    const k = P(u, o.clientY);
    M(u, f, k), O();
  }
  function i(o) {
    e.dragging && (o.preventDefault(), _({ cancelled: !1 }));
  }
  function a(o) {
    e.dragging && e.targetColumnId == null && _({ cancelled: !0 }), I();
  }
  let d = null;
  function c(o) {
    if (o.pointerType !== "touch" && o.pointerType !== "pen") return;
    const u = L(o.target, "[data-card-id]");
    u && u.getAttribute("data-card-locked") !== "true" && (d = {
      cardEl: u,
      id: u.getAttribute("data-card-id"),
      x: o.clientX,
      y: o.clientY,
      pointerId: o.pointerId
    });
  }
  function h(o) {
    if (d && !e.pointerActive) {
      const S = o.clientX - d.x, E = o.clientY - d.y;
      if (Math.hypot(S, E) < 6) return;
      y(d, o);
    }
    if (!e.pointerActive) return;
    e.pointer.x = o.clientX, e.pointer.y = o.clientY;
    const u = nt(o.clientX, o.clientY);
    if (!u) return;
    const f = u.getAttribute("data-board-column-id-value");
    if (!t.canAcceptDrop?.(e.fromColumnId, f)) return;
    const k = P(u, o.clientY);
    M(u, f, k), rt(o.clientX, o.clientY), O();
  }
  function m(o) {
    if (!e.pointerActive) {
      d = null;
      return;
    }
    d = null, _({ cancelled: e.targetColumnId == null }), I();
  }
  function b(o) {
    d = null, e.pointerActive && (_({ cancelled: !0 }), I());
  }
  function y(o, u) {
    const f = L(o.cardEl, "[data-board-column-id-value]");
    if (!f) return;
    const k = f.getAttribute("data-board-column-id-value");
    if (t.isColumnDisallowDrag?.(k)) return;
    const S = t.expandSelection?.(o.id, k) ?? [o.id];
    e.dragging = !0, e.pointerActive = !0, e.cardIds = S, e.fromColumnId = k, o.cardEl.classList.add("sk-card-dragging"), e.ghostEl = wt(o.cardEl, S.length), rt(u.clientX, u.clientY);
    try {
      o.cardEl.setPointerCapture?.(o.pointerId);
    } catch {
    }
    t.onDragStart?.({ ids: S, fromColumnId: k });
  }
  function g(o) {
    e.dragging && o.key === "Escape" && (e.targetColumnId = null, e.targetIndex = null, W());
  }
  function A(o, u) {
    e.dragging = !0, e.cardIds = Array.isArray(o) ? o.slice() : [o], e.fromColumnId = u, t.onDragStart?.({ ids: e.cardIds, fromColumnId: u });
  }
  function w(o = {}) {
    const u = !!o.cancelled;
    u || (e.targetColumnId = o.toColumnId ?? null, e.targetIndex = o.toIndex == null ? null : Number(o.toIndex)), _({ cancelled: u }), I();
  }
  function _({ cancelled: o }) {
    if (!e.dragging) return;
    const u = {
      cardIds: e.cardIds.slice(),
      fromColumnId: e.fromColumnId,
      toColumnId: o ? null : e.targetColumnId,
      toIndex: o ? null : e.targetIndex,
      cancelled: o
    };
    t.onDrop?.(u);
  }
  function I() {
    e.dragging = !1, e.pointerActive = !1, e.cardIds = [], e.fromColumnId = null, e.targetColumnId = null, e.targetIndex = null, e.ghostEl && (e.ghostEl.remove(), e.ghostEl = null), W(), bt();
    for (const o of r.querySelectorAll(".sk-card-dragging"))
      o.classList.remove("sk-card-dragging");
  }
  function M(o, u, f) {
    e.targetColumnId = u, e.targetIndex = f, N(o, f);
  }
  function P(o, u) {
    const f = o.querySelector(".sk-cards");
    if (!f) return 0;
    const k = Array.from(f.querySelectorAll(":scope > [data-card-id]")).filter((S) => !S.classList.contains("sk-card-dragging"));
    if (k.length === 0) return 0;
    for (let S = 0; S < k.length; S++) {
      const E = k[S].getBoundingClientRect();
      if (u < E.top + E.height / 2) return S;
    }
    return k.length;
  }
  function N(o, u) {
    const f = o.querySelector(".sk-cards");
    if (!f) return;
    e.indicatorEl || (e.indicatorEl = document.createElement("li"), e.indicatorEl.className = "sk-drop-indicator", e.indicatorEl.setAttribute("aria-hidden", "true"));
    const k = e.indicatorEl, S = Array.from(f.querySelectorAll(":scope > [data-card-id]")).filter((E) => !E.classList.contains("sk-card-dragging"));
    u >= S.length ? f.appendChild(k) : f.insertBefore(k, S[u]);
  }
  function W() {
    e.indicatorEl?.parentNode && e.indicatorEl.parentNode.removeChild(e.indicatorEl);
  }
  function O() {
    if (e.rafToken != null) return;
    const o = () => {
      if (e.rafToken = null, !e.dragging) return;
      const { x: u, y: f } = e.pointer;
      St(u), vt(u, f), e.rafToken = requestAnimationFrame(o);
    };
    e.rafToken = requestAnimationFrame(o);
  }
  function bt() {
    e.rafToken != null && (cancelAnimationFrame(e.rafToken), e.rafToken = null);
  }
  function St(o) {
    const u = r.querySelector(".sk-columns");
    if (!u) return;
    const f = u.getBoundingClientRect();
    if (o < f.left + V) {
      const k = j(f.left + V - o);
      u.scrollLeft -= k;
    } else if (o > f.right - V) {
      const k = j(o - (f.right - V));
      u.scrollLeft += k;
    }
  }
  function vt(o, u) {
    const f = nt(o, u);
    if (!f) return;
    const k = f.querySelector(".sk-cards");
    if (!k) return;
    const S = k.getBoundingClientRect();
    if (u < S.top + V) {
      const E = j(S.top + V - u);
      k.scrollTop -= E;
    } else if (u > S.bottom - V) {
      const E = j(u - (S.bottom - V));
      k.scrollTop += E;
    }
  }
  function j(o) {
    const u = Math.max(0, Math.min(1, o / V));
    return Math.ceil(u * Ut);
  }
  function nt(o, u) {
    const f = r.querySelectorAll("[data-board-column-id-value]");
    for (const k of f) {
      const S = k.getBoundingClientRect();
      if (o >= S.left && o <= S.right && u >= S.top && u <= S.bottom) return k;
    }
    return null;
  }
  function wt(o, u) {
    const f = o.cloneNode(!0);
    if (f.classList.add("sk-card-ghost"), f.style.position = "fixed", f.style.pointerEvents = "none", f.style.opacity = "0.85", f.style.zIndex = "99999", f.style.left = "0px", f.style.top = "0px", u > 1) {
      const k = document.createElement("span");
      k.className = "sk-card-stack-badge", k.textContent = String(u), f.appendChild(k);
    }
    return document.body.appendChild(f), f;
  }
  function rt(o, u) {
    e.ghostEl && (e.ghostEl.style.transform = `translate(${o + 8}px, ${u + 8}px)`);
  }
  function At(o, u) {
    try {
      o.dataTransfer.setData("application/x-stimulus-kanban-count", String(u));
    } catch {
    }
  }
  return r.addEventListener("dragstart", n), r.addEventListener("dragover", s), r.addEventListener("drop", i), r.addEventListener("dragend", a), r.addEventListener("pointerdown", c), window.addEventListener("pointermove", h), window.addEventListener("pointerup", m), window.addEventListener("pointercancel", b), document.addEventListener("keydown", g), {
    beginDrag: A,
    endDrag: w,
    destroy() {
      r.removeEventListener("dragstart", n), r.removeEventListener("dragover", s), r.removeEventListener("drop", i), r.removeEventListener("dragend", a), r.removeEventListener("pointerdown", c), window.removeEventListener("pointermove", h), window.removeEventListener("pointerup", m), window.removeEventListener("pointercancel", b), document.removeEventListener("keydown", g), I();
    },
    isDragging() {
      return e.dragging;
    },
    getState() {
      return { ...e, cardIds: e.cardIds.slice() };
    }
  };
}
const Kt = 6;
function Ht({
  cards: r,
  cardHeight: t,
  gap: e = 8,
  overscan: n = Kt,
  scrollEl: s,
  renderCard: i,
  // (card, index) => HTMLElement
  cardsListEl: a
}) {
  const d = t + e, c = document.createElement("li"), h = document.createElement("li");
  c.className = "sk-virtual-spacer", h.className = "sk-virtual-spacer", c.setAttribute("aria-hidden", "true"), h.setAttribute("aria-hidden", "true");
  let m = /* @__PURE__ */ new Map();
  function b() {
    const g = r.length, A = s.clientHeight, w = s.scrollTop, _ = Math.max(0, Math.floor(w / d) - n), I = Math.ceil(A / d) + n * 2, M = Math.min(g - 1, _ + I);
    a.replaceChildren(), c.style.height = `${_ * d}px`, h.style.height = `${Math.max(0, (g - M - 1) * d)}px`, a.appendChild(c);
    const P = /* @__PURE__ */ new Map();
    for (let N = _; N <= M; N++) {
      const W = r[N];
      if (!W) continue;
      let O = m.get(N);
      O || (O = i(W, N)), a.appendChild(O), P.set(N, O);
    }
    m = P, a.appendChild(h);
  }
  function y() {
    b();
  }
  return s.addEventListener("scroll", y, { passive: !0 }), b(), {
    render: b,
    update(g) {
      r = g, m.clear(), b();
    },
    destroy() {
      s.removeEventListener("scroll", y), m.clear(), a.replaceChildren();
    },
    /* Translate a logical card index (in `cards`) to a y-position relative
     * to the scroll container — used by the DnD module so a drop into the
     * logical N-th slot of a virtualised column resolves correctly even
     * when N isn't currently rendered. */
    indexToY(g) {
      return g * d;
    },
    yToIndex(g) {
      return Math.max(0, Math.floor(g / d));
    }
  };
}
function Yt({ cardCount: r, threshold: t, cardHeight: e, virtual: n }) {
  return n === !0 ? !0 : n === !1 || !Number.isFinite(e) || e <= 0 ? !1 : r >= (Number.isFinite(t) ? t : 200);
}
const X = /* @__PURE__ */ new Map();
function F(r, t) {
  if (typeof r != "string" || !r) throw new Error("registerRenderer: name must be a non-empty string");
  if (typeof t != "function") throw new Error("registerRenderer: fn must be a function");
  X.set(r, t);
}
function at(r) {
  return X.get(r) || null;
}
function zt() {
  return Array.from(X.keys());
}
function l(r, t = {}, e = null) {
  const n = document.createElement(r);
  for (const [s, i] of Object.entries(t))
    i == null || i === !1 || (s === "class" ? n.className = i : s === "text" ? n.textContent = String(i) : n.setAttribute(s, i === !0 ? "" : String(i)));
  if (e == null) return n;
  for (const s of [].concat(e))
    s == null || s === !1 || n.appendChild(typeof s == "string" ? document.createTextNode(s) : s);
  return n;
}
const v = (r) => r == null || r === "", D = {
  statusPill(r, { colorMap: t = {}, iconMap: e = {} } = {}) {
    const n = r == null ? "" : String(r), s = t[n] || "#9ca3af", i = e[n];
    return l(
      "span",
      { class: "sk-pill", style: `--sk-pill-color:${s}`, "data-status": n },
      i ? [l("span", { class: "sk-pill-icon", text: i }), document.createTextNode(n || "—")] : [document.createTextNode(n || "—")]
    );
  },
  avatar(r, { url: t, size: e = 24, title: n } = {}) {
    if (t)
      return l("img", {
        class: "sk-avatar",
        src: t,
        alt: r || "",
        width: e,
        height: e,
        title: n || r || ""
      });
    const s = String(r || "?").split(/\s+/).map((i) => i[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
    return l("span", { class: "sk-avatar sk-avatar-fallback", title: n || r || "" }, [s]);
  },
  tags(r, { max: t = 4 } = {}) {
    const e = Array.isArray(r) ? r : String(r || "").split(",").map((s) => s.trim()).filter(Boolean), n = l("span", { class: "sk-tags" });
    return e.slice(0, t).forEach((s) => n.appendChild(l("span", { class: "sk-tag", text: s }))), e.length > t && n.appendChild(l("span", { class: "sk-tag sk-tag-more", text: `+${e.length - t}` })), n;
  },
  currency(r, { currency: t = "AUD", locale: e = "en-AU" } = {}) {
    if (v(r)) return l("span", {}, "");
    const n = Number(r);
    if (!Number.isFinite(n)) return l("span", { text: String(r) });
    try {
      const s = new Intl.NumberFormat(e, { style: "currency", currency: t, maximumFractionDigits: 0 }).format(n);
      return l("span", { class: "sk-currency", text: s });
    } catch {
      return l("span", { class: "sk-currency", text: `${n.toFixed(0)}` });
    }
  },
  percent(r) {
    if (v(r)) return l("span", {});
    const t = Number(r);
    return Number.isFinite(t) ? l("span", { class: "sk-percent", text: `${Math.round(t * 100)}%` }) : l("span", { text: String(r) });
  },
  progressBar(r) {
    const t = Math.max(0, Math.min(1, Number(r) || 0));
    return l("div", { class: "sk-progress" }, [
      l("div", { class: "sk-progress-bar", style: `width:${Math.round(t * 100)}%` })
    ]);
  },
  relativeTime(r) {
    if (v(r)) return l("span", {});
    const t = r instanceof Date ? r : new Date(r);
    if (Number.isNaN(t.valueOf())) return l("span", { text: String(r) });
    const e = Date.now() - t.valueOf(), n = Math.abs(e), s = n < 6e4 ? "just now" : n < 36e5 ? `${Math.round(n / 6e4)}m` : n < 864e5 ? `${Math.round(n / 36e5)}h` : n < 7 * 864e5 ? `${Math.round(n / 864e5)}d` : t.toLocaleDateString();
    return l("time", { class: "sk-rel-time", datetime: t.toISOString(), title: t.toLocaleString(), text: s });
  },
  dueDate(r) {
    if (v(r)) return l("span", {});
    const t = r instanceof Date ? r : new Date(r);
    if (Number.isNaN(t.valueOf())) return l("span", { text: String(r) });
    const e = /* @__PURE__ */ new Date();
    e.setHours(0, 0, 0, 0);
    const n = new Date(t);
    n.setHours(0, 0, 0, 0);
    const s = Math.round((n - e) / 864e5), i = s < 0 ? "sk-due sk-due-overdue" : s <= 1 ? "sk-due sk-due-soon" : "sk-due", a = s === 0 ? "Due today" : s === 1 ? "Due tomorrow" : s === -1 ? "1 day overdue" : s < 0 ? `${-s} days overdue` : `Due ${t.toLocaleDateString()}`;
    return l("span", { class: i, title: t.toLocaleString(), text: a });
  },
  countryFlag(r) {
    if (v(r)) return l("span", {});
    const t = String(r).toUpperCase().slice(0, 2);
    if (t.length !== 2) return l("span", { text: String(r) });
    const e = String.fromCodePoint(...t.split("").map((n) => 127397 + n.charCodeAt(0)));
    return l("span", { class: "sk-flag", title: t, text: e });
  },
  attachments(r) {
    const t = Array.isArray(r) ? r : [];
    return t.length === 0 ? l("span", {}) : l(
      "span",
      { class: "sk-attachments", title: `${t.length} attachment(s)` },
      `📎 ${t.length}`
    );
  },
  mask(r, { type: t = "card" } = {}) {
    const e = String(r || "").replace(/\D/g, "");
    if (!e) return l("span", {});
    if (t === "card") {
      const n = e.slice(-4);
      return l("span", { class: "sk-mask", text: `•••• ${n}` });
    }
    return l("span", { class: "sk-mask", text: e.replace(/.(?=.{4})/g, "•") });
  }
}, J = {
  open: "#3b82f6",
  todo: "#3b82f6",
  doing: "#f59e0b",
  in_progress: "#f59e0b",
  review: "#a855f7",
  blocked: "#ef4444",
  done: "#10b981",
  closed: "#6b7280",
  cancelled: "#6b7280",
  resolved: "#10b981"
};
function lt({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-story" }), e = l("header", { class: "sk-card-header" }, [
    l("span", { class: "sk-card-key", text: r.key || "" }),
    D.statusPill(r.status, { colorMap: J })
  ]), n = l("h4", { class: "sk-card-title", text: r.title || "" }), s = l("footer", { class: "sk-card-footer" }, [
    v(r.points) ? null : l("span", { class: "sk-card-points", text: `${r.points} pts` }),
    v(r.assignee_name) ? null : D.avatar(r.assignee_name, { url: r.assignee_avatar })
  ].filter(Boolean));
  return t.append(e, n, s), t;
}
function ot({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-task" }), e = l("div", { class: "sk-card-task-row" }, [
    l("input", {
      type: "checkbox",
      class: "sk-card-check",
      ...r.done ? { checked: !0 } : {},
      "data-sk-task-check": ""
    }),
    l("span", { class: r.done ? "sk-card-title sk-card-title-done" : "sk-card-title", text: r.title || "" })
  ]);
  return t.appendChild(e), v(r.due_at) || t.appendChild(D.dueDate(r.due_at)), t;
}
function dt({ card: r }) {
  const t = String(r.severity || "minor").toLowerCase(), e = { critical: "#dc2626", major: "#f97316", minor: "#facc15", cosmetic: "#94a3b8" }, n = l("article", { class: "sk-card sk-card-bug", "data-severity": t });
  return n.append(
    l("header", { class: "sk-card-header" }, [
      l("span", { class: "sk-card-key", text: r.key || "" }),
      l("span", { class: "sk-pill", style: `--sk-pill-color:${e[t] || "#94a3b8"}`, text: t })
    ]),
    l("h4", { class: "sk-card-title", text: r.title || "" }),
    r.reporter_name ? l("footer", { class: "sk-card-footer" }, [
      D.avatar(r.reporter_name, { url: r.reporter_avatar, title: `Reported by ${r.reporter_name}` })
    ]) : null
  ), n;
}
function ct({ card: r }) {
  const t = String(r.priority || "p4").toLowerCase(), e = { p1: "#dc2626", p2: "#f97316", p3: "#facc15", p4: "#94a3b8", p5: "#94a3b8" }, n = l("article", { class: "sk-card sk-card-incident", "data-priority": t });
  return n.append(
    l("header", { class: "sk-card-header" }, [
      l("span", { class: "sk-pill sk-pill-priority", style: `--sk-pill-color:${e[t] || "#94a3b8"}`, text: t.toUpperCase() }),
      v(r.pages) ? null : l("span", { class: "sk-card-meta", text: `📟 ${r.pages}` })
    ].filter(Boolean)),
    l("h4", { class: "sk-card-title", text: r.title || "" }),
    l("footer", { class: "sk-card-footer" }, [
      v(r.opened_at) ? null : D.relativeTime(r.opened_at)
    ].filter(Boolean))
  ), n;
}
function ut({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-note" });
  return t.append(
    l("div", { class: "sk-card-body", text: r.body || r.title || "" }),
    l("footer", { class: "sk-card-footer" }, [
      v(r.author) ? null : l("span", { class: "sk-card-meta", text: r.author }),
      v(r.updated_at) ? null : D.relativeTime(r.updated_at)
    ].filter(Boolean))
  ), t;
}
function ht({ card: r }) {
  const t = String(r.ci || "").toLowerCase(), e = t === "pass" ? "sk-ci sk-ci-pass" : t === "fail" ? "sk-ci sk-ci-fail" : t === "pending" ? "sk-ci sk-ci-pending" : "sk-ci", n = l("article", { class: "sk-card sk-card-pr" });
  return n.append(
    l("header", { class: "sk-card-header" }, [
      l("span", { class: "sk-card-key", text: `#${r.number ?? ""}` }),
      l("span", { class: "sk-card-meta", text: r.repo || "" })
    ]),
    l("h4", { class: "sk-card-title", text: r.title || "" }),
    l("footer", { class: "sk-card-footer" }, [
      l("span", { class: e, title: `CI: ${t || "unknown"}` }),
      !v(r.diff_added) || !v(r.diff_removed) ? l("span", { class: "sk-card-diff" }, [
        l("span", { class: "sk-diff-add", text: `+${r.diff_added ?? 0}` }),
        l("span", { class: "sk-diff-rm", text: `−${r.diff_removed ?? 0}` })
      ]) : null,
      Array.isArray(r.reviewers) && r.reviewers.length > 0 ? l(
        "span",
        { class: "sk-card-reviewers" },
        r.reviewers.slice(0, 3).map((s) => D.avatar(s.name, { url: s.avatar, size: 18 }))
      ) : null
    ].filter(Boolean))
  ), n;
}
function mt({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-ticket" });
  return t.append(
    l("header", { class: "sk-card-header" }, [
      l("span", { class: "sk-card-key", text: r.key || `T-${r.id}` }),
      v(r.channel) ? null : l("span", { class: "sk-channel", "data-channel": r.channel, text: r.channel })
    ].filter(Boolean)),
    l("h4", { class: "sk-card-title", text: r.subject || r.title || "" }),
    l("div", { class: "sk-card-meta", text: r.customer_name || "" }),
    v(r.sla_due_at) ? null : l("footer", { class: "sk-card-footer" }, [D.dueDate(r.sla_due_at)])
  ), t;
}
function ft({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-lead" });
  return t.append(
    l("h4", { class: "sk-card-title", text: r.name || "" }),
    l("div", { class: "sk-card-meta", text: r.company || "" }),
    l("footer", { class: "sk-card-footer" }, [
      v(r.value) ? null : D.currency(r.value, { currency: r.currency || "AUD" }),
      v(r.stage) ? null : D.statusPill(r.stage, { colorMap: J })
    ].filter(Boolean))
  ), t;
}
function pt({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-order" });
  return t.append(
    l("header", { class: "sk-card-header" }, [
      l("span", { class: "sk-card-key", text: `#${r.order_number || r.id || ""}` }),
      D.statusPill(r.status, { colorMap: J })
    ]),
    v(r.customer_name) ? null : l("div", { class: "sk-card-meta", text: r.customer_name }),
    l("footer", { class: "sk-card-footer" }, [
      v(r.total) ? null : D.currency(r.total, { currency: r.currency || "AUD" }),
      v(r.items_count) ? null : l("span", { class: "sk-card-meta", text: `${r.items_count} items` })
    ].filter(Boolean))
  ), t;
}
function gt({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-email", "data-unread": r.unread ? "true" : "false" });
  return t.append(
    l("header", { class: "sk-card-header" }, [
      r.unread ? l("span", { class: "sk-unread-dot", title: "Unread" }) : null,
      l("span", { class: "sk-card-meta", text: r.sender || "" })
    ].filter(Boolean)),
    l("h4", { class: "sk-card-title", text: r.subject || "" }),
    l("div", { class: "sk-card-body sk-card-snippet", text: r.snippet || "" })
  ), t;
}
function Ct({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-image" });
  if (!v(r.image_url)) {
    const e = l("img", { class: "sk-card-hero", src: r.image_url, alt: r.caption || "" });
    r.clickToZoom !== !1 && (e.style.cursor = "zoom-in", e.addEventListener("click", (n) => {
      n.stopPropagation();
      const s = l("div", { class: "sk-zoom-overlay" }, [
        l("img", { src: r.image_url, alt: r.caption || "" })
      ]);
      s.addEventListener("click", () => s.remove()), document.body.appendChild(s);
    })), t.appendChild(e);
  }
  return v(r.caption) || t.appendChild(l("div", { class: "sk-card-caption", text: r.caption })), t;
}
function _t({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-cover" });
  return v(r.image_url) || t.appendChild(l("img", { class: "sk-card-hero", src: r.image_url, alt: r.title || "" })), t.appendChild(l("h4", { class: "sk-card-title", text: r.title || "" })), r.progress != null && t.appendChild(D.progressBar(r.progress)), t;
}
function kt({ card: r }) {
  const t = l("article", { class: "sk-card sk-card-gantt" });
  return t.append(
    l("h4", { class: "sk-card-title", text: r.title || "" }),
    l("div", { class: "sk-gantt-bar" }, [
      l("div", { class: "sk-gantt-fill", style: `width:${Math.round((Number(r.progress) || 0) * 100)}%` })
    ]),
    v(r.due_at) ? null : D.dueDate(r.due_at)
  ), t;
}
F("story", lt);
F("task", ot);
F("bug", dt);
F("incident", ct);
F("note", ut);
F("pr", ht);
F("support-ticket", mt);
F("lead", ft);
F("order", pt);
F("email-thread", gt);
F("image-card", Ct);
F("cover-progress", _t);
F("gantt-stub", kt);
const Xt = {
  story: lt,
  task: ot,
  bug: dt,
  incident: ct,
  note: ut,
  pr: ht,
  "support-ticket": mt,
  lead: ft,
  order: pt,
  "email-thread": gt,
  "image-card": Ct,
  "cover-progress": _t,
  "gantt-stub": kt,
  sub: D
}, Jt = 280, Qt = 8;
class Q extends $ {
  initialize() {
    this.state = {
      cards: [],
      columns: [],
      columnOrder: [],
      // explicit ordering, mutated by moveColumn/reorder
      columnCounts: /* @__PURE__ */ new Map(),
      // server-side: total per column
      selection: /* @__PURE__ */ new Set(),
      lastSelectedId: null,
      activeCardId: null,
      activeColumnId: null,
      quickFilter: "",
      predicate: null,
      swimlaneField: "",
      collapsedSwimlanes: /* @__PURE__ */ new Set(),
      editing: null,
      // { cardId, editorEl, originalSnapshot }
      openDetailCardId: null,
      wipExceeded: /* @__PURE__ */ new Set(),
      // colIds currently over-WIP (for "fire once" semantics)
      stuckCards: /* @__PURE__ */ new Set(),
      // cardIds currently stuck per column.stuck_after_days
      enteredColumnAt: /* @__PURE__ */ new Map(),
      // cardId → ISO timestamp of when card entered current column
      virtualColumns: /* @__PURE__ */ new Map(),
      // columnId → virtual instance
      ready: !1
    }, this._renderScheduled = !1, this._renderColumnDirty = /* @__PURE__ */ new Set(), this._persistTimer = null, this._scheduleRender = Wt(() => this._renderNow());
  }
  connect() {
    this.element.classList.add("sk-board"), this.heightValue && (this.element.style.height = this.heightValue), this.domLayoutValue === "autoHeight" && this.element.classList.add("sk-board-auto-height"), this.element.hasAttribute("tabindex") || (this.element.tabIndex = 0), this._parseColumnsFromDom();
    const t = this._parseCardsFromDom();
    t.length > 0 ? this.state.cards = H(t, this._modelOpts()) : Array.isArray(this.cardDataValue) && this.cardDataValue.length > 0 ? this.state.cards = H(this.cardDataValue, this._modelOpts()) : this.cardDataUrlValue && this._loadFromUrl(this.cardDataUrlValue), this.state.swimlaneField = this.swimlaneFieldValue || "", this.state.quickFilter = this.quickFilterValue || "", this._installDnd(), this._installKeyboard(), this._installFileDrop(), this.api = qt(this), this.element.boardApi = this.api, this._restorePersistedState(), this._scheduleRender(), queueMicrotask(() => {
      this.state.ready = !0, C(this.element, "board:ready", { api: this.api });
    });
  }
  disconnect() {
    this._dnd?.destroy?.(), document.removeEventListener("click", this._onDocumentClick);
    for (const t of this.state.virtualColumns.values()) t.destroy?.();
    delete this.element.boardApi;
  }
  /* ---------------- Parsing ---------------- */
  _parseColumnsFromDom() {
    const t = [], e = this.element.querySelectorAll('[data-controller~="board-column"]');
    for (const s of e) {
      const i = s.getAttribute("data-board-column-id-value") || "";
      i && t.push({
        id: i,
        title: s.getAttribute("data-board-column-title-value") || i,
        wip: this._numOrNull(s.getAttribute("data-board-column-wip-value")),
        min_count: this._numOrNull(s.getAttribute("data-board-column-min-count-value")),
        width: this._numOrNull(s.getAttribute("data-board-column-width-value")),
        collapsed: s.getAttribute("data-board-column-collapsed-value") === "true",
        hidden: s.getAttribute("data-board-column-hidden-value") === "true",
        accept_from: this._jsonOrNull(s.getAttribute("data-board-column-accept-cards-from-value")),
        disallow_drag: s.getAttribute("data-board-column-disallow-drag-value") === "true",
        sort: s.getAttribute("data-board-column-sort-value") || "manual",
        stuck_after_days: this._numOrNull(s.getAttribute("data-board-column-stuck-after-days-value")),
        card_renderer: s.getAttribute("data-board-column-card-renderer-value") || null,
        card_editor: s.getAttribute("data-board-column-card-editor-value") || null,
        add_card_label: s.getAttribute("data-board-column-add-card-label-value") || null,
        color: s.getAttribute("data-board-column-color-value") || null,
        icon: s.getAttribute("data-board-column-icon-value") || null
      });
    }
    this.state.columns = st(t);
    const n = this.wipLimitsValue || {};
    for (const s of this.state.columns)
      Object.prototype.hasOwnProperty.call(n, s.id) && (s.wip = n[s.id]);
    this.state.columnOrder = this.state.columns.map((s) => s.id);
  }
  _parseCardsFromDom() {
    const t = [], e = this.element.querySelectorAll("[data-card-id]");
    for (const n of e) {
      const s = n.getAttribute("data-card-id"), a = L(n, "[data-board-column-id-value]")?.getAttribute("data-board-column-id-value") || n.getAttribute("data-column-id") || "", d = n.getAttribute("data-card-order"), c = n.getAttribute("data-card-json");
      let h = { [this.getCardIdValue]: s, [this.getColumnIdValue]: a };
      if (c)
        try {
          Object.assign(h, JSON.parse(c));
        } catch {
        }
      d != null && (h[this.orderFieldValue] = Number(d)), h.title == null && (h.title = n.textContent.trim());
      const m = n.getAttribute("data-card-swimlane");
      m != null && (h.__swimlane = m), n.getAttribute("data-card-locked") === "true" && (h.__locked = !0);
      const y = n.getAttribute("data-card-color");
      y && (h.__color = y);
      const g = n.getAttribute("data-card-renderer");
      g && (h.__renderer = g);
      const A = n.getAttribute("data-card-editor");
      A && (h.__editor = A), t.push(h);
    }
    return t;
  }
  async _loadFromUrl(t) {
    try {
      const e = await fetch(t, { headers: { Accept: "application/json" } });
      if (!e.ok) throw new Error(`HTTP ${e.status}`);
      const n = await e.json();
      Array.isArray(n) ? this.setCardData(n) : (Array.isArray(n.columns) && this.setColumnData(n.columns), Array.isArray(n.cards) && this.setCardData(n.cards));
    } catch (e) {
      C(this.element, "board:loadError", { url: t, error: String(e) });
    }
  }
  /* ---------------- Public methods backing the boardApi ---------------- */
  setCardData(t) {
    this.state.cards = H(t, this._modelOpts()), this._reseedEnteredColumnAt(), this._scheduleRender(), C(this.element, "board:cardDataChanged", { cards: this.getCardData() });
  }
  getCardData() {
    return this.state.cards.map((t) => ({ ...t }));
  }
  setColumnData(t) {
    this.state.columns = st(t), this.state.columnOrder = this.state.columns.map((e) => e.id), this._scheduleRender(), C(this.element, "board:columnDataChanged", { columns: this.getColumnData() });
  }
  getColumnData() {
    return this._orderedColumns().filter((t) => !t.__synthetic).map((t) => ({ ...t }));
  }
  applyTransaction(t) {
    const e = new Map(this.state.cards.map((n) => [String(n[this.getCardIdValue]), String(n[this.getColumnIdValue])]));
    return this.state.cards = $t(this.state.cards, t, this._modelOpts()), this._trackEnteredColumnDelta(e), this._scheduleRender(), Array.isArray(t?.add) && t.add.forEach((n) => C(this.element, "board:cardAdded", { cardId: n[this.getCardIdValue], columnId: n[this.getColumnIdValue], card: n })), Array.isArray(t?.remove) && t.remove.forEach((n) => C(this.element, "board:cardRemoved", { cardId: typeof n == "object" ? n[this.getCardIdValue] : n })), this._checkWipStateChanges(), this.getCardData();
  }
  setColumnCounts(t) {
    this.state.columnCounts = new Map(Object.entries(t || {}).map(([e, n]) => [String(e), Number(n)])), this._scheduleRender();
  }
  getColumnCounts() {
    return Object.fromEntries(this.state.columnCounts);
  }
  /* selection */
  selectCard(t) {
    this.cardSelectionValue && (this.cardSelectionValue === "single" && this.state.selection.clear(), this.state.selection.add(String(t)), this.state.lastSelectedId = String(t), this._refreshSelectionDecorations(), C(this.element, "board:cardSelectionChanged", { selectedCardIds: this.getSelectedCardIds() }));
  }
  deselectCard(t) {
    this.state.selection.delete(String(t)), this._refreshSelectionDecorations(), C(this.element, "board:cardSelectionChanged", { selectedCardIds: this.getSelectedCardIds() });
  }
  toggleSelection(t) {
    const e = String(t);
    this.state.selection.has(e) ? this.deselectCard(e) : this.selectCard(e);
  }
  selectAllInColumn(t) {
    if (this.cardSelectionValue !== "multiple") return;
    const e = B(this.state.cards, t, this._modelOpts()).map((n) => String(n[this.getCardIdValue]));
    for (const n of e) this.state.selection.add(n);
    this._refreshSelectionDecorations(), C(this.element, "board:cardSelectionChanged", { selectedCardIds: this.getSelectedCardIds() });
  }
  clearSelection() {
    this.state.selection.size !== 0 && (this.state.selection.clear(), this._refreshSelectionDecorations(), C(this.element, "board:cardSelectionChanged", { selectedCardIds: [] }));
  }
  getSelectedCardIds() {
    return Array.from(this.state.selection);
  }
  getSelectedCards() {
    const t = this.state.selection;
    return this.state.cards.filter((e) => t.has(String(e[this.getCardIdValue]))).map((e) => ({ ...e }));
  }
  _refreshSelectionDecorations() {
    for (const t of this.element.querySelectorAll("[data-card-id]")) {
      const e = t.getAttribute("data-card-id");
      t.classList.toggle("sk-card-selected", this.state.selection.has(e)), t.setAttribute("aria-selected", this.state.selection.has(e) ? "true" : "false");
    }
  }
  /* movement */
  moveCard(t, e) {
    const n = this._snapshotCard(t);
    if (!this._beforeMoveOk([t], n?.[this.getColumnIdValue], e.toColumnId, e.toIndex)) return !1;
    const s = this._currentVisibleIndex(t);
    this.state.cards = z(this.state.cards, t, e, this._modelOpts());
    const i = n?.[this.getColumnIdValue], a = e.toColumnId ?? i;
    return String(i) !== String(a) && this._markEnteredColumn(t), this._scheduleRender(), C(this.element, "board:cardMoved", {
      cardId: t,
      fromColumnId: i,
      toColumnId: e.toColumnId,
      fromIndex: s,
      toIndex: e.toIndex
    }), this._checkWipStateChanges(), !0;
  }
  moveCards(t, e) {
    if (!t?.length) return !1;
    const n = this._snapshotCard(t[0]);
    if (!this._beforeMoveOk(t, n?.[this.getColumnIdValue], e.toColumnId, e.toIndex)) return !1;
    const s = n?.[this.getColumnIdValue];
    if (this.state.cards = Bt(this.state.cards, t, e, this._modelOpts()), String(s) !== String(e.toColumnId))
      for (const i of t) this._markEnteredColumn(i);
    return this._scheduleRender(), C(this.element, "board:cardsMoved", {
      cardIds: t,
      fromColumnId: s,
      toColumnId: e.toColumnId,
      toIndex: e.toIndex
    }), this._checkWipStateChanges(), !0;
  }
  reorderCardWithinColumn(t, e) {
    const n = this._snapshotCard(t);
    return n ? (this.state.cards = Rt(this.state.cards, t, e, this._modelOpts()), this._scheduleRender(), C(this.element, "board:cardMoved", {
      cardId: t,
      fromColumnId: n[this.getColumnIdValue],
      toColumnId: n[this.getColumnIdValue],
      fromIndex: null,
      toIndex: e
    }), !0) : !1;
  }
  _beforeMoveOk(t, e, n, s) {
    if (this.readOnlyValue || C(
      this.element,
      "board:beforeMove",
      { cardIds: t, fromColumnId: e, toColumnId: n, toIndex: s },
      { cancellable: !0 }
    ).defaultPrevented) return !1;
    const a = this._columnById(n);
    return !(a?.accept_from && e && !a.accept_from.includes(String(e)));
  }
  _snapshotCard(t) {
    return this.state.cards.find((e) => String(e[this.getCardIdValue]) === String(t)) || null;
  }
  _currentVisibleIndex(t) {
    const e = this._snapshotCard(t);
    if (!e) return -1;
    const n = B(this.state.cards, e[this.getColumnIdValue], this._modelOpts());
    return K(n, this._columnById(e[this.getColumnIdValue])?.sort, this.orderFieldValue).findIndex((i) => String(i[this.getCardIdValue]) === String(t));
  }
  /* columns */
  setColumnVisible(t, e) {
    const n = this._columnById(t);
    n && (n.hidden = !e, this._scheduleRender(), C(this.element, "board:columnVisibleChanged", { columnId: t, visible: !!e }));
  }
  setColumnCollapsed(t, e) {
    const n = this._columnById(t);
    n && (n.collapsed = !!e, this._scheduleRender(), C(this.element, "board:columnCollapsedChanged", { columnId: t, collapsed: !!e }));
  }
  setColumnWidth(t, e) {
    const n = this._columnById(t);
    n && (n.width = Number(e), this._scheduleRender(), C(this.element, "board:columnResized", { columnId: t, width: n.width }));
  }
  moveColumn(t, e) {
    const n = this.state.columnOrder.slice(), s = n.indexOf(String(t));
    s !== -1 && (n.splice(s, 1), n.splice(Math.max(0, Math.min(e, n.length)), 0, String(t)), this.state.columnOrder = n, this._scheduleRender(), C(this.element, "board:columnMoved", { columnId: t, fromIndex: s, toIndex: e }));
  }
  setColumnWip(t, e) {
    const n = this._columnById(t);
    n && (n.wip = e == null ? null : Number(e), this._scheduleRender(), this._checkWipStateChanges());
  }
  setColumnAcceptFrom(t, e) {
    const n = this._columnById(t);
    n && (n.accept_from = Array.isArray(e) ? e.map(String) : null);
  }
  sizeColumnsToFit() {
    const t = this.element.querySelector(".sk-columns");
    if (!t) return;
    const e = this._orderedColumns().filter((s) => !s.hidden && !s.__synthetic);
    if (e.length === 0) return;
    const n = Math.floor((t.clientWidth - (e.length + 1) * this.gapValue) / e.length);
    for (const s of e) s.width = n;
    this._scheduleRender();
  }
  getColumnSort(t) {
    return this._columnById(t)?.sort || "manual";
  }
  setColumnSort(t, e) {
    const n = this._columnById(t);
    n && (n.sort = e || "manual", this._scheduleRender(), C(this.element, "board:columnSortChanged", { columnId: t, sort: n.sort }));
  }
  /* swimlanes */
  setSwimlaneField(t) {
    this.state.swimlaneField = t || "", this._scheduleRender(), C(this.element, "board:swimlaneChanged", { swimlaneField: this.state.swimlaneField });
  }
  setSwimlaneCollapsed(t, e) {
    const n = String(t ?? "");
    e ? this.state.collapsedSwimlanes.add(n) : this.state.collapsedSwimlanes.delete(n), this._scheduleRender();
  }
  /* filter */
  setQuickFilter(t) {
    this.state.quickFilter = t || "", this._scheduleRender(), C(this.element, "board:filterChanged", { quickFilter: this.state.quickFilter, predicate: this.state.predicate });
  }
  setCardFilter(t) {
    this.state.predicate = typeof t == "function" ? t : null, this._scheduleRender(), C(this.element, "board:filterChanged", { quickFilter: this.state.quickFilter, predicate: this.state.predicate });
  }
  /* editing */
  startEditingCard(t) {
    if (this.readOnlyValue) return !1;
    this.state.editing && this.cancelEditing();
    const e = this._snapshotCard(t);
    if (!e || e.__locked) return !1;
    const n = this._cardEl(t);
    if (!n) return !1;
    const s = e.__editor || this._columnById(e[this.getColumnIdValue])?.card_editor || this.cardEditorValue, i = s ? Y(s) : this._defaultEditor(e);
    return i ? (i.dataset.controller = (i.dataset.controller || "") + " card-editor", i.dataset.cardEditorCardIdValue = String(t), n.replaceChildren(i), this._seedEditor(i, e), this.state.editing = { cardId: String(t), editorEl: i, original: { ...e } }, queueMicrotask(() => {
      const a = i.querySelector("[data-editor-input], [data-editor-field]");
      a?.focus?.(), a?.select?.();
    }), C(this.element, "board:cardEditStarted", { cardId: t }), !0) : !1;
  }
  commitEditing() {
    const t = this.state.editing;
    if (!t) return !1;
    const e = this._readEditor(t.editorEl, t.original);
    return this.applyTransaction({ update: [e] }), C(this.element, "board:cardValueChanged", { cardId: t.cardId, oldCard: t.original, newCard: e }), this.state.editing = null, !0;
  }
  cancelEditing() {
    const t = this.state.editing;
    return t ? (this.state.editing = null, this._scheduleRender(), C(this.element, "board:cardEditCancelled", { cardId: t.cardId }), !0) : !1;
  }
  _defaultEditor(t) {
    return p("form", { class: "sk-card-editor" }, [
      p("input", { class: "sk-card-editor-input", "data-editor-input": "", "data-editor-field": "title", value: t.title || "" }),
      p("div", { class: "sk-card-editor-actions" }, [
        p("button", { type: "submit", "data-editor-commit": "", class: "sk-button sk-button-primary" }, "Save"),
        p("button", { type: "button", "data-editor-cancel": "", class: "sk-button" }, "Cancel")
      ])
    ]);
  }
  _seedEditor(t, e) {
    for (const n of t.querySelectorAll("[data-editor-field]")) {
      const s = n.getAttribute("data-editor-field");
      if (!s) continue;
      const i = e[s];
      n.tagName === "SELECT" ? n.value = i == null ? "" : String(i) : n.type === "checkbox" ? n.checked = !!i : n.value = i == null ? "" : String(i);
    }
  }
  _readEditor(t, e) {
    const n = { ...e };
    for (const s of t.querySelectorAll("[data-editor-field]")) {
      const i = s.getAttribute("data-editor-field");
      i && (s.type === "checkbox" ? n[i] = !!s.checked : s.type === "number" ? n[i] = s.value === "" ? null : Number(s.value) : n[i] = s.value);
    }
    return n;
  }
  /* programmatic drag */
  beginDrag(t, e) {
    return this._dnd?.beginDrag(Array.isArray(t) ? t : [t], e);
  }
  endDrag(t = {}) {
    return this._dnd?.endDrag(t);
  }
  /* WIP */
  getWipState() {
    return Ot(this._orderedColumns(), this.state.cards, this._modelOpts());
  }
  _checkWipStateChanges() {
    const t = /* @__PURE__ */ new Set();
    for (const e of this.getWipState())
      e.over && t.add(String(e.colId));
    for (const e of t)
      if (!this.state.wipExceeded.has(e)) {
        const n = this.getWipState().find((s) => String(s.colId) === e);
        C(this.element, "board:wipExceeded", { columnId: e, count: n?.count, limit: n?.limit });
      }
    this.state.wipExceeded = t;
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
  _markEnteredColumn(t, e) {
    const n = String(t), s = e || this._aging_now();
    this.state.enteredColumnAt.set(n, s);
  }
  _reseedEnteredColumnAt() {
    const t = /* @__PURE__ */ new Map(), e = this._aging_now();
    for (const n of this.state.cards) {
      const s = String(n[this.getCardIdValue]), i = this.state.enteredColumnAt.get(s), a = n.entered_column_at || n.entered_at;
      t.set(s, i || a || e);
    }
    this.state.enteredColumnAt = t;
  }
  _trackEnteredColumnDelta(t) {
    const e = this._aging_now();
    for (const s of this.state.cards) {
      const i = String(s[this.getCardIdValue]), a = String(s[this.getColumnIdValue]), d = t.get(i);
      d == null ? this.state.enteredColumnAt.set(i, s.entered_column_at || s.entered_at || e) : d !== a && this.state.enteredColumnAt.set(i, e);
    }
    const n = new Set(this.state.cards.map((s) => String(s[this.getCardIdValue])));
    for (const s of this.state.enteredColumnAt.keys())
      n.has(s) || this.state.enteredColumnAt.delete(s);
  }
  _aging_now() {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  getCardEnteredAt(t) {
    return this.state.enteredColumnAt.get(String(t)) || null;
  }
  /* Whole-day delta. `2026-05-26T10:00:00Z` → `2026-05-28T11:00:00Z` is 2 days. */
  getCardAgeInColumn(t, e = this._aging_now()) {
    const n = this.getCardEnteredAt(t);
    if (!n) return null;
    const s = new Date(e) - new Date(n);
    return Number.isNaN(s) ? null : Math.max(0, Math.floor(s / 864e5));
  }
  getStuckCardIds(t = this._aging_now()) {
    const e = [];
    for (const n of this._orderedColumns())
      if (n.stuck_after_days)
        for (const s of B(this.state.cards, n.id, this._modelOpts())) {
          const i = String(s[this.getCardIdValue]), a = this.getCardAgeInColumn(i, t);
          a != null && a >= n.stuck_after_days && e.push(i);
        }
    return e;
  }
  _decorateStuckCards() {
    if (!this._orderedColumns().some((s) => s.stuck_after_days)) return;
    const e = this._aging_now(), n = new Set(this.getStuckCardIds(e));
    for (const s of this.element.querySelectorAll("[data-card-id]")) {
      const i = s.getAttribute("data-card-id"), a = n.has(String(i));
      if (s.setAttribute("data-card-stuck", a ? "true" : "false"), a) {
        const d = this.getCardAgeInColumn(i, e);
        d != null && s.setAttribute("data-card-age-days", String(d));
      } else
        s.removeAttribute("data-card-age-days");
    }
    for (const s of n)
      if (!this.state.stuckCards.has(s)) {
        const i = this.state.cards.find((a) => String(a[this.getCardIdValue]) === s);
        C(this.element, "board:cardStuck", {
          cardId: s,
          columnId: i?.[this.getColumnIdValue],
          ageDays: this.getCardAgeInColumn(s, e)
        });
      }
    this.state.stuckCards = n;
  }
  /* persistence */
  getBoardState() {
    return {
      columnOrder: this.state.columnOrder.slice(),
      columns: this._orderedColumns().filter((t) => !t.__synthetic).map((t) => ({
        id: t.id,
        width: t.width ?? null,
        collapsed: !!t.collapsed,
        hidden: !!t.hidden,
        wip: t.wip ?? null,
        sort: t.sort || "manual"
      })),
      swimlaneField: this.state.swimlaneField || "",
      collapsedSwimlanes: Array.from(this.state.collapsedSwimlanes),
      quickFilter: this.state.quickFilter || "",
      readOnly: !!this.readOnlyValue
    };
  }
  applyBoardState(t) {
    if (t) {
      if (Array.isArray(t.columnOrder) && (this.state.columnOrder = t.columnOrder.slice()), Array.isArray(t.columns))
        for (const e of t.columns) {
          const n = this._columnById(e.id);
          n && (e.width != null && (n.width = e.width), n.collapsed = !!e.collapsed, n.hidden = !!e.hidden, e.wip != null && (n.wip = e.wip), e.sort && (n.sort = e.sort));
        }
      this.state.swimlaneField = t.swimlaneField || "", this.state.collapsedSwimlanes = new Set(t.collapsedSwimlanes || []), this.state.quickFilter = t.quickFilter || "", this._scheduleRender(), C(this.element, "board:boardStateApplied", { state: t });
    }
  }
  clearPersistedState() {
    if (this.persistKeyValue)
      try {
        localStorage.removeItem(`skanban:${this.persistKeyValue}`);
      } catch {
      }
  }
  _restorePersistedState() {
    if (this.persistKeyValue)
      try {
        const t = localStorage.getItem(`skanban:${this.persistKeyValue}`);
        if (!t) return;
        this.applyBoardState(JSON.parse(t));
      } catch {
      }
  }
  _schedulePersist() {
    this.persistKeyValue && (this._persistTimer && clearTimeout(this._persistTimer), this._persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(`skanban:${this.persistKeyValue}`, JSON.stringify(this.getBoardState()));
      } catch {
      }
    }, 200));
  }
  /* export */
  getDataAsJson() {
    return { columns: this.getColumnData(), cards: this.getCardData() };
  }
  getDataAsCsv({ columns: t, swimlanes: e = !1 } = {}) {
    const n = t && t.length ? this._orderedColumns().filter((a) => t.includes(a.id)) : this._orderedColumns().filter((a) => !a.__synthetic && !a.hidden), i = [["card_id", "column", ...e && this.state.swimlaneField ? [this.state.swimlaneField] : [], "title"].join(",")];
    for (const a of n) {
      const d = K(
        B(this.state.cards, a.id, this._modelOpts()),
        a.sort,
        this.orderFieldValue
      );
      for (const c of d) {
        const h = [
          this._csvCell(c[this.getCardIdValue]),
          this._csvCell(a.title),
          ...e && this.state.swimlaneField ? [this._csvCell(c[this.state.swimlaneField])] : [],
          this._csvCell(c.title || "")
        ];
        i.push(h.join(","));
      }
    }
    return i.join(`
`);
  }
  _csvCell(t) {
    const e = t == null ? "" : String(t);
    return /[",\n]/.test(e) ? `"${e.replace(/"/g, '""')}"` : e;
  }
  /* card detail panel */
  openCardDetail(t) {
    const e = this._snapshotCard(t);
    if (!e) return !1;
    this.closeCardDetail();
    const n = this.cardDetailTemplateValue, s = n ? Y(n) : this._defaultDetailPanel(e);
    if (!s) return !1;
    if (s.classList.add("sk-card-detail"), s.dataset.cardId = String(t), it(s, e), this.detailLayoutValue === "rail")
      s.classList.add("sk-card-detail-rail"), s.style.width = `${this.detailWidthValue}px`, this.element.appendChild(s);
    else {
      s.classList.add("sk-card-detail-popover");
      const a = this._cardEl(t)?.getBoundingClientRect();
      a && (s.style.position = "fixed", s.style.top = `${Math.max(8, a.top)}px`, s.style.left = `${Math.min(window.innerWidth - 360, a.right + 8)}px`), document.body.appendChild(s);
    }
    return this.state.openDetailCardId = String(t), s.addEventListener("click", (i) => {
      i.target?.matches("[data-detail-close]") && this.closeCardDetail();
    }), this._onDocumentClick = (i) => {
      !s.contains(i.target) && !this._cardEl(t)?.contains(i.target) && this.closeCardDetail();
    }, setTimeout(() => document.addEventListener("click", this._onDocumentClick), 0), C(this.element, "board:cardDetailOpened", { cardId: t, card: e, panelEl: s }), !0;
  }
  closeCardDetail() {
    const t = this.state.openDetailCardId;
    return t ? (document.querySelector(`.sk-card-detail[data-card-id="${t}"]`)?.remove(), this.state.openDetailCardId = null, document.removeEventListener("click", this._onDocumentClick), C(this.element, "board:cardDetailClosed", { cardId: t }), !0) : !1;
  }
  _defaultDetailPanel(t) {
    return p("aside", { class: "sk-card-detail-default" }, [
      p("header", {}, [p("h3", { text: t.title || `Card ${t[this.getCardIdValue]}` }), p("button", { "data-detail-close": "", text: "×", class: "sk-button" })]),
      p("dl", {}, Object.entries(t).filter(([e]) => !e.startsWith("__")).flatMap(([e, n]) => [
        p("dt", { text: e }),
        p("dd", { text: n == null ? "" : String(n) })
      ]))
    ]);
  }
  /* ---------------- Internals: rendering ---------------- */
  _modelOpts() {
    return {
      getCardId: this.getCardIdValue,
      getColumnId: this.getColumnIdValue,
      orderField: this.orderFieldValue
    };
  }
  _orderedColumns() {
    const t = new Map(this.state.columns.map((n) => [n.id, n])), e = [];
    for (const n of this.state.columnOrder) {
      const s = t.get(n);
      s && e.push(s);
    }
    for (const n of this.state.columns) this.state.columnOrder.includes(n.id) || e.push(n);
    return e;
  }
  _columnById(t) {
    return this.state.columns.find((e) => String(e.id) === String(t)) || null;
  }
  _cardEl(t) {
    return this.element.querySelector(`[data-card-id="${CSS.escape(String(t))}"]`);
  }
  _renderNow() {
    this._renderScheduled = !1;
    const t = this.state.ready, e = !!this.state.swimlaneField;
    let n = this.state.cards;
    this.state.quickFilter && (n = Vt(n, this.state.quickFilter)), typeof this.state.predicate == "function" && (n = Nt(n, this.state.predicate));
    const s = this.filterModeValue || "hide";
    let i = this.element.querySelector(".sk-columns");
    i || (i = p("ol", { class: "sk-columns" }), this.element.replaceChildren(i)), i.style.gap = `${this.gapValue}px`;
    const a = this._orderedColumns().filter((c) => !c.hidden), d = e ? Mt(n, this.state.swimlaneField) : /* @__PURE__ */ new Map([["", n]]);
    if (i.replaceChildren(), e && d.size > 0)
      for (const [c, h] of d) {
        const m = p("li", {
          class: "sk-swimlane",
          "data-swimlane-value": c || ""
        }), b = this.state.collapsedSwimlanes.has(c), y = p("div", {
          class: "sk-swimlane-header",
          "data-controller": "swimlane-header",
          "data-swimlane-header-value-value": c || "",
          // The whole header is the click target — chevron, label, and count.
          // Keyboard parity (Enter / Space) is wired in the controller's
          // keydown handler so the header is a real WAI-ARIA button.
          "data-action": "click->swimlane-header#toggle keydown->swimlane-header#keydown",
          role: "button",
          tabindex: "0",
          "aria-expanded": b ? "false" : "true"
        }, [
          p("span", { class: "sk-swimlane-toggle", "aria-hidden": "true", text: b ? "▶" : "▼" }),
          p("span", { class: "sk-swimlane-label", text: c || "Unassigned" }),
          p("span", { class: "sk-swimlane-count", text: `${h.length}` })
        ]), g = p("div", { class: "sk-swimlane-cols", style: `gap:${this.gapValue}px` });
        for (const A of a) {
          const w = B(h, A.id, this._modelOpts());
          g.appendChild(this._renderColumn(A, w, s));
        }
        m.append(y, g), this.state.collapsedSwimlanes.has(c) && m.classList.add("sk-swimlane-collapsed"), i.appendChild(m);
      }
    else
      for (const c of a) {
        const h = B(n, c.id, this._modelOpts());
        i.appendChild(this._renderColumn(c, h, s));
      }
    this._refreshSelectionDecorations(), this._decorateStuckCards(), t && this._schedulePersist();
  }
  _renderColumn(t, e, n) {
    const s = K(e, t.sort, this.orderFieldValue), i = s.length, a = this.serverSideValue ? this.state.columnCounts.get(String(t.id)) ?? i : i, d = t.wip != null && i > t.wip, c = p("li", {
      class: "sk-column" + (t.collapsed ? " sk-column-collapsed" : ""),
      "data-controller": "board-column",
      "data-board-column-id-value": t.id,
      "data-board-column-title-value": t.title,
      "data-board-column-wip-value": t.wip ?? "",
      "data-board-column-sort-value": t.sort || "manual",
      "data-over-wip": d ? "true" : null,
      style: {
        width: `${t.width || this.columnWidthValue}px`,
        ...t.color ? { "--sk-column-accent": t.color } : {}
      }
    }), h = p("header", { class: "sk-column-header" }, [
      t.icon ? p("span", { class: "sk-column-icon", text: t.icon }) : null,
      p("span", { class: "sk-column-title", text: t.title }),
      p("span", {
        class: "sk-column-count" + (d ? " sk-column-count-over-wip" : ""),
        text: t.wip != null ? `${i} / ${t.wip}` : String(a)
      })
    ].filter(Boolean)), m = p("ol", { class: "sk-cards", style: `gap:${this.gapValue}px` });
    if (t.collapsed)
      return c.appendChild(h), c;
    for (const y of s) {
      const g = this._renderCard(y, t);
      n === "dim" && this.state.quickFilter && !this._cardMatchesQuick(y) && g.classList.add("sk-card-dimmed"), m.appendChild(g);
    }
    if (this.serverSideValue) {
      const y = this.state.columnCounts.get(String(t.id)) ?? i;
      if (y > i) {
        const g = p("li", { class: "sk-column-more-pill" }, [
          p("button", {
            type: "button",
            class: "sk-button sk-button-ghost",
            onclick: () => C(this.element, "board:columnFetchMore", { columnId: t.id, loadedCount: i, totalCount: y }),
            text: `+${y - i} more…`
          })
        ]);
        m.appendChild(g);
      }
    }
    if (this.addCardValue) {
      const y = t.add_card_label || "+ Add card", g = p("li", { class: "sk-add-card-row" }, [
        p("button", {
          type: "button",
          class: "sk-button sk-button-ghost",
          onclick: () => C(this.element, "board:addCardRequested", { columnId: t.id }),
          text: y
        })
      ]);
      m.appendChild(g);
    }
    c.append(h, m);
    const b = Number(this.cardHeightValue);
    if (Yt({
      cardCount: s.length,
      threshold: this.virtualThresholdValue,
      cardHeight: b,
      virtual: this.virtualValue
    })) {
      this.state.virtualColumns.get(t.id)?.destroy?.(), m.replaceChildren();
      const g = Ht({
        cards: s,
        cardHeight: b,
        gap: this.gapValue,
        scrollEl: m,
        cardsListEl: m,
        renderCard: (A) => this._renderCard(A, t)
      });
      this.state.virtualColumns.set(t.id, g);
    } else
      this.state.virtualColumns.get(t.id)?.destroy?.(), this.state.virtualColumns.delete(t.id);
    return c;
  }
  _renderCard(t, e) {
    const n = String(t[this.getCardIdValue]), s = t.__renderer || e?.card_renderer || this.cardRendererValue;
    let i = null;
    if (s) {
      const d = document.getElementById(s);
      if (d && d.tagName === "TEMPLATE")
        i = Y(s), i && it(i, t);
      else {
        const c = at(s);
        c && (i = c({ card: t, columnId: e?.id, defaultEl: p("article", { class: "sk-card" }) }));
      }
    }
    i || (i = p("article", { class: "sk-card" }, [
      p("div", { class: "sk-card-body", text: t.title ?? n })
    ]));
    const a = p("li", {
      class: "sk-card-wrapper" + (this.state.selection.has(n) ? " sk-card-selected" : ""),
      "data-controller": "card",
      "data-card-id": n,
      "data-column-id": t[this.getColumnIdValue] || "",
      "data-card-order": t[this.orderFieldValue] ?? "",
      "data-card-locked": t.__locked ? "true" : null,
      "data-card-color": t.__color || null,
      draggable: !t.__locked && !this.readOnlyValue ? "true" : "false",
      role: "option",
      tabindex: "-1",
      "aria-selected": this.state.selection.has(n) ? "true" : "false"
    });
    return t.__color && a.style.setProperty("--sk-card-accent", t.__color), a.appendChild(i), a;
  }
  _cardMatchesQuick(t) {
    const e = String(this.state.quickFilter || "").toLowerCase();
    if (!e) return !0;
    for (const n of Object.values(t))
      if (n != null && (typeof n == "string" || typeof n == "number") && String(n).toLowerCase().includes(e))
        return !0;
    return !1;
  }
  /* ---------------- DnD wiring ---------------- */
  _installDnd() {
    this._dnd = jt({
      root: this.element,
      hooks: {
        isColumnDisallowDrag: (t) => !!this._columnById(t)?.disallow_drag,
        canAcceptDrop: (t, e) => {
          if (this.readOnlyValue) return !1;
          const n = this._columnById(e);
          return !(!n || n.accept_from && t && !n.accept_from.includes(String(t)));
        },
        expandSelection: (t, e) => this.state.selection.has(String(t)) ? this.getSelectedCards().filter((n) => String(n[this.getColumnIdValue]) === String(e)).map((n) => String(n[this.getCardIdValue])) : [String(t)],
        onDragStart: ({ ids: t, fromColumnId: e }) => {
          C(this.element, "board:dragStarted", { cardIds: t, fromColumnId: e });
        },
        onDrop: ({ cardIds: t, fromColumnId: e, toColumnId: n, toIndex: s, cancelled: i }) => {
          if (i || n == null) {
            C(this.element, "board:dragEnded", { cardIds: t, fromColumnId: e, cancelled: !0 });
            return;
          }
          t.length === 1 ? this.moveCard(t[0], { toColumnId: n, toIndex: s }) : this.moveCards(t, { toColumnId: n, toIndex: s });
        }
      }
    });
  }
  /* ---------------- Keyboard nav ---------------- */
  _installKeyboard() {
    this.element.addEventListener("keydown", (t) => {
      if (L(t.target, ".sk-card-editor")) return;
      const e = t.key, n = t.metaKey || t.ctrlKey, s = this.state.activeCardId;
      if (!s) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e)) {
          const i = this.element.querySelector("[data-card-id]");
          i && this._setActive(i.getAttribute("data-card-id")), t.preventDefault();
          return;
        }
        return;
      }
      if (n && (e === "ArrowUp" || e === "ArrowDown"))
        return t.preventDefault(), this._moveActiveWithinColumn(e === "ArrowUp" ? -1 : 1);
      if (n && (e === "ArrowLeft" || e === "ArrowRight"))
        return t.preventDefault(), this._moveActiveAcrossColumns(e === "ArrowLeft" ? -1 : 1);
      if (e === "ArrowUp" || e === "ArrowDown")
        return t.preventDefault(), this._navWithinColumn(e === "ArrowUp" ? -1 : 1);
      if (e === "ArrowLeft" || e === "ArrowRight")
        return t.preventDefault(), this._navAcrossColumns(e === "ArrowLeft" ? -1 : 1);
      if (e === "Enter") {
        t.preventDefault(), this.cardDetailTemplateValue ? this.openCardDetail(s) : this.startEditingCard(s);
        return;
      }
      if (e === " ")
        return t.preventDefault(), this.toggleSelection(s);
      if (n && e.toLowerCase() === "a") {
        t.preventDefault(), this.state.activeColumnId && this.selectAllInColumn(this.state.activeColumnId);
        return;
      }
      if (n && e.toLowerCase() === "c") {
        const i = this.getSelectedCards();
        i.length > 0 && (t.preventDefault(), navigator.clipboard?.writeText(JSON.stringify(i, null, 2)).catch(() => {
        }));
        return;
      }
    });
  }
  _setActive(t) {
    this.state.activeCardId = String(t);
    const e = this._snapshotCard(t);
    this.state.activeColumnId = e ? String(e[this.getColumnIdValue]) : null;
    for (const s of this.element.querySelectorAll("[data-card-id]"))
      s.classList.toggle("sk-card-active", s.getAttribute("data-card-id") === String(t));
    this._cardEl(t)?.focus?.();
  }
  _columnVisibleCards(t) {
    const e = B(this.state.cards, t, this._modelOpts());
    return K(e, this._columnById(t)?.sort, this.orderFieldValue);
  }
  _navWithinColumn(t) {
    const e = this._columnVisibleCards(this.state.activeColumnId), n = e.findIndex((i) => String(i[this.getCardIdValue]) === this.state.activeCardId), s = e[Math.max(0, Math.min(e.length - 1, n + t))];
    s && this._setActive(s[this.getCardIdValue]);
  }
  _navAcrossColumns(t) {
    const e = this._orderedColumns().filter((a) => !a.hidden), n = e.findIndex((a) => String(a.id) === this.state.activeColumnId), s = e[Math.max(0, Math.min(e.length - 1, n + t))];
    if (!s) return;
    const i = this._columnVisibleCards(s.id);
    i[0] && this._setActive(i[0][this.getCardIdValue]);
  }
  _moveActiveWithinColumn(t) {
    const e = this._columnVisibleCards(this.state.activeColumnId), n = e.findIndex((i) => String(i[this.getCardIdValue]) === this.state.activeCardId);
    if (n === -1) return;
    const s = Math.max(0, Math.min(e.length - 1, n + t));
    n !== s && this.reorderCardWithinColumn(this.state.activeCardId, s);
  }
  _moveActiveAcrossColumns(t) {
    const e = this._orderedColumns().filter((i) => !i.hidden), n = e.findIndex((i) => String(i.id) === this.state.activeColumnId), s = e[Math.max(0, Math.min(e.length - 1, n + t))];
    !s || String(s.id) === this.state.activeColumnId || (this.moveCard(this.state.activeCardId, { toColumnId: s.id, toIndex: 0 }), this.state.activeColumnId = String(s.id));
  }
  /* ---------------- File drop ---------------- */
  _installFileDrop() {
    this.acceptFilesValue && (this.element.addEventListener("dragover", (t) => {
      if (!t.dataTransfer?.types?.includes("Files")) return;
      L(t.target, "[data-card-id]") && t.preventDefault();
    }), this.element.addEventListener("drop", (t) => {
      if (!t.dataTransfer?.files?.length) return;
      const e = L(t.target, "[data-card-id]");
      if (!e) return;
      t.preventDefault();
      const n = e.getAttribute("data-card-id"), s = this._snapshotCard(n), i = Array.from(t.dataTransfer.files);
      if (C(
        this.element,
        "board:fileAttached",
        { cardId: n, files: i, card: s, dataTransfer: t.dataTransfer },
        { cancellable: !0 }
      ).defaultPrevented) return;
      const d = this.attachmentsFieldValue || "attachments", c = Array.isArray(s?.[d]) ? s[d].slice() : [], h = i.map((m) => ({ name: m.name, size: m.size, type: m.type }));
      this.applyTransaction({ update: [{ [this.getCardIdValue]: n, [d]: c.concat(h) }] });
    }));
  }
  /* ---------------- Misc helpers ---------------- */
  _numOrNull(t) {
    if (t == null || t === "") return null;
    const e = Number(t);
    return Number.isFinite(e) ? e : null;
  }
  _jsonOrNull(t) {
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
}
x(Q, "values", {
  cardData: { type: Array, default: [] },
  cardDataUrl: { type: String, default: "" },
  cardSelection: { type: String, default: "" },
  cardMultiSelectWithClick: { type: Boolean, default: !1 },
  suppressCardClickSelection: { type: Boolean, default: !1 },
  cardHeight: { type: String, default: "auto" },
  columnWidth: { type: Number, default: Jt },
  gap: { type: Number, default: Qt },
  virtual: { type: Boolean, default: !1 },
  virtualThreshold: { type: Number, default: 200 },
  height: { type: String, default: "" },
  getCardId: { type: String, default: R },
  getColumnId: { type: String, default: T },
  orderField: { type: String, default: q },
  domLayout: { type: String, default: "" },
  serverSide: { type: Boolean, default: !1 },
  swimlaneField: { type: String, default: "" },
  swimlaneDisplay: { type: String, default: "row" },
  wipLimits: { type: Object, default: {} },
  quickFilter: { type: String, default: "" },
  filterMode: { type: String, default: "hide" },
  // 'hide' | 'dim'
  cardRenderer: { type: String, default: "" },
  cardEditor: { type: String, default: "" },
  cardDetailTemplate: { type: String, default: "" },
  detailLayout: { type: String, default: "popover" },
  // 'popover' | 'rail'
  detailWidth: { type: Number, default: 360 },
  dragHandleSelector: { type: String, default: "" },
  readOnly: { type: Boolean, default: !1 },
  persistKey: { type: String, default: "" },
  addCard: { type: Boolean, default: !1 },
  addColumn: { type: Boolean, default: !1 },
  acceptFiles: { type: Boolean, default: !1 },
  attachmentsField: { type: String, default: "attachments" }
});
class G extends $ {
  constructor() {
    super(...arguments);
    /* Header double-click toggles collapse — same UX as Trello's column menu
     * shortcut. Single click just emits a discoverable event so host apps can
     * wire a custom column menu. */
    x(this, "_onHeaderClick", (e) => {
      const n = e.target?.closest?.(".sk-column-header");
      if (!(!n || !this.element.contains(n))) {
        if (e.detail === 2) {
          this._board()?.setColumnCollapsed?.(this.idValue, !this.collapsedValue);
          return;
        }
        C(this.element, "board:columnHeaderClicked", { columnId: this.idValue, originalEvent: e });
      }
    });
  }
  connect() {
    this.element.addEventListener("click", this._onHeaderClick);
  }
  disconnect() {
    this.element.removeEventListener("click", this._onHeaderClick);
  }
  toggle() {
    this._board()?.setColumnCollapsed?.(this.idValue, !this.collapsedValue);
  }
  _board() {
    return U(this.element, "board", this.application);
  }
}
x(G, "values", {
  id: { type: String, default: "" },
  title: { type: String, default: "" },
  wip: { type: Number, default: 0 },
  minCount: { type: Number, default: 0 },
  width: { type: Number, default: 0 },
  collapsed: { type: Boolean, default: !1 },
  hidden: { type: Boolean, default: !1 },
  acceptCardsFrom: { type: Array, default: [] },
  disallowDrag: { type: Boolean, default: !1 },
  sort: { type: String, default: "manual" },
  cardRenderer: { type: String, default: "" },
  cardEditor: { type: String, default: "" },
  addCardLabel: { type: String, default: "" },
  color: { type: String, default: "" },
  icon: { type: String, default: "" }
});
class yt extends $ {
  constructor() {
    super(...arguments);
    x(this, "_onClick", (e) => {
      const n = this._board();
      if (!n) return;
      const s = this._cardId(), i = this._card(), a = i?.[n.getColumnIdValue] ?? null;
      if (C(this.element, "board:cardClicked", { cardId: s, card: i, columnId: a, originalEvent: e }), n._setActive?.(s), n.suppressCardClickSelectionValue || n.cardSelectionValue === "") return;
      const d = e.metaKey || e.ctrlKey, c = e.shiftKey;
      n.cardSelectionValue === "multiple" && (d || c || n.cardMultiSelectWithClickValue) ? n.toggleSelection(s) : (n.clearSelection?.(), n.selectCard(s));
    });
    x(this, "_onDblClick", (e) => {
      const n = this._board();
      if (!n) return;
      const s = this._cardId(), i = this._card(), a = i?.[n.getColumnIdValue] ?? null;
      C(this.element, "board:cardDblClicked", { cardId: s, card: i, columnId: a }), n.cardDetailTemplateValue ? n.openCardDetail?.(s) : n.startEditingCard?.(s);
    });
  }
  connect() {
    this.element.addEventListener("click", this._onClick), this.element.addEventListener("dblclick", this._onDblClick);
  }
  disconnect() {
    this.element.removeEventListener("click", this._onClick), this.element.removeEventListener("dblclick", this._onDblClick);
  }
  _board() {
    return U(this.element, "board", this.application);
  }
  _cardId() {
    return this.element.getAttribute("data-card-id");
  }
  _card() {
    const e = this._board();
    if (!e) return null;
    const n = this._cardId();
    return e.state.cards.find((s) => String(s[e.getCardIdValue]) === String(n)) || null;
  }
  /* Imperative helpers — exposed for host glue */
  select() {
    this._board()?.selectCard?.(this._cardId());
  }
  deselect() {
    this._board()?.deselectCard?.(this._cardId());
  }
  edit() {
    this._board()?.startEditingCard?.(this._cardId());
  }
  openDetail() {
    this._board()?.openCardDetail?.(this._cardId());
  }
}
class Z extends $ {
  constructor() {
    super(...arguments);
    x(this, "_onKeyDown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault(), this._board()?.cancelEditing();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !this._isMultiline(e.target)) {
        e.preventDefault(), this._board()?.commitEditing();
        return;
      }
      if (e.key === "Tab") {
        const n = Array.from(this.element.querySelectorAll("[data-editor-field]"));
        n.length && e.target === n[n.length - 1] && !e.shiftKey && (e.preventDefault(), this._board()?.commitEditing());
      }
    });
    x(this, "_onClick", (e) => {
      const n = e.target;
      if (n?.closest?.("[data-editor-commit]")) {
        e.preventDefault(), this._board()?.commitEditing();
        return;
      }
      n?.closest?.("[data-editor-cancel]") && (e.preventDefault(), this._board()?.cancelEditing());
    });
    x(this, "_onSubmit", (e) => {
      e.preventDefault(), this._board()?.commitEditing();
    });
    x(this, "_onFocusOut", (e) => {
      this.element.hasAttribute("data-editor-no-commit-on-blur") || this.element.contains(e.relatedTarget) || this._board()?.commitEditing();
    });
  }
  connect() {
    this.element.addEventListener("keydown", this._onKeyDown), this.element.addEventListener("click", this._onClick), this.element.addEventListener("focusout", this._onFocusOut), this.element.tagName === "FORM" && this.element.addEventListener("submit", this._onSubmit);
  }
  disconnect() {
    this.element.removeEventListener("keydown", this._onKeyDown), this.element.removeEventListener("click", this._onClick), this.element.removeEventListener("focusout", this._onFocusOut), this.element.tagName === "FORM" && this.element.removeEventListener("submit", this._onSubmit);
  }
  _isMultiline(e) {
    return e ? e.tagName === "TEXTAREA" ? !0 : e.hasAttribute?.("data-editor-multiline") : !1;
  }
  _board() {
    return U(this.element, "board", this.application);
  }
}
x(Z, "values", {
  cardId: { type: String, default: "" }
});
class tt extends $ {
  toggle(t) {
    const e = U(this.element, "board", this.application);
    if (!e) return;
    const n = this.valueValue || "", s = e.state.collapsedSwimlanes;
    s.has(n) ? s.delete(n) : s.add(n), e._scheduleRender?.();
  }
  keydown(t) {
    (t.key === "Enter" || t.key === " " || t.key === "Spacebar") && (t.preventDefault(), this.toggle(t));
  }
}
x(tt, "values", {
  value: { type: String, default: "" }
});
class et extends $ {
  constructor() {
    super(...arguments);
    x(this, "_open", (e) => {
      e.preventDefault(), this._dismiss();
      const n = U(this.element, "board", this.application);
      if (!n) return;
      const s = this.columnIdValue || this.element.getAttribute("data-board-column-id-value") || "";
      if (!s) return;
      const i = n._columnById?.(s);
      if (!i) return;
      const a = p("div", {
        class: "sk-column-menu",
        style: `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:9999;`
      }, [
        p("button", {
          type: "button",
          class: "sk-menu-item",
          text: i.collapsed ? "Expand column" : "Collapse column",
          onclick: () => {
            n.setColumnCollapsed(s, !i.collapsed), this._dismiss();
          }
        }),
        p("button", {
          type: "button",
          class: "sk-menu-item",
          text: "Hide column",
          onclick: () => {
            n.setColumnVisible(s, !1), this._dismiss();
          }
        }),
        i.wip != null ? p("button", {
          type: "button",
          class: "sk-menu-item",
          text: "Clear WIP limit",
          onclick: () => {
            n.setColumnWip(s, null), this._dismiss();
          }
        }) : null,
        p("hr", { class: "sk-menu-sep" }),
        p("button", {
          type: "button",
          class: "sk-menu-item",
          text: "Sort: Manual",
          onclick: () => {
            n.setColumnSort(s, "manual"), this._dismiss();
          }
        }),
        p("button", {
          type: "button",
          class: "sk-menu-item",
          text: "Sort: Title ↑",
          onclick: () => {
            n.setColumnSort(s, "asc:title"), this._dismiss();
          }
        }),
        p("button", {
          type: "button",
          class: "sk-menu-item",
          text: "Sort: Title ↓",
          onclick: () => {
            n.setColumnSort(s, "desc:title"), this._dismiss();
          }
        })
      ].filter(Boolean));
      document.body.appendChild(a), this._menu = a, setTimeout(() => document.addEventListener("click", this._dismiss, { once: !0 }), 0);
    });
    x(this, "_dismiss", () => {
      this._menu?.remove(), this._menu = null;
    });
  }
  connect() {
    this.element.addEventListener("contextmenu", this._open);
  }
  disconnect() {
    this.element.removeEventListener("contextmenu", this._open), this._dismiss();
  }
}
x(et, "values", {
  columnId: { type: String, default: "" }
});
const Gt = { minSelection: 1, position: "bottom" };
function Zt(r, t = {}) {
  if (!r) throw new Error("attachBulkActionToolbar: boardEl is required");
  const e = { ...Gt, ...t }, n = Array.isArray(e.actions) ? e.actions.slice() : [], s = p("div", { class: "sk-bulk-toolbar", role: "toolbar", "aria-label": "Bulk actions" });
  s.style.display = "none";
  const i = p("span", { class: "sk-bulk-label" });
  s.appendChild(i);
  function a(c) {
    [...s.querySelectorAll("button.sk-bulk-btn,button.sk-bulk-clear")].forEach((m) => m.remove());
    for (const m of n) {
      const b = p("button", {
        class: `sk-bulk-btn${m.danger ? " sk-bulk-btn-danger" : ""}${m.primary ? " sk-bulk-btn-primary" : ""}`,
        type: "button",
        "data-bulk-action": m.id || m.label,
        text: m.label || m.id || ""
      });
      (typeof m.disabled == "function" ? m.disabled(c, r.boardApi) : !1) && b.setAttribute("disabled", ""), b.addEventListener("click", () => {
        try {
          m.onClick?.(r.boardApi.getSelectedCardIds(), r.boardApi, r);
        } catch (g) {
          console.error("[bulk-toolbar] action failed", g);
        }
      }), s.appendChild(b);
    }
    const h = p("button", {
      class: "sk-bulk-clear",
      type: "button",
      "aria-label": "Clear selection",
      text: "×"
    });
    h.addEventListener("click", () => r.boardApi?.clearSelection?.()), s.appendChild(h);
  }
  function d() {
    const c = r.boardApi?.getSelectedCardIds?.() || [];
    if (c.length < e.minSelection) {
      s.style.display = "none";
      return;
    }
    i.textContent = `${c.length} selected`, a(c), s.style.display = "";
  }
  return r.addEventListener("board:cardSelectionChanged", d), document.body.appendChild(s), s.classList.add(`sk-bulk-toolbar-${e.position}`), setTimeout(d, 0), {
    destroy() {
      r.removeEventListener("board:cardSelectionChanged", d), s.remove();
    },
    el: s,
    update: d
  };
}
function te(r) {
  const t = r ?? Dt.start();
  return t.register("board", Q), t.register("board-column", G), t.register("card", yt), t.register("card-editor", Z), t.register("swimlane-header", tt), t.register("column-menu", et), t;
}
const ee = {
  start: te,
  BoardController: Q,
  BoardColumnController: G,
  CardController: yt,
  CardEditorController: Z,
  SwimlaneHeaderController: tt,
  ColumnMenuController: et,
  registerRenderer: F,
  getRenderer: at,
  listRenderers: zt,
  renderers: Xt,
  subRenderers: D,
  attachBulkActionToolbar: Zt
};
typeof window < "u" && !window.__stimulusKanbanStarted && (window.__stimulusKanbanStarted = !0, window.StimulusKanban = ee);
export {
  G as BoardColumnController,
  Q as BoardController,
  yt as CardController,
  Z as CardEditorController,
  et as ColumnMenuController,
  tt as SwimlaneHeaderController,
  Zt as attachBulkActionToolbar,
  ee as default,
  at as getRenderer,
  zt as listRenderers,
  F as registerRenderer,
  Xt as renderers,
  te as start,
  D as subRenderers
};
//# sourceMappingURL=stimulus_kanban.esm.js.map
