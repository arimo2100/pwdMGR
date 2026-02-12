let groups = JSON.parse(localStorage.getItem('groups')) || [
    { id: 'all', name: '全部', system: true },
    { id: 'website', name: '网站', system: false, color: '#667eea' },
    { id: 'app', name: '应用', system: false, color: '#f093fb' },
    { id: 'game', name: '游戏', system: false, color: '#4facfe' },
    { id: 'other', name: '其他', system: false, color: '#43e97b' }
];

let passwords = [];
let autoLock = JSON.parse(localStorage.getItem('autoLock')) !== false;
let currentFilter = 'all';
let currentDetailId = null;
let masterPassword = '';
let isInitialized = localStorage.getItem('masterPasswordHash') !== null;
let isUnlocked = false;
let selectionMode = false;
let selectedItems = new Set();
let isLoading = false;

function showLoading() {
    isLoading = true;
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    isLoading = false;
    document.getElementById('loadingOverlay').classList.remove('show');
}

function showSkeleton() {
    const list = document.getElementById('passwordList');
    list.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-item';
        skeleton.innerHTML = `
            <div class="skeleton-icon skeleton"></div>
            <div class="skeleton-content">
                <div class="skeleton-title skeleton"></div>
                <div class="skeleton-text skeleton"></div>
            </div>
        `;
        list.appendChild(skeleton);
    }
}

async function checkInitialization() {
    isInitialized = localStorage.getItem('masterPasswordHash') !== null;
}

function showSetupScreen() {
    const lockScreen = document.getElementById('lockScreen');
    lockScreen.querySelector('.lock-title').textContent = '欢迎使用';
    lockScreen.querySelector('.lock-subtitle').textContent = '请设置主密码';
    
    const lockInputWrapper = lockScreen.querySelector('.lock-input-wrapper');
    if (lockInputWrapper) {
        lockInputWrapper.style.display = 'none';
    }
    
    const setupForm = document.createElement('div');
    setupForm.id = 'setupForm';
    setupForm.innerHTML = `
        <div style="max-width: 320px; margin: 0 auto;">
            <div class="form-group">
                <input type="password" class="form-input" id="setupPassword" placeholder="设置主密码（至少6位）" style="text-align: center;">
            </div>
            <div class="form-group">
                <input type="password" class="form-input" id="setupPasswordConfirm" placeholder="确认主密码" style="text-align: center;">
            </div>
            <button class="submit-btn" onclick="completeSetup()">完成设置</button>
        </div>
    `;
    lockScreen.querySelector('.lock-content').appendChild(setupForm);
}

async function completeSetup() {
    const password = document.getElementById('setupPassword').value;
    const confirm = document.getElementById('setupPasswordConfirm').value;
    
    if (password.length < 6) {
        showToast('密码至少需要6位');
        return;
    }
    
    if (password !== confirm) {
        showToast('两次输入的密码不一致');
        return;
    }
    
    const hash = await CryptoUtils.hashPassword(password);
    localStorage.setItem('masterPasswordHash', hash);
    masterPassword = password;
    isInitialized = true;
    isUnlocked = true;
    
    document.getElementById('setupForm').remove();
    
    await loadPasswords();
    renderGroups();
    renderPasswords();
    unlockApp();
    showToast('设置成功！');
}

