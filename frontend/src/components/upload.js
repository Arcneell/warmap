import { $ } from '../utils.js';
import { authFetch } from '../api.js';
import { loadGeoJSON } from '../pages/map.js';
import { loadProfile, loadStats } from '../pages/sidebar.js';

export function initUpload() {
    const uploadModal = $('uploadModal');
    const dropZone = $('dropZone');
    const fileInput = $('fileInput');
    const progressBar = $('progressBar');
    const progressFill = $('progressFill');
    const uploadResult = $('uploadResult');

    $('uploadBtn').addEventListener('click', () => {
        uploadModal.classList.add('active');
        resetUploadUI();
    });

    $('closeModal').addEventListener('click', () => uploadModal.classList.remove('active'));
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) uploadModal.classList.remove('active');
    });

    $('browseBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) uploadFiles(fileInput.files);
    });

    function resetUploadUI() {
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';
        progressFill.style.background = '';
        uploadResult.style.display = 'none';
        fileInput.value = '';
    }

    async function uploadFiles(fileList) {
        progressBar.style.display = 'block';
        uploadResult.style.display = 'none';
        progressFill.style.width = '30%';

        const form = new FormData();
        for (const file of fileList) form.append('files', file);

        try {
            progressFill.style.width = '50%';
            const res = await authFetch('/api/v1/upload', { method: 'POST', body: form });

            if (!res.ok) throw new Error('Upload failed');

            const transactions = await res.json();
            progressFill.style.width = '70%';

            // Poll for completion
            let totalNew = 0, totalUpdated = 0, totalSkipped = 0, totalXp = 0;
            for (const tx of transactions) {
                const status = await pollTransaction(tx.transaction_id);
                totalNew += status.new_networks || 0;
                totalUpdated += status.updated_networks || 0;
                totalSkipped += status.skipped_networks || 0;
                totalXp += status.xp_earned || 0;
            }

            progressFill.style.width = '100%';
            $('resImported').textContent = totalNew;
            $('resUpdated').textContent = totalUpdated;
            $('resSkipped').textContent = totalSkipped;
            $('resXp').textContent = '+' + totalXp;
            uploadResult.style.display = 'block';

            loadStats();
            loadGeoJSON();
            loadProfile();
        } catch (e) {
            console.error('Upload error:', e);
            progressFill.style.background = '#dc3545';
        }
    }

    async function pollTransaction(txId) {
        for (let i = 0; i < 60; i++) {
            const res = await authFetch(`/api/v1/upload/status/${txId}`);
            if (!res.ok) break;
            const data = await res.json();
            if (data.status === 'done' || data.status === 'error') return data;
            await new Promise(r => setTimeout(r, 1000));
        }
        return {};
    }
}
