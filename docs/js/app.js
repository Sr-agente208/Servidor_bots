// ============================================================
// BOT STORE - JavaScript
// GitHub: Sr-agente208/Servidor_bots
// ============================================================

const REPO_OWNER = 'Sr-agente208';
const REPO_NAME = 'Servidor_bots';
const BOTS_FILE = 'docs/bots.json';
const RELEASES_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
const CONTENTS_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${BOTS_FILE}`;

// ============================================================
// STATE
// ============================================================

let allBots = [];
let currentSection = 'browse';

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loadBots();
    loadSavedConfig();
    setupDragDrop();
    createToastContainer();
});

// ============================================================
// CONFIG (GitHub Token)
// ============================================================

function loadSavedConfig() {
    const token = localStorage.getItem('gh_token');
    const user = localStorage.getItem('gh_user');
    if (token) document.getElementById('githubToken').value = token;
    if (user) document.getElementById('githubUser').value = user;
    updateLoginBtn();
}

function saveConfig() {
    const token = document.getElementById('githubToken').value.trim();
    const user = document.getElementById('githubUser').value.trim();
    const status = document.getElementById('configStatus');

    if (!token) {
        showStatus(status, '❌ Token é obrigatório', 'error');
        return;
    }

    localStorage.setItem('gh_token', token);
    if (user) localStorage.setItem('gh_user', user);

    showStatus(status, '✅ Configuração salva!', 'success');
    updateLoginBtn();

    setTimeout(() => closeModal('configModal'), 1000);
}

function updateLoginBtn() {
    const btn = document.getElementById('loginBtn');
    const user = localStorage.getItem('gh_user');
    if (user) {
        btn.textContent = `👤 ${user}`;
        btn.onclick = showConfig;
    }
}

function getToken() {
    return localStorage.getItem('gh_token');
}

function showConfig() {
    document.getElementById('configModal').classList.add('active');
}

// ============================================================
// NAVIGATION
// ============================================================

function showSection(section) {
    currentSection = section;

    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    // Show target
    document.getElementById(`${section}Section`).classList.add('active');

    // Update nav buttons
    document.querySelectorAll('.nav .btn-ghost').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    // Load my bots if needed
    if (section === 'mybots') loadMyBots();

    // Close mobile menu
    document.querySelector('.nav').classList.remove('active');
}

function toggleMenu() {
    document.querySelector('.nav').classList.toggle('active');
}

// ============================================================
// LOAD BOTS
// ============================================================

async function loadBots() {
    const grid = document.getElementById('botsGrid');

    try {
        const response = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${BOTS_FILE}?t=${Date.now()}`);

        if (response.ok) {
            const data = await response.json();
            allBots = data.bots || [];
        } else {
            allBots = [];
        }
    } catch (error) {
        console.error('Erro ao carregar bots:', error);
        allBots = [];
    }

    renderBots(allBots, grid);
    updateStats();
}

function renderBots(bots, container) {
    if (bots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🤖</span>
                <h3>Nenhum bot encontrado</h3>
                <p>Seja o primeiro a enviar um bot!</p>
                <button class="btn btn-primary" onclick="showSection('upload')">📤 Enviar Bot</button>
            </div>
        `;
        return;
    }

    container.innerHTML = bots.map(bot => `
        <div class="bot-card" onclick="showBotDetail('${bot.id}')">
            <div class="bot-card-header">
                <h3>${escapeHtml(bot.name)}</h3>
                <span class="bot-category cat-${bot.category || 'outros'}">${getCategoryLabel(bot.category)}</span>
            </div>
            <p class="bot-description">${escapeHtml(bot.description)}</p>
            <div class="bot-meta">
                <span>👤 ${escapeHtml(bot.author || 'Anônimo')}</span>
                <span>📦 ${escapeHtml(bot.version || '1.0.0')}</span>
                <span>⬇️ ${bot.downloads || 0}</span>
                <span>📅 ${formatDate(bot.created_at)}</span>
            </div>
            <div class="bot-actions">
                <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); downloadBot('${bot.id}')">⬇️ Download</button>
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); showBotDetail('${bot.id}')">👁️ Detalhes</button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    document.getElementById('totalBots').textContent = allBots.length;
    document.getElementById('totalDownloads').textContent = allBots.reduce((sum, b) => sum + (b.downloads || 0), 0);
    document.getElementById('totalUsers').textContent = new Set(allBots.map(b => b.author)).size;
}

// ============================================================
// FILTER
// ============================================================

function filterBots() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;

    let filtered = allBots;

    if (search) {
        filtered = filtered.filter(b =>
            b.name.toLowerCase().includes(search) ||
            b.description.toLowerCase().includes(search) ||
            (b.author || '').toLowerCase().includes(search)
        );
    }

    if (category !== 'all') {
        filtered = filtered.filter(b => b.category === category);
    }

    renderBots(filtered, document.getElementById('botsGrid'));
}

// ============================================================
// BOT DETAIL
// ============================================================