function initLockScreen() {
    const lockScreen = document.getElementById('lockScreen');
    const lockInputWrapper = lockScreen.querySelector('.lock-input-wrapper');
    if (lockInputWrapper) {
        lockInputWrapper.style.display = 'block';
    }
    
    const passwordInput = document.getElementById('lockPasswordInput');
    const unlockBtn = document.getElementById('unlockBtn');
    
    if (passwordInput && unlockBtn) {
        unlockBtn.addEventListener('click', async () => {
            const password = passwordInput.value;
            if (!password) {
                showToast('请输入密码');
                return;
            }
            await checkPassword(password);
        });
        
        passwordInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const password = passwordInput.value;
                if (!password) {
                    showToast('请输入密码');
                    return;
                }
                await checkPassword(password);
            }
        });
    }

    async function checkPassword(password) {
        const storedHash = localStorage.getItem('masterPasswordHash');
        const isValid = await CryptoUtils.verifyPassword(password, storedHash);
        
        if (isValid) {
            masterPassword = password;
            isUnlocked = true;
            await loadPasswords();
            renderGroups();
            renderPasswords();
            unlockApp();
        } else {
            showToast('密码错误');
            document.getElementById('lockPasswordInput').value = '';
            document.querySelector('.lock-content').style.animation = 'shake 0.5s';
            setTimeout(() => {
                document.querySelector('.lock-content').style.animation = '';
            }, 500);
        }
    }
}

async function loadPasswords() {
    const encryptedData = localStorage.getItem('encryptedPasswords');
    if (encryptedData) {
        const decrypted = await CryptoUtils.decrypt(encryptedData, masterPassword);
        if (decrypted) {
            passwords = JSON.parse(decrypted);
        } else {
            passwords = [];
        }
    }
}

async function savePasswords() {
    const encrypted = await CryptoUtils.encrypt(JSON.stringify(passwords), masterPassword);
    localStorage.setItem('encryptedPasswords', encrypted);
}

function unlockApp() {
    const lockScreen = document.getElementById('lockScreen');
    lockScreen.classList.add('hidden');
    setTimeout(() => {
        lockScreen.style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
    }, 600);
}

function lockApp() {
    masterPassword = '';
    isUnlocked = false;
    passwords = [];
    location.reload();
}

function toggleAutoLockSetting() {
    autoLock = !autoLock;
    localStorage.setItem('autoLock', JSON.stringify(autoLock));
    const toggle = document.getElementById('autoLockToggle');
    toggle.classList.toggle('active');
    showToast(autoLock ? '自动锁定已开启' : '自动锁定已关闭');
}

function setupAutoLock() {
    let lastActiveTime = Date.now();
    let isTabHidden = false;
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isTabHidden = true;
            lastActiveTime = Date.now();
        } else if (isTabHidden && autoLock) {
            const inactiveTime = Date.now() - lastActiveTime;
            if (inactiveTime > 30000) {
                lockApp();
            }
            isTabHidden = false;
        }
    });
    
    ['mousedown', 'touchstart', 'keydown'].forEach(event => {
        document.addEventListener(event, () => {
            lastActiveTime = Date.now();
        });
    });
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeIcon = document.getElementById('themeIcon');
    themeIcon.textContent = newTheme === 'light' ? '☀️' : '🌙';
    
    showToast(newTheme === 'light' ? '已切换到亮色模式' : '已切换到暗色模式');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'light' ? '☀️' : '🌙';
    }
}

