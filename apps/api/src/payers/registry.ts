import type { PayerId } from '@eligibility/shared';
import type { PayerAdapter } from './PayerAdapter.js';

/**
 * Routes a payerId to its adapter. Adding a payer = registering one adapter;
 * nothing else in the app changes.
 */
export class PayerRegistry {
  private readonly adapters = new Map<PayerId, PayerAdapter>();

  register(adapter: PayerAdapter): this {
    this.adapters.set(adapter.payerId, adapter);
    return this;
  }

  get(payerId: PayerId): PayerAdapter {
    const adapter = this.adapters.get(payerId);
    if (!adapter) throw new Error(`No payer adapter registered for "${payerId}"`);
    return adapter;
  }
}