function showBotDetail(botId) {
    const bot = allBots.find(b => b.id === botId);
    if (!bot) return;

    document.getElementById('modalBotName').textContent = bot.name;
    document.getElementById('modalBotContent').innerHTML = `
        <div class="bot-detail-header">
            <div class="bot-detail-icon">🤖</div>
            <div class="bot-detail-info">
                <h3>${escapeHtml(bot.name)}</h3>
                <div class="bot-meta">
                    <span class="bot-category cat-${bot.category || 'outros'}">${getCategoryLabel(bot.category)}</span>
                    <span>👤 ${escapeHtml(bot.author || 'Anônimo')}</span>
                    <span>📦 v${escapeHtml(bot.version || '1.0.0')}</span>
                    <span>⬇️ ${bot.downloads || 0} downloads</span>
                </div>
            </div>
        </div>

        <div class="bot-detail-section">
            <h4>Descrição</h4>
            <p>${escapeHtml(bot.description)}</p>
        </div>

        ${bot.readme ? `
        <div class="bot-detail-section">
            <h4>README</h4>
            <div class="bot-detail-readme">${escapeHtml(bot.readme)}</div>
        </div>
        ` : ''}

        <div class="bot-detail-section">
            <h4>Informações</h4>
            <div class="bot-meta" style="flex-direction: column; gap: 0.5rem;">
                <span>📄 Arquivo: ${escapeHtml(bot.filename || 'N/A')}</span>
                <span>💾 Tamanho: ${formatSize(bot.file_size)}</span>
                <span>📅 Enviado em: ${formatDate(bot.created_at)}</span>
            </div>
        </div>

        <div class="bot-detail-actions">
            <button class="btn btn-success" onclick="downloadBot('${bot.id}')">⬇️ Download</button>
            <button class="btn btn-ghost" onclick="closeModal('botModal')">Fechar</button>
        </div>
    `;

    document.getElementById('botModal').classList.add('active');
}

// ============================================================
// DOWNLOAD
// ============================================================

async function downloadBot(botId) {
    const bot = allBots.find(b => b.id === botId);
    if (!bot) return;

    // Increment download count
    bot.downloads = (bot.downloads || 0) + 1;

    // Try to download from release
    try {
        const releaseTag = `bot-${botId}`;
        const releaseResp = await fetch(`${RELEASES_API}/tags/${releaseTag}`);

        if (releaseResp.ok) {
            const release = await releaseResp.json();
            const asset = release.assets.find(a => a.name === bot.filename);
            if (asset) {
                window.open(asset.browser_download_url, '_blank');
                showToast('Download iniciado!', 'success');
                return;
            }
        }
    } catch (e) {
        console.log('Release não encontrada, tentando download direto...');
    }

    // Fallback: try direct file URL
    if (bot.download_url) {
        window.open(bot.download_url, '_blank');
        showToast('Download iniciado!', 'success');
    } else {
        showToast('Arquivo não disponível para download', 'error');
    }
}

// ============================================================
// UPLOAD
// ============================================================

