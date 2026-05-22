// 全局状态
let accounts = [];
let categories = [];
let currentCategory = null;
let currentAccountId = null;

// API 基础路径
const API_BASE = '/api';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadAccounts();
    loadStats();
    initIconPicker();
});

// 加载分类
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        categories = await response.json();
        renderCategories();
        updateCategorySelect();
    } catch (error) {
        showToast('加载分类失败', 'error');
    }
}

// 渲染分类列表
function renderCategories() {
    const container = document.getElementById('categoryList');
    
    // 添加"全部"选项
    let html = `
        <li class="category-item ${currentCategory === null ? 'active' : ''}" onclick="filterByCategory(null)">
            <span class="icon">📋</span>
            <span class="name">全部</span>
            <span class="count">${accounts.length}</span>
        </li>
    `;
    
    // 添加各分类
    categories.forEach(category => {
        const count = accounts.filter(a => a.category_id === category.id).length;
        html += `
            <li class="category-item ${currentCategory === category.id ? 'active' : ''}" 
                onclick="filterByCategory(${category.id})">
                <span class="icon">${category.icon}</span>
                <span class="name">${category.name}</span>
                <span class="count">${count}</span>
            </li>
        `;
    });
    
    container.innerHTML = html;
}

// 更新分类选择框
function updateCategorySelect() {
    const select = document.getElementById('accountCategory');
    select.innerHTML = categories.map(c => 
        `<option value="${c.id}">${c.icon} ${c.name}</option>`
    ).join('');
}

