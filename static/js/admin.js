// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupEventListeners();
});

let allUsers = [];
let currentAction = null;
let currentUserId = null;
const currentUserIdFromPage = parseInt(document.getElementById('userData')?.getAttribute('data-user-id') || '0', 10);

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Busca
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Modal
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('confirmBtn').addEventListener('click', confirmAction);
    
    // Fechar modal ao clicar fora
    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target.id === 'confirmModal') closeModal();
    });
}

// ===== CARREGAR USUÁRIOS =====
async function loadUsers() {
    console.log('Carregando usuários...');
    try {
        const response = await fetch('/api/admin/users');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro na resposta:', errorData);
            throw new Error(errorData.error || 'Erro ao carregar usuários');
        }
        
        allUsers = await response.json();
        console.log('Usuários carregados:', allUsers);
        updateStats();
        renderUsers(allUsers);
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao carregar usuários', 'error');
        document.getElementById('usersTableBody').innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    Erro ao carregar usuários
                </td>
            </tr>
        `;
    }
}

// ===== ATUALIZAR ESTATÍSTICAS =====
function updateStats() {
    const totalUsers = allUsers.length;
    const totalAdmins = allUsers.filter(u => u.is_admin).length;
    const totalRegularUsers = totalUsers - totalAdmins;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalAdmins').textContent = totalAdmins;
    document.getElementById('totalRegularUsers').textContent = totalRegularUsers;
}

// ===== RENDERIZAR USUÁRIOS =====
function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    <i class="fas fa-search"></i>
                    Nenhum usuário encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>#${user.id}</strong></td>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <span class="user-badge ${user.is_admin ? 'badge-admin' : 'badge-user'}">
                    <i class="fas ${user.is_admin ? 'fa-shield-alt' : 'fa-user'}"></i>
                    ${user.is_admin ? 'Admin' : 'Usuário'}
                </span>
            </td>
            <td>${user.folders_count}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="actions-btns">
                    ${user.id !== currentUserIdFromPage ? `
                        <button 
                            class="btn-action btn-toggle-admin" 
                            onclick="toggleAdmin(${user.id}, ${user.is_admin})"
                            title="${user.is_admin ? 'Remover admin' : 'Tornar admin'}">
                            <i class="fas fa-shield-alt"></i>
                        </button>
                        <button 
                            class="btn-action btn-delete" 
                            onclick="confirmDelete(${user.id}, '${escapeHtml(user.name)}')"
                            title="Deletar usuário">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">Você</span>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
}

// ===== BUSCAR USUÁRIOS =====
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderUsers(allUsers);
        return;
    }
    
    const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.id.toString().includes(searchTerm)
    );
    
    renderUsers(filtered);
}

// ===== ALTERNAR STATUS DE ADMIN =====
async function toggleAdmin(userId, isCurrentlyAdmin) {
    currentAction = 'toggle';
    currentUserId = userId;
    
    const user = allUsers.find(u => u.id === userId);
    const action = isCurrentlyAdmin ? 'remover privilégios de administrador' : 'tornar administrador';
    
    showModal(
        isCurrentlyAdmin ? 'Remover Admin' : 'Tornar Admin',
        `Deseja ${action} de <strong>${escapeHtml(user.name)}</strong>?`
    );
}

async function executeToggleAdmin() {
    try {
        const response = await fetch(`/api/admin/users/${currentUserId}/toggle-admin`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Status atualizado com sucesso!', 'success');
            await loadUsers();
        } else {
            showNotification(data.message || 'Erro ao atualizar status', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao atualizar status', 'error');
    }
}

// ===== DELETAR USUÁRIO =====
function confirmDelete(userId, userName) {
    currentAction = 'delete';
    currentUserId = userId;
    
    showModal(
        'Deletar Usuário',
        `Tem certeza que deseja deletar <strong>${escapeHtml(userName)}</strong>?<br><br>
        <span style="color: var(--error);">Esta ação não pode ser desfeita e todas as pastas e notas deste usuário serão perdidas!</span>`
    );
}

async function executeDelete() {
    try {
        const response = await fetch(`/api/admin/users/${currentUserId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Usuário deletado com sucesso!', 'success');
            await loadUsers();
        } else {
            showNotification(data.message || 'Erro ao deletar usuário', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao deletar usuário', 'error');
    }
}

// ===== MODAL =====
function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').innerHTML = message;
    document.getElementById('confirmModal').classList.add('active');
}

function closeModal() {
    document.getElementById('confirmModal').classList.remove('active');
    currentAction = null;
    currentUserId = null;
}

async function confirmAction() {
    closeModal();
    
    if (currentAction === 'delete') {
        await executeDelete();
    } else if (currentAction === 'toggle') {
        await executeToggleAdmin();
    }
}

// ===== NOTIFICAÇÃO =====
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// ===== UTILIDADES =====
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
