/* Built-in card renderers + a tiny registry.
 *
 * stimulus_kanban's primary rendering path is the HTML `<template>` clone
 * with `data-bind`/`data-bind-attr` (see src/lib/dom.js#applyBindings) —
 * perfect for shaped layouts. Some card families want a small function
 * instead (story-with-status-pill-and-points, image-card with click-to-zoom,
 * relative-time/SLA timers). This module is that function layer.
 *
 * A renderer is `(ctx) => HTMLElement | void`, where `ctx` is
 * `{ card, columnId, defaultEl }`. Return an element and the board uses it;
 * return nothing and the renderer is assumed to have mutated `defaultEl` in
 * place.
 *
 * Renderers register themselves at module load. Host apps can compose,
 * override, or extend via registerRenderer/getRenderer. */

const REGISTRY = new Map();

export function registerRenderer(name, fn) {
  if (typeof name !== 'string' || !name) throw new Error('registerRenderer: name must be a non-empty string');
  if (typeof fn !== 'function') throw new Error('registerRenderer: fn must be a function');
  REGISTRY.set(name, fn);
}

export function getRenderer(name) { return REGISTRY.get(name) || null; }
export function listRenderers() { return Array.from(REGISTRY.keys()); }

/* ---------- tiny element helper (DOM-only, no React) -------------------- */

function h(tag, attrs = {}, content = null) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  if (content == null) return node;
  for (const c of [].concat(content)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

const isBlank = (v) => v == null || v === '';

/* ---------- sub-renderers (composable for custom card layouts) ---------- */

export const subRenderers = {
  statusPill(value, { colorMap = {}, iconMap = {} } = {}) {
    const v = value == null ? '' : String(value);
    const color = colorMap[v] || '#9ca3af';
    const icon  = iconMap[v];
    return h('span', { class: 'sk-pill', style: `--sk-pill-color:${color}`, 'data-status': v },
      icon ? [h('span', { class: 'sk-pill-icon', text: icon }), document.createTextNode(v || '—')]
           : [document.createTextNode(v || '—')]);
  },
  avatar(name, { url, size = 24, title } = {}) {
    if (url) {
      return h('img', {
        class: 'sk-avatar',
        src: url,
        alt: name || '',
        width: size, height: size,
        title: title || name || '',
      });
    }
    const initials = String(name || '?')
      .split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    return h('span', { class: 'sk-avatar sk-avatar-fallback', title: title || name || '' }, [initials]);
  },
  tags(values, { max = 4 } = {}) {
    const arr = Array.isArray(values) ? values : String(values || '').split(',').map((s) => s.trim()).filter(Boolean);
    const list = h('span', { class: 'sk-tags' });
    arr.slice(0, max).forEach((t) => list.appendChild(h('span', { class: 'sk-tag', text: t })));
    if (arr.length > max) list.appendChild(h('span', { class: 'sk-tag sk-tag-more', text: `+${arr.length - max}` }));
    return list;
  },
  currency(amount, { currency = 'AUD', locale = 'en-AU' } = {}) {
    if (isBlank(amount)) return h('span', {}, '');
    const n = Number(amount);
    if (!Number.isFinite(n)) return h('span', { text: String(amount) });
    try {
      const text = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
      return h('span', { class: 'sk-currency', text });
    } catch {
      return h('span', { class: 'sk-currency', text: `${n.toFixed(0)}` });
    }
  },
  percent(value) {
    if (isBlank(value)) return h('span', {});
    const n = Number(value);
    if (!Number.isFinite(n)) return h('span', { text: String(value) });
    return h('span', { class: 'sk-percent', text: `${Math.round(n * 100)}%` });
  },
  progressBar(value) {
    const n = Math.max(0, Math.min(1, Number(value) || 0));
    const bar = h('div', { class: 'sk-progress' }, [
      h('div', { class: 'sk-progress-bar', style: `width:${Math.round(n * 100)}%` }),
    ]);
    return bar;
  },
  relativeTime(date) {
    if (isBlank(date)) return h('span', {});
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.valueOf())) return h('span', { text: String(date) });
    const diff = Date.now() - d.valueOf();
    const abs = Math.abs(diff);
    const fmt =
      abs < 60_000      ? 'just now' :
      abs < 3_600_000   ? `${Math.round(abs / 60_000)}m` :
      abs < 86_400_000  ? `${Math.round(abs / 3_600_000)}h` :
      abs < 7 * 86_400_000 ? `${Math.round(abs / 86_400_000)}d` :
      d.toLocaleDateString();
    return h('time', { class: 'sk-rel-time', datetime: d.toISOString(), title: d.toLocaleString(), text: fmt });
  },
  dueDate(date) {
    if (isBlank(date)) return h('span', {});
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.valueOf())) return h('span', { text: String(date) });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const days = Math.round((day - today) / 86_400_000);
    const cls = days < 0 ? 'sk-due sk-due-overdue' : days <= 1 ? 'sk-due sk-due-soon' : 'sk-due';
    const label =
      days === 0  ? 'Due today' :
      days === 1  ? 'Due tomorrow' :
      days === -1 ? '1 day overdue' :
      days < 0    ? `${-days} days overdue` :
      `Due ${d.toLocaleDateString()}`;
    return h('span', { class: cls, title: d.toLocaleString(), text: label });
  },
  countryFlag(code) {
    if (isBlank(code)) return h('span', {});
    const s = String(code).toUpperCase().slice(0, 2);
    if (s.length !== 2) return h('span', { text: String(code) });
    const flag = String.fromCodePoint(...s.split('').map((c) => 127397 + c.charCodeAt(0)));
    return h('span', { class: 'sk-flag', title: s, text: flag });
  },
  attachments(list) {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length === 0) return h('span', {});
    return h('span', { class: 'sk-attachments', title: `${arr.length} attachment(s)` },
      `📎 ${arr.length}`);
  },
  mask(value, { type = 'card' } = {}) {
    const s = String(value || '').replace(/\D/g, '');
    if (!s) return h('span', {});
    if (type === 'card') {
      const last4 = s.slice(-4);
      return h('span', { class: 'sk-mask', text: `•••• ${last4}` });
    }
    return h('span', { class: 'sk-mask', text: s.replace(/.(?=.{4})/g, '•') });
  },
};

