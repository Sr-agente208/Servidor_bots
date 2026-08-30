// ============================================================
// BOT STORE - JavaScript Completo
// GitHub: Sr-agente208/Servidor_bots
// ============================================================

const REPO_OWNER = 'Sr-agente208';
const REPO_NAME = 'Servidor_bots';
const BOTS_FILE = 'docs/bots.json';
const USERS_FILE = 'docs/users.json';
const RELEASES_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
const CONTENTS_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

let allBots = [];
let allUsers = [];
let currentUser = null;
let currentCategory = 'all';

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    checkSession();
    setupDragDrop();
});

// ============================================================
// PARTICLES (Auth Background)
// ============================================================

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 15 + 10) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        p.style.width = p.style.height = (Math.random() * 4 + 2) + 'px';
        container.appendChild(p);
    }
}

// ============================================================
// SESSION
// ============================================================

function checkSession() {
    const session = localStorage.getItem('botstore_session');
    if (session) {
        try {
            currentUser = JSON.parse(session);
            enterApp();
        } catch (e) {
            showAuth();
        }
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
}

function enterApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'flex';
    updateUserUI();
    loadBots();
}

function updateUserUI() {
    if (!currentUser) return;
    const initial = (currentUser.username || 'U')[0].toUpperCase();

    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('topbarAvatar').textContent = initial;
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userEmail').textContent = currentUser.email || '';
    document.getElementById('dropdownName').textContent = currentUser.username;
    document.getElementById('dropdownEmail').textContent = currentUser.email || '';

    // Settings
    document.getElementById('settingsUser').value = currentUser.username;
    document.getElementById('settingsEmail').value = currentUser.email || '';
    document.getElementById('settingsJoined').value = formatDate(currentUser.joined);
    if (currentUser.github_token) {
        document.getElementById('settingsToken').value = currentUser.github_token;
    }
}

// ============================================================
// AUTH TABS
// ============================================================

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }

    // Clear status
    document.getElementById('loginStatus').className = 'auth-status';
    document.getElementById('regStatus').className = 'auth-status';
}

// ============================================================
// HASH PASSWORD (SHA-256)
// ============================================================

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'botstore_salt_2024');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// REGISTER
// ============================================================

