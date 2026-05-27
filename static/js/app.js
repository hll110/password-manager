// 全局状态
let accounts = [];
let categories = [];
let currentCategory = null;
let currentAccountId = null;
let favoriteFilter = false;
let currentView = 'all';
let sortBy = 'updated_at';
let searchDebounceTimer = null;

const API_BASE = '/api';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSearchInputs();
    initPasswordStrength();
    loadCategories();
    loadAccounts();
    loadStats();
    initIconPicker();
    registerServiceWorker();
});

function initSearchInputs() {
    const handler = (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => loadAccounts(e.target.value.trim()), 300);
    };
    const mobile = document.getElementById('searchInput');
    const desktop = document.getElementById('searchInputDesktop');
    if (mobile) mobile.addEventListener('input', handler);
    if (desktop) desktop.addEventListener('input', handler);
}

function getSearchQuery() {
    const mobile = document.getElementById('searchInput');
    const desktop = document.getElementById('searchInputDesktop');
    return (mobile?.value || desktop?.value || '').trim();
}

function syncSearchInputs(value) {
    const mobile = document.getElementById('searchInput');
    const desktop = document.getElementById('searchInputDesktop');
    if (mobile) mobile.value = value;
    if (desktop) desktop.value = value;
}

// 主题
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    }
    updateThemeIcon();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    if (next === 'light') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        // 预留：可后续添加 sw.js
    }
}

// 加载分类
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        categories = await response.json();
        renderCategories();
        renderCategoryChips();
        updateCategorySelect();
    } catch {
        showToast('加载分类失败', 'error');
    }
}

function renderCategories() {
    const container = document.getElementById('categoryList');
    if (!container) return;

    let html = `
        <li class="category-item ${currentCategory === null ? 'active' : ''}" onclick="filterByCategory(null)">
            <span class="icon">📋</span>
            <span class="name">全部</span>
            <span class="count">${accounts.length}</span>
        </li>
    `;

    categories.forEach(category => {
        const count = accounts.filter(a => a.category_id === category.id).length;
        html += `
            <li class="category-item ${currentCategory === category.id ? 'active' : ''}"
                onclick="filterByCategory(${category.id})">
                <span class="icon">${category.icon}</span>
                <span class="name">${escapeHtml(category.name)}</span>
                <span class="count">${count}</span>
            </li>
        `;
    });

    container.innerHTML = html;
}

function renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    if (!container) return;

    let html = `<span class="chip ${currentCategory === null ? 'active' : ''}" onclick="filterByCategory(null)">全部</span>`;
    categories.forEach(cat => {
        html += `<span class="chip ${currentCategory === cat.id ? 'active' : ''}"
            onclick="filterByCategory(${cat.id})">${cat.icon} ${escapeHtml(cat.name)}</span>`;
    });
    container.innerHTML = html;
}

function updateCategorySelect() {
    const select = document.getElementById('accountCategory');
    if (!select) return;
    select.innerHTML = categories.map(c =>
        `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`
    ).join('');
}

// 加载账号
async function loadAccounts(search) {
    const query = search !== undefined ? search : getSearchQuery();
    try {
        const params = new URLSearchParams();
        if (currentCategory) params.append('category_id', currentCategory);
        if (query) params.append('search', query);
        if (favoriteFilter || currentView === 'favorite') params.append('favorite', '1');
        params.append('sort', sortBy);

        const url = `${API_BASE}/accounts?${params}`;
        const response = await fetch(url);
        accounts = await response.json();
        renderAccounts();
        renderCategories();
        renderCategoryChips();

        const welcomeCard = document.getElementById('welcomeCard');
        const accountsGrid = document.getElementById('accountsGrid');
        const showWelcome = accounts.length === 0 && !query && !favoriteFilter && currentView !== 'favorite';

        if (showWelcome) {
            welcomeCard?.classList.remove('hidden');
            accountsGrid?.classList.add('hidden');
        } else {
            welcomeCard?.classList.add('hidden');
            accountsGrid?.classList.remove('hidden');
        }
    } catch {
        showToast('加载账号失败', 'error');
    }
}