/* ---------- common pill colour map (status renderers reuse) ------------- */

const DEFAULT_STATUS_COLORS = {
  open:        '#3b82f6',
  todo:        '#3b82f6',
  doing:       '#f59e0b',
  in_progress: '#f59e0b',
  review:      '#a855f7',
  blocked:     '#ef4444',
  done:        '#10b981',
  closed:      '#6b7280',
  cancelled:   '#6b7280',
  resolved:    '#10b981',
};

/* ---------- card renderers (registered names) --------------------------- */

function renderStory({ card }) {
  const art = h('article', { class: 'sk-card sk-card-story' });
  const header = h('header', { class: 'sk-card-header' }, [
    h('span', { class: 'sk-card-key', text: card.key || '' }),
    subRenderers.statusPill(card.status, { colorMap: DEFAULT_STATUS_COLORS }),
  ]);
  const title = h('h4', { class: 'sk-card-title', text: card.title || '' });
  const footer = h('footer', { class: 'sk-card-footer' }, [
    !isBlank(card.points) ? h('span', { class: 'sk-card-points', text: `${card.points} pts` }) : null,
    !isBlank(card.assignee_name) ? subRenderers.avatar(card.assignee_name, { url: card.assignee_avatar }) : null,
  ].filter(Boolean));
  art.append(header, title, footer);
  return art;
}

function renderTask({ card }) {
  const art = h('article', { class: 'sk-card sk-card-task' });
  const row = h('div', { class: 'sk-card-task-row' }, [
    h('input', {
      type: 'checkbox',
      class: 'sk-card-check',
      ...(card.done ? { checked: true } : {}),
      'data-sk-task-check': '',
    }),
    h('span', { class: card.done ? 'sk-card-title sk-card-title-done' : 'sk-card-title', text: card.title || '' }),
  ]);
  art.appendChild(row);
  if (!isBlank(card.due_at)) art.appendChild(subRenderers.dueDate(card.due_at));
  return art;
}

function renderBug({ card }) {
  const sev = String(card.severity || 'minor').toLowerCase();
  const sevColors = { critical: '#dc2626', major: '#f97316', minor: '#facc15', cosmetic: '#94a3b8' };
  const art = h('article', { class: 'sk-card sk-card-bug', 'data-severity': sev });
  art.append(
    h('header', { class: 'sk-card-header' }, [
      h('span', { class: 'sk-card-key', text: card.key || '' }),
      h('span', { class: 'sk-pill', style: `--sk-pill-color:${sevColors[sev] || '#94a3b8'}`, text: sev }),
    ]),
    h('h4', { class: 'sk-card-title', text: card.title || '' }),
    card.reporter_name
      ? h('footer', { class: 'sk-card-footer' }, [
          subRenderers.avatar(card.reporter_name, { url: card.reporter_avatar, title: `Reported by ${card.reporter_name}` }),
        ])
      : null,
  );
  return art;
}

