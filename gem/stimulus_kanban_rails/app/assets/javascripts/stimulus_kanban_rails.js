/* stimulus_kanban_rails — Turbo Stream sync layer for stimulus_kanban.
 *
 * Subscribes to the board's stream (turbo_stream_from in the rendered view)
 * and applies card-grained events as boardApi.applyTransaction batches.
 * Optimistic moves done on the client get reconciled (or reverted) by the
 * matching server echo.
 *
 * Optimistic-id reconciliation (mirrors stimulus_grid_rails):
 *   - every PATCH/POST sends a fresh X-Optimistic-Id header
 *   - the server stashes it on the model (_skr_optimistic_id) and the
 *     after_commit broadcast carries it back to ALL connected tabs
 *   - the originating client sees its own id in the incoming event and
 *     suppresses it (the move was already applied locally); other tabs
 *     apply via applyTransaction as normal
 *
 * Host apps tag the board with `data-controller="board board-sync"` and
 * this controller does the rest.
 */
import { Application, Controller } from "@hotwired/stimulus";

class BoardSyncController extends Controller {
  static values = {
    resource: { type: String, default: "" },
    mountPath: { type: String, default: "/boards" },
  };

  connect() {
    // In-flight optimistic ids the originator should ignore when they echo
    // back from the server's broadcast. Each id is added when we PATCH and
    // dropped after a short TTL so a stuck request can't leak memory.
    this._myOptimisticIds = new Set();

    this._onMoved   = (ev) => this._postMove(ev.detail);
    this._onUpdated = (ev) => this._postUpdate(ev.detail);
    this._onIncoming = (ev) => this._applyIncoming(ev.detail);
    this.element.addEventListener("board:cardMoved",        this._onMoved);
    this.element.addEventListener("board:cardValueChanged", this._onUpdated);
    document.addEventListener("stimulus-kanban-rails:event", this._onIncoming);
  }
  disconnect() {
    this.element.removeEventListener("board:cardMoved",        this._onMoved);
    this.element.removeEventListener("board:cardValueChanged", this._onUpdated);
    document.removeEventListener("stimulus-kanban-rails:event", this._onIncoming);
  }

  _newOptimisticId() {
    const id = (crypto?.randomUUID?.() || `oid-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    this._myOptimisticIds.add(id);
    // Stale guard — drop the id after 30s so a hung request never grows the set.
    setTimeout(() => this._myOptimisticIds.delete(id), 30_000);
    return id;
  }

  _postMove({ cardId, toColumnId, toIndex }) {
    const url = `${this.mountPathValue}/${this.resourceValue}/cards/${encodeURIComponent(cardId)}/move`;
    fetch(url, {
      method: "PATCH",
      headers: this._headers(),
      body: JSON.stringify({ to_column_id: toColumnId, to_index: toIndex }),
    }).then((r) => { if (!r.ok) this._revert(cardId); });
  }
  _postUpdate({ cardId, newCard }) {
    if (!newCard) return;
    const url = `${this.mountPathValue}/${this.resourceValue}/cards/${encodeURIComponent(cardId)}`;
    fetch(url, {
      method: "PATCH",
      headers: this._headers(),
      body: JSON.stringify({ card: newCard }),
    });
  }
  _applyIncoming({ resource, event }) {
    if (resource !== this.resourceValue) return;
    // Suppress our own echo — the originator already applied this change
    // locally; re-applying would be redundant and can flicker.
    if (event.optimistic_id && this._myOptimisticIds.has(event.optimistic_id)) {
      this._myOptimisticIds.delete(event.optimistic_id);
      return;
    }
    const api = this.element.boardApi;
    if (!api) return;
    if (event.kind === "remove") api.applyTransaction({ remove: [event.card.id] });
    if (event.kind === "update") api.applyTransaction({ update: [event.card] });
    if (event.kind === "add")    api.applyTransaction({ add:    [event.card] });
  }
  _revert(cardId) {
    // Naive revert: refetch the canonical card from the server and
    // applyTransaction(update). The optimistic move already mutated the DOM;
    // applyTransaction.update with the server's column_id puts it right.
    fetch(`${this.mountPathValue}/${this.resourceValue}/cards/${encodeURIComponent(cardId)}`, { headers: this._headers() })
      .then((r) => r.ok ? r.json() : null)
      .then((body) => body?.card && this.element.boardApi?.applyTransaction({ update: [body.card] }));
  }
  _headers() {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
    return {
      "Content-Type":   "application/json",
      "Accept":         "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-Optimistic-Id":  this._newOptimisticId(),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    };
  }
}

export function start(app) {
  const application = app ?? Application.start();
  application.register("board-sync", BoardSyncController);
  return application;
}

const StimulusKanbanRails = { start, BoardSyncController };
export default StimulusKanbanRails;

if (typeof window !== "undefined" && !window.__stimulusKanbanRailsStarted) {
  window.__stimulusKanbanRailsStarted = true;
  window.StimulusKanbanRails = StimulusKanbanRails;
}