function renderAccounts() {
    const container = document.getElementById('accountsGrid');
    if (!container) return;

    if (accounts.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>${favoriteFilter || currentView === 'favorite' ? '暂无收藏账号' : '暂无账号，点击添加'}</p>
        </div>`;
        return;
    }

    container.innerHTML = accounts.map(account => `
        <div class="account-card ${account.favorite ? 'favorite' : ''}" data-id="${account.id}">
            <div class="account-card-header" onclick="showAccountDetail(${account.id})">
                <div class="account-icon">${account.category_icon || '📁'}</div>
                <div class="account-info">
                    <div class="account-title">${escapeHtml(account.title)}</div>
                    <div class="account-category">${escapeHtml(account.category_name || '未分类')}</div>
                </div>
            </div>
            <div class="account-card-body" onclick="showAccountDetail(${account.id})">
                ${account.username ? `
                    <div class="account-field">
                        <i class="fas fa-user"></i>
                        <span class="account-field-value">${escapeHtml(account.username)}</span>
                    </div>` : ''}
                ${account.url ? `
                    <div class="account-field">
                        <i class="fas fa-link"></i>
                        <span class="account-field-value">${escapeHtml(account.url)}</span>
                    </div>` : ''}
            </div>
            <div class="account-card-actions">
                ${account.username ? `
                    <button class="btn-copy" data-copy="${attrEscape(account.username)}" data-label="用户名">
                        <i class="fas fa-user"></i> 用户名
                    </button>` : ''}
                ${account.password ? `
                    <button class="btn-copy" data-copy="${attrEscape(account.password)}" data-label="密码">
                        <i class="fas fa-key"></i> 密码
                    </button>` : ''}
                <button class="btn-copy" onclick="event.stopPropagation(); toggleAccountFavorite(${account.id})" title="收藏">
                    <i class="fas fa-star" style="color:${account.favorite ? 'var(--warning-color)' : 'inherit'}"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(btn.dataset.copy, btn.dataset.label);
        });
    });
}

function filterByCategory(categoryId) {
    currentCategory = categoryId;
    loadAccounts();
    closeSidebar();
}

function toggleFavoriteFilter() {
    favoriteFilter = !favoriteFilter;
    document.getElementById('favoriteFilterBtn')?.classList.toggle('active', favoriteFilter);
    loadAccounts();
}

function onSortChange() {
    sortBy = document.getElementById('sortSelect')?.value || 'updated_at';
    loadAccounts();
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.bottom-nav-item[data-view]').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
    });

    if (view === 'favorite') {
        favoriteFilter = true;
        document.getElementById('favoriteFilterBtn')?.classList.add('active');
    } else if (view === 'all') {
        favoriteFilter = false;
        document.getElementById('favoriteFilterBtn')?.classList.remove('active');
    }

    if (view !== 'categories') loadAccounts();
}

async function toggleAccountFavorite(accountId) {
    try {
        const res = await fetch(`${API_BASE}/accounts/${accountId}/favorite`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast(data.favorite ? '已加入收藏' : '已取消收藏', 'success');
            loadAccounts();
            loadStats();
        }
    } catch {
        showToast('操作失败', 'error');
    }
}

function searchAccounts() {
    loadAccounts(getSearchQuery());
}

function showAddModal() {
    currentAccountId = null;
    document.getElementById('modalTitle').textContent = '添加账号';
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    document.getElementById('accountFavorite').checked = false;
    document.getElementById('pwdLength').value = 16;
    updatePwdLength();
    updatePasswordStrength('');
    openModal('accountModal');
}

