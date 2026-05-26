import { describe, it, expect } from 'vitest';
import { renderers, registerRenderer, getRenderer, listRenderers, subRenderers } from '../src/lib/renderers.js';

const ctx = (card) => ({ card, columnId: 'x', defaultEl: document.createElement('article') });

describe('registry', () => {
  it('lists the built-in names', () => {
    const names = listRenderers();
    expect(names).toContain('story');
    expect(names).toContain('task');
    expect(names).toContain('pr');
  });
  it('register + get round-trip', () => {
    registerRenderer('my-card', () => document.createElement('div'));
    expect(typeof getRenderer('my-card')).toBe('function');
  });
});

describe('story renderer', () => {
  it('renders title + key + status + points', () => {
    const node = renderers.story(ctx({ title: 'Ship it', key: 'PRJ-1', status: 'doing', points: 5 }));
    expect(node.querySelector('.sk-card-title').textContent).toBe('Ship it');
    expect(node.querySelector('.sk-card-key').textContent).toBe('PRJ-1');
    expect(node.querySelector('.sk-pill').textContent).toContain('doing');
    expect(node.querySelector('.sk-card-points').textContent).toBe('5 pts');
  });
});

describe('task renderer', () => {
  it('renders a checkbox with done state', () => {
    const node = renderers.task(ctx({ title: 'Buy milk', done: true }));
    const check = node.querySelector('input[type=checkbox]');
    expect(check.checked).toBe(true);
    expect(node.querySelector('.sk-card-title').classList.contains('sk-card-title-done')).toBe(true);
  });
});

describe('pr renderer', () => {
  it('shows CI dot class for pass / fail / pending', () => {
    expect(renderers.pr(ctx({ ci: 'pass' })).querySelector('.sk-ci').classList.contains('sk-ci-pass')).toBe(true);
    expect(renderers.pr(ctx({ ci: 'fail' })).querySelector('.sk-ci').classList.contains('sk-ci-fail')).toBe(true);
    expect(renderers.pr(ctx({ ci: 'pending' })).querySelector('.sk-ci').classList.contains('sk-ci-pending')).toBe(true);
  });
});

describe('lead renderer', () => {
  it('formats the value as currency', () => {
    const node = renderers.lead(ctx({ name: 'Acme', value: 50000, currency: 'AUD' }));
    expect(node.querySelector('.sk-currency').textContent).toMatch(/\$50,000/);
  });
});

describe('image-card renderer', () => {
  it('renders a hero image and caption', () => {
    const node = renderers['image-card'](ctx({ image_url: 'x.jpg', caption: 'Hi' }));
    expect(node.querySelector('img').getAttribute('src')).toBe('x.jpg');
    expect(node.querySelector('.sk-card-caption').textContent).toBe('Hi');
  });
});

describe('subRenderers', () => {
  it('avatar renders initials when no url is given', () => {
    const node = subRenderers.avatar('Ada Lovelace');
    expect(node.textContent).toBe('AL');
  });
  it('avatar renders <img> when url is given', () => {
    const node = subRenderers.avatar('Ada', { url: 'a.png' });
    expect(node.tagName).toBe('IMG');
    expect(node.getAttribute('src')).toBe('a.png');
  });
  it('progressBar clamps to [0,1]', () => {
    const node = subRenderers.progressBar(1.5);
    const bar = node.querySelector('.sk-progress-bar');
    expect(bar.style.width).toBe('100%');
  });
  it('dueDate flags overdue', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const node = subRenderers.dueDate(yesterday);
    expect(node.className).toContain('sk-due-overdue');
  });
});