function exportData() {
    const data = { passwords, groups, exportTime: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `password_backup_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
}

function importData() {
    document.getElementById('importFileInput').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.passwords && Array.isArray(data.passwords)) {
                if (confirm(`确定要导入吗？将覆盖现有数据（包含 ${data.passwords.length} 个密码）`)) {
                    passwords = data.passwords;
                    if (data.groups) groups = data.groups;
                    localStorage.setItem('groups', JSON.stringify(groups));
                    savePasswords();
                    renderGroups();
                    renderPasswords();
                    showToast('数据导入成功');
                }
            } else {
                showToast('文件格式错误');
            }
        } catch (err) {
            showToast('导入失败：文件损坏');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function renderGroups() {
    const tabsContainer = document.getElementById('groupTabs');
    tabsContainer.innerHTML = '';
    
    const userGroups = groups.filter(g => g.id !== 'all');
    
    const allTab = document.createElement('div');
    allTab.className = `group-tab ${currentFilter === 'all' ? 'active' : ''}`;
    allTab.innerHTML = '<span>全部</span>';
    allTab.onclick = () => selectGroup('all');
    tabsContainer.appendChild(allTab);
    
    userGroups.forEach(group => {
        const tab = document.createElement('div');
        tab.className = `group-tab ${currentFilter === group.id ? 'active' : ''}`;
        tab.innerHTML = `<span>${group.name}</span>`;
        tab.onclick = () => selectGroup(group.id);
        tabsContainer.appendChild(tab);
    });
}

function selectGroup(groupId) {
    currentFilter = groupId;
    renderGroups();
    renderPasswords();
}

function renderPasswords(searchTerm = '') {
    const list = document.getElementById('passwordList');
    list.innerHTML = '';

    let filtered = passwords;
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"></div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">暂无密码记录</div>
                <div style="font-size: 14px; opacity: 0.6;">点击底部 + 号添加</div>
            </div>
        `;
        return;
    }

    filtered.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'password-item draggable';
        div.style.setProperty('--index', index);
        div.dataset.id = item.id;
        div.draggable = true;
        
        let iconHtml = item.iconType === 'image' 
            ? `<img src="${item.icon}" alt="icon">` 
            : item.icon;
        
        const isSelected = selectedItems.has(item.id);
        div.classList.toggle('selected', isSelected);
        
        div.innerHTML = `
            <div class="drag-handle">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
                </svg>
            </div>
            ${selectionMode ? `
                <div class="checkbox ${isSelected ? 'checked' : ''}" onclick="event.stopPropagation(); toggleSelection(${item.id})">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
            ` : ''}
            <div class="app-icon" style="background: ${item.color}20; box-shadow: 0 0 20px ${item.color}30;">
                ${iconHtml}
            </div>
            <div class="app-info">
                <div class="app-name">${item.name}</div>
                <div class="app-detail">
                    <span>${item.username}</span>
                    <span>•</span>
                    <span>••••••</span>
                </div>
            </div>
            ${!selectionMode ? `
                <svg class="arrow" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
            ` : ''}
        `;
        
        if (selectionMode) {
            div.onclick = () => toggleSelection(item.id);
        } else {
            div.onclick = () => showPage('detail', item);
        }
        
        setupDragEvents(div);
        list.appendChild(div);
    });
}

document.getElementById('searchInput')?.addEventListener('input', (e) => {
    renderPasswords(e.target.value);
});

function openGroupManager() {
    renderGroupsList();
    document.getElementById('groupModal').classList.add('show');
}

function renderGroupsList() {
    const container = document.getElementById('groupsList');
    container.innerHTML = '';
    
    const userGroups = groups.filter(g => !g.system);
    
    userGroups.forEach(group => {
        const item = document.createElement('div');
        item.className = 'group-item';
        item.dataset.id = group.id;
        item.draggable = true;
        item.innerHTML = `
            <div class="drag-handle" style="position: relative; left: 0; top: 0; transform: none;">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
                </svg>
            </div>
            <div class="group-info">
                <div class="group-color" style="background: ${group.color || '#5eead4'};"></div>
                <input type="text" class="group-name-input" value="${group.name}" id="group-name-${group.id}">
            </div>
            <div class="group-actions">
                <button class="group-action-btn save-group" onclick="updateGroup('${group.id}')">保存</button>
                <button class="group-action-btn delete-group-btn" onclick="deleteGroup('${group.id}')">删除</button>
            </div>
        `;
        setupGroupDragEvents(item);
        container.appendChild(item);
    });
}

function addNewGroup() {
    const name = document.getElementById('newGroupName').value.trim();
    if (!name) {
        showToast('请输入分组名称');
        return;
    }
    
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newGroup = {
        id: 'group_' + Date.now(),
        name: name,
        color: randomColor,
        system: false
    };
    
    groups.push(newGroup);
    saveGroups();
    document.getElementById('newGroupName').value = '';
    renderGroupsList();
    renderGroups();
    showToast('分组添加成功');
}