async function showEditModal(accountId) {
    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}`);
        const account = await response.json();

        currentAccountId = accountId;
        document.getElementById('modalTitle').textContent = '编辑账号';
        document.getElementById('accountId').value = accountId;
        document.getElementById('accountTitle').value = account.title || '';
        document.getElementById('accountUsername').value = account.username || '';
        document.getElementById('accountPassword').value = account.password || '';
        document.getElementById('accountUrl').value = account.url || '';
        document.getElementById('accountCategory').value = account.category_id || '';
        document.getElementById('accountNotes').value = account.notes || '';
        document.getElementById('accountFavorite').checked = !!account.favorite;
        updatePasswordStrength(account.password || '');

        closeModal('detailModal');
        openModal('accountModal');
    } catch {
        showToast('加载账号失败', 'error');
    }
}

async function saveAccount(event) {
    event.preventDefault();

    const accountId = document.getElementById('accountId').value;
    const data = {
        title: document.getElementById('accountTitle').value.trim(),
        username: document.getElementById('accountUsername').value,
        password: document.getElementById('accountPassword').value,
        url: document.getElementById('accountUrl').value,
        category_id: parseInt(document.getElementById('accountCategory').value),
        notes: document.getElementById('accountNotes').value,
        favorite: document.getElementById('accountFavorite').checked,
    };

    if (!data.title) {
        showToast('请填写标题', 'error');
        return;
    }

    try {
        const response = await fetch(
            accountId ? `${API_BASE}/accounts/${accountId}` : `${API_BASE}/accounts`,
            {
                method: accountId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }
        );
        const result = await response.json();

        if (response.ok) {
            showToast(accountId ? '更新成功' : '创建成功', 'success');
            closeModal('accountModal');
            loadAccounts();
            loadStats();
        } else {
            showToast(result.error || '操作失败', 'error');
        }
    } catch {
        showToast('操作失败', 'error');
    }
}

async function deleteAccount(accountId) {
    if (!confirm('确定要删除这个账号吗？此操作不可恢复。')) return;

    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('删除成功', 'success');
            closeModal('detailModal');
            loadAccounts();
            loadStats();
        } else {
            showToast('删除失败', 'error');
        }
    } catch {
        showToast('删除失败', 'error');
    }
}

async function showAccountDetail(accountId) {
    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}`);
        const account = await response.json();
        currentAccountId = accountId;

        const container = document.getElementById('accountDetail');
        container.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">标题</span>
                <span class="detail-value">${escapeHtml(account.title)}</span>
            </div>
            ${account.username ? `
            <div class="detail-row">
                <span class="detail-label">用户名</span>
                <span class="detail-value">
                    ${escapeHtml(account.username)}
                    <button class="btn-copy" data-copy="${attrEscape(account.username)}" data-label="用户名">
                        <i class="fas fa-copy"></i>
                    </button>
                </span>
            </div>` : ''}
            ${account.password ? `
            <div class="detail-row">
                <span class="detail-label">密码</span>
                <span class="detail-value">
                    <span id="passwordDisplay">••••••••</span>
                    <button class="btn-copy" id="togglePwdBtn" data-pwd="${attrEscape(account.password)}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-copy" data-copy="${attrEscape(account.password)}" data-label="密码">
                        <i class="fas fa-copy"></i>
                    </button>
                </span>
            </div>` : ''}
            ${account.url ? `
            <div class="detail-row">
                <span class="detail-label">网址</span>
                <span class="detail-value">
                    <a href="${escapeHtml(account.url)}" target="_blank" rel="noopener">${escapeHtml(account.url)}</a>
                </span>
            </div>` : ''}
            <div class="detail-row">
                <span class="detail-label">分类</span>
                <span class="detail-value">${account.category_icon} ${escapeHtml(account.category_name || '未分类')}</span>
            </div>
            ${account.notes ? `
            <div class="detail-row">
                <span class="detail-label">备注</span>
                <span class="detail-value">${escapeHtml(account.notes)}</span>
            </div>` : ''}
            <div class="detail-row">
                <span class="detail-label">更新</span>
                <span class="detail-value">${formatDate(account.updated_at)}</span>
            </div>
            <div class="detail-actions">
                <button class="btn-secondary" onclick="toggleAccountFavorite(${account.id}); closeModal('detailModal');">
                    <i class="fas fa-star"></i> ${account.favorite ? '取消收藏' : '收藏'}
                </button>
                <button class="btn-secondary" onclick="showVersionHistory(${account.id})">
                    <i class="fas fa-history"></i> 历史
                </button>
                <button class="btn-secondary" onclick="showEditModal(${account.id})">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="btn-danger" onclick="deleteAccount(${account.id})">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        `;

        container.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', () => copyToClipboard(btn.dataset.copy, btn.dataset.label));
        });

        const toggleBtn = document.getElementById('togglePwdBtn');
        if (toggleBtn) {
            let visible = false;
            toggleBtn.addEventListener('click', () => {
                visible = !visible;
                const display = document.getElementById('passwordDisplay');
                display.textContent = visible ? toggleBtn.dataset.pwd : '••••••••';
                toggleBtn.querySelector('i').className = visible ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        }

        document.getElementById('detailTitle').textContent = account.title;
        openModal('detailModal');
    } catch {
        showToast('加载详情失败', 'error');
    }
}

async function showVersionHistory(accountId) {
    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}/versions`);
        const versions = await response.json();
        const container = document.getElementById('versionList');

        if (versions.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">暂无版本历史</p>';
        } else {
            container.innerHTML = versions.map(v => `
                <div class="version-item">
                    <div class="version-number">v${v.version}</div>
                    <div class="version-info">
                        <div><strong>版本 ${v.version}</strong></div>
                        <div class="version-date">${formatDate(v.created_at)}</div>
                        ${v.username ? `<div>${escapeHtml(v.username)}</div>` : ''}
                    </div>
                    <button class="btn-secondary" onclick="restoreVersion(${accountId}, ${v.version})">恢复</button>
                </div>
            `).join('');
        }

        closeModal('detailModal');
        openModal('versionModal');
    } catch {
        showToast('加载版本历史失败', 'error');
    }
}