async function handleRegister(event) {
    event.preventDefault();
    const status = document.getElementById('regStatus');
    const btn = document.getElementById('regBtn');

    const username = document.getElementById('regUser').value.trim().toLowerCase();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const passConfirm = document.getElementById('regPassConfirm').value;

    // Validações
    if (username.length < 3) {
        showAuthStatus(status, '❌ Usuário deve ter pelo menos 3 caracteres', 'error');
        return;
    }
    if (pass !== passConfirm) {
        showAuthStatus(status, '❌ As senhas não coincidem', 'error');
        return;
    }
    if (pass.length < 4) {
        showAuthStatus(status, '❌ Senha deve ter pelo menos 4 caracteres', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Criando conta...';
    showAuthStatus(status, '⏳ Verificando disponibilidade...', 'info');

    try {
        // Carregar usuários existentes
        await loadUsers();

        // Verificar se já existe
        if (allUsers.find(u => u.username === username)) {
            showAuthStatus(status, '❌ Este nome de usuário já está em uso', 'error');
            btn.disabled = false;
            btn.textContent = 'Criar Conta';
            return;
        }

        if (allUsers.find(u => u.email === email)) {
            showAuthStatus(status, '❌ Este e-mail já está cadastrado', 'error');
            btn.disabled = false;
            btn.textContent = 'Criar Conta';
            return;
        }

        // Hash da senha
        const hashedPass = await hashPassword(pass);

        // Criar usuário
        const newUser = {
            id: generateId(),
            username,
            email,
            password: hashedPass,
            joined: new Date().toISOString(),
            github_token: ''
        };

        allUsers.push(newUser);

        // Salvar no GitHub
        showAuthStatus(status, '⏳ Salvando dados...', 'info');
        await saveUsers('feat: registrar usuário ' + username);

        // Login automático
        currentUser = { ...newUser };
        delete currentUser.password;
        localStorage.setItem('botstore_session', JSON.stringify(currentUser));

        showAuthStatus(status, '✅ Conta criada com sucesso!', 'success');

        setTimeout(() => enterApp(), 800);

    } catch (error) {
        console.error('Erro no registro:', error);
        showAuthStatus(status, '❌ Erro: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Criar Conta';
    }
}

// ============================================================
// LOGIN
// ============================================================

async function handleLogin(event) {
    event.preventDefault();
    const status = document.getElementById('loginStatus');
    const btn = document.getElementById('loginBtn');

    const username = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;

    btn.disabled = true;
    btn.textContent = 'Entrando...';
    showAuthStatus(status, '⏳ Verificando credenciais...', 'info');

    try {
        await loadUsers();

        const hashedPass = await hashPassword(pass);
        const user = allUsers.find(u => u.username === username && u.password === hashedPass);

        if (!user) {
            showAuthStatus(status, '❌ Usuário ou senha incorretos', 'error');
            btn.disabled = false;
            btn.textContent = 'Entrar';
            return;
        }

        // Login
        currentUser = { ...user };
        delete currentUser.password;
        localStorage.setItem('botstore_session', JSON.stringify(currentUser));

        showAuthStatus(status, '✅ Login realizado!', 'success');
        setTimeout(() => enterApp(), 500);

    } catch (error) {
        console.error('Erro no login:', error);
        showAuthStatus(status, '❌ Erro ao conectar: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar';
    }
}

// ============================================================
// LOGOUT
// ============================================================

function handleLogout() {
    localStorage.removeItem('botstore_session');
    currentUser = null;
    showAuth();
    showToast('Até logo! 👋', 'info');
}

// ============================================================
// USERS MANAGEMENT
// ============================================================

async function loadUsers() {
    try {
        const resp = await fetch(`${CONTENTS_API}/${USERS_FILE}?t=${Date.now()}`);
        if (resp.ok) {
            const data = await resp.json();
            const content = JSON.parse(atob(data.content));
            allUsers = content.users || [];
            window._usersSha = data.sha;
        } else {
            allUsers = [];
            window._usersSha = null;
        }
    } catch (e) {
        allUsers = [];
        window._usersSha = null;
    }
}

async function saveUsers(commitMsg) {
    const body = {
        message: commitMsg,
        content: btoa(unescape(encodeURIComponent(JSON.stringify({ users: allUsers }, null, 2)))),
        branch: 'main'
    };
    if (window._usersSha) body.sha = window._usersSha;

    const resp = await fetch(`${CONTENTS_API}/${USERS_FILE}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || 'Erro ao salvar');
    }

    const result = await resp.json();
    window._usersSha = result.content.sha;
}

// ============================================================
// LOAD BOTS
// ============================================================

async function loadBots() {
    try {
        const resp = await fetch(`${CONTENTS_API}/${BOTS_FILE}?t=${Date.now()}`);
        if (resp.ok) {
            const data = await resp.json();
            const content = JSON.parse(atob(data.content));
            allBots = content.bots || [];
            window._botsSha = data.sha;
        } else {
            allBots = [];
            window._botsSha = null;
        }
    } catch (e) {
        console.error('Erro ao carregar bots:', e);
        allBots = [];
    }

    renderDashboard();
    renderExplore();
    renderMyBots();
}

// ============================================================
// RENDER DASHBOARD
// ============================================================

function renderDashboard() {
    const myBotsCount = currentUser ? allBots.filter(b => b.author === currentUser.username).length : 0;

    document.getElementById('dashTotalBots').textContent = allBots.length;
    document.getElementById('dashTotalDownloads').textContent = allBots.reduce((s, b) => s + (b.downloads || 0), 0);
    document.getElementById('dashTotalUsers').textContent = new Set(allBots.map(b => b.author)).size;
    document.getElementById('dashMyBots').textContent = myBotsCount;

    const recent = [...allBots].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
    const grid = document.getElementById('dashRecentBots');

    if (recent.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🤖</span>
                <h3>Nenhum bot ainda</h3>
                <p>Seja o primeiro a enviar um bot!</p>
                <button class="btn btn-primary" onclick="showPage('upload')">📤 Enviar Bot</button>
            </div>`;
        return;
    }

    grid.innerHTML = recent.map(b => createBotCard(b)).join('');
}

// ============================================================
// RENDER EXPLORE
// ============================================================

function renderExplore() {
    const grid = document.getElementById('exploreGrid');
    const search = document.getElementById('exploreSearch')?.value?.toLowerCase() || '';

    let filtered = [...allBots];

    if (search) {
        filtered = filtered.filter(b =>
            b.name.toLowerCase().includes(search) ||
            b.description.toLowerCase().includes(search) ||
            (b.author || '').toLowerCase().includes(search)
        );
    }

    if (currentCategory !== 'all') {
        filtered = filtered.filter(b => b.category === currentCategory);
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <h3>Nenhum bot encontrado</h3>
                <p>Tente outra busca ou categoria</p>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(b => createBotCard(b)).join('');
}

function filterExplore() {
    renderExplore();
}

function filterByCategory(btn, cat) {
    currentCategory = cat;
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderExplore();
}

// ============================================================
// RENDER MY BOTS
// ============================================================

function renderMyBots() {
    const grid = document.getElementById('myBotsGrid');
    if (!currentUser) return;

    const myBots = allBots.filter(b => b.author === currentUser.username);

    if (myBots.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <h3>Você ainda não enviou nenhum bot</h3>
                <p>Compartilhe seu primeiro bot com a comunidade!</p>
                <button class="btn btn-primary" onclick="showPage('upload')">📤 Enviar Bot</button>
            </div>`;
        return;
    }

    grid.innerHTML = myBots.map(b => `
        <div class="bot-card" onclick="showBotDetail('${b.id}')">
            <div class="bot-card-top">
                <h3>${esc(b.name)}</h3>
                <span class="bot-badge badge-${b.category || 'outros'}">${getCatLabel(b.category)}</span>
            </div>
            <p class="bot-card-desc">${esc(b.description)}</p>
            <div class="bot-card-meta">
                <span>📦 v${esc(b.version || '1.0.0')}</span>
                <span>⬇️ ${b.downloads || 0}</span>
                <span>📅 ${formatDate(b.created_at)}</span>
            </div>
            <div class="bot-card-actions">
                <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); downloadBot('${b.id}')">⬇️ Download</button>
                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteBot('${b.id}')">🗑️ Excluir</button>
            </div>
        </div>
    `).join('');
}

// ============================================================
// BOT CARD COMPONENT
// ============================================================

function createBotCard(bot) {
    return `
        <div class="bot-card" onclick="showBotDetail('${bot.id}')">
            <div class="bot-card-top">
                <h3>${esc(bot.name)}</h3>
                <span class="bot-badge badge-${bot.category || 'outros'}">${getCatLabel(bot.category)}</span>
            </div>
            <p class="bot-card-desc">${esc(bot.description)}</p>
            <div class="bot-card-meta">
                <span>👤 ${esc(bot.author || 'Anônimo')}</span>
                <span>📦 v${esc(bot.version || '1.0.0')}</span>
                <span>⬇️ ${bot.downloads || 0}</span>
                <span>📅 ${formatDate(bot.created_at)}</span>
            </div>
            <div class="bot-card-actions">
                <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); downloadBot('${bot.id}')">⬇️ Download</button>
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); showBotDetail('${bot.id}')">👁️ Ver</button>
            </div>
        </div>`;
}

// ============================================================
// BOT DETAIL MODAL
// ============================================================

function showBotDetail(botId) {
    const bot = allBots.find(b => b.id === botId);
    if (!bot) return;

    document.getElementById('modalBody').innerHTML = `
        <div class="modal-bot-header">
            <div class="modal-bot-icon">🤖</div>
            <div class="modal-bot-info">
                <h2>${esc(bot.name)}</h2>
                <div class="bot-card-meta" style="margin-bottom:0">
                    <span class="bot-badge badge-${bot.category || 'outros'}">${getCatLabel(bot.category)}</span>
                    <span>👤 ${esc(bot.author || 'Anônimo')}</span>
                    <span>📦 v${esc(bot.version || '1.0.0')}</span>
                    <span>⬇️ ${bot.downloads || 0} downloads</span>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <h4>Descrição</h4>
            <p>${esc(bot.description)}</p>
        </div>

        ${bot.readme ? `
        <div class="modal-section">
            <h4>README</h4>
            <div class="modal-readme">${esc(bot.readme)}</div>
        </div>` : ''}

        <div class="modal-section">
            <h4>Informações</h4>
            <p>📄 Arquivo: ${esc(bot.filename || 'N/A')}<br>
            💾 Tamanho: ${formatSize(bot.file_size)}<br>
            📅 Enviado em: ${formatDate(bot.created_at)}</p>
        </div>

        <div class="modal-actions">
            <button class="btn btn-success" onclick="downloadBot('${bot.id}')">⬇️ Download</button>
            <button class="btn btn-ghost" onclick="closeModal('botModal')">Fechar</button>
        </div>`;

    document.getElementById('botModal').classList.add('active');
}

// ============================================================
// DOWNLOAD
// ============================================================

async function downloadBot(botId) {
    const bot = allBots.find(b => b.id === botId);
    if (!bot) return;

    bot.downloads = (bot.downloads || 0) + 1;

    if (bot.download_url) {
        window.open(bot.download_url, '_blank');
        showToast('⬇️ Download iniciado!', 'success');
        return;
    }

    // Tentar buscar da release
    try {
        const resp = await fetch(`${RELEASES_API}/tags/bot-${botId}`);
        if (resp.ok) {
            const release = await resp.json();
            const asset = release.assets?.find(a => a.name === bot.filename);
            if (asset) {
                window.open(asset.browser_download_url, '_blank');
                showToast('⬇️ Download iniciado!', 'success');
                return;
            }
        }
    } catch (e) {}

    showToast('❌ Arquivo não disponível', 'error');
}

// ============================================================
// UPLOAD
// ============================================================

async function handleUpload(event) {
    event.preventDefault();

    const token = currentUser?.github_token;
    if (!token) {
        showToast('⚠️ Configure seu GitHub Token nas Configurações', 'error');
        showPage('settings');
        return;
    }

    const name = document.getElementById('botName').value.trim();
    const category = document.getElementById('botCategory').value;
    const description = document.getElementById('botDescription').value.trim();
    const version = document.getElementById('botVersion').value.trim() || '1.0.0';
    const price = document.getElementById('botPrice').value;
    const readme = document.getElementById('botReadme').value.trim();
    const fileInput = document.getElementById('botFile');
    const status = document.getElementById('uploadStatus');
    const btn = document.getElementById('submitBtn');

    if (!fileInput.files[0]) {
        showUploadStatus(status, '❌ Selecione um arquivo', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Enviando...';

    try {
        const file = fileInput.files[0];
        const botId = generateId();

        // 1. Criar release
        showUploadStatus(status, '📦 Criando release no GitHub...', 'info');

        const releaseResp = await fetch(RELEASES_API, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                tag_name: `bot-${botId}`,
                name: `${name} v${version}`,
                body: description,
                draft: false,
                prerelease: false
            })
        });

        if (!releaseResp.ok) {
            const err = await releaseResp.json();
            throw new Error(err.message || 'Erro ao criar release');
        }

        const release = await releaseResp.json();

        // 2. Upload arquivo
        showUploadStatus(status, '📤 Enviando arquivo (' + formatSize(file.size) + ')...', 'info');

        const uploadUrl = `https://uploads.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}/assets?name=${encodeURIComponent(file.name)}`;

        const uploadResp = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/octet-stream'
            },
            body: file
        });

        if (!uploadResp.ok) throw new Error('Erro ao enviar arquivo');

        const asset = await uploadResp.json();

        // 3. Atualizar bots.json
        showUploadStatus(status, '💾 Registrando bot...', 'info');

        const newBot = {
            id: botId,
            name,
            category,
            description,
            version,
            price,
            author: currentUser.username,
            readme,
            filename: file.name,
            file_size: file.size,
            download_url: asset.browser_download_url,
            release_tag: `bot-${botId}`,
            downloads: 0,
            created_at: new Date().toISOString()
        };

        await saveBotsJson(newBot, 'feat: adicionar bot "' + name + '"');

        showUploadStatus(status, '✅ Bot publicado com sucesso!', 'success');
        showToast('🎉 Bot publicado com sucesso!', 'success');

        // Reset form
        document.getElementById('uploadForm').reset();
        document.getElementById('botVersion').value = '1.0.0';
        document.getElementById('fileDropContent').innerHTML = `
            <span class="file-icon">📁</span>
            <p>Arraste o arquivo aqui ou <strong>clique para selecionar</strong></p>
            <small>.zip, .js, .py, .json (máx. 50MB)</small>`;

        setTimeout(() => loadBots(), 2000);

    } catch (error) {
        console.error('Erro no upload:', error);
        showUploadStatus(status, '❌ ' + error.message, 'error');
        showToast('❌ ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Publicar Bot';
    }
}