function updateGroup(id) {
    const newName = document.getElementById(`group-name-${id}`).value.trim();
    if (!newName) {
        showToast('分组名称不能为空');
        return;
    }
    
    const group = groups.find(g => g.id === id);
    if (group) {
        group.name = newName;
        saveGroups();
        renderGroups();
        showToast('分组已更新');
    }
}

async function deleteGroup(id) {
    const group = groups.find(g => g.id === id);
    if (!group) return;
    
    const count = passwords.filter(p => p.category === id).length;
    const confirmMsg = count > 0 
        ? `该分组下有 ${count} 个密码，删除后这些密码将变为"未分组"，确定删除吗？`
        : '确定删除这个分组吗？';
    
    if (confirm(confirmMsg)) {
        passwords.forEach(p => {
            if (p.category === id) p.category = 'other';
        });
        await savePasswords();
        
        groups = groups.filter(g => g.id !== id);
        saveGroups();
        renderGroupsList();
        renderGroups();
        renderPasswords();
        showToast('分组已删除');
    }
}

function saveGroups() {
    localStorage.setItem('groups', JSON.stringify(groups));
}

function showPage(page, item = null) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('settingsPage').style.display = 'none';
    document.getElementById('addPage').style.display = 'none';
    document.getElementById('detailPage').style.display = 'none';
    
    if (page === 'home') {
        document.getElementById('appContainer').style.display = 'block';
        document.querySelector('.nav-item[data-page="home"]').classList.add('active');
    } else if (page === 'settings') {
        document.getElementById('settingsPage').style.display = 'block';
        document.querySelector('.nav-item[data-page="settings"]').classList.add('active');
    } else if (page === 'add') {
        document.getElementById('addPage').style.display = 'block';
    } else if (page === 'detail' && item) {
        document.getElementById('detailPage').style.display = 'block';
        openDetailModal(item);
    }
}

function toggleSelectionMode() {
    selectionMode = !selectionMode;
    selectedItems.clear();
    
    const appContainer = document.getElementById('appContainer');
    const headerActions = document.querySelector('.header-actions');
    const selectionBar = document.querySelector('.selection-bar');
    
    appContainer.classList.toggle('selection-mode', selectionMode);
    
    if (selectionMode) {
        headerActions.style.display = 'none';
        selectionBar.style.display = 'flex';
    } else {
        headerActions.style.display = 'flex';
        selectionBar.style.display = 'none';
    }
    
    updateSelectionCount();
    renderPasswords();
}

function toggleSelection(id) {
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    updateSelectionCount();
    renderPasswords();
}

function updateSelectionCount() {
    document.getElementById('selectedCount').textContent = selectedItems.size;
}