async function restoreVersion(accountId, version) {
    if (!confirm(`确定要恢复到版本 ${version} 吗？`)) return;

    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}/restore/${version}`, { method: 'POST' });
        const result = await response.json();
        if (response.ok) {
            showToast(`已恢复到版本 ${version}`, 'success');
            closeModal('versionModal');
            loadAccounts();
        } else {
            showToast(result.error || '恢复失败', 'error');
        }
    } catch {
        showToast('恢复失败', 'error');
    }
}

function showAddCategoryModal() {
    document.getElementById('categoryForm').reset();
    resetIconPicker();
    openModal('categoryModal');
}

function initIconPicker() {
    document.querySelectorAll('.icon-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
}

function resetIconPicker() {
    document.querySelectorAll('.icon-option').forEach((o, i) => {
        o.classList.toggle('selected', i === 0);
    });
}

async function saveCategory(event) {
    event.preventDefault();
    const name = document.getElementById('categoryName').value.trim();
    const selectedIcon = document.querySelector('.icon-option.selected');
    const icon = selectedIcon ? selectedIcon.dataset.icon : '📁';

    try {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, icon }),
        });
        const result = await response.json();
        if (response.ok) {
            showToast('分类创建成功', 'success');
            closeModal('categoryModal');
            loadCategories();
        } else {
            showToast(result.error || '创建失败', 'error');
        }
    } catch {
        showToast('创建失败', 'error');
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const stats = await response.json();
        const totalEl = document.getElementById('totalAccounts');
        const favEl = document.getElementById('favoriteAccounts');
        if (totalEl) totalEl.textContent = stats.total_accounts;
        if (favEl) favEl.textContent = stats.favorite_accounts || 0;
    } catch {
        console.error('加载统计失败');
    }
}

// 密码生成
function updatePwdLength() {
    const val = document.getElementById('pwdLength')?.value || 16;
    const label = document.getElementById('pwdLengthVal');
    if (label) label.textContent = val;
}

function generatePassword() {
    const length = parseInt(document.getElementById('pwdLength')?.value || 16);
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';
    const all = lower + upper + digits + symbols;

    let password = [
        lower[Math.floor(Math.random() * lower.length)],
        upper[Math.floor(Math.random() * upper.length)],
        digits[Math.floor(Math.random() * digits.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
    ];

    for (let i = password.length; i < length; i++) {
        password.push(all[Math.floor(Math.random() * all.length)]);
    }

    password = password.sort(() => Math.random() - 0.5).join('');
    const input = document.getElementById('accountPassword');
    input.value = password;
    input.type = 'text';
    updatePasswordStrength(password);
    showToast('已生成强密码', 'success');
}

function initPasswordStrength() {
    const input = document.getElementById('accountPassword');
    if (input) {
        input.addEventListener('input', (e) => updatePasswordStrength(e.target.value));
    }
}

function updatePasswordStrength(password) {
    const container = document.getElementById('passwordStrength');
    if (!container) return;

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const colors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981'];
    const widths = ['20%', '40%', '60%', '80%', '100%'];
    const idx = Math.min(score, 4);

    const bar = container.querySelector('.password-strength-bar') ||
        (() => { const b = document.createElement('div'); b.className = 'password-strength-bar'; container.appendChild(b); return b; })();

    bar.style.width = password ? widths[idx] : '0';
    bar.style.background = password ? colors[idx] : 'transparent';
}

function togglePassword() {
    const input = document.getElementById('accountPassword');
    const icon = input?.parentElement?.querySelectorAll('.btn-icon')[0]?.querySelector('i');
    if (!input || !icon) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.className = input.type === 'text' ? 'fas fa-eye-slash' : 'fas fa-eye';
}

// 导入导出
async function exportData() {
    try {
        const response = await fetch(`${API_BASE}/export`);
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `password-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('导出成功', 'success');
    } catch {
        showToast('导出失败', 'error');
    }
}

async function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        const accountsData = data.accounts || data;

        if (!Array.isArray(accountsData) || accountsData.length === 0) {
            showToast('文件中没有有效数据', 'error');
            return;
        }

        if (!confirm(`将导入 ${accountsData.length} 条账号，是否继续？`)) {
            event.target.value = '';
            return;
        }

        const response = await fetch(`${API_BASE}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts: accountsData }),
        });
        const result = await response.json();

        if (response.ok) {
            showToast(result.message, 'success');
            loadAccounts();
            loadStats();
            closeModal('settingsModal');
        } else {
            showToast(result.error || '导入失败', 'error');
        }
    } catch {
        showToast('文件格式错误', 'error');
    }
    event.target.value = '';
}

function showSettingsPanel() {
    openModal('settingsModal');
}

// 复制
async function copyToClipboard(text, label) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            fallbackCopy(text);
        }
        showToast(`${label}已复制`, 'success');
        if (navigator.vibrate) navigator.vibrate(30);
    } catch {
        fallbackCopy(text);
        showToast(`${label}已复制`, 'success');
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// 侧边栏
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar?.classList.toggle('active');
    overlay?.classList.toggle('active');
    document.body.style.overflow = sidebar?.classList.contains('active') ? 'hidden' : '';
}

function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('active');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

// 弹窗
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
    if (!document.querySelector('.modal.active')) {
        document.body.style.overflow = '';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function attrEscape(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal.id);
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
        closeSidebar();
    }
});
