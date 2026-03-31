import { authFetch, refreshToken } from './api.js';
import { $, escapeHtml } from './utils.js';
import { getState, setState } from './state.js';

export async function initAuth() {
    const loggedIn = await handleAuthCode();
    if (loggedIn) {
        await loadAuthUser();
        return;
    }
    const refreshed = await refreshToken();
    if (refreshed) {
        await loadAuthUser();
    } else {
        updateAuthUI(null);
    }
}

async function handleAuthCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('auth_code');
    if (!code) return false;
    window.history.replaceState({}, '', '/');
    try {
        const res = await fetch('/api/v1/auth/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auth_code: code }),
        });
        if (res.ok) {
            const data = await res.json();
            setState('accessToken', data.access_token);
            setState('tokenExpiresAt', Date.now() + data.expires_in * 1000);
            return true;
        }
    } catch (e) {
        console.error('Auth exchange failed:', e);
    }
    return false;
}

async function loadAuthUser() {
    try {
        const res = await authFetch('/api/v1/auth/me');
        if (res.ok) {
            const user = await res.json();
            setState('currentUser', user);
            updateAuthUI(user);
            return user;
        }
    } catch (e) {}
    updateAuthUI(null);
    return null;
}

function updateAuthUI(user) {
    const loginBtn = $('loginBtn');
    const logoutBtn = $('logoutBtn');
    const headerProfile = $('headerProfile');
    const headerAvatar = $('headerAvatar');

    if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = '';
        headerProfile.style.display = '';
        $('headerPseudo').textContent = user.username;
        $('headerLevel').textContent = 'Lvl ' + user.level;
        if (user.avatar_url) {
            headerAvatar.src = user.avatar_url;
            headerAvatar.style.display = '';
        } else {
            headerAvatar.style.display = 'none';
        }
    } else {
        loginBtn.style.display = '';
        logoutBtn.style.display = 'none';
        headerAvatar.style.display = 'none';
    }

    // Update mine button
    const btnMine = $('btnMineOnly');
    if (btnMine) {
        btnMine.style.display = getState('accessToken') ? '' : 'none';
    }
}

export function setupAuthListeners() {
    $('headerProfile').addEventListener('click', () => {
        if (getState('accessToken')) {
            $('newTokenDisplay').style.display = 'none';
            loadTokenList();
            $('tokenModal').classList.add('active');
        }
    });

    $('loginBtn').addEventListener('click', () => $('loginModal').classList.add('active'));
    $('closeLoginModal').addEventListener('click', () => $('loginModal').classList.remove('active'));
    $('loginModal').addEventListener('click', (e) => {
        if (e.target.id === 'loginModal') e.target.classList.remove('active');
    });

    const githubBtn = $('loginGithub');
    if (githubBtn) githubBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/v1/auth/login/github');
            const data = await res.json();
            window.location.href = data.redirect_url;
        } catch (e) { console.error('GitHub login failed:', e); }
    });

    $('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
        setState('accessToken', null);
        setState('tokenExpiresAt', 0);
        setState('currentUser', null);
        updateAuthUI(null);
    });

    $('closeTokenModal').addEventListener('click', () => $('tokenModal').classList.remove('active'));
    $('tokenModal').addEventListener('click', (e) => {
        if (e.target.id === 'tokenModal') e.target.classList.remove('active');
    });

    $('createTokenBtn').addEventListener('click', async () => {
        const name = $('tokenNameInput').value.trim();
        if (!name) return;
        try {
            const res = await authFetch('/api/v1/auth/tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                const data = await res.json();
                $('newTokenValue').textContent = data.token;
                $('newTokenDisplay').style.display = '';
                $('tokenNameInput').value = '';
                loadTokenList();
            }
        } catch (e) { console.error('Token creation failed:', e); }
    });
}

async function loadTokenList() {
    try {
        const res = await authFetch('/api/v1/auth/tokens');
        if (!res.ok) return;
        const tokens = await res.json();
        const container = $('tokenList');
        if (tokens.length === 0) {
            container.innerHTML = '<div style="color:var(--text-secondary);font-size:0.85rem;">No API tokens yet</div>';
            return;
        }
        container.innerHTML = tokens.map(t => {
            const date = new Date(t.created_at).toLocaleDateString();
            const revokedCls = t.revoked ? ' token-revoked' : '';
            const revokeBtn = t.revoked ? '<span style="color:var(--text-secondary);font-size:0.75rem;">revoked</span>' : `<button class="token-revoke" onclick="window.__revokeToken(${t.id})">Revoke</button>`;
            return `<div class="token-item">
                <div><span class="token-name${revokedCls}">${escapeHtml(t.name)}</span><br><span class="token-meta">Created ${date}</span></div>
                ${revokeBtn}
            </div>`;
        }).join('');
    } catch (e) {}
}

window.__revokeToken = async function(tokenId) {
    try {
        await authFetch(`/api/v1/auth/tokens/${tokenId}`, { method: 'DELETE' });
        loadTokenList();
    } catch (e) {}
};