async function handleUpload(event) {
    event.preventDefault();

    const token = getToken();
    if (!token) {
        showConfig();
        showToast('Configure seu token do GitHub primeiro', 'error');
        return;
    }

    const name = document.getElementById('botName').value.trim();
    const category = document.getElementById('botCategory').value;
    const description = document.getElementById('botDescription').value.trim();
    const version = document.getElementById('botVersion').value.trim() || '1.0.0';
    const author = document.getElementById('githubUser').value.trim() || document.getElementById('botAuthor').value.trim() || 'Anônimo';
    const readme = document.getElementById('botReadme').value.trim();
    const fileInput = document.getElementById('botFile');
    const status = document.getElementById('uploadStatus');
    const submitBtn = document.getElementById('submitBtn');

    if (!fileInput.files[0]) {
        showStatus(status, '❌ Selecione um arquivo', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Enviando...';
    showStatus(status, '📤 Processando envio...', 'info');

    try {
        const file = fileInput.files[0];
        const botId = generateId();

        // 1. Create release with the file
        showStatus(status, '📦 Criando release no GitHub...', 'info');

        // Create release
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

        // 2. Upload file as release asset
        showStatus(status, '📤 Enviando arquivo...', 'info');

        const uploadUrl = `https://uploads.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}/assets?name=${encodeURIComponent(file.name)}`;

        const uploadResp = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/octet-stream'
            },
            body: file
        });

        if (!uploadResp.ok) {
            throw new Error('Erro ao enviar arquivo');
        }

        const asset = await uploadResp.json();

        // 3. Update bots.json
        showStatus(status, '💾 Atualizando registro...', 'info');

        const newBot = {
            id: botId,
            name,
            category,
            description,
            version,
            author,
            readme,
            filename: file.name,
            file_size: file.size,
            download_url: asset.browser_download_url,
            release_tag: `bot-${botId}`,
            downloads: 0,
            created_at: new Date().toISOString()
        };

        await updateBotsJson(newBot, token);

        showStatus(status, '✅ Bot publicado com sucesso!', 'success');
        showToast('🤖 Bot publicado com sucesso!', 'success');

        // Reset form
        document.getElementById('uploadForm').reset();
        document.getElementById('fileDropContent').innerHTML = `
            <span class="file-icon">📁</span>
            <p>Arraste o arquivo aqui ou <strong>clique para selecionar</strong></p>
            <small>.zip, .js, .py, .json (máx. 50MB)</small>
        `;

        // Reload bots
        setTimeout(() => loadBots(), 2000);

    } catch (error) {
        console.error('Erro no upload:', error);
        showStatus(status, `❌ Erro: ${error.message}`, 'error');
        showToast(`Erro: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Publicar Bot';
    }
}

async function updateBotsJson(newBot, token) {
    // Get current file
    let currentContent = { bots: [] };
    let sha = null;

    try {
        const resp = await fetch(CONTENTS_API, {
            headers: { 'Authorization': `token ${token}` }
        });

        if (resp.ok) {
            const data = await resp.json();
            sha = data.sha;
            currentContent = JSON.parse(atob(data.content));
        }
    } catch (e) {
        // File doesn't exist yet
    }

    // Add new bot
    if (!currentContent.bots) currentContent.bots = [];
    currentContent.bots.push(newBot);

    // Update file
    const body = {
        message: `feat: adicionar bot "${newBot.name}"`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(currentContent, null, 2)))),
        branch: 'main'
    };

    if (sha) body.sha = sha;

    const resp = await fetch(CONTENTS_API, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || 'Erro ao atualizar registro');
    }
}

// ============================================================
// MY BOTS
// ============================================================

function loadMyBots() {
    const user = localStorage.getItem('gh_user');
    const grid = document.getElementById('myBotsGrid');

    if (!user) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">⚙️</span>
                <h3>Configure seu perfil</h3>
                <p>Defina seu nome de usuário nas configurações para ver seus bots</p>
                <button class="btn btn-primary" onclick="showConfig()">⚙️ Configurar</button>
            </div>
        `;
        return;
    }

    const myBots = allBots.filter(b => b.author === user);

    if (myBots.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🤖</span>
                <h3>Nenhum bot ainda</h3>
                <p>Envie seu primeiro bot!</p>
                <button class="btn btn-primary" onclick="showSection('upload')">📤 Enviar Bot</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = myBots.map(bot => `
        <div class="bot-card">
            <div class="bot-card-header">
                <h3>${escapeHtml(bot.name)}</h3>
                <span class="bot-category cat-${bot.category || 'outros'}">${getCategoryLabel(bot.category)}</span>
            </div>
            <p class="bot-description">${escapeHtml(bot.description)}</p>
            <div class="bot-meta">
                <span>📦 v${escapeHtml(bot.version || '1.0.0')}</span>
                <span>⬇️ ${bot.downloads || 0}</span>
                <span>📅 ${formatDate(bot.created_at)}</span>
            </div>
            <div class="bot-actions">
                <button class="btn btn-success btn-sm" onclick="downloadBot('${bot.id}')">⬇️ Download</button>
                <button class="btn btn-danger btn-sm" onclick="deleteBot('${bot.id}')">🗑️ Excluir</button>
            </div>
        </div>
    `).join('');
}

async function deleteBot(botId) {
    if (!confirm('Tem certeza que deseja excluir este bot?')) return;

    const token = getToken();
    if (!token) {
        showConfig();
        return;
    }

    try {
        // Remove from bots.json
        let sha = null;
        let currentContent = { bots: [] };

        const resp = await fetch(CONTENTS_API, {
            headers: { 'Authorization': `token ${token}` }
        });

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

        await fetch(CONTENTS_API, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        // Try to delete release
        try {
            await fetch(`${RELEASES_API}/tags/bot-${botId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${token}` }
            });
        } catch (e) { /* ignore */ }

        showToast('Bot excluído com sucesso!', 'success');
        loadBots();
        loadMyBots();

    } catch (error) {
        showToast(`Erro ao excluir: ${error.message}`, 'error');
    }
}

// ============================================================
// FILE DRAG & DROP
// ============================================================

function setupDragDrop() {
    const drop = document.getElementById('fileDrop');
    if (!drop) return;

    ['dragenter', 'dragover'].forEach(e => {
        drop.addEventListener(e, (ev) => {
            ev.preventDefault();
            drop.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(e => {
        drop.addEventListener(e, (ev) => {
            ev.preventDefault();
            drop.classList.remove('dragover');
        });
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
            <p class="file-selected">${escapeHtml(file.name)}</p>
            <small>${formatSize(file.size)}</small>
        `;
    }
}

// ============================================================
// MODALS
// ============================================================

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    document.body.appendChild(container);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// HELPERS
// ============================================================

function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-${type}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
}

function formatSize(bytes) {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getCategoryLabel(cat) {
    const labels = {
        'atendimento': '📞 Atendimento',
        'vendas': '💰 Vendas',
        'utilidades': '🔧 Utilidades',
        'jogos': '🎮 Jogos',
        'outros': '📦 Outros'
    };
    return labels[cat] || '📦 Outros';
}

function generateId() {
    return Math.random().toString(36).substring(2, 10);
}
