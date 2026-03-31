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
import { initMap, onMapEnter, onMapLeave, loadGeoJSON } from './pages/map.js';
import { loadProfile, loadStats, setupProfileListeners } from './pages/sidebar.js';
import { initBluetooth, loadBluetooth } from './pages/bluetooth.js';
import { initCell, loadCellTowers } from './pages/cell.js';
import { initLeaderboard, loadLeaderboard } from './pages/leaderboard.js';
import { loadAdvancedStats } from './pages/advanced-stats.js';
import { loadMyStats } from './pages/my-stats.js';
import { onUploadsEnter, onUploadsLeave } from './pages/uploads.js';
import { initUpload } from './components/upload.js';
import { $ } from './utils.js';

// Initialize all modules
setupAuthListeners();
setupProfileListeners();
initMap();
initBluetooth();
initCell();
initLeaderboard();
initUpload();

// Register routes
registerRoute('#map', {
    nav: $('navMap'),
    page: $('map'),
    onEnter: onMapEnter,
    onLeave: onMapLeave,
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
registerRoute('#advanced-stats', {
    nav: $('navAdvancedStats'),
    page: $('advancedStatsPage'),
    onEnter: loadAdvancedStats,
});
registerRoute('#my-stats', {
    nav: $('navMyStats'),
    page: $('myStatsPage'),
    onEnter: loadMyStats,
});
registerRoute('#uploads', {
    nav: $('navUploads'),
    page: $('uploadsPage'),
    onEnter: onUploadsEnter,
    onLeave: onUploadsLeave,
});

// Header nav buttons
$('navMap').addEventListener('click', () => navigate('#map'));
$('navBt').addEventListener('click', () => navigate('#bluetooth'));
$('navCell').addEventListener('click', () => navigate('#cell'));
$('navLeaderboard').addEventListener('click', () => navigate('#leaderboard'));
$('navAdvancedStats').addEventListener('click', () => navigate('#advanced-stats'));
$('navMyStats').addEventListener('click', () => navigate('#my-stats'));
$('navUploads').addEventListener('click', () => navigate('#uploads'));

// Hamburger menu
$('hamburgerBtn').addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
});

// Boot
initAuth();
loadProfile();
loadStats();
initRouter();