async function batchDelete() {
    if (selectedItems.size === 0) {
        showToast('请先选择要删除的项目');
        return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedItems.size} 个密码吗？`)) {
        showLoading();
        passwords = passwords.filter(p => !selectedItems.has(p.id));
        await savePasswords();
        toggleSelectionMode();
        renderPasswords();
        hideLoading();
        showToast('删除成功');
    }
}

function openBatchMoveModal() {
    if (selectedItems.size === 0) {
        showToast('请先选择要移动的项目');
        return;
    }
    
    const optionsContainer = document.getElementById('batchMoveOptions');
    optionsContainer.innerHTML = '';
    
    const userGroups = groups.filter(g => g.id !== 'all');
    
    userGroups.forEach(group => {
        const option = document.createElement('div');
        option.className = 'batch-move-option';
        option.innerHTML = `
            <div class="group-color" style="background: ${group.color || '#5eead4'};"></div>
            <span>${group.name}</span>
        `;
        option.onclick = () => batchMoveToGroup(group.id);
        optionsContainer.appendChild(option);
    });
    
    document.getElementById('batchMoveModal').classList.add('show');
}

async function batchMoveToGroup(groupId) {
    showLoading();
    passwords.forEach(p => {
        if (selectedItems.has(p.id)) {
            p.category = groupId;
        }
    });
    
    await savePasswords();
    closeModal('batchMoveModal');
    toggleSelectionMode();
    renderPasswords();
    hideLoading();
    showToast('移动成功');
}

let draggedItem = null;
let draggedGroup = null;

function setupDragEvents(item) {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragleave', handleDragLeave);
}

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.password-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (this === draggedItem) return;
    
    const draggedId = parseInt(draggedItem.dataset.id);
    const targetId = parseInt(this.dataset.id);
    
    const draggedIndex = passwords.findIndex(p => p.id === draggedId);
    const targetIndex = passwords.findIndex(p => p.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = passwords.splice(draggedIndex, 1);
        passwords.splice(targetIndex, 0, removed);
        await savePasswords();
        renderPasswords();
    }
}

function setupGroupDragEvents(item) {
    item.addEventListener('dragstart', handleGroupDragStart);
    item.addEventListener('dragend', handleGroupDragEnd);
    item.addEventListener('dragover', handleGroupDragOver);
    item.addEventListener('drop', handleGroupDrop);
    item.addEventListener('dragleave', handleGroupDragLeave);
}

function handleGroupDragStart(e) {
    draggedGroup = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleGroupDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.group-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleGroupDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (this !== draggedGroup) {
        this.classList.add('drag-over');
    }
}

function handleGroupDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleGroupDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (this === draggedGroup) return;
    
    const draggedId = draggedGroup.dataset.id;
    const targetId = this.dataset.id;
    
    const draggedIndex = groups.findIndex(g => g.id === draggedId);
    const targetIndex = groups.findIndex(g => g.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = groups.splice(draggedIndex, 1);
        groups.splice(targetIndex, 0, removed);
        saveGroups();
        renderGroupsList();
        renderGroups();
    }
}

function switchIconTab(tab, element) {
    document.querySelectorAll('.icon-tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    
    if (tab === 'emoji') {
        document.getElementById('emojiSelector').style.display = 'grid';
        document.getElementById('uploadSelector').style.display = 'none';
        document.getElementById('iconType').value = 'emoji';
        document.getElementById('iconValue').value = '🌐';
    } else {
        document.getElementById('emojiSelector').style.display = 'none';
        document.getElementById('uploadSelector').style.display = 'grid';
        document.getElementById('iconType').value = 'image';
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        showToast('图片大小不能超过2MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadArea = document.querySelector('.upload-area');
        uploadArea.innerHTML = `<img src="${e.target.result}" class="upload-preview">`;
        document.getElementById('iconValue').value = e.target.result;
    };
    reader.readAsDataURL(file);
}

function addCustomField(existingField = null) {
    const container = document.getElementById('customFieldsContainer');
    const fieldId = existingField ? existingField.id : 'new_' + Date.now();
    
    const div = document.createElement('div');
    div.className = 'custom-field-item';
    div.id = `field-${fieldId}`;
    div.innerHTML = `
        <button type="button" class="remove-field-btn" onclick="removeCustomField('${fieldId}')">×</button>
        <div class="field-header">
            <select class="field-type-select" onchange="changeFieldType('${fieldId}')">
                <option value="text" ${existingField?.type === 'text' ? 'selected' : ''}>文本</option>
                <option value="link" ${existingField?.type === 'link' ? 'selected' : ''}>链接</option>
                <option value="email" ${existingField?.type === 'email' ? 'selected' : ''}>邮箱</option>
                <option value="date" ${existingField?.type === 'date' ? 'selected' : ''}>日期</option>
            </select>
            <input type="text" class="field-name-input" placeholder="字段名称" value="${existingField?.name || ''}">
        </div>
        <input type="${existingField?.type === 'date' ? 'date' : 'text'}" 
               class="field-value-input" 
               placeholder="字段值" 
               value="${existingField?.value || ''}">
    `;
    
    container.appendChild(div);
}

function changeFieldType(fieldId) {
    const select = document.querySelector(`#field-${fieldId} .field-type-select`);
    const valueInput = document.querySelector(`#field-${fieldId} .field-value-input`);
    valueInput.type = select.value === 'date' ? 'date' : 'text';
}