// 加载账号列表
async function loadAccounts(search = '') {
    try {
        let url = `${API_BASE}/accounts`;
        const params = new URLSearchParams();
        
        if (currentCategory) {
            params.append('category_id', currentCategory);
        }
        if (search) {
            params.append('search', search);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        accounts = await response.json();
        renderAccounts();
        renderCategories(); // 更新计数
        
        // 显示/隐藏欢迎卡片
        const welcomeCard = document.getElementById('welcomeCard');
        const accountsGrid = document.getElementById('accountsGrid');
        
        if (accounts.length === 0) {
            welcomeCard.classList.remove('hidden');
            accountsGrid.classList.add('hidden');
        } else {
            welcomeCard.classList.add('hidden');
            accountsGrid.classList.remove('hidden');
        }
    } catch (error) {
        showToast('加载账号失败', 'error');
    }
}

// 渲染账号列表
function renderAccounts() {
    const container = document.getElementById('accountsGrid');
    
    if (accounts.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = accounts.map(account => `
        <div class="account-card" onclick="showAccountDetail(${account.id})">
            <div class="account-card-header">
                <div class="account-icon">
                    ${account.category_icon || '📁'}
                </div>
                <div class="account-info">
                    <div class="account-title">${escapeHtml(account.title)}</div>
                    <div class="account-category">${account.category_name || '未分类'}</div>
                </div>
            </div>
            <div class="account-card-body">
                ${account.username ? `
                    <div class="account-field">
                        <i class="fas fa-user"></i>
                        <span class="account-field-value">${escapeHtml(account.username)}</span>
                    </div>
                ` : ''}
                ${account.url ? `
                    <div class="account-field">
                        <i class="fas fa-link"></i>
                        <span class="account-field-value">${escapeHtml(account.url)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="account-card-actions" onclick="event.stopPropagation()">
                ${account.username ? `
                    <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(account.username)}', '用户名')">
                        <i class="fas fa-user"></i> 复制用户名
                    </button>
                ` : ''}
                ${account.password ? `
                    <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(account.password)}', '密码')">
                        <i class="fas fa-key"></i> 复制密码
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 按分类筛选
function filterByCategory(categoryId) {
    currentCategory = categoryId;
    loadAccounts(document.getElementById('searchInput').value);
}

// 搜索账号
function searchAccounts() {
    const search = document.getElementById('searchInput').value;
    loadAccounts(search);
}

// 显示添加弹窗
function showAddModal() {
    currentAccountId = null;
    document.getElementById('modalTitle').textContent = '添加账号';
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    openModal('accountModal');
}

// 显示编辑弹窗
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
        
        closeModal('detailModal');
        openModal('accountModal');
    } catch (error) {
        showToast('加载账号失败', 'error');
    }
}

// 保存账号
async function saveAccount(event) {
    event.preventDefault();
    
    const accountId = document.getElementById('accountId').value;
    const data = {
        title: document.getElementById('accountTitle').value,
        username: document.getElementById('accountUsername').value,
        password: document.getElementById('accountPassword').value,
        url: document.getElementById('accountUrl').value,
        category_id: parseInt(document.getElementById('accountCategory').value),
        notes: document.getElementById('accountNotes').value
    };
    
    try {
        let response;
        if (accountId) {
            // 更新
            response = await fetch(`${API_BASE}/accounts/${accountId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // 创建
            response = await fetch(`${API_BASE}/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(accountId ? '更新成功' : '创建成功', 'success');
            closeModal('accountModal');
            loadAccounts();
            loadStats();
        } else {
            showToast(result.error || '操作失败', 'error');
        }
    } catch (error) {
        showToast('操作失败', 'error');
    }
}

// 删除账号
async function deleteAccount(accountId) {
    if (!confirm('确定要删除这个账号吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('删除成功', 'success');
            closeModal('detailModal');
            loadAccounts();
            loadStats();
        } else {
            showToast('删除失败', 'error');
        }
    } catch (error) {
        showToast('删除失败', 'error');
    }
}

// 显示账号详情
async function showAccountDetail(accountId) {
    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}`);
        const account = await response.json();
        
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
                        <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(account.username)}', '用户名')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </span>
                </div>
            ` : ''}
            ${account.password ? `
                <div class="detail-row">
                    <span class="detail-label">密码</span>
                    <span class="detail-value">
                        <span id="passwordDisplay">••••••••</span>
                        <button class="btn-copy" onclick="toggleDetailPassword('${escapeHtml(account.password)}')">
                            <i class="fas fa-eye" id="togglePasswordIcon"></i>
                        </button>
                        <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(account.password)}', '密码')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </span>
                </div>
            ` : ''}
            ${account.url ? `
                <div class="detail-row">
                    <span class="detail-label">网址</span>
                    <span class="detail-value">
                        <a href="${escapeHtml(account.url)}" target="_blank">${escapeHtml(account.url)}</a>
                    </span>
                </div>
            ` : ''}
            <div class="detail-row">
                <span class="detail-label">分类</span>
                <span class="detail-value">${account.category_icon} ${account.category_name || '未分类'}</span>
            </div>
            ${account.notes ? `
                <div class="detail-row">
                    <span class="detail-label">备注</span>
                    <span class="detail-value">${escapeHtml(account.notes)}</span>
                </div>
            ` : ''}
            <div class="detail-row">
                <span class="detail-label">创建时间</span>
                <span class="detail-value">${formatDate(account.created_at)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">更新时间</span>
                <span class="detail-value">${formatDate(account.updated_at)}</span>
            </div>
            <div class="detail-actions">
                <button class="btn-secondary" onclick="showVersionHistory(${account.id})">
                    <i class="fas fa-history"></i> 版本历史
                </button>
                <button class="btn-secondary" onclick="showEditModal(${account.id})">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="btn-danger" onclick="deleteAccount(${account.id})">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        `;
        
        document.getElementById('detailTitle').textContent = account.title;
        openModal('detailModal');
    } catch (error) {
        showToast('加载详情失败', 'error');
    }
}

// 切换详情密码显示
let detailPasswordVisible = false;
function toggleDetailPassword(password) {
    const display = document.getElementById('passwordDisplay');
    const icon = document.getElementById('togglePasswordIcon');
    
    detailPasswordVisible = !detailPasswordVisible;
    
    if (detailPasswordVisible) {
        display.textContent = password;
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        display.textContent = '••••••••';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// 显示版本历史
async function showVersionHistory(accountId) {
    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}/versions`);
        const versions = await response.json();
        
        const container = document.getElementById('versionList');
        
        if (versions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无版本历史</p>';
        } else {
            container.innerHTML = versions.map(version => `
                <div class="version-item">
                    <div class="version-number">v${version.version}</div>
                    <div class="version-info">
                        <div><strong>版本 ${version.version}</strong></div>
                        <div class="version-date">${formatDate(version.created_at)}</div>
                        ${version.username ? `<div>用户名: ${escapeHtml(version.username)}</div>` : ''}
                    </div>
                    <button class="btn-secondary" onclick="restoreVersion(${accountId}, ${version.version})">
                        恢复
                    </button>
                </div>
            `).join('');
        }
        
        closeModal('detailModal');
        openModal('versionModal');
    } catch (error) {
        showToast('加载版本历史失败', 'error');
    }
}

// 恢复版本
async function restoreVersion(accountId, version) {
    if (!confirm(`确定要恢复到版本 ${version} 吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}/restore/${version}`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(`已恢复到版本 ${version}`, 'success');
            closeModal('versionModal');
            loadAccounts();
        } else {
            showToast(result.error || '恢复失败', 'error');
        }
    } catch (error) {
        showToast('恢复失败', 'error');
    }
}

// 显示添加分类弹窗
function showAddCategoryModal() {
    document.getElementById('categoryForm').reset();
    resetIconPicker();
    openModal('categoryModal');
}

// 初始化图标选择器
function initIconPicker() {
    const iconOptions = document.querySelectorAll('.icon-option');
    iconOptions.forEach(option => {
        option.addEventListener('click', () => {
            iconOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
}

// 重置图标选择器
function resetIconPicker() {
    const iconOptions = document.querySelectorAll('.icon-option');
    iconOptions.forEach(o => o.classList.remove('selected'));
    iconOptions[0].classList.add('selected');
}

// 保存分类
async function saveCategory(event) {
    event.preventDefault();
    
    const name = document.getElementById('categoryName').value;
    const selectedIcon = document.querySelector('.icon-option.selected');
    const icon = selectedIcon ? selectedIcon.dataset.icon : '📁';
    
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, icon })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('分类创建成功', 'success');
            closeModal('categoryModal');
            loadCategories();
        } else {
            showToast(result.error || '创建失败', 'error');
        }
    } catch (error) {
        showToast('创建失败', 'error');
    }
}

// 加载统计信息
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const stats = await response.json();
        
        document.getElementById('totalAccounts').textContent = stats.total_accounts;
    } catch (error) {
        console.error('加载统计失败', error);
    }
}

// 生成随机密码
function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('accountPassword').value = password;
}

// 切换密码显示
function togglePassword() {
    const input = document.getElementById('accountPassword');
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// 复制到剪贴板
async function copyToClipboard(text, label) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(`${label}已复制`, 'success');
    } catch (error) {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`${label}已复制`, 'success');
    }
}

// 切换侧边栏
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// 打开弹窗
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 关闭弹窗
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

// 显示 Toast 提示
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// HTML 转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 点击弹窗外部关闭
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // ESC 关闭弹窗
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            closeModal(modal.id);
        });
    }
    
    // Ctrl/Cmd + K 聚焦搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    
    // Ctrl/Cmd + N 添加账号
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showAddModal();
    }
});