function renderIncident({ card }) {
  const pri = String(card.priority || 'p4').toLowerCase();
  const priColors = { p1: '#dc2626', p2: '#f97316', p3: '#facc15', p4: '#94a3b8', p5: '#94a3b8' };
  const art = h('article', { class: 'sk-card sk-card-incident', 'data-priority': pri });
  art.append(
    h('header', { class: 'sk-card-header' }, [
      h('span', { class: 'sk-pill sk-pill-priority', style: `--sk-pill-color:${priColors[pri] || '#94a3b8'}`, text: pri.toUpperCase() }),
      !isBlank(card.pages) ? h('span', { class: 'sk-card-meta', text: `📟 ${card.pages}` }) : null,
    ].filter(Boolean)),
    h('h4', { class: 'sk-card-title', text: card.title || '' }),
    h('footer', { class: 'sk-card-footer' }, [
      !isBlank(card.opened_at) ? subRenderers.relativeTime(card.opened_at) : null,
    ].filter(Boolean)),
  );
  return art;
}

function renderNote({ card }) {
  const art = h('article', { class: 'sk-card sk-card-note' });
  art.append(
    h('div', { class: 'sk-card-body', text: card.body || card.title || '' }),
    h('footer', { class: 'sk-card-footer' }, [
      !isBlank(card.author) ? h('span', { class: 'sk-card-meta', text: card.author }) : null,
      !isBlank(card.updated_at) ? subRenderers.relativeTime(card.updated_at) : null,
    ].filter(Boolean)),
  );
  return art;
}

function renderPr({ card }) {
  const ci = String(card.ci || '').toLowerCase();
  const ciClass = ci === 'pass' ? 'sk-ci sk-ci-pass'
                 : ci === 'fail' ? 'sk-ci sk-ci-fail'
                 : ci === 'pending' ? 'sk-ci sk-ci-pending'
                 : 'sk-ci';
  const art = h('article', { class: 'sk-card sk-card-pr' });
  art.append(
    h('header', { class: 'sk-card-header' }, [
      h('span', { class: 'sk-card-key', text: `#${card.number ?? ''}` }),
      h('span', { class: 'sk-card-meta', text: card.repo || '' }),
    ]),
    h('h4', { class: 'sk-card-title', text: card.title || '' }),
    h('footer', { class: 'sk-card-footer' }, [
      h('span', { class: ciClass, title: `CI: ${ci || 'unknown'}` }),
      !isBlank(card.diff_added) || !isBlank(card.diff_removed)
        ? h('span', { class: 'sk-card-diff' }, [
            h('span', { class: 'sk-diff-add', text: `+${card.diff_added ?? 0}` }),
            h('span', { class: 'sk-diff-rm',  text: `−${card.diff_removed ?? 0}` }),
          ])
        : null,
      Array.isArray(card.reviewers) && card.reviewers.length > 0
        ? h('span', { class: 'sk-card-reviewers' },
            card.reviewers.slice(0, 3).map((r) => subRenderers.avatar(r.name, { url: r.avatar, size: 18 })))
        : null,
    ].filter(Boolean)),
  );
  return art;
}

function renderSupportTicket({ card }) {
  const art = h('article', { class: 'sk-card sk-card-ticket' });
  art.append(
    h('header', { class: 'sk-card-header' }, [
      h('span', { class: 'sk-card-key', text: card.key || `T-${card.id}` }),
      !isBlank(card.channel)
        ? h('span', { class: 'sk-channel', 'data-channel': card.channel, text: card.channel })
        : null,
    ].filter(Boolean)),
    h('h4', { class: 'sk-card-title', text: card.subject || card.title || '' }),
    h('div', { class: 'sk-card-meta', text: card.customer_name || '' }),
    !isBlank(card.sla_due_at)
      ? h('footer', { class: 'sk-card-footer' }, [subRenderers.dueDate(card.sla_due_at)])
      : null,
  );
  return art;
}

function renderLead({ card }) {
  const art = h('article', { class: 'sk-card sk-card-lead' });
  art.append(
    h('h4', { class: 'sk-card-title', text: card.name || '' }),
    h('div', { class: 'sk-card-meta', text: card.company || '' }),
    h('footer', { class: 'sk-card-footer' }, [
      !isBlank(card.value) ? subRenderers.currency(card.value, { currency: card.currency || 'AUD' }) : null,
      !isBlank(card.stage) ? subRenderers.statusPill(card.stage, { colorMap: DEFAULT_STATUS_COLORS }) : null,
    ].filter(Boolean)),
  );
  return art;
}