function removeCustomField(fieldId) {
    const element = document.getElementById(`field-${fieldId}`);
    if (element) element.remove();
}

function getCustomFieldsFromForm() {
    const fields = [];
    document.querySelectorAll('.custom-field-item').forEach(item => {
        const type = item.querySelector('.field-type-select').value;
        const name = item.querySelector('.field-name-input').value.trim();
        const value = item.querySelector('.field-value-input').value.trim();
        
        if (name && value) {
            fields.push({ id: item.id.replace('field-', ''), name, type, value });
        }
    });
    return fields;
}

function openAddModal(isEdit = false) {
    initAddPage();
    
    document.getElementById('addPageTitle').textContent = '添加密码';
    
    const form = document.getElementById('addPasswordForm');
    form.reset();
    document.getElementById('editId').value = '';
    document.getElementById('customFieldsContainer').innerHTML = '';
    
    if (!isEdit) {
        document.getElementById('iconType').value = 'emoji';
        document.getElementById('iconValue').value = '🌐';
        switchIconTab('emoji', document.querySelector('.icon-tab'));
        document.querySelector('.upload-area').innerHTML = `
            <input type="file" id="fileInput" accept="image/*" onchange="handleImageUpload(event)">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="opacity: 0.5;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span>点击上传图片</span>
        `;
    }
    
    showPage('add');
}

