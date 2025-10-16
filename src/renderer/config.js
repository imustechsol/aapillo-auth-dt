const { ipcRenderer } = require('electron');

let currentUserId = null;
let systemUsers = [];

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'users') {
        loadUsers();
    }
}

async function saveMasterConfig() {
    const masterPassword = document.getElementById('masterPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const apiEndpoint = document.getElementById('apiEndpoint').value;
    const apiKey = document.getElementById('apiKey').value;
    
    if (!masterPassword || !confirmPassword || !apiEndpoint || !apiKey) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (masterPassword !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    if (masterPassword.length < 8) {
        showMessage('Master password must be at least 8 characters long', 'error');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('save-master-config', {
            masterPassword,
            apiEndpoint,
            apiKey
        });
        
        if (result.success) {
            showMessage('Configuration saved successfully!', 'success');
            document.getElementById('masterPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showMessage('Failed to save configuration: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error saving configuration: ' + error.message, 'error');
    }
}

async function testConnection() {
    const apiEndpoint = document.getElementById('apiEndpoint').value;
    const apiKey = document.getElementById('apiKey').value;
    
    if (!apiEndpoint || !apiKey) {
        showMessage('Please enter API endpoint and key first', 'error');
        return;
    }
    
    showMessage('Testing connection...', 'info');
    
    try {
        const response = await fetch(`${apiEndpoint}/health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 5000
        });
        
        if (response.ok) {
            showMessage('Connection test successful!', 'success');
        } else {
            showMessage('Connection test failed: ' + response.statusText, 'error');
        }
    } catch (error) {
        showMessage('Connection test failed: ' + error.message, 'error');
    }
}

async function loadUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '<div class="loading">Loading users...</div>';
    
    try {
        systemUsers = await ipcRenderer.invoke('get-system-users');
        renderUsers();
    } catch (error) {
        usersList.innerHTML = '<div class="error">Failed to load users: ' + error.message + '</div>';
    }
}

async function renderUsers() {
    const usersList = document.getElementById('usersList');
    
    if (systemUsers.length === 0) {
        usersList.innerHTML = '<div class="no-users">No users found</div>';
        return;
    }
    
    let html = '<div class="users-grid">';
    
    for (const user of systemUsers) {
        const userConfig = await ipcRenderer.invoke('get-user-config', user.id);
        const isConfigured = userConfig !== null;
        
        html += `
            <div class="user-card ${isConfigured ? 'configured' : ''}" onclick="openUserPanel('${user.id}', '${user.name}')">
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-caption">${user.description}</div>
                    <div class="user-id">ID: ${user.id.substring(0, 50)}</div>
                    <div class="user-last-login">Last Login: ${user.lastLogin}</div>
                </div>
                <div class="user-status">
                    <span class="status-badge ${isConfigured ? 'configured' : 'not-configured'}">
                        ${isConfigured ? 'Configured' : 'Not Configured'}
                    </span>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    usersList.innerHTML = html;
}

async function refreshUsers() {
    await loadUsers();
}

async function openUserPanel(userId, userName) {
    currentUserId = userId;
    
    document.getElementById('panelTitle').textContent = `Configure User: ${userName}`;
    
    const userConfig = await ipcRenderer.invoke('get-user-config', userId);
    
    if (userConfig) {
        document.getElementById('userUuid').value = userConfig.uuid || '';
        document.getElementById('otpSkipDuration').value = userConfig.otpSkipDuration || 60;
        document.getElementById('mobileNumbers').value = userConfig.mobileNumbers ? userConfig.mobileNumbers.join(', ') : '';
        document.getElementById('userEnabled').checked = userConfig.enabled !== false;
    } else {
        document.getElementById('userUuid').value = '';
        document.getElementById('otpSkipDuration').value = 60;
        document.getElementById('mobileNumbers').value = '';
        document.getElementById('userEnabled').checked = true;
    }
    
    document.getElementById('userPanel').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeUserPanel() {
    document.getElementById('userPanel').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    currentUserId = null;
}

async function saveUserConfig() {
    if (!currentUserId) return;
    
    const uuid = document.getElementById('userUuid').value.trim();
    const otpSkipDuration = document.getElementById('otpSkipDuration').value;
    const mobileNumbers = document.getElementById('mobileNumbers').value;
    const enabled = document.getElementById('userEnabled').checked;
    
    if (!uuid) {
        showMessage('Please enter a UUID for this user', 'error');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('save-user-config', currentUserId, {
            uuid,
            otpSkipDuration,
            mobileNumbers,
            enabled
        });
        
        if (result.success) {
            showMessage('User configuration saved successfully!', 'success');
            closeUserPanel();
            renderUsers();
        } else {
            showMessage('Failed to save user configuration: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error saving user configuration: ' + error.message, 'error');
    }
}

async function exportConfig() {
    try {
        const result = await ipcRenderer.invoke('config-export');
        if (result.success) {
            showMessage('Configuration exported successfully!', 'success');
        } else {
            showMessage('Failed to export configuration: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error exporting configuration: ' + error.message, 'error');
    }
}

async function importConfig() {
    try {
        const result = await ipcRenderer.invoke('config-import');
        if (result.success) {
            showMessage('Configuration imported successfully!', 'success');
        } else {
            showMessage('Failed to import configuration: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error importing configuration: ' + error.message, 'error');
    }
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    if (type === 'success') {
        messageDiv.style.background = '#28a745';
    } else if (type === 'error') {
        messageDiv.style.background = '#dc3545';
    } else {
        messageDiv.style.background = '#17a2b8';
    }
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('users').classList.contains('active')) {
        loadUsers();
    }
});

document.getElementById('overlay').addEventListener('click', closeUserPanel);