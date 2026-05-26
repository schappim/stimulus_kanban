var It = Object.defineProperty;
var Et = (r, t, e) => t in r ? It(r, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : r[t] = e;
var D = (r, t, e) => Et(r, typeof t != "symbol" ? t + "" : t, e);
import { Controller as $, Application as xt } from "@hotwired/stimulus";
const B = "id", T = "column_id", q = "order";
function H(r, t = {}) {
  const e = t.getCardId || B, n = t.getColumnId || T, s = t.orderField || q, i = Array.isArray(r) ? r.filter((d) => d != null) : [], l = /* @__PURE__ */ new Map();
  for (const d of i) {
    const h = String(d[n] ?? "");
    l.has(h) || l.set(h, []), l.get(h).push(d);
  }
  const c = [];
  for (const [d, h] of l)
    h.slice().sort((k, b) => {
      const g = k[s], A = b[s];
      return g == null && A == null ? 0 : g == null ? 1 : A == null ? -1 : Number(g) - Number(A);
    }).forEach((k, b) => {
      const g = { ...k };
      g[e] = String(k[e] ?? ""), g[n] = d, g[s] = k[s] == null ? b : Number(k[s]), c.push(g);
    });
  return c;
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
function R(r, t, e = {}) {
  const n = e.getColumnId || T;
  return r.filter((s) => String(s[n]) === String(t));
}
const Dt = (r, t) => String(r ?? "").localeCompare(String(t ?? ""), void 0, { numeric: !0, sensitivity: "base" });
function Ft(r, t, e) {
  const n = r?.[e], s = t?.[e];
  return n == null && s == null ? 0 : n == null ? -1 : s == null ? 1 : typeof n == "number" && typeof s == "number" ? n - s : Dt(n, s);
}
function K(r, t, e = q) {
  if (!t || t === "manual")
    return r.slice().sort((l, c) => {
      const d = l[e], h = c[e];
      return d == null && h == null ? 0 : d == null ? 1 : h == null ? -1 : Number(d) - Number(h);
    });
  const [n, s] = String(t).split(":");
  if (!s) return r.slice();
  const i = n === "desc" ? -1 : 1;
  return r.slice().sort((l, c) => i * Ft(l, c, s));
}
function Lt(r, t) {
  return t ? r.filter((e) => Tt(e, t)) : r;
}
const Vt = /* @__PURE__ */ new Set([
  B,
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
    if (s != null && !n.startsWith("__") && !Vt.has(n) && (typeof s == "string" || typeof s == "number") && String(s).toLowerCase().includes(e))
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
function Ot(r, t) {
  const e = /* @__PURE__ */ new Map();
  if (!t)
    return e.set("", r.slice()), e;
  for (const n of r) {
    const s = n[t], i = s == null || s === "" ? "" : String(s);
    e.has(i) || e.set(i, []), e.get(i).push(n);
  }
  return e;
}
function Mt(r, t, e = {}) {
  const n = e.getColumnId || T, s = /* @__PURE__ */ new Map();
  for (const i of t) {
    const l = String(i[n] ?? "");
    s.set(l, (s.get(l) || 0) + 1);
  }
  return r.filter((i) => !i.__synthetic).map((i) => {
    const l = s.get(String(i.id)) || 0, c = i.wip == null ? null : Number(i.wip);
    return {
      colId: i.id,
      count: l,
      limit: c,
      over: c != null && l > c
    };
  });
}
function z(r, t, e, n = {}) {
  const s = n.getCardId || B, i = n.getColumnId || T, l = n.orderField || q, c = String(t), d = r.map((C) => ({ ...C })), h = d.find((C) => String(C[s]) === c);
  if (!h) return r;
  const m = String(h[i]), k = String(e.toColumnId ?? m), b = e.toIndex == null ? Number.POSITIVE_INFINITY : Number(e.toIndex);
  h[i] = k;
  const g = d.filter((C) => String(C[i]) === m && String(C[s]) !== c).sort((C, I) => Number(C[l] ?? 0) - Number(I[l] ?? 0)), A = d.filter((C) => String(C[i]) === k && String(C[s]) !== c).sort((C, I) => Number(C[l] ?? 0) - Number(I[l] ?? 0)), w = Math.max(0, Math.min(b, A.length));
  return A.splice(w, 0, h), g.forEach((C, I) => {
    C[l] = I;
  }), A.forEach((C, I) => {
    C[l] = I;
  }), d;
}
function Bt(r, t, e, n = {}) {
  const s = n.getCardId || B, i = n.getColumnId || T, l = n.orderField || q;
  if (!Array.isArray(t) || t.length === 0) return r;
  const c = new Set(t.map(String)), d = String(e.toColumnId), h = e.toIndex == null ? Number.POSITIVE_INFINITY : Number(e.toIndex), m = r.map((w) => ({ ...w })), k = m.filter((w) => c.has(String(w[s]))).sort((w, C) => {
    const I = m.indexOf(w), O = m.indexOf(C);
    return I - O;
  });
  if (k.length === 0) return r;
  const b = /* @__PURE__ */ new Map();
  for (const w of m) {
    if (c.has(String(w[s]))) continue;
    const C = String(w[i]);
    b.has(C) || b.set(C, []), b.get(C).push(w);
  }
  for (const w of b.values())
    w.sort((C, I) => Number(C[l] ?? 0) - Number(I[l] ?? 0));
  for (const w of k) w[i] = d;
  const g = b.get(d) || [], A = Math.max(0, Math.min(h, g.length));
  g.splice(A, 0, ...k), b.set(d, g);
  for (const w of b.values())
    w.forEach((C, I) => {
      C[l] = I;
    });
  return m;
}
function Rt(r, t, e, n = {}) {
  const s = n.getCardId || B, i = n.getColumnId || T, l = String(t), c = r.find((d) => String(d[s]) === l);
  return c ? z(r, l, { toColumnId: c[i], toIndex: e }, n) : r;
}
function $t(r, t, e = {}) {
  const n = e.getCardId || B, s = e.getColumnId || T;
  let i = r.slice();
  const l = t || {};
  if (Array.isArray(l.remove)) {
    const c = new Set(l.remove.map((d) => String(typeof d == "object" ? d[n] : d)));
    i = i.filter((d) => !c.has(String(d[n])));
  }
  if (Array.isArray(l.update)) {
    const c = /* @__PURE__ */ new Map();
    for (const d of l.update) c.set(String(d[n]), d);
    i = i.map((d) => {
      const h = String(d[n]);
      if (!c.has(h)) return d;
      const m = { ...d, ...c.get(h) };
      return m[n] = h, m;
    });
  }
  if (Array.isArray(l.add)) {
    const c = new Set(i.map((d) => String(d[n])));
    for (const d of l.add) {
      const h = String(d[n] ?? "");
      h && !c.has(h) && (i.push({ ...d, [n]: h, [s]: String(d[s] ?? "") }), c.add(h));
    }
  }
  if (Array.isArray(l.move))
    for (const c of l.move)
      i = z(i, c[n] ?? c.id, { toColumnId: c.toColumnId, toIndex: c.toIndex }, e);
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
function y(r, t, e = {}, { cancellable: n = !1 } = {}) {
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
    for (const [i, l] of s) {
      const c = t[l];
      c == null || c === !1 ? n.removeAttribute(i) : n.setAttribute(i, String(c));
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
function V(r, t) {
  return r ? r.matches?.(t) ? r : r.closest?.(t) || null : null;
}
function Wt(r) {
  let t = !1, e = null;
  const n = (...s) => {
    if (e = s, t) return;
    t = !0, (typeof requestAnimationFrame == "function" ? requestAnimationFrame : (l) => setTimeout(l, 16))(() => {
      t = !1;
      const l = e;
      e = null, r(...l);
    });
  };
  return n.cancel = () => {
    t = !1, e = null;
  }, n;
}
const L = 48, Ut = 24;
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
    const u = V(o.target, "[data-card-id]");
    if (!u) return;
    const f = V(u, "[data-board-column-id-value]");
    if (!f) return;
    if (u.getAttribute("data-card-locked") === "true") {
      o.preventDefault();
      return;
    }
    const _ = f.getAttribute("data-board-column-id-value");
    if (t.isColumnDisallowDrag?.(_)) {
      o.preventDefault();
      return;
    }
    const S = u.getAttribute("data-card-id"), E = t.expandSelection?.(S, _) ?? [S];
    e.dragging = !0, e.cardIds = E, e.fromColumnId = _, o.dataTransfer.effectAllowed = "move";
    try {
      o.dataTransfer.setData("text/plain", JSON.stringify({ ids: E }));
    } catch {
    }
    E.length > 1 && At(o, E.length), t.onDragStart?.({ ids: E, fromColumnId: _ }), u.classList.add("sk-card-dragging");
  }
  function s(o) {
    if (!e.dragging) return;
    const u = V(o.target, "[data-board-column-id-value]");
    if (!u) return;
    const f = u.getAttribute("data-board-column-id-value");
    if (!t.canAcceptDrop?.(e.fromColumnId, f)) return;
    o.preventDefault(), o.dataTransfer.dropEffect = "move", e.pointer.x = o.clientX, e.pointer.y = o.clientY;
    const _ = P(u, o.clientY);
    O(u, f, _), M();
  }
  function i(o) {
    e.dragging && (o.preventDefault(), C({ cancelled: !1 }));
  }
  function l(o) {
    e.dragging && e.targetColumnId == null && C({ cancelled: !0 }), I();
  }
  let c = null;
  function d(o) {
    if (o.pointerType !== "touch" && o.pointerType !== "pen") return;
    const u = V(o.target, "[data-card-id]");
    u && u.getAttribute("data-card-locked") !== "true" && (c = {
      cardEl: u,
      id: u.getAttribute("data-card-id"),
      x: o.clientX,
      y: o.clientY,
      pointerId: o.pointerId
    });
  }
  function h(o) {
    if (c && !e.pointerActive) {
      const S = o.clientX - c.x, E = o.clientY - c.y;
      if (Math.hypot(S, E) < 6) return;
      b(c, o);
    }
    if (!e.pointerActive) return;
    e.pointer.x = o.clientX, e.pointer.y = o.clientY;
    const u = nt(o.clientX, o.clientY);
    if (!u) return;
    const f = u.getAttribute("data-board-column-id-value");
    if (!t.canAcceptDrop?.(e.fromColumnId, f)) return;
    const _ = P(u, o.clientY);
    O(u, f, _), rt(o.clientX, o.clientY), M();
  }
  function m(o) {
    if (!e.pointerActive) {
      c = null;
      return;
    }
    c = null, C({ cancelled: e.targetColumnId == null }), I();
  }
  function k(o) {
    c = null, e.pointerActive && (C({ cancelled: !0 }), I());
  }
  function b(o, u) {
    const f = V(o.cardEl, "[data-board-column-id-value]");
    if (!f) return;
    const _ = f.getAttribute("data-board-column-id-value");
    if (t.isColumnDisallowDrag?.(_)) return;
    const S = t.expandSelection?.(o.id, _) ?? [o.id];
    e.dragging = !0, e.pointerActive = !0, e.cardIds = S, e.fromColumnId = _, o.cardEl.classList.add("sk-card-dragging"), e.ghostEl = wt(o.cardEl, S.length), rt(u.clientX, u.clientY);
    try {
      o.cardEl.setPointerCapture?.(o.pointerId);
    } catch {
    }
    t.onDragStart?.({ ids: S, fromColumnId: _ });
  }
  function g(o) {
    e.dragging && o.key === "Escape" && (e.targetColumnId = null, e.targetIndex = null, W());
  }
  function A(o, u) {
    e.dragging = !0, e.cardIds = Array.isArray(o) ? o.slice() : [o], e.fromColumnId = u, t.onDragStart?.({ ids: e.cardIds, fromColumnId: u });
  }
  function w(o = {}) {
    const u = !!o.cancelled;
    u || (e.targetColumnId = o.toColumnId ?? null, e.targetIndex = o.toIndex == null ? null : Number(o.toIndex)), C({ cancelled: u }), I();
  }
  function C({ cancelled: o }) {
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
    e.dragging = !1, e.pointerActive = !1, e.cardIds = [], e.fromColumnId = null, e.targetColumnId = null, e.targetIndex = null, e.ghostEl && (e.ghostEl.remove(), e.ghostEl = null), W(), kt();
    for (const o of r.querySelectorAll(".sk-card-dragging"))
      o.classList.remove("sk-card-dragging");
  }
  function O(o, u, f) {
    e.targetColumnId = u, e.targetIndex = f, N(o, f);
  }
  function P(o, u) {
    const f = o.querySelector(".sk-cards");
    if (!f) return 0;
    const _ = Array.from(f.querySelectorAll(":scope > [data-card-id]")).filter((S) => !S.classList.contains("sk-card-dragging"));
    if (_.length === 0) return 0;
    for (let S = 0; S < _.length; S++) {
      const E = _[S].getBoundingClientRect();
      if (u < E.top + E.height / 2) return S;
    }
    return _.length;
  }
  function N(o, u) {
    const f = o.querySelector(".sk-cards");
    if (!f) return;
    e.indicatorEl || (e.indicatorEl = document.createElement("li"), e.indicatorEl.className = "sk-drop-indicator", e.indicatorEl.setAttribute("aria-hidden", "true"));
    const _ = e.indicatorEl, S = Array.from(f.querySelectorAll(":scope > [data-card-id]")).filter((E) => !E.classList.contains("sk-card-dragging"));
    u >= S.length ? f.appendChild(_) : f.insertBefore(_, S[u]);
  }
  function W() {
    e.indicatorEl?.parentNode && e.indicatorEl.parentNode.removeChild(e.indicatorEl);
  }
  function M() {
    if (e.rafToken != null) return;
    const o = () => {
      if (e.rafToken = null, !e.dragging) return;
      const { x: u, y: f } = e.pointer;
      St(u), vt(u, f), e.rafToken = requestAnimationFrame(o);
    };
    e.rafToken = requestAnimationFrame(o);
  }
  function kt() {
    e.rafToken != null && (cancelAnimationFrame(e.rafToken), e.rafToken = null);
  }
  function St(o) {
    const u = r.querySelector(".sk-columns");
    if (!u) return;
    const f = u.getBoundingClientRect();
    if (o < f.left + L) {
      const _ = j(f.left + L - o);
      u.scrollLeft -= _;
    } else if (o > f.right - L) {
      const _ = j(o - (f.right - L));
      u.scrollLeft += _;
    }
  }
  function vt(o, u) {
    const f = nt(o, u);
    if (!f) return;
    const _ = f.querySelector(".sk-cards");
    if (!_) return;
    const S = _.getBoundingClientRect();
    if (u < S.top + L) {
      const E = j(S.top + L - u);
      _.scrollTop -= E;
    } else if (u > S.bottom - L) {
      const E = j(u - (S.bottom - L));
      _.scrollTop += E;
    }
  }
  function j(o) {
    const u = Math.max(0, Math.min(1, o / L));
    return Math.ceil(u * Ut);
  }
  function nt(o, u) {
    const f = r.querySelectorAll("[data-board-column-id-value]");
    for (const _ of f) {
      const S = _.getBoundingClientRect();
      if (o >= S.left && o <= S.right && u >= S.top && u <= S.bottom) return _;
    }
    return null;
  }
  function wt(o, u) {
    const f = o.cloneNode(!0);
    if (f.classList.add("sk-card-ghost"), f.style.position = "fixed", f.style.pointerEvents = "none", f.style.opacity = "0.85", f.style.zIndex = "99999", f.style.left = "0px", f.style.top = "0px", u > 1) {
      const _ = document.createElement("span");
      _.className = "sk-card-stack-badge", _.textContent = String(u), f.appendChild(_);
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
  return r.addEventListener("dragstart", n), r.addEventListener("dragover", s), r.addEventListener("drop", i), r.addEventListener("dragend", l), r.addEventListener("pointerdown", d), window.addEventListener("pointermove", h), window.addEventListener("pointerup", m), window.addEventListener("pointercancel", k), document.addEventListener("keydown", g), {
    beginDrag: A,
    endDrag: w,
    destroy() {
      r.removeEventListener("dragstart", n), r.removeEventListener("dragover", s), r.removeEventListener("drop", i), r.removeEventListener("dragend", l), r.removeEventListener("pointerdown", d), window.removeEventListener("pointermove", h), window.removeEventListener("pointerup", m), window.removeEventListener("pointercancel", k), document.removeEventListener("keydown", g), I();
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
  cardsListEl: l
}) {
  const c = t + e, d = document.createElement("li"), h = document.createElement("li");
  d.className = "sk-virtual-spacer", h.className = "sk-virtual-spacer", d.setAttribute("aria-hidden", "true"), h.setAttribute("aria-hidden", "true");
  let m = /* @__PURE__ */ new Map();
  function k() {
    const g = r.length, A = s.clientHeight, w = s.scrollTop, C = Math.max(0, Math.floor(w / c) - n), I = Math.ceil(A / c) + n * 2, O = Math.min(g - 1, C + I);
    l.replaceChildren(), d.style.height = `${C * c}px`, h.style.height = `${Math.max(0, (g - O - 1) * c)}px`, l.appendChild(d);
    const P = /* @__PURE__ */ new Map();
    for (let N = C; N <= O; N++) {
      const W = r[N];
      if (!W) continue;
      let M = m.get(N);
      M || (M = i(W, N)), l.appendChild(M), P.set(N, M);
    }
    m = P, l.appendChild(h);
  }
  function b() {
    k();
  }
  return s.addEventListener("scroll", b, { passive: !0 }), k(), {
    render: k,
    update(g) {
      r = g, m.clear(), k();
    },
    destroy() {
      s.removeEventListener("scroll", b), m.clear(), l.replaceChildren();
    },
    /* Translate a logical card index (in `cards`) to a y-position relative
     * to the scroll container — used by the DnD module so a drop into the
     * logical N-th slot of a virtualised column resolves correctly even
     * when N isn't currently rendered. */
    indexToY(g) {
      return g * c;
    },
    yToIndex(g) {
      return Math.max(0, Math.floor(g / c));
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
function a(r, t = {}, e = null) {
  const n = document.createElement(r);
  for (const [s, i] of Object.entries(t))
    i == null || i === !1 || (s === "class" ? n.className = i : s === "text" ? n.textContent = String(i) : n.setAttribute(s, i === !0 ? "" : String(i)));
  if (e == null) return n;
  for (const s of [].concat(e))
    s == null || s === !1 || n.appendChild(typeof s == "string" ? document.createTextNode(s) : s);
  return n;
}
const v = (r) => r == null || r === "", x = {
  statusPill(r, { colorMap: t = {}, iconMap: e = {} } = {}) {
    const n = r == null ? "" : String(r), s = t[n] || "#9ca3af", i = e[n];
    return a(
      "span",
      { class: "sk-pill", style: `--sk-pill-color:${s}`, "data-status": n },
      i ? [a("span", { class: "sk-pill-icon", text: i }), document.createTextNode(n || "—")] : [document.createTextNode(n || "—")]
    );
  },
  avatar(r, { url: t, size: e = 24, title: n } = {}) {
    if (t)
      return a("img", {
        class: "sk-avatar",
        src: t,
        alt: r || "",
        width: e,
        height: e,
        title: n || r || ""
      });
    const s = String(r || "?").split(/\s+/).map((i) => i[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
    return a("span", { class: "sk-avatar sk-avatar-fallback", title: n || r || "" }, [s]);
  },
  tags(r, { max: t = 4 } = {}) {
    const e = Array.isArray(r) ? r : String(r || "").split(",").map((s) => s.trim()).filter(Boolean), n = a("span", { class: "sk-tags" });
    return e.slice(0, t).forEach((s) => n.appendChild(a("span", { class: "sk-tag", text: s }))), e.length > t && n.appendChild(a("span", { class: "sk-tag sk-tag-more", text: `+${e.length - t}` })), n;
  },
  currency(r, { currency: t = "AUD", locale: e = "en-AU" } = {}) {
    if (v(r)) return a("span", {}, "");
    const n = Number(r);
    if (!Number.isFinite(n)) return a("span", { text: String(r) });
    try {
      const s = new Intl.NumberFormat(e, { style: "currency", currency: t, maximumFractionDigits: 0 }).format(n);
      return a("span", { class: "sk-currency", text: s });
    } catch {
      return a("span", { class: "sk-currency", text: `${n.toFixed(0)}` });
    }
  },
  percent(r) {
    if (v(r)) return a("span", {});
    const t = Number(r);
    return Number.isFinite(t) ? a("span", { class: "sk-percent", text: `${Math.round(t * 100)}%` }) : a("span", { text: String(r) });
  },
  progressBar(r) {
    const t = Math.max(0, Math.min(1, Number(r) || 0));
    return a("div", { class: "sk-progress" }, [
      a("div", { class: "sk-progress-bar", style: `width:${Math.round(t * 100)}%` })
    ]);
  },
  relativeTime(r) {
    if (v(r)) return a("span", {});
    const t = r instanceof Date ? r : new Date(r);
    if (Number.isNaN(t.valueOf())) return a("span", { text: String(r) });
    const e = Date.now() - t.valueOf(), n = Math.abs(e), s = n < 6e4 ? "just now" : n < 36e5 ? `${Math.round(n / 6e4)}m` : n < 864e5 ? `${Math.round(n / 36e5)}h` : n < 7 * 864e5 ? `${Math.round(n / 864e5)}d` : t.toLocaleDateString();
    return a("time", { class: "sk-rel-time", datetime: t.toISOString(), title: t.toLocaleString(), text: s });
  },
  dueDate(r) {
    if (v(r)) return a("span", {});
    const t = r instanceof Date ? r : new Date(r);
    if (Number.isNaN(t.valueOf())) return a("span", { text: String(r) });
    const e = /* @__PURE__ */ new Date();
    e.setHours(0, 0, 0, 0);
    const n = new Date(t);
    n.setHours(0, 0, 0, 0);
    const s = Math.round((n - e) / 864e5), i = s < 0 ? "sk-due sk-due-overdue" : s <= 1 ? "sk-due sk-due-soon" : "sk-due", l = s === 0 ? "Due today" : s === 1 ? "Due tomorrow" : s === -1 ? "1 day overdue" : s < 0 ? `${-s} days overdue` : `Due ${t.toLocaleDateString()}`;
    return a("span", { class: i, title: t.toLocaleString(), text: l });
  },
  countryFlag(r) {
    if (v(r)) return a("span", {});
    const t = String(r).toUpperCase().slice(0, 2);
    if (t.length !== 2) return a("span", { text: String(r) });
    const e = String.fromCodePoint(...t.split("").map((n) => 127397 + n.charCodeAt(0)));
    return a("span", { class: "sk-flag", title: t, text: e });
  },
  attachments(r) {
    const t = Array.isArray(r) ? r : [];
    return t.length === 0 ? a("span", {}) : a(
      "span",
      { class: "sk-attachments", title: `${t.length} attachment(s)` },
      `📎 ${t.length}`
    );
  },
  mask(r, { type: t = "card" } = {}) {
    const e = String(r || "").replace(/\D/g, "");
    if (!e) return a("span", {});
    if (t === "card") {
      const n = e.slice(-4);
      return a("span", { class: "sk-mask", text: `•••• ${n}` });
    }
    return a("span", { class: "sk-mask", text: e.replace(/.(?=.{4})/g, "•") });
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
  const t = a("article", { class: "sk-card sk-card-story" }), e = a("header", { class: "sk-card-header" }, [
    a("span", { class: "sk-card-key", text: r.key || "" }),
    x.statusPill(r.status, { colorMap: J })
  ]), n = a("h4", { class: "sk-card-title", text: r.title || "" }), s = a("footer", { class: "sk-card-footer" }, [
    v(r.points) ? null : a("span", { class: "sk-card-points", text: `${r.points} pts` }),
    v(r.assignee_name) ? null : x.avatar(r.assignee_name, { url: r.assignee_avatar })
  ].filter(Boolean));
  return t.append(e, n, s), t;
}
function ot({ card: r }) {
  const t = a("article", { class: "sk-card sk-card-task" }), e = a("div", { class: "sk-card-task-row" }, [
    a("input", {
      type: "checkbox",
      class: "sk-card-check",
      ...r.done ? { checked: !0 } : {},
      "data-sk-task-check": ""
    }),
    a("span", { class: r.done ? "sk-card-title sk-card-title-done" : "sk-card-title", text: r.title || "" })
  ]);
  return t.appendChild(e), v(r.due_at) || t.appendChild(x.dueDate(r.due_at)), t;
}
function dt({ card: r }) {
  const t = String(r.severity || "minor").toLowerCase(), e = { critical: "#dc2626", major: "#f97316", minor: "#facc15", cosmetic: "#94a3b8" }, n = a("article", { class: "sk-card sk-card-bug", "data-severity": t });
  return n.append(
    a("header", { class: "sk-card-header" }, [
      a("span", { class: "sk-card-key", text: r.key || "" }),
      a("span", { class: "sk-pill", style: `--sk-pill-color:${e[t] || "#94a3b8"}`, text: t })
    ]),
    a("h4", { class: "sk-card-title", text: r.title || "" }),
    r.reporter_name ? a("footer", { class: "sk-card-footer" }, [
      x.avatar(r.reporter_name, { url: r.reporter_avatar, title: `Reported by ${r.reporter_name}` })
    ]) : null
  ), n;
}
function ct({ card: r }) {
  const t = String(r.priority || "p4").toLowerCase(), e = { p1: "#dc2626", p2: "#f97316", p3: "#facc15", p4: "#94a3b8", p5: "#94a3b8" }, n = a("article", { class: "sk-card sk-card-incident", "data-priority": t });
  return n.append(
    a("header", { class: "sk-card-header" }, [
      a("span", { class: "sk-pill sk-pill-priority", style: `--sk-pill-color:${e[t] || "#94a3b8"}`, text: t.toUpperCase() }),
      v(r.pages) ? null : a("span", { class: "sk-card-meta", text: `📟 ${r.pages}` })
    ].filter(Boolean)),
    a("h4", { class: "sk-card-title", text: r.title || "" }),
    a("footer", { class: "sk-card-footer" }, [
      v(r.opened_at) ? null : x.relativeTime(r.opened_at)
    ].filter(Boolean))
  ), n;
}
function ut({ card: r }) {
  const t = a("article", { class: "sk-card sk-card-note" });
  return t.append(
    a("div", { class: "sk-card-body", text: r.body || r.title || "" }),
    a("footer", { class: "sk-card-footer" }, [
      v(r.author) ? null : a("span", { class: "sk-card-meta", text: r.author }),
      v(r.updated_at) ? null : x.relativeTime(r.updated_at)
    ].filter(Boolean))
  ), t;
}
function ht({ card: r }) {
  const t = String(r.ci || "").toLowerCase(), e = t === "pass" ? "sk-ci sk-ci-pass" : t === "fail" ? "sk-ci sk-ci-fail" : t === "pending" ? "sk-ci sk-ci-pending" : "sk-ci", n = a("article", { class: "sk-card sk-card-pr" });
  return n.append(
    a("header", { class: "sk-card-header" }, [
      a("span", { class: "sk-card-key", text: `#${r.number ?? ""}` }),
      a("span", { class: "sk-card-meta", text: r.repo || "" })
    ]),
    a("h4", { class: "sk-card-title", text: r.title || "" }),
    a("footer", { class: "sk-card-footer" }, [
      a("span", { class: e, title: `CI: ${t || "unknown"}` }),
      !v(r.diff_added) || !v(r.diff_removed) ? a("span", { class: "sk-card-diff" }, [
        a("span", { class: "sk-diff-add", text: `+${r.diff_added ?? 0}` }),
        a("span", { class: "sk-diff-rm", text: `−${r.diff_removed ?? 0}` })
      ]) : null,
      Array.isArray(r.reviewers) && r.reviewers.length > 0 ? a(
        "span",
        { class: "sk-card-reviewers" },
        r.reviewers.slice(0, 3).map((s) => x.avatar(s.name, { url: s.avatar, size: 18 }))
      ) : null
    ].filter(Boolean))
  ), n;
}
function mt({ card: r }) {
  const t = a("article", { class: "sk-card sk-card-ticket" });
  return t.append(
    a("header", { class: "sk-card-header" }, [
      a("span", { class: "sk-card-key", text: r.key || `T-${r.id}` }),
      v(r.channel) ? null : a("span", { class: "sk-channel", "data-channel": r.channel, text: r.channel })
    ].filter(Boolean)),
    a("h4", { class: "sk-card-title", text: r.subject || r.title || "" }),
    a("div", { class: "sk-card-meta", text: r.customer_name || "" }),
    v(r.sla_due_at) ? null : a("footer", { class: "sk-card-footer" }, [x.dueDate(r.sla_due_at)])
  ), t;
}
function ft({ card: r }) {
  const t = a("article", { class: "sk-card sk-card-lead" });
  return t.append(
    a("h4", { class: "sk-card-title", text: r.name || "" }),
    a("div", { class: "sk-card-meta", text: r.company || "" }),
    a("footer", { class: "sk-card-footer" }, [
      v(r.value) ? null : x.currency(r.value, { currency: r.currency || "AUD" }),
      v(r.stage) ? null : x.statusPill(r.stage, { colorMap: J })
    ].filter(Boolean))
  ), t;
}
function pt({ card: r }) {
  const t = a("article", { class: "sk-card sk-card-order" });
  return t.append(
    a("header", { class: "sk-card-header" }, [
      a("span", { class: "sk-card-key", text: `#${r.order_number || r.id || ""}` }),
      x.statusPill(r.status, { colorMap: J })
    ]),
    v(r.customer_name) ? null : a("div", { class: "sk-card-meta", text: r.customer_name }),
    a("footer", { class: "sk-card-footer" }, [
      v(r.total) ? null : x.currency(r.total, { currency: r.currency || "AUD" }),
      v(r.items_count) ? null : a("span", { class: "sk-card-meta", text: `${r.items_count} items` })
    ].filter(Boolean))
  ), t;
}
function gt({ card: r }) {
  const t = a("article", { class: "sk-card sk-card-email", "data-unread": r.unread ? "true" : "false" });
  return t.append(
    a("header", { class: "sk-card-header" }, [
      r.unread ? a("span", { class: "sk-unread-dot", title: "Unread" }) : null,
      a("span", { class: "sk-card-meta", text: r.sender || "" })
    ].filter(Boolean)),
    a("h4", { class: "sk-card-title", text: r.subject || "" }),
    a("div", { class: "sk-card-body sk-card-snippet", text: r.snippet || "" })
  ), t;
}
function Ct({ card: r }) {
  const t = a("article", { class: "sk-card sk-card-image" });
  if (!v(r.image_url)) {
    const e = a("img", { class: "sk-card-hero", src: r.image_url, alt: r.caption || "" });
    r.clickToZoom !== !1 && (e.style.cursor = "zoom-in", e.addEventListener("click", (n) => {
      n.stopPropagation();
      const s = a("div", { class: "sk-zoom-overlay" }, [
        a("img", { src: r.image_url, alt: r.caption || "" })
      ]);
      s.addEventListener("click", () => s.remove()), document.body.appendChild(s);
    })), t.appendChild(e);
  }
  return v(r.caption) || t.appendChild(a("div", { class: "sk-card-caption", text: r.caption })), t;
}
function _t({ card: r }) {
  const t = a("article", { class: "sk-card sk-card-cover" });
  return v(r.image_url) || t.appendChild(a("img", { class: "sk-card-hero", src: r.image_url, alt: r.title || "" })), t.appendChild(a("h4", { class: "sk-card-title", text: r.title || "" })), r.progress != null && t.appendChild(x.progressBar(r.progress)), t;
}
function yt({ card: r }) {
  const t = a("article", { class: "sk-card sk-card-gantt" });
  return t.append(
    a("h4", { class: "sk-card-title", text: r.title || "" }),
    a("div", { class: "sk-gantt-bar" }, [
      a("div", { class: "sk-gantt-fill", style: `width:${Math.round((Number(r.progress) || 0) * 100)}%` })
    ]),
    v(r.due_at) ? null : x.dueDate(r.due_at)
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
F("gantt-stub", yt);
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
  "gantt-stub": yt,
  sub: x
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
      virtualColumns: /* @__PURE__ */ new Map(),
      // columnId → virtual instance
      ready: !1
    }, this._renderScheduled = !1, this._renderColumnDirty = /* @__PURE__ */ new Set(), this._persistTimer = null, this._scheduleRender = Wt(() => this._renderNow());
  }
  connect() {
    this.element.classList.add("sk-board"), this.heightValue && (this.element.style.height = this.heightValue), this.domLayoutValue === "autoHeight" && this.element.classList.add("sk-board-auto-height"), this.element.hasAttribute("tabindex") || (this.element.tabIndex = 0), this._parseColumnsFromDom();
    const t = this._parseCardsFromDom();
    t.length > 0 ? this.state.cards = H(t, this._modelOpts()) : Array.isArray(this.cardDataValue) && this.cardDataValue.length > 0 ? this.state.cards = H(this.cardDataValue, this._modelOpts()) : this.cardDataUrlValue && this._loadFromUrl(this.cardDataUrlValue), this.state.swimlaneField = this.swimlaneFieldValue || "", this.state.quickFilter = this.quickFilterValue || "", this._installDnd(), this._installKeyboard(), this._installFileDrop(), this.api = qt(this), this.element.boardApi = this.api, this._restorePersistedState(), this._scheduleRender(), queueMicrotask(() => {
      this.state.ready = !0, y(this.element, "board:ready", { api: this.api });
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
      const s = n.getAttribute("data-card-id"), l = V(n, "[data-board-column-id-value]")?.getAttribute("data-board-column-id-value") || n.getAttribute("data-column-id") || "", c = n.getAttribute("data-card-order"), d = n.getAttribute("data-card-json");
      let h = { [this.getCardIdValue]: s, [this.getColumnIdValue]: l };
      if (d)
        try {
          Object.assign(h, JSON.parse(d));
        } catch {
        }
      c != null && (h[this.orderFieldValue] = Number(c)), h.title == null && (h.title = n.textContent.trim());
      const m = n.getAttribute("data-card-swimlane");
      m != null && (h.__swimlane = m), n.getAttribute("data-card-locked") === "true" && (h.__locked = !0);
      const b = n.getAttribute("data-card-color");
      b && (h.__color = b);
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
      y(this.element, "board:loadError", { url: t, error: String(e) });
    }
  }
  /* ---------------- Public methods backing the boardApi ---------------- */
  setCardData(t) {
    this.state.cards = H(t, this._modelOpts()), this._scheduleRender(), y(this.element, "board:cardDataChanged", { cards: this.getCardData() });
  }
  getCardData() {
    return this.state.cards.map((t) => ({ ...t }));
  }
  setColumnData(t) {
    this.state.columns = st(t), this.state.columnOrder = this.state.columns.map((e) => e.id), this._scheduleRender(), y(this.element, "board:columnDataChanged", { columns: this.getColumnData() });
  }
  getColumnData() {
    return this._orderedColumns().filter((t) => !t.__synthetic).map((t) => ({ ...t }));
  }
  applyTransaction(t) {
    return this.state.cards = $t(this.state.cards, t, this._modelOpts()), this._scheduleRender(), Array.isArray(t?.add) && t.add.forEach((e) => y(this.element, "board:cardAdded", { cardId: e[this.getCardIdValue], columnId: e[this.getColumnIdValue], card: e })), Array.isArray(t?.remove) && t.remove.forEach((e) => y(this.element, "board:cardRemoved", { cardId: typeof e == "object" ? e[this.getCardIdValue] : e })), this._checkWipStateChanges(), this.getCardData();
  }
  setColumnCounts(t) {
    this.state.columnCounts = new Map(Object.entries(t || {}).map(([e, n]) => [String(e), Number(n)])), this._scheduleRender();
  }
  getColumnCounts() {
    return Object.fromEntries(this.state.columnCounts);
  }
  /* selection */
  selectCard(t) {
    this.cardSelectionValue && (this.cardSelectionValue === "single" && this.state.selection.clear(), this.state.selection.add(String(t)), this.state.lastSelectedId = String(t), this._refreshSelectionDecorations(), y(this.element, "board:cardSelectionChanged", { selectedCardIds: this.getSelectedCardIds() }));
  }
  deselectCard(t) {
    this.state.selection.delete(String(t)), this._refreshSelectionDecorations(), y(this.element, "board:cardSelectionChanged", { selectedCardIds: this.getSelectedCardIds() });
  }
  toggleSelection(t) {
    const e = String(t);
    this.state.selection.has(e) ? this.deselectCard(e) : this.selectCard(e);
  }
  selectAllInColumn(t) {
    if (this.cardSelectionValue !== "multiple") return;
    const e = R(this.state.cards, t, this._modelOpts()).map((n) => String(n[this.getCardIdValue]));
    for (const n of e) this.state.selection.add(n);
    this._refreshSelectionDecorations(), y(this.element, "board:cardSelectionChanged", { selectedCardIds: this.getSelectedCardIds() });
  }
  clearSelection() {
    this.state.selection.size !== 0 && (this.state.selection.clear(), this._refreshSelectionDecorations(), y(this.element, "board:cardSelectionChanged", { selectedCardIds: [] }));
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
    return this.state.cards = z(this.state.cards, t, e, this._modelOpts()), this._scheduleRender(), y(this.element, "board:cardMoved", {
      cardId: t,
      fromColumnId: n?.[this.getColumnIdValue],
      toColumnId: e.toColumnId,
      fromIndex: s,
      toIndex: e.toIndex
    }), this._checkWipStateChanges(), !0;
  }
  moveCards(t, e) {
    if (!t?.length) return !1;
    const n = this._snapshotCard(t[0]);
    return this._beforeMoveOk(t, n?.[this.getColumnIdValue], e.toColumnId, e.toIndex) ? (this.state.cards = Bt(this.state.cards, t, e, this._modelOpts()), this._scheduleRender(), y(this.element, "board:cardsMoved", {
      cardIds: t,
      fromColumnId: n?.[this.getColumnIdValue],
      toColumnId: e.toColumnId,
      toIndex: e.toIndex
    }), this._checkWipStateChanges(), !0) : !1;
  }
  reorderCardWithinColumn(t, e) {
    const n = this._snapshotCard(t);
    return n ? (this.state.cards = Rt(this.state.cards, t, e, this._modelOpts()), this._scheduleRender(), y(this.element, "board:cardMoved", {
      cardId: t,
      fromColumnId: n[this.getColumnIdValue],
      toColumnId: n[this.getColumnIdValue],
      fromIndex: null,
      toIndex: e
    }), !0) : !1;
  }
  _beforeMoveOk(t, e, n, s) {
    if (this.readOnlyValue || y(
      this.element,
      "board:beforeMove",
      { cardIds: t, fromColumnId: e, toColumnId: n, toIndex: s },
      { cancellable: !0 }
    ).defaultPrevented) return !1;
    const l = this._columnById(n);
    return !(l?.accept_from && e && !l.accept_from.includes(String(e)));
  }
  _snapshotCard(t) {
    return this.state.cards.find((e) => String(e[this.getCardIdValue]) === String(t)) || null;
  }
  _currentVisibleIndex(t) {
    const e = this._snapshotCard(t);
    if (!e) return -1;
    const n = R(this.state.cards, e[this.getColumnIdValue], this._modelOpts());
    return K(n, this._columnById(e[this.getColumnIdValue])?.sort, this.orderFieldValue).findIndex((i) => String(i[this.getCardIdValue]) === String(t));
  }
  /* columns */
  setColumnVisible(t, e) {
    const n = this._columnById(t);
    n && (n.hidden = !e, this._scheduleRender(), y(this.element, "board:columnVisibleChanged", { columnId: t, visible: !!e }));
  }
  setColumnCollapsed(t, e) {
    const n = this._columnById(t);
    n && (n.collapsed = !!e, this._scheduleRender(), y(this.element, "board:columnCollapsedChanged", { columnId: t, collapsed: !!e }));
  }
  setColumnWidth(t, e) {
    const n = this._columnById(t);
    n && (n.width = Number(e), this._scheduleRender(), y(this.element, "board:columnResized", { columnId: t, width: n.width }));
  }
  moveColumn(t, e) {
    const n = this.state.columnOrder.slice(), s = n.indexOf(String(t));
    s !== -1 && (n.splice(s, 1), n.splice(Math.max(0, Math.min(e, n.length)), 0, String(t)), this.state.columnOrder = n, this._scheduleRender(), y(this.element, "board:columnMoved", { columnId: t, fromIndex: s, toIndex: e }));
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
    n && (n.sort = e || "manual", this._scheduleRender(), y(this.element, "board:columnSortChanged", { columnId: t, sort: n.sort }));
  }
  /* swimlanes */
  setSwimlaneField(t) {
    this.state.swimlaneField = t || "", this._scheduleRender(), y(this.element, "board:swimlaneChanged", { swimlaneField: this.state.swimlaneField });
  }
  setSwimlaneCollapsed(t, e) {
    const n = String(t ?? "");
    e ? this.state.collapsedSwimlanes.add(n) : this.state.collapsedSwimlanes.delete(n), this._scheduleRender();
  }
  /* filter */
  setQuickFilter(t) {
    this.state.quickFilter = t || "", this._scheduleRender(), y(this.element, "board:filterChanged", { quickFilter: this.state.quickFilter, predicate: this.state.predicate });
  }
  setCardFilter(t) {
    this.state.predicate = typeof t == "function" ? t : null, this._scheduleRender(), y(this.element, "board:filterChanged", { quickFilter: this.state.quickFilter, predicate: this.state.predicate });
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
      const l = i.querySelector("[data-editor-input], [data-editor-field]");
      l?.focus?.(), l?.select?.();
    }), y(this.element, "board:cardEditStarted", { cardId: t }), !0) : !1;
  }
  commitEditing() {
    const t = this.state.editing;
    if (!t) return !1;
    const e = this._readEditor(t.editorEl, t.original);
    return this.applyTransaction({ update: [e] }), y(this.element, "board:cardValueChanged", { cardId: t.cardId, oldCard: t.original, newCard: e }), this.state.editing = null, !0;
  }
  cancelEditing() {
    const t = this.state.editing;
    return t ? (this.state.editing = null, this._scheduleRender(), y(this.element, "board:cardEditCancelled", { cardId: t.cardId }), !0) : !1;
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
    return Mt(this._orderedColumns(), this.state.cards, this._modelOpts());
  }
  _checkWipStateChanges() {
    const t = /* @__PURE__ */ new Set();
    for (const e of this.getWipState())
      e.over && t.add(String(e.colId));
    for (const e of t)
      if (!this.state.wipExceeded.has(e)) {
        const n = this.getWipState().find((s) => String(s.colId) === e);
        y(this.element, "board:wipExceeded", { columnId: e, count: n?.count, limit: n?.limit });
      }
    this.state.wipExceeded = t;
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
      this.state.swimlaneField = t.swimlaneField || "", this.state.collapsedSwimlanes = new Set(t.collapsedSwimlanes || []), this.state.quickFilter = t.quickFilter || "", this._scheduleRender(), y(this.element, "board:boardStateApplied", { state: t });
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
    const n = t && t.length ? this._orderedColumns().filter((l) => t.includes(l.id)) : this._orderedColumns().filter((l) => !l.__synthetic && !l.hidden), i = [["card_id", "column", ...e && this.state.swimlaneField ? [this.state.swimlaneField] : [], "title"].join(",")];
    for (const l of n) {
      const c = K(
        R(this.state.cards, l.id, this._modelOpts()),
        l.sort,
        this.orderFieldValue
      );
      for (const d of c) {
        const h = [
          this._csvCell(d[this.getCardIdValue]),
          this._csvCell(l.title),
          ...e && this.state.swimlaneField ? [this._csvCell(d[this.state.swimlaneField])] : [],
          this._csvCell(d.title || "")
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
      const l = this._cardEl(t)?.getBoundingClientRect();
      l && (s.style.position = "fixed", s.style.top = `${Math.max(8, l.top)}px`, s.style.left = `${Math.min(window.innerWidth - 360, l.right + 8)}px`), document.body.appendChild(s);
    }
    return this.state.openDetailCardId = String(t), s.addEventListener("click", (i) => {
      i.target?.matches("[data-detail-close]") && this.closeCardDetail();
    }), this._onDocumentClick = (i) => {
      !s.contains(i.target) && !this._cardEl(t)?.contains(i.target) && this.closeCardDetail();
    }, setTimeout(() => document.addEventListener("click", this._onDocumentClick), 0), y(this.element, "board:cardDetailOpened", { cardId: t, card: e, panelEl: s }), !0;
  }
  closeCardDetail() {
    const t = this.state.openDetailCardId;
    return t ? (document.querySelector(`.sk-card-detail[data-card-id="${t}"]`)?.remove(), this.state.openDetailCardId = null, document.removeEventListener("click", this._onDocumentClick), y(this.element, "board:cardDetailClosed", { cardId: t }), !0) : !1;
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
    this.state.quickFilter && (n = Lt(n, this.state.quickFilter)), typeof this.state.predicate == "function" && (n = Nt(n, this.state.predicate));
    const s = this.filterModeValue || "hide";
    let i = this.element.querySelector(".sk-columns");
    i || (i = p("ol", { class: "sk-columns" }), this.element.replaceChildren(i)), i.style.gap = `${this.gapValue}px`;
    const l = this._orderedColumns().filter((d) => !d.hidden), c = e ? Ot(n, this.state.swimlaneField) : /* @__PURE__ */ new Map([["", n]]);
    if (i.replaceChildren(), e && c.size > 0)
      for (const [d, h] of c) {
        const m = p("li", {
          class: "sk-swimlane",
          "data-swimlane-value": d || ""
        }), k = this.state.collapsedSwimlanes.has(d), b = p("div", {
          class: "sk-swimlane-header",
          "data-controller": "swimlane-header",
          "data-swimlane-header-value-value": d || "",
          // The whole header is the click target — chevron, label, and count.
          // Keyboard parity (Enter / Space) is wired in the controller's
          // keydown handler so the header is a real WAI-ARIA button.
          "data-action": "click->swimlane-header#toggle keydown->swimlane-header#keydown",
          role: "button",
          tabindex: "0",
          "aria-expanded": k ? "false" : "true"
        }, [
          p("span", { class: "sk-swimlane-toggle", "aria-hidden": "true", text: k ? "▶" : "▼" }),
          p("span", { class: "sk-swimlane-label", text: d || "Unassigned" }),
          p("span", { class: "sk-swimlane-count", text: `${h.length}` })
        ]), g = p("div", { class: "sk-swimlane-cols", style: `gap:${this.gapValue}px` });
        for (const A of l) {
          const w = R(h, A.id, this._modelOpts());
          g.appendChild(this._renderColumn(A, w, s));
        }
        m.append(b, g), this.state.collapsedSwimlanes.has(d) && m.classList.add("sk-swimlane-collapsed"), i.appendChild(m);
      }
    else
      for (const d of l) {
        const h = R(n, d.id, this._modelOpts());
        i.appendChild(this._renderColumn(d, h, s));
      }
    this._refreshSelectionDecorations(), t && this._schedulePersist();
  }
  _renderColumn(t, e, n) {
    const s = K(e, t.sort, this.orderFieldValue), i = s.length, l = this.serverSideValue ? this.state.columnCounts.get(String(t.id)) ?? i : i, c = t.wip != null && i > t.wip, d = p("li", {
      class: "sk-column" + (t.collapsed ? " sk-column-collapsed" : ""),
      "data-controller": "board-column",
      "data-board-column-id-value": t.id,
      "data-board-column-title-value": t.title,
      "data-board-column-wip-value": t.wip ?? "",
      "data-board-column-sort-value": t.sort || "manual",
      "data-over-wip": c ? "true" : null,
      style: {
        width: `${t.width || this.columnWidthValue}px`,
        ...t.color ? { "--sk-column-accent": t.color } : {}
      }
    }), h = p("header", { class: "sk-column-header" }, [
      t.icon ? p("span", { class: "sk-column-icon", text: t.icon }) : null,
      p("span", { class: "sk-column-title", text: t.title }),
      p("span", {
        class: "sk-column-count" + (c ? " sk-column-count-over-wip" : ""),
        text: t.wip != null ? `${i} / ${t.wip}` : String(l)
      })
    ].filter(Boolean)), m = p("ol", { class: "sk-cards", style: `gap:${this.gapValue}px` });
    if (t.collapsed)
      return d.appendChild(h), d;
    for (const b of s) {
      const g = this._renderCard(b, t);
      n === "dim" && this.state.quickFilter && !this._cardMatchesQuick(b) && g.classList.add("sk-card-dimmed"), m.appendChild(g);
    }
    if (this.serverSideValue) {
      const b = this.state.columnCounts.get(String(t.id)) ?? i;
      if (b > i) {
        const g = p("li", { class: "sk-column-more-pill" }, [
          p("button", {
            type: "button",
            class: "sk-button sk-button-ghost",
            onclick: () => y(this.element, "board:columnFetchMore", { columnId: t.id, loadedCount: i, totalCount: b }),
            text: `+${b - i} more…`
          })
        ]);
        m.appendChild(g);
      }
    }
    if (this.addCardValue) {
      const b = t.add_card_label || "+ Add card", g = p("li", { class: "sk-add-card-row" }, [
        p("button", {
          type: "button",
          class: "sk-button sk-button-ghost",
          onclick: () => y(this.element, "board:addCardRequested", { columnId: t.id }),
          text: b
        })
      ]);
      m.appendChild(g);
    }
    d.append(h, m);
    const k = Number(this.cardHeightValue);
    if (Yt({
      cardCount: s.length,
      threshold: this.virtualThresholdValue,
      cardHeight: k,
      virtual: this.virtualValue
    })) {
      this.state.virtualColumns.get(t.id)?.destroy?.(), m.replaceChildren();
      const g = Ht({
        cards: s,
        cardHeight: k,
        gap: this.gapValue,
        scrollEl: m,
        cardsListEl: m,
        renderCard: (A) => this._renderCard(A, t)
      });
      this.state.virtualColumns.set(t.id, g);
    } else
      this.state.virtualColumns.get(t.id)?.destroy?.(), this.state.virtualColumns.delete(t.id);
    return d;
  }
  _renderCard(t, e) {
    const n = String(t[this.getCardIdValue]), s = t.__renderer || e?.card_renderer || this.cardRendererValue;
    let i = null;
    if (s) {
      const c = document.getElementById(s);
      if (c && c.tagName === "TEMPLATE")
        i = Y(s), i && it(i, t);
      else {
        const d = at(s);
        d && (i = d({ card: t, columnId: e?.id, defaultEl: p("article", { class: "sk-card" }) }));
      }
    }
    i || (i = p("article", { class: "sk-card" }, [
      p("div", { class: "sk-card-body", text: t.title ?? n })
    ]));
    const l = p("li", {
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
    return t.__color && l.style.setProperty("--sk-card-accent", t.__color), l.appendChild(i), l;
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
          y(this.element, "board:dragStarted", { cardIds: t, fromColumnId: e });
        },
        onDrop: ({ cardIds: t, fromColumnId: e, toColumnId: n, toIndex: s, cancelled: i }) => {
          if (i || n == null) {
            y(this.element, "board:dragEnded", { cardIds: t, fromColumnId: e, cancelled: !0 });
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
      if (V(t.target, ".sk-card-editor")) return;
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
    const e = R(this.state.cards, t, this._modelOpts());
    return K(e, this._columnById(t)?.sort, this.orderFieldValue);
  }
  _navWithinColumn(t) {
    const e = this._columnVisibleCards(this.state.activeColumnId), n = e.findIndex((i) => String(i[this.getCardIdValue]) === this.state.activeCardId), s = e[Math.max(0, Math.min(e.length - 1, n + t))];
    s && this._setActive(s[this.getCardIdValue]);
  }
  _navAcrossColumns(t) {
    const e = this._orderedColumns().filter((l) => !l.hidden), n = e.findIndex((l) => String(l.id) === this.state.activeColumnId), s = e[Math.max(0, Math.min(e.length - 1, n + t))];
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
      V(t.target, "[data-card-id]") && t.preventDefault();
    }), this.element.addEventListener("drop", (t) => {
      if (!t.dataTransfer?.files?.length) return;
      const e = V(t.target, "[data-card-id]");
      if (!e) return;
      t.preventDefault();
      const n = e.getAttribute("data-card-id"), s = this._snapshotCard(n), i = Array.from(t.dataTransfer.files);
      if (y(
        this.element,
        "board:fileAttached",
        { cardId: n, files: i, card: s, dataTransfer: t.dataTransfer },
        { cancellable: !0 }
      ).defaultPrevented) return;
      const c = this.attachmentsFieldValue || "attachments", d = Array.isArray(s?.[c]) ? s[c].slice() : [], h = i.map((m) => ({ name: m.name, size: m.size, type: m.type }));
      this.applyTransaction({ update: [{ [this.getCardIdValue]: n, [c]: d.concat(h) }] });
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
D(Q, "values", {
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
  getCardId: { type: String, default: B },
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
    D(this, "_onHeaderClick", (e) => {
      const n = e.target?.closest?.(".sk-column-header");
      if (!(!n || !this.element.contains(n))) {
        if (e.detail === 2) {
          this._board()?.setColumnCollapsed?.(this.idValue, !this.collapsedValue);
          return;
        }
        y(this.element, "board:columnHeaderClicked", { columnId: this.idValue, originalEvent: e });
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
D(G, "values", {
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
class bt extends $ {
  constructor() {
    super(...arguments);
    D(this, "_onClick", (e) => {
      const n = this._board();
      if (!n) return;
      const s = this._cardId(), i = this._card(), l = i?.[n.getColumnIdValue] ?? null;
      if (y(this.element, "board:cardClicked", { cardId: s, card: i, columnId: l, originalEvent: e }), n._setActive?.(s), n.suppressCardClickSelectionValue || n.cardSelectionValue === "") return;
      const c = e.metaKey || e.ctrlKey, d = e.shiftKey;
      n.cardSelectionValue === "multiple" && (c || d || n.cardMultiSelectWithClickValue) ? n.toggleSelection(s) : (n.clearSelection?.(), n.selectCard(s));
    });
    D(this, "_onDblClick", (e) => {
      const n = this._board();
      if (!n) return;
      const s = this._cardId(), i = this._card(), l = i?.[n.getColumnIdValue] ?? null;
      y(this.element, "board:cardDblClicked", { cardId: s, card: i, columnId: l }), n.cardDetailTemplateValue ? n.openCardDetail?.(s) : n.startEditingCard?.(s);
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
    D(this, "_onKeyDown", (e) => {
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
    D(this, "_onClick", (e) => {
      const n = e.target;
      if (n?.closest?.("[data-editor-commit]")) {
        e.preventDefault(), this._board()?.commitEditing();
        return;
      }
      n?.closest?.("[data-editor-cancel]") && (e.preventDefault(), this._board()?.cancelEditing());
    });
    D(this, "_onSubmit", (e) => {
      e.preventDefault(), this._board()?.commitEditing();
    });
    D(this, "_onFocusOut", (e) => {
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
D(Z, "values", {
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
D(tt, "values", {
  value: { type: String, default: "" }
});
class et extends $ {
  constructor() {
    super(...arguments);
    D(this, "_open", (e) => {
      e.preventDefault(), this._dismiss();
      const n = U(this.element, "board", this.application);
      if (!n) return;
      const s = this.columnIdValue || this.element.getAttribute("data-board-column-id-value") || "";
      if (!s) return;
      const i = n._columnById?.(s);
      if (!i) return;
      const l = p("div", {
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
      document.body.appendChild(l), this._menu = l, setTimeout(() => document.addEventListener("click", this._dismiss, { once: !0 }), 0);
    });
    D(this, "_dismiss", () => {
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
D(et, "values", {
  columnId: { type: String, default: "" }
});
const Gt = { minSelection: 1, position: "bottom" };
function Zt(r, t = {}) {
  if (!r) throw new Error("attachBulkActionToolbar: boardEl is required");
  const e = { ...Gt, ...t }, n = Array.isArray(e.actions) ? e.actions.slice() : [], s = p("div", { class: "sk-bulk-toolbar", role: "toolbar", "aria-label": "Bulk actions" });
  s.style.display = "none";
  const i = p("span", { class: "sk-bulk-label" });
  s.appendChild(i);
  function l(d) {
    [...s.querySelectorAll("button.sk-bulk-btn,button.sk-bulk-clear")].forEach((m) => m.remove());
    for (const m of n) {
      const k = p("button", {
        class: `sk-bulk-btn${m.danger ? " sk-bulk-btn-danger" : ""}${m.primary ? " sk-bulk-btn-primary" : ""}`,
        type: "button",
        "data-bulk-action": m.id || m.label,
        text: m.label || m.id || ""
      });
      (typeof m.disabled == "function" ? m.disabled(d, r.boardApi) : !1) && k.setAttribute("disabled", ""), k.addEventListener("click", () => {
        try {
          m.onClick?.(r.boardApi.getSelectedCardIds(), r.boardApi, r);
        } catch (g) {
          console.error("[bulk-toolbar] action failed", g);
        }
      }), s.appendChild(k);
    }
    const h = p("button", {
      class: "sk-bulk-clear",
      type: "button",
      "aria-label": "Clear selection",
      text: "×"
    });
    h.addEventListener("click", () => r.boardApi?.clearSelection?.()), s.appendChild(h);
  }
  function c() {
    const d = r.boardApi?.getSelectedCardIds?.() || [];
    if (d.length < e.minSelection) {
      s.style.display = "none";
      return;
    }
    i.textContent = `${d.length} selected`, l(d), s.style.display = "";
  }
  return r.addEventListener("board:cardSelectionChanged", c), document.body.appendChild(s), s.classList.add(`sk-bulk-toolbar-${e.position}`), setTimeout(c, 0), {
    destroy() {
      r.removeEventListener("board:cardSelectionChanged", c), s.remove();
    },
    el: s,
    update: c
  };
}
function te(r) {
  const t = r ?? xt.start();
  return t.register("board", Q), t.register("board-column", G), t.register("card", bt), t.register("card-editor", Z), t.register("swimlane-header", tt), t.register("column-menu", et), t;
}
const ee = {
  start: te,
  BoardController: Q,
  BoardColumnController: G,
  CardController: bt,
  CardEditorController: Z,
  SwimlaneHeaderController: tt,
  ColumnMenuController: et,
  registerRenderer: F,
  getRenderer: at,
  listRenderers: zt,
  renderers: Xt,
  subRenderers: x,
  attachBulkActionToolbar: Zt
};
typeof window < "u" && !window.__stimulusKanbanStarted && (window.__stimulusKanbanStarted = !0, window.StimulusKanban = ee);
export {
  G as BoardColumnController,
  Q as BoardController,
  bt as CardController,
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
  x as subRenderers
};
//# sourceMappingURL=stimulus_kanban.esm.js.map