function openDetailModal(item) {
    currentDetailId = item.id;
    const iconDiv = document.getElementById('detailIcon');
    
    if (item.iconType === 'image') {
        iconDiv.innerHTML = `<img src="${item.icon}" style="width: 100%; height: 100%; object-fit: cover;">`;
        iconDiv.style.background = 'rgba(255,255,255,0.05)';
    } else {
        iconDiv.textContent = item.icon;
        iconDiv.style.background = item.color + '20';
        iconDiv.style.boxShadow = `0 0 30px ${item.color}40`;
    }
    
    const group = groups.find(g => g.id === item.category);
    document.getElementById('detailTitle').textContent = item.name;
    document.getElementById('detailCategory').textContent = group ? group.name : '未分组';
    document.getElementById('detailUsername').textContent = item.username;
    document.getElementById('detailPassword').textContent = item.password;
    document.getElementById('detailPassword').classList.add('password-mask');
    document.getElementById('detailPassword').classList.remove('password-visible');
    document.getElementById('eyeIcon').textContent = '👁';
    
    const customFieldsContainer = document.getElementById('detailCustomFields');
    customFieldsContainer.innerHTML = '';
    if (item.customFields && item.customFields.length > 0) {
        item.customFields.forEach(field => {
            const div = document.createElement('div');
            div.className = 'detail-field';
            
            let valueHtml = field.value;
            if (field.type === 'link') {
                valueHtml = `<a href="${field.value}" target="_blank" style="color: #5eead4; text-decoration: none;">${field.value}</a>`;
            }
            
            div.innerHTML = `
                <div class="detail-label">${field.name}</div>
                <div class="detail-value" style="font-size: 16px;">
                    <span>${valueHtml}</span>
                    <button class="copy-btn" onclick="copyText('${field.value}')">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                    </button>
                </div>
            `;
            customFieldsContainer.appendChild(div);
        });
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleDetailPassword() {
    const pwd = document.getElementById('detailPassword');
    const eye = document.getElementById('eyeIcon');
    if (pwd.classList.contains('password-mask')) {
        pwd.classList.remove('password-mask');
        pwd.classList.add('password-visible');
        eye.textContent = '🙈';
    } else {
        pwd.classList.add('password-mask');
        pwd.classList.remove('password-visible');
        eye.textContent = '👁';
    }
}

function editCurrentItem() {
    const item = passwords.find(p => p.id === currentDetailId);
    if (!item) return;
    
    initAddPage();
    
    document.getElementById('addPageTitle').textContent = '编辑密码';
    
    const form = document.getElementById('addPasswordForm');
    form.reset();
    document.getElementById('customFieldsContainer').innerHTML = '';
    
    document.getElementById('editId').value = item.id;
    document.getElementById('appName').value = item.name;
    document.getElementById('username').value = item.username;
    document.getElementById('password').value = item.password;
    document.getElementById('category').value = item.category;
    
    if (item.iconType === 'image') {
        switchIconTab('upload', document.querySelectorAll('.icon-tab')[1]);
        document.querySelector('.upload-area').innerHTML = `<img src="${item.icon}" class="upload-preview">`;
        document.getElementById('iconValue').value = item.icon;
    } else {
        switchIconTab('emoji', document.querySelector('.icon-tab'));
        document.querySelectorAll('.icon-option').forEach(i => {
            i.classList.toggle('selected', i.dataset.icon === item.icon);
        });
        document.getElementById('iconValue').value = item.icon;
    }
    
    if (item.customFields) {
        item.customFields.forEach(field => addCustomField(field));
    }
    
    showPage('add');
}

async function savePassword() {
    showLoading();
    
    const editId = document.getElementById('editId').value;
    const iconType = document.getElementById('iconType').value;
    const iconValue = document.getElementById('iconValue').value;
    
    const newPassword = {
        id: editId ? parseInt(editId) : Date.now(),
        name: document.getElementById('appName').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        icon: iconValue,
        iconType: iconType,
        category: document.getElementById('category').value,
        color: iconType === 'emoji' ? '#5eead4' : '#64748b',
        customFields: getCustomFieldsFromForm()
    };
    
    if (editId) {
        const index = passwords.findIndex(p => p.id === parseInt(editId));
        if (index !== -1) {
            if (passwords[index].iconType === 'emoji' && iconType === 'emoji') {
                newPassword.color = passwords[index].color;
            }
            passwords[index] = newPassword;
        }
    } else {
        passwords.unshift(newPassword);
    }
    
    await savePasswords();
    renderPasswords();
    showPage('home');
    hideLoading();
    showToast(editId ? '更新成功' : '保存成功');
}

async function deleteCurrentItem() {
    if (confirm('确定要删除这个密码吗？')) {
        showLoading();
        passwords = passwords.filter(p => p.id !== currentDetailId);
        await savePasswords();
        renderPasswords();
        showPage('home');
        hideLoading();
        showToast('已删除');
    }
}

function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).textContent;
    copyText(text);
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板');
    } catch (err) {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('已复制到剪贴板');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastText').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal.id);
    });
});

const passwordForm = document.getElementById('addPasswordForm');
if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePassword();
    });
}

let iconSelectionInitialized = false;

function initAddPage() {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '';
    groups.filter(g => g.id !== 'all').forEach(g => {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.name;
        categorySelect.appendChild(option);
    });
    
    if (!iconSelectionInitialized) {
        setupIconSelection();
        iconSelectionInitialized = true;
    }
}

function setupIconSelection() {
    document.querySelectorAll('.icon-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            document.getElementById('iconValue').value = option.dataset.icon;
            document.getElementById('iconType').value = 'emoji';
        });
    });
}

const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-10px); }
        40% { transform: translateX(10px); }
        60% { transform: translateX(-10px); }
        80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    await checkInitialization();
    
    if (isInitialized) {
        showSkeleton();
        initLockScreen();
        renderGroups();
        renderPasswords();
    } else {
        showSetupScreen();
    }
    
    hideLoading();
    setupAutoLock();
});
