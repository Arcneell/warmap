import { getState, setState } from './state.js';

export function authHeaders() {
    const token = getState('accessToken');
    if (token) return { 'Authorization': `Bearer ${token}` };
    return {};
}

export async function authFetch(url, opts = {}) {
    const token = getState('accessToken');
    const expiresAt = getState('tokenExpiresAt');
    if (token && Date.now() > expiresAt - 30000) {
        await refreshToken();
    }
    opts.headers = { ...opts.headers, ...authHeaders() };
    return fetch(url, opts);
}

export async function refreshToken() {
    try {
        const res = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setState('accessToken', data.access_token);
            setState('tokenExpiresAt', Date.now() + data.expires_in * 1000);
            return true;
        }
    } catch (e) {}
    setState('accessToken', null);
    setState('tokenExpiresAt', 0);
    return false;
}
