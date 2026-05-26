/* DOM helpers shared by the board, column, card, and editor controllers.
 *
 * Kept deliberately small — every helper here exists because the same
 * shape appears 3+ times in the controllers. Anything used once stays
 * inline at the call site. */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) {
      node.setAttribute(k, '');
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function setAttrs(node, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) node.removeAttribute(k);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
}

export function cloneTemplate(id) {
  if (!id || typeof document === 'undefined') return null;
  const tpl = document.getElementById(id);
  if (!tpl || tpl.tagName !== 'TEMPLATE') return null;
  const first = tpl.content.firstElementChild;
  return first ? first.cloneNode(true) : null;
}

/* Bubble a CustomEvent off `target` carrying `detail`. Returns the event so
 * callers can check `defaultPrevented` for cancellable hooks (beforeMove,
 * fileAttached, …). */
export function emit(target, name, detail = {}, { cancellable = false } = {}) {
  const ev = new CustomEvent(name, { detail, bubbles: true, cancelable: cancellable });
  target.dispatchEvent(ev);
  return ev;
}

export function findParentController(startEl, identifier, application) {
  let cur = startEl?.parentElement;
  while (cur) {
    const ids = (cur.getAttribute('data-controller') || '').split(/\s+/);
    if (ids.includes(identifier)) {
      const c = application.getControllerForElementAndIdentifier(cur, identifier);
      if (c) return c;
    }
    cur = cur.parentElement;
  }
  return null;
}

/* data-bind / data-bind-text / data-bind-attr shape — same contract as
 * stimulus_grid renderers, so a host app can share field-binding markup
 * between a grid row and a kanban card.
 *
 *   <h4 data-bind="title"></h4>            → element.textContent = card.title
 *   <span data-bind-text="amount"></span>  → element.textContent = format(card.amount)
 *   <img data-bind-attr="src:avatar_url" data-bind-attr="alt:assignee_name" />
 *
 * Multiple data-bind-attr declarations on the same element are honored — the
 * MutationObserver of one would clobber the other, so the parser splits the
 * attribute list manually. */
export function applyBindings(root, card, { format } = {}) {
  if (!root || !card) return root;
  // Plain text bindings.
  for (const node of root.querySelectorAll('[data-bind]')) {
    const field = node.getAttribute('data-bind');
    if (!field) continue;
    const v = card[field];
    node.textContent = v == null ? '' : String(v);
  }
  for (const node of root.querySelectorAll('[data-bind-text]')) {
    const field = node.getAttribute('data-bind-text');
    if (!field) continue;
    const v = card[field];
    node.textContent = typeof format === 'function' ? format(v, field, card) : (v == null ? '' : String(v));
  }
  // Attribute bindings — multiple "attr:field" pairs in one
  // `data-bind-attr="src:url,alt:title"` *or* repeated attributes.
  for (const node of root.querySelectorAll('[data-bind-attr]')) {
    const pairs = collectBindAttrs(node);
    for (const [attr, field] of pairs) {
      const v = card[field];
      if (v == null || v === false) node.removeAttribute(attr);
      else node.setAttribute(attr, String(v));
    }
  }
  return root;
}

function collectBindAttrs(node) {
  // A renderer can either pile `data-bind-attr="src:url,alt:title"` into one
  // attribute *or* declare repeated `data-bind-attr` lines (HTML coalesces
  // those, so we treat both as a flat pair list).
  const raw = node.getAttribute('data-bind-attr') || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const i = s.indexOf(':');
    if (i === -1) return [s, s];
    return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
  });
}

/* Find the first ancestor (or self) matching a selector. Centralised so the
 * "card under this pointer event" lookup is one call. */
export function ancestor(el, selector) {
  if (!el) return null;
  if (el.matches?.(selector)) return el;
  return el.closest?.(selector) || null;
}

/* Read a tunable from a data-* attribute, falling back to a default. The DOM
 * always hands us strings; this helper coerces to the requested type. */
export function dataAttr(el, name, { type = 'string', defaultValue = null } = {}) {
  const raw = el?.getAttribute?.(name);
  if (raw == null || raw === '') return defaultValue;
  if (type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : defaultValue;
  }
  if (type === 'boolean') return raw === 'true' || raw === '' || raw === '1';
  if (type === 'json') {
    try { return JSON.parse(raw); } catch { return defaultValue; }
  }
  return raw;
}

/* Throttle-leading-trailing scheduler around requestAnimationFrame. Used for
 * drag autoscroll and render coalescing — call repeatedly and `fn` runs once
 * per animation frame at most. */
export function rafThrottle(fn) {
  let queued = false;
  let lastArgs = null;
  const wrapped = (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    const cb = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (f) => setTimeout(f, 16);
    cb(() => {
      queued = false;
      const a = lastArgs;
      lastArgs = null;
      fn(...a);
    });
  };
  wrapped.cancel = () => { queued = false; lastArgs = null; };
  return wrapped;
}