async function saveBotsJson(newBot, commitMsg) {
    // Carregar bots atuais
    let currentContent = { bots: [] };
    let sha = null;

    try {
        const resp = await fetch(`${CONTENTS_API}/${BOTS_FILE}?t=${Date.now()}`);
        if (resp.ok) {
            const data = await resp.json();
            sha = data.sha;
            currentContent = JSON.parse(atob(data.content));
        }
    } catch (e) {}

    if (!currentContent.bots) currentContent.bots = [];
    currentContent.bots.push(newBot);
    currentContent.last_updated = new Date().toISOString();

    const body = {
        message: commitMsg,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(currentContent, null, 2)))),
        branch: 'main'
    };
    if (sha) body.sha = sha;

    const resp = await fetch(`${CONTENTS_API}/${BOTS_FILE}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${currentUser.github_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || 'Erro ao salvar');
    }
}

// ============================================================
// DELETE BOT
// ============================================================

async function deleteBot(botId) {
    if (!confirm('Tem certeza que deseja excluir este bot?')) return;

    const token = currentUser?.github_token;
    if (!token) {
        showToast('⚠️ Configure seu GitHub Token', 'error');
        return;
    }

    try {
        let sha = null;
        let currentContent = { bots: [] };

        const resp = await fetch(`${CONTENTS_API}/${BOTS_FILE}?t=${Date.now()}`);
        if (resp.ok) {
            const data = await resp.json();
            sha = data.sha;
            currentContent = JSON.parse(atob(data.content));
        }

        currentContent.bots = (currentContent.bots || []).filter(b => b.id !== botId);

        const body = {
            message: `feat: remover bot ${botId}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(currentContent, null, 2)))),
            branch: 'main'
        };
        if (sha) body.sha = sha;

        await fetch(`${CONTENTS_API}/${BOTS_FILE}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        showToast('🗑️ Bot excluído!', 'success');
        loadBots();

    } catch (error) {
        showToast('❌ ' + error.message, 'error');
    }
}

// ============================================================
// GITHUB TOKEN
// ============================================================

async function saveGithubToken() {
    const token = document.getElementById('settingsToken').value.trim();
    const status = document.getElementById('tokenStatus');

    if (!token) {
        status.innerHTML = '<span style="color: var(--red);">❌ Token é obrigatório</span>';
        return;
    }

    currentUser.github_token = token;

    // Atualizar no arquivo de usuários
    try {
        await loadUsers();
        const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex >= 0) {
            allUsers[userIndex].github_token = token;
            await saveUsers('feat: atualizar token de ' + currentUser.username);
        }
    } catch (e) {
        console.error('Erro ao salvar token:', e);
    }

    localStorage.setItem('botstore_session', JSON.stringify(currentUser));
    status.innerHTML = '<span style="color: var(--green);">✅ Token salvo com sucesso!</span>';
    showToast('✅ Token GitHub salvo!', 'success');
}

// ============================================================
// NAVIGATION
// ============================================================

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector(`[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Fechar sidebar no mobile
    document.getElementById('sidebar').classList.remove('open');

    // Fechar dropdown
    document.getElementById('userDropdown').classList.remove('active');

    // Refresh data
    if (page === 'mybots') renderMyBots();
    if (page === 'dashboard') renderDashboard();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('active');
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar-user')) {
        document.getElementById('userDropdown')?.classList.remove('active');
    }
});