function renderOrder({ card }) {
  const art = h('article', { class: 'sk-card sk-card-order' });
  art.append(
    h('header', { class: 'sk-card-header' }, [
      h('span', { class: 'sk-card-key', text: `#${card.order_number || card.id || ''}` }),
      subRenderers.statusPill(card.status, { colorMap: DEFAULT_STATUS_COLORS }),
    ]),
    !isBlank(card.customer_name)
      ? h('div', { class: 'sk-card-meta', text: card.customer_name })
      : null,
    h('footer', { class: 'sk-card-footer' }, [
      !isBlank(card.total) ? subRenderers.currency(card.total, { currency: card.currency || 'AUD' }) : null,
      !isBlank(card.items_count) ? h('span', { class: 'sk-card-meta', text: `${card.items_count} items` }) : null,
    ].filter(Boolean)),
  );
  return art;
}

function renderEmailThread({ card }) {
  const art = h('article', { class: 'sk-card sk-card-email', 'data-unread': card.unread ? 'true' : 'false' });
  art.append(
    h('header', { class: 'sk-card-header' }, [
      card.unread ? h('span', { class: 'sk-unread-dot', title: 'Unread' }) : null,
      h('span', { class: 'sk-card-meta', text: card.sender || '' }),
    ].filter(Boolean)),
    h('h4', { class: 'sk-card-title', text: card.subject || '' }),
    h('div', { class: 'sk-card-body sk-card-snippet', text: card.snippet || '' }),
  );
  return art;
}

function renderImageCard({ card }) {
  const art = h('article', { class: 'sk-card sk-card-image' });
  if (!isBlank(card.image_url)) {
    const img = h('img', { class: 'sk-card-hero', src: card.image_url, alt: card.caption || '' });
    if (card.clickToZoom !== false) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const overlay = h('div', { class: 'sk-zoom-overlay' }, [
          h('img', { src: card.image_url, alt: card.caption || '' }),
        ]);
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
      });
    }
    art.appendChild(img);
  }
  if (!isBlank(card.caption)) art.appendChild(h('div', { class: 'sk-card-caption', text: card.caption }));
  return art;
}

function renderCoverProgress({ card }) {
  const art = h('article', { class: 'sk-card sk-card-cover' });
  if (!isBlank(card.image_url)) {
    art.appendChild(h('img', { class: 'sk-card-hero', src: card.image_url, alt: card.title || '' }));
  }
  art.appendChild(h('h4', { class: 'sk-card-title', text: card.title || '' }));
  if (card.progress != null) art.appendChild(subRenderers.progressBar(card.progress));
  return art;
}

function renderGanttStub({ card }) {
  const art = h('article', { class: 'sk-card sk-card-gantt' });
  art.append(
    h('h4', { class: 'sk-card-title', text: card.title || '' }),
    h('div', { class: 'sk-gantt-bar' }, [
      h('div', { class: 'sk-gantt-fill', style: `width:${Math.round((Number(card.progress) || 0) * 100)}%` }),
    ]),
    !isBlank(card.due_at) ? subRenderers.dueDate(card.due_at) : null,
  );
  return art;
}

/* ---------- registry seed ---------------------------------------------- */

registerRenderer('story',          renderStory);
registerRenderer('task',           renderTask);
registerRenderer('bug',            renderBug);
registerRenderer('incident',       renderIncident);
registerRenderer('note',           renderNote);
registerRenderer('pr',             renderPr);
registerRenderer('support-ticket', renderSupportTicket);
registerRenderer('lead',           renderLead);
registerRenderer('order',          renderOrder);
registerRenderer('email-thread',   renderEmailThread);
registerRenderer('image-card',     renderImageCard);
registerRenderer('cover-progress', renderCoverProgress);
registerRenderer('gantt-stub',     renderGanttStub);

export const renderers = {
  story:           renderStory,
  task:            renderTask,
  bug:             renderBug,
  incident:        renderIncident,
  note:            renderNote,
  pr:              renderPr,
  'support-ticket':renderSupportTicket,
  lead:            renderLead,
  order:           renderOrder,
  'email-thread':  renderEmailThread,
  'image-card':    renderImageCard,
  'cover-progress':renderCoverProgress,
  'gantt-stub':    renderGanttStub,
  sub:             subRenderers,
};
