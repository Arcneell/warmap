/**
 * Simple hash-based SPA router.
 * Routes: #map, #bluetooth, #cell, #leaderboard, #advanced-stats, #my-stats, #uploads
 */

import { $ } from './utils.js';

const routes = {};
let currentRoute = null;

export function registerRoute(hash, { nav, page, onEnter, onLeave }) {
    routes[hash] = { nav, page, onEnter, onLeave };
}

export function navigate(hash) {
    if (hash === currentRoute) return;
    const previous = routes[currentRoute];
    if (previous && previous.onLeave) previous.onLeave();
    currentRoute = hash;
    window.location.hash = hash;

    Object.entries(routes).forEach(([h, { nav, page }]) => {
        const isActive = h === hash;
        if (nav) nav.classList.toggle('active', isActive);
        if (page) {
            if (page.id === 'map') {
                page.style.display = isActive ? '' : 'none';
            } else {
                page.style.display = isActive ? 'flex' : 'none';
            }
        }
    });

    // Sidebar only visible on map
    const sidebar = $('sidebar');
    if (sidebar) sidebar.style.display = hash === '#map' ? '' : 'none';

    const route = routes[hash];
    if (route && route.onEnter) route.onEnter();
}

export function initRouter() {
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash || '#map';
        navigate(hash);
    });

    // Initial route
    const hash = window.location.hash || '#map';
    navigate(hash);
}