// ============================================================
// GLOBAL SEARCH
// ============================================================

function handleGlobalSearch() {
    const query = document.getElementById('globalSearch').value;
    if (query.length > 0) {
        showPage('explore');
        document.getElementById('exploreSearch').value = query;
        renderExplore();
    }
}

// ============================================================
// FILE DRAG & DROP
// ============================================================

function setupDragDrop() {
    const drop = document.getElementById('fileDrop');
    if (!drop) return;

    ['dragenter', 'dragover'].forEach(e => {
        drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('dragover'); });
    });

    ['dragleave', 'drop'].forEach(e => {
        drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('dragover'); });
    });

    drop.addEventListener('drop', (ev) => {
        const files = ev.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('botFile').files = files;
            handleFileSelect(document.getElementById('botFile'));
        }
    });
}

function handleFileSelect(input) {
    const content = document.getElementById('fileDropContent');
    if (input.files[0]) {
        const file = input.files[0];
        content.innerHTML = `
            <span class="file-icon">✅</span>
            <p class="file-selected">${esc(file.name)}</p>
            <small>${formatSize(file.size)}</small>`;
    }
}

// ============================================================
// MODAL
// ============================================================

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});

// ============================================================
// TOAST
// ============================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// HELPERS
// ============================================================

function showAuthStatus(el, msg, type) {
    el.textContent = msg;
    el.className = `auth-status ${type}`;
}

function showUploadStatus(el, msg, type) {
    el.textContent = msg;
    el.className = `upload-status ${type}`;
}

function esc(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function formatDate(d) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('pt-BR');
}

function formatSize(bytes) {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

function getCatLabel(cat) {
    const m = { atendimento: '📞 Atendimento', vendas: '💰 Vendas', utilidades: '🔧 Utilidades', jogos: '🎮 Jogos', outros: '📦 Outros' };
    return m[cat] || '📦 Outros';
}

function generateId() {
    return Math.random().toString(36).substring(2, 10);
}
