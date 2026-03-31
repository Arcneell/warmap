import { authFetch } from '../api.js';
import { $, escapeHtml } from '../utils.js';

let refreshTimer = null;
const PAGE_SIZE = 50;
let currentOffset = 0;

function statusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'done') return '<span class="upload-badge done">Done</span>';
    if (s === 'error') return '<span class="upload-badge error">Error</span>';
    if (s === 'processing') return '<span class="upload-badge processing">Processing</span>';
    return '<span class="upload-badge pending">Pending</span>';
}

function fmtDate(v) {
    if (!v) return '--';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '--' : d.toLocaleString();
}

export async function loadUploads() {
    const tbody = $('uploadsTableBody');
    const headerBadge = $('uploadStatusBadge');
    if (!tbody) return;
    try {
        const res = await authFetch(`/api/v1/upload?limit=${PAGE_SIZE}&offset=${currentOffset}`);
        if (!res.ok) {
            tbody.innerHTML = '<tr><td colspan="8" class="bt-empty">Login required</td></tr>';
            return;
        }
        const rows = await res.json();
        const hasActiveJobs = rows.some((r) => ['pending', 'processing'].includes((r.status || '').toLowerCase()));
        if (headerBadge) {
            headerBadge.style.display = hasActiveJobs ? '' : 'none';
            headerBadge.classList.toggle('active', hasActiveJobs);
        }
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="bt-empty">No uploads yet</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map((r) => {
            const processed = (r.new_networks || 0) + (r.updated_networks || 0);
            return `<tr>
                <td>${escapeHtml(r.filename || '--')}</td>
                <td>${statusBadge(r.status)}</td>
                <td>${processed}</td>
                <td>${r.skipped_networks || 0}</td>
                <td>${r.xp_earned || 0}</td>
                <td>${fmtDate(r.uploaded_at)}</td>
                <td>${fmtDate(r.completed_at)}</td>
                <td>${escapeHtml(r.status_message || '--')}</td>
            </tr>`;
        }).join('');
        const pageInfo = $('uploadsPageInfo');
        const prevBtn = $('uploadsPrev');
        const nextBtn = $('uploadsNext');
        if (pageInfo) pageInfo.textContent = `Page ${Math.floor(currentOffset / PAGE_SIZE) + 1}`;
        if (prevBtn) prevBtn.disabled = currentOffset === 0;
        if (nextBtn) nextBtn.disabled = rows.length < PAGE_SIZE;
    } catch (e) {
        console.error('Failed to load uploads history:', e);
        tbody.innerHTML = '<tr><td colspan="8" class="bt-empty">Failed to load history</td></tr>';
    }
}

export function onUploadsEnter() {
    loadUploads();
    const refreshBtn = $('refreshUploadsBtn');
    if (refreshBtn) refreshBtn.onclick = loadUploads;
    const prevBtn = $('uploadsPrev');
    const nextBtn = $('uploadsNext');
    if (prevBtn) prevBtn.onclick = () => {
        currentOffset = Math.max(0, currentOffset - PAGE_SIZE);
        loadUploads();
    };
    if (nextBtn) nextBtn.onclick = () => {
        currentOffset += PAGE_SIZE;
        loadUploads();
    };
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(loadUploads, 3000);
}

export function onUploadsLeave() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}
