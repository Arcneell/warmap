/**
 * Simple reactive state store.
 * Components can subscribe to state changes.
 */

const state = {
    accessToken: null,
    tokenExpiresAt: 0,
    currentUser: null,
    mineOnly: false,
    viewMode: 'markers',
    showBtLayer: false,
    showCellLayer: false,
};

const listeners = new Map();

export function getState(key) {
    return state[key];
}

export function setState(key, value) {
    state[key] = value;
    const cbs = listeners.get(key);
    if (cbs) cbs.forEach(cb => cb(value));
}

export function subscribe(key, callback) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(callback);
    return () => listeners.get(key).delete(callback);
}
