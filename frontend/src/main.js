/**
 * Wardrove - Main entry point
 *
 * ES module architecture:
 *   main.js -> auth, router, pages/*, components/*
 *   state.js -> reactive state store
 *   api.js -> authFetch with auto-refresh
 */

import { initAuth, setupAuthListeners } from './auth.js';
import { registerRoute, navigate, initRouter } from './router.js';
import { initMap, onMapEnter, loadGeoJSON } from './pages/map.js';
import { loadProfile, loadStats, setupProfileListeners } from './pages/sidebar.js';
import { initBluetooth, loadBluetooth } from './pages/bluetooth.js';
import { initCell, loadCellTowers } from './pages/cell.js';
import { initLeaderboard, loadLeaderboard } from './pages/leaderboard.js';
import { initGroups, loadGroups } from './pages/groups.js';
import { initUpload } from './components/upload.js';
import { $ } from './utils.js';

// Initialize all modules
setupAuthListeners();
setupProfileListeners();
initMap();
initBluetooth();
initCell();
initLeaderboard();
initGroups();
initUpload();

// Register routes
registerRoute('#map', {
    nav: $('navMap'),
    page: $('map'),
    onEnter: onMapEnter,
});
registerRoute('#bluetooth', {
    nav: $('navBt'),
    page: $('btPage'),
    onEnter: loadBluetooth,
});
registerRoute('#cell', {
    nav: $('navCell'),
    page: $('cellPage'),
    onEnter: loadCellTowers,
});
registerRoute('#leaderboard', {
    nav: $('navLeaderboard'),
    page: $('leaderboardPage'),
    onEnter: loadLeaderboard,
});
registerRoute('#groups', {
    nav: $('navGroups'),
    page: $('groupsPage'),
    onEnter: loadGroups,
});

// Export button
$('exportBtn').addEventListener('click', () => {
    window.location.href = '/api/v1/export/wigle-csv';
});

// Hamburger menu
$('hamburgerBtn').addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
});

// Boot
initAuth();
loadProfile();
loadStats();
initRouter();
