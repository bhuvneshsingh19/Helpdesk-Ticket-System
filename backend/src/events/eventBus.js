import { EventEmitter } from 'node:events';

/**
 * Tiny in-process event bus.
 *
 * Controllers publish domain events ("ticket.created", ...) and know nothing about
 * what happens next. Handlers subscribe independently (activity log, notifications).
 * A failing handler never breaks the request that produced the event.
 */
class EventBus extends EventEmitter {
  /** Publishes an event and resolves once every handler has settled. */
  async publish(type, payload = {}) {
    const event = { type, at: new Date(), ...payload };
    const handlers = this.listeners(type);
    const results = await Promise.allSettled(
      handlers.map((handler) => Promise.resolve().then(() => handler(event))),
    );
    results.forEach((r) => {
      if (r.status === 'rejected') {
        console.error(`[events] handler failed for ${type}:`, r.reason?.message || r.reason);
      }
    });
    return event;
  }
}

export const eventBus = new EventBus();
