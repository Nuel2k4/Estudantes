// ===== ESTADO GLOBAL =====
let currentFolderId = null;
let currentNoteId = null;
let studyTimer = null;
let studyStartTime = null;
let elapsedSeconds = 0;
let autoSaveTimeout = null;
let autoSaveTimer = null;
let lastSavedSeconds = 0;
let folderToDelete = null;
let loadingCount = 0; // Contador de operações em andamento

// ===== LOADING GLOBAL =====
function showGlobalLoading(message = 'Carregando...') {
    loadingCount++;
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'global-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="spinner"></div>
                <p class="loader-message">${message}</p>
            </div>
        `;
        document.body.appendChild(loader);
    } else {
        loader.querySelector('.loader-message').textContent = message;
    }
    loader.style.display = 'flex';
}

function hideGlobalLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remover após 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // Mostrar onboarding se for novo usuário
    const showWelcome = document.body.getAttribute('data-show-welcome') === 'true';
    if (showWelcome) {
        setTimeout(() => {
            const modal = document.getElementById('onboardingModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        }, 500);
    }
});

function initializeApp() {
    loadFolders();
    setupEventListeners();
    // Aguardar carregar timer (pode salvar sessão pendente)
    loadStudyTimer().then(() => {
        // Depois carregar estatísticas
        loadStudyStats();
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Pastas
    document.getElementById('addFolderBtn').addEventListener('click', openFolderModal);
    document.getElementById('cancelFolderBtn').addEventListener('click', closeFolderModal);
    document.getElementById('saveFolderBtn').addEventListener('click', createFolder);
    
    // Enter para criar pasta
    document.getElementById('folderNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });
    
    // Notas
    document.getElementById('addNoteBtn').addEventListener('click', openNoteModal);
    document.getElementById('closeModal').addEventListener('click', closeNoteModal);
    document.getElementById('cancelNote').addEventListener('click', closeNoteModal);
    document.getElementById('saveNote').addEventListener('click', saveNote);
    
    // Auto-save ao digitar
    document.getElementById('noteContentInput').addEventListener('input', handleAutoSave);
    document.getElementById('noteTitleInput').addEventListener('input', handleAutoSave);
    
    // Cronômetro
    document.getElementById('startTimer').addEventListener('click', startStudyTimer);
    document.getElementById('stopTimer').addEventListener('click', stopStudyTimer);
    document.getElementById('resetTimer').addEventListener('click', resetStudyTimer);
    
    // IA Chat
    const aiSendBtn = document.getElementById('sendAiMessage');
    const aiInput = document.getElementById('aiInput');
    if (aiSendBtn) aiSendBtn.addEventListener('click', sendAiMessage);
    if (aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendAiMessage();
        });
    }
    
    // YouTube
    const ytSearchBtn = document.getElementById('searchYoutube');
    const ytInput = document.getElementById('youtubeSearch');
    if (ytSearchBtn) ytSearchBtn.addEventListener('click', searchYoutube);
    if (ytInput) {
        ytInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchYoutube();
        });
    }
    
    // Fechar modal ao clicar fora
    document.getElementById('noteModal').addEventListener('click', (e) => {
        if (e.target.id === 'noteModal') closeNoteModal();
    });
    
    document.getElementById('folderModal').addEventListener('click', (e) => {
        if (e.target.id === 'folderModal') closeFolderModal();
    });
    
    // Modal de excluir pasta
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const deleteModal = document.getElementById('deleteModal');
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeleteFolder);
    }
    
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') closeDeleteModal();
        });
    }
}

// ===== PASTAS =====
async function loadFolders() {
    showGlobalLoading('Carregando pastas...');
    try {
        const response = await fetch('/api/folders');
        const folders = await response.json();
        
        const foldersList = document.getElementById('foldersList');
        foldersList.innerHTML = '';
        
        if (folders.length === 0) {
            foldersList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">Nenhuma pasta criada</p>';
            return;
        }
        
        folders.forEach(folder => {
            const folderElement = createFolderElement(folder);
            foldersList.appendChild(folderElement);
        });
    } catch (error) {
        console.error('❌ Erro ao carregar pastas:', error);
        showToast('Erro ao carregar pastas', 'error');
    } finally {
        hideGlobalLoading();
    }
}

function createFolderElement(folder) {
    const div = document.createElement('div');
    div.className = 'folder-item';
    div.dataset.folderId = folder.id;
    
    div.innerHTML = `
        <div class="folder-info">
            <i class="fas fa-folder"></i>
            <span>${folder.name}</span>
        </div>
        <div class="folder-actions">
            <button class="btn-delete" onclick="deleteFolder(${folder.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-delete')) {
            selectFolder(folder.id, folder.name);
        }
    });
    
    return div;
}

// ===== MODAL DE PASTA =====
function openFolderModal() {
    const modal = document.getElementById('folderModal');
    const input = document.getElementById('folderNameInput');
    modal.classList.add('show');
    input.value = '';
    setTimeout(() => input.focus(), 100);
}

function closeFolderModal() {
    const modal = document.getElementById('folderModal');
    modal.classList.remove('show');
}

async function createFolder() {
    const input = document.getElementById('folderNameInput');
    const folderName = input.value.trim();
    
    if (!folderName) {
        input.focus();
        return;
    }
    
    try {
        const response = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: folderName })
        });
        
        if (response.ok) {
            await loadFolders();
            closeFolderModal();
            showNotification('Pasta criada com sucesso!', 'success');
        }
    } catch (error) {
        console.error('Erro ao criar pasta:', error);
        showNotification('Erro ao criar pasta', 'error');
    }
}

async function deleteFolder(folderId) {
    abrirModalExcluir(folderId);
}

async function selectFolder(folderId, folderName) {
    currentFolderId = folderId;
    
    // Atualizar UI
    document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-folder-id="${folderId}"]`).classList.add('active');
    
    document.getElementById('currentFolderName').textContent = folderName;
    const addNoteBtn = document.getElementById('addNoteBtn');
    addNoteBtn.disabled = false;
    console.log('Botão addNote habilitado:', addNoteBtn);
    
    // Mostrar painel da IA ao lado
    const rightPanel = document.querySelector('.right-panel');
    console.log('Selecionou pasta - Painel encontrado:', rightPanel);
    if (rightPanel) {
        rightPanel.classList.add('show');
        console.log('Painel da IA mostrado! Classes:', rightPanel.className);
    } else {
        console.error('Painel da IA não encontrado no DOM!');
    }
    
    // Carregar notas
    await loadNotes(folderId);
}

// ===== NOTAS =====
async function loadNotes(folderId) {
    try {
        const response = await fetch(`/api/folders/${folderId}/notes`);
        const notes = await response.json();
        
        const notesGrid = document.getElementById('notesGrid');
        notesGrid.innerHTML = '';
        
        if (notes.length === 0) {
            notesGrid.innerHTML = '<div class="welcome-message"><i class="fas fa-sticky-note"></i><h2>Nenhuma nota ainda</h2><p>Clique em "Nova Nota" para começar</p></div>';
            return;
        }
        
        notes.forEach(note => {
            const noteElement = createNoteElement(note);
            notesGrid.appendChild(noteElement);
        });
    } catch (error) {
        console.error('Erro ao carregar notas:', error);
        showNotification('Erro ao carregar notas', 'error');
    }
}

function createNoteElement(note) {
    const div = document.createElement('div');
    div.className = 'note-card';
    div.dataset.noteId = note.id;
    
    const previewContent = note.content ? note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '') : 'Sem conteúdo';
    const updatedDate = new Date(note.updated_at).toLocaleDateString('pt-BR');
    
    div.innerHTML = `
        <div class="note-header">
            <h3 class="note-title">${note.title}</h3>
            <button class="btn-delete" onclick="abrirModalExcluirNota(${note.id}, event)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="note-content">${previewContent}</div>
        <div class="note-footer">
            Última atualização: ${updatedDate}
        </div>
    `;
    
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-delete')) {
            editNote(note);
        }
    });
    
    return div;
}

function openNoteModal(note = null) {
    console.log('openNoteModal chamada, note:', note);
    const modal = document.getElementById('noteModal');
    const modalTitle = document.getElementById('modalTitle');
    const titleInput = document.getElementById('noteTitleInput');
    const contentInput = document.getElementById('noteContentInput');
    
    if (note) {
        currentNoteId = note.id;
        modalTitle.textContent = 'Editar Nota';
        titleInput.value = note.title;
        contentInput.value = note.content || '';
    } else {
        currentNoteId = null;
        modalTitle.textContent = 'Nova Nota';
        titleInput.value = '';
        contentInput.value = '';
    }
    
    modal.classList.add('active');
    titleInput.focus();
    
    // Mostrar painel da IA quando abrir nota
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
        rightPanel.classList.add('show');
    }
    
    // Iniciar auto-save para nova nota
    startAutoSaveForNewNote();
}

function closeNoteModal() {
    document.getElementById('noteModal').classList.remove('active');
    currentNoteId = null;
    
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    // Manter painel da IA visível se ainda houver pasta selecionada
    // Caso contrário, esconder
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel && !currentFolderId) {
        rightPanel.classList.remove('show');
    }
}

function editNote(note) {
    openNoteModal(note);
}

async function saveNote() {
    const title = document.getElementById('noteTitleInput').value.trim();
    const content = document.getElementById('noteContentInput').value.trim();
    
    if (!title) {
        alert('Por favor, digite um título para a nota');
        return;
    }
    
    // Forçar salvamento imediato antes de fechar
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    try {
        if (currentNoteId) {
            // Atualizar nota existente
            await fetch(`/api/notes/${currentNoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });
        } else {
            // Criar nova nota
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    folder_id: currentFolderId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                currentNoteId = data.id;
            }
        }
        
        closeNoteModal();
        await loadNotes(currentFolderId);
        showNotification('Nota salva com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar nota:', error);
        showNotification('Erro ao salvar nota', 'error');
    }
}

async function deleteNote(noteId) {
    // Função mantida para compatibilidade, mas agora usa o modal
    abrirModalExcluirNota(noteId, event);
}

// ===== AUTO-SAVE =====
function handleAutoSave() {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    autoSaveTimeout = setTimeout(async () => {
        const title = document.getElementById('noteTitleInput').value.trim();
        const content = document.getElementById('noteContentInput').value.trim();
        
        if (!title) {
            return;
        }
        
        try {
            if (currentNoteId) {
                // Atualizar nota existente
                await fetch(`/api/notes/${currentNoteId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content })
                });
            } else {
                // Criar nova nota automaticamente
                const response = await fetch('/api/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        content,
                        folder_id: currentFolderId
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    currentNoteId = data.id;
                    // Atualizar lista de notas em background
                    loadNotes(currentFolderId);
                }
            }
        } catch (error) {
            console.error('Erro no auto-save:', error);
        }
    }, 1500);
}

function startAutoSaveForNewNote() {
    // Configurar auto-save desde o início para novas notas
    const titleInput = document.getElementById('noteTitleInput');
    const contentInput = document.getElementById('noteContentInput');
    
    // Remover event listeners antigos para evitar duplicação
    titleInput.removeEventListener('input', handleAutoSave);
    contentInput.removeEventListener('input', handleAutoSave);
    
    // Adicionar novamente
    titleInput.addEventListener('input', handleAutoSave);
    contentInput.addEventListener('input', handleAutoSave);
}

// ===== CRONÔMETRO DE ESTUDO =====
async function loadStudyTimer() {
    const savedTime = localStorage.getItem('studyTimerSeconds');
    const wasRunning = localStorage.getItem('studyTimerRunning') === 'true';
    const savedStartTime = localStorage.getItem('studyTimerStartTime');
    
    if (wasRunning && savedStartTime) {
        // Timer estava rodando, calcular tempo desde o início
        const startTime = parseInt(savedStartTime);
        const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
        
        // Salvar sessão automaticamente
        if (totalSeconds > 0) {
            console.log('⏰ Detectado timer interrompido, salvando', totalSeconds, 'segundos');
            const endTime = new Date();
            const sessionStart = new Date(startTime);
            
            try {
                const response = await fetch('/api/study-sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        start_time: sessionStart.toISOString(),
                        end_time: endTime.toISOString(),
                        duration_seconds: totalSeconds
                    })
                });
                
                const result = await response.json();
                console.log('✅ Sessão salva:', result);
                
                // Atualizar estatísticas
                await loadStudyStats();
            } catch (error) {
                console.error('❌ Erro ao salvar sessão:', error);
            }
        }
        
        // Resetar timer
        elapsedSeconds = 0;
        localStorage.removeItem('studyTimerSeconds');
        localStorage.removeItem('studyTimerRunning');
        localStorage.removeItem('studyTimerStartTime');
    } else if (savedTime) {
        elapsedSeconds = parseInt(savedTime);
    }
    
    updateTimerDisplay();
}

function startStudyTimer() {
    if (studyTimer) return;
    
    studyStartTime = Date.now() - (elapsedSeconds * 1000);
    localStorage.setItem('studyTimerRunning', 'true');
    localStorage.setItem('studyTimerStartTime', studyStartTime.toString());
    
    // Atualizar display a cada segundo
    studyTimer = setInterval(() => {
        elapsedSeconds = Math.floor((Date.now() - studyStartTime) / 1000);
        updateTimerDisplay();
        localStorage.setItem('studyTimerSeconds', elapsedSeconds);
    }, 1000);
    
    // Auto-save a cada 60 segundos
    autoSaveTimer = setInterval(() => {
        autoSaveStudySession();
    }, 60000);
    
    document.getElementById('startTimer').disabled = true;
    document.getElementById('stopTimer').disabled = false;
}

function stopStudyTimer() {
    if (!studyTimer) return;
    
    clearInterval(studyTimer);
    studyTimer = null;
    
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
    }
    
    localStorage.setItem('studyTimerRunning', 'false');
    
    // Salvar sessão final no banco
    if (elapsedSeconds > lastSavedSeconds) {
        saveStudySession();
    }
    
    document.getElementById('startTimer').disabled = false;
    document.getElementById('stopTimer').disabled = true;
}

function resetStudyTimer() {
    if (studyTimer) {
        stopStudyTimer();
    }
    
    elapsedSeconds = 0;
    updateTimerDisplay();
    localStorage.removeItem('studyTimerSeconds');
    localStorage.removeItem('studyTimerRunning');
}

function updateTimerDisplay() {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

// Auto-save periódico (salva incremento desde último save)
async function autoSaveStudySession() {
    const secondsToSave = elapsedSeconds - lastSavedSeconds;
    if (secondsToSave < 30) return; // Só salva se tiver pelo menos 30 segundos novos
    
    console.log('Auto-save:', secondsToSave, 'segundos novos');
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (secondsToSave * 1000));
    
    try {
        const response = await fetch('/api/study-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                duration_seconds: secondsToSave
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('Auto-save bem-sucedido!', result);
            lastSavedSeconds = elapsedSeconds;
            loadStudyStats();
        }
    } catch (error) {
        console.error('Erro no auto-save:', error);
    }
}

// Salvar sessão final ao pausar
async function saveStudySession() {
    const secondsToSave = elapsedSeconds - lastSavedSeconds;
    if (secondsToSave === 0) return;
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (elapsedSeconds * 1000));
    
    console.log('Salvando sessão:', elapsedSeconds, 'segundos');
    
    try {
        const response = await fetch('/api/study-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                duration_seconds: elapsedSeconds
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('Sessão salva com sucesso!', result);
            
            // Atualizar o lastSavedSeconds para o total atual
            lastSavedSeconds = elapsedSeconds;
            
            // Atualizar estatísticas
            setTimeout(() => {
                loadStudyStats();
            }, 500);
        } else {
            console.error('Erro ao salvar:', response.status, result);
        }
    } catch (error) {
        console.error('Erro ao salvar sessão de estudo:', error);
    }
}

// Salvar sessão de forma síncrona (para beforeunload)
function saveStudySessionSync() {
    if (elapsedSeconds === 0) return;
    
    console.log('Salvando sessão (sync):', elapsedSeconds, 'segundos');
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (elapsedSeconds * 1000));
    
    // Usar sendBeacon para envio síncrono confiável
    const data = JSON.stringify({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: elapsedSeconds
    });
    
    console.log('Enviando com sendBeacon:', data);
    
    // sendBeacon garante que a requisição seja enviada mesmo ao fechar a página
    const sent = navigator.sendBeacon('/api/study-sessions', new Blob([data], { type: 'application/json' }));
    console.log('SendBeacon enviado:', sent);
    
    // Limpar localStorage
    localStorage.removeItem('studyTimerSeconds');
    localStorage.removeItem('studyTimerRunning');
}

// Carregar estatísticas de estudo
async function loadStudyStats() {
    console.log('Carregando estatísticas...');
    try {
        const response = await fetch('/api/study-sessions/stats');
        if (response.ok) {
            const data = await response.json();
            console.log('Estatísticas recebidas:', data);
            
            // Formatar e exibir estatísticas
            document.getElementById('statToday').textContent = formatTime(data.today);
            document.getElementById('statWeek').textContent = formatTime(data.week);
            document.getElementById('statMonth').textContent = formatTime(data.month);
            document.getElementById('statYear').textContent = formatTime(data.year);
        } else {
            console.error('Erro ao carregar estatísticas:', response.status);
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Formatar segundos para horas e minutos
// Formatar segundos para horas e minutos
function formatTime(seconds) {
    // Garantir que é número inteiro
    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
}

// Toggle estatísticas
function toggleStats() {
    const content = document.getElementById('statsContent');
    const toggle = document.getElementById('statsToggle');
    const header = document.querySelector('.stats-header');
    
    content.classList.toggle('active');
    header.classList.toggle('active');
}

// ===== CHAT IA =====
async function sendAiMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Adicionar mensagem do usuário
    addAiMessage(message, 'user');
    input.value = '';
    
    // Adicionar indicador de digitação
    const typingIndicator = addTypingIndicator();
    
    // Desabilitar botão de enviar durante processamento
    const sendBtn = document.getElementById('sendAiMessage');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.5';
    }
    
    try {
        // Chamar API do ChatGPT através do backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        // Remover indicador de digitação
        typingIndicator.remove();
        
        // Adicionar resposta da IA
        addAiMessage(data.response, 'assistant');
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        typingIndicator.remove();
        addAiMessage('Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.', 'assistant');
    } finally {
        // Reabilitar botão de enviar
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
        }
    }
}

function addAiMessage(text, type) {
    const messagesContainer = document.getElementById('aiMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${type}`;
    
    // Formatar texto (quebras de linha e emojis)
    let formattedText = escapeHtml(text)
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **negrito**
        .replace(/\*(.*?)\*/g, '<em>$1</em>')  // *itálico*
        .replace(/`(.*?)`/g, '<code>$1</code>');  // `código`
    
    messageDiv.innerHTML = `<p>${formattedText}</p>`;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addTypingIndicator() {
    const messagesContainer = document.getElementById('aiMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message assistant typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return typingDiv;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== AUTO PLAYLIST MUSIC PLAYER (MÚSICAS JÁ VALIDADAS!) =====
let currentTrackList = [];
let currentTrackIndex = 0;
let ytPlayer = null;

// Carregar API do YouTube IFrame
let tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

async function searchYoutube() {
    const query = document.getElementById('youtubeSearch').value.trim();
    console.log('[Music] Buscando:', query);
    if (!query) {
        console.log('[Music] Query vazia!');
        alert('Cole uma URL do YouTube ou digite um gênero musical!');
        return;
    }
    
    try {
        const embedContainer = document.getElementById('youtubeEmbed');
        console.log('[Music] Mostrando loading...');
        embedContainer.innerHTML = `
            <div class="youtube-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando música...</p>
                <small style="opacity: 0.6;">Aguarde um momento!</small>
            </div>
        `;
        
        console.log('[Music] Fazendo fetch...');
        const response = await fetch('/api/music/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });
        
        console.log('[Music] Response status:', response.status);
        const data = await response.json();
        console.log('[Music] Data recebida:', data);
        
        if (data.tracks && data.tracks.length > 0) {
            console.log('[Music] Mostrando', data.tracks.length, 'músicas');
            currentTrackList = data.tracks;
            
            // Se for apenas 1 resultado (URL colada), tocar direto
            if (data.tracks.length === 1) {
                console.log('[Music] Tocando diretamente (URL única)');
                currentTrackIndex = 0;
                loadYoutubeVideo(0);
            } else {
                // Se for múltiplos resultados, mostrar lista
                showTrackList();
            }
        } else {
            console.log('[Music] Nenhuma música encontrada');
            embedContainer.innerHTML = `
                <div class="youtube-placeholder">
                    <i class="fas fa-search"></i>
                    <h3>Nenhuma música disponível encontrada</h3>
                    <p>Tente pesquisar por outro termo</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao buscar músicas:', error);
        const embedContainer = document.getElementById('youtubeEmbed');
        embedContainer.innerHTML = `
            <div class="youtube-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao buscar. Tente novamente.</p>
            </div>
        `;
    }
}

function showTrackList() {
    const embedContainer = document.getElementById('youtubeEmbed');
    
    let listHTML = `
        <div class="track-list-container">
            <div class="track-list-header">
                <h3>🎵 ${currentTrackList.length} Músicas Disponíveis</h3>
                <p style="font-size: 12px; opacity: 0.7;">Clique para tocar • Todas validadas ✓</p>
            </div>
            <div class="track-list">
    `;
    
    currentTrackList.forEach((track, index) => {
        listHTML += `
            <div class="track-item" onclick="playTrack(${index})">
                <img src="${track.cover}" alt="${track.title}" class="track-item-cover">
                <div class="track-item-info">
                    <h4>${track.title}</h4>
                    <p>${track.artist}</p>
                    <small>${track.album}</small>
                </div>
                <div class="track-item-play">
                    <i class="fas fa-play-circle"></i>
                </div>
            </div>
        `;
    });
    
    listHTML += `
            </div>
            <button class="btn-back-search-only" onclick="newSearch()">
                <i class="fas fa-search"></i> Nova busca
            </button>
        </div>
    `;
    
    embedContainer.innerHTML = listHTML;
}

function playTrack(index) {
    currentTrackIndex = index;
    loadYoutubeVideo(index);
}

function loadYoutubeVideo(index) {
    currentTrackIndex = index;
    const track = currentTrackList[index];
    const embedContainer = document.getElementById('youtubeEmbed');
    
    // Player integrado do YouTube
    embedContainer.innerHTML = `
        <div class="music-player-container">
            <div class="now-playing-header">
                <div class="now-playing-info">
                    <img src="${track.cover}" alt="${track.title}" class="album-cover-small">
                    <div class="track-details-mini">
                        <h3>${track.title}</h3>
                        <p>${track.artist}</p>
                    </div>
                </div>
                <button onclick="showTrackList()" class="btn-back-to-list">
                    <i class="fas fa-list"></i> Ver Lista
                </button>
            </div>
            
            <div class="youtube-player-integrated">
                <iframe 
                    width="100%" 
                    height="400"
                    src="https://www.youtube.com/embed/${track.videoId}?autoplay=1&controls=1&rel=0"
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen>
                </iframe>
            </div>
            
            <div class="player-controls-bar">
                <button onclick="previousTrack()" class="btn-player-control" title="Anterior">
                    <i class="fas fa-step-backward"></i>
                </button>
                <div class="track-counter">
                    <span>${currentTrackIndex + 1} / ${currentTrackList.length}</span>
                </div>
                <button onclick="nextTrack()" class="btn-player-control" title="Próxima">
                    <i class="fas fa-step-forward"></i>
                </button>
            </div>
            
            <div class="player-footer">
                <i class="fab fa-youtube" style="color: #FF0000;"></i>
                <span>Player Integrado do YouTube</span>
            </div>
        </div>
    `;
}

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % currentTrackList.length;
    loadYoutubeVideo(currentTrackIndex);
}

function previousTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + currentTrackList.length) % currentTrackList.length;
    loadYoutubeVideo(currentTrackIndex);
}

function newSearch() {
    const embedContainer = document.getElementById('youtubeEmbed');
    embedContainer.innerHTML = `
        <div class="youtube-placeholder">
            <i class="fas fa-music"></i>
            <p>Busque e escolha suas músicas</p>
            <small style="color: rgba(255,255,255,0.5);">Biblioteca de áudio do YouTube!</small>
        </div>
    `;
}

// Notificações
function showNotification(message, type = 'success') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'var(--gradient-1)' : 'var(--gradient-2)'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Adicionar animações CSS para notificações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    // Botão de busca de música
    const searchYoutubeBtn = document.getElementById('searchYoutube');
    if (searchYoutubeBtn) {
        searchYoutubeBtn.addEventListener('click', searchYoutube);
    }
    
    // Enter na busca de música
    const youtubeSearchInput = document.getElementById('youtubeSearch');
    if (youtubeSearchInput) {
        youtubeSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchYoutube();
            }
        });
    }
});

// ===== ROTINA DIÁRIA =====
let currentRoutineDay = 'segunda';
let editingTaskId = null;
let currentView = 'notas';

// Função para alternar entre views
window.alternarView = function(view) {
    currentView = view;
    
    const notasView = document.getElementById('notasView');
    const rotinaView = document.getElementById('rotinaView');
    const notasTab = document.getElementById('notasTab');
    const rotinaTab = document.getElementById('rotinaTab');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const addTaskBtn = document.getElementById('addTaskBtn');
    
    if (view === 'notas') {
        notasView.style.display = 'block';
        rotinaView.style.display = 'none';
        notasTab.classList.add('active');
        rotinaTab.classList.remove('active');
        addNoteBtn.style.display = 'flex';
        addTaskBtn.style.display = 'none';
    } else if (view === 'rotina') {
        notasView.style.display = 'none';
        rotinaView.style.display = 'block';
        notasTab.classList.remove('active');
        rotinaTab.classList.add('active');
        addNoteBtn.style.display = 'none';
        addTaskBtn.style.display = 'flex';
        carregarTarefas();
    }
}

// Event listeners da rotina
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar view de notas
    alternarView('notas');
});

async function abrirModalRotina() {
    alternarView('rotina');
}

function fecharModalRotina() {
    alternarView('notas');
}

function selecionarDia(dia) {
    currentRoutineDay = dia;
    
    // Atualizar botões ativos
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const selectedBtn = document.querySelector(`[data-day="${dia}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    renderizarCronograma();
}

async function carregarTarefas() {
    try {
        const response = await fetch('/api/routine/tasks');
        const tasks = await response.json();
        window.routineTasks = tasks;
        renderizarCronograma();
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        showNotification('Erro ao carregar tarefas', 'error');
    }
}

function renderizarCronograma() {
    const scheduleList = document.getElementById('scheduleList');
    const emptySchedule = document.getElementById('emptySchedule');
    const tasks = window.routineTasks || [];
    
    // Filtrar tarefas do dia atual
    const dayTasks = tasks.filter(task => 
        task.days.includes(currentRoutineDay)
    ).sort((a, b) => a.order_index - b.order_index);
    
    if (dayTasks.length === 0) {
        scheduleList.style.display = 'none';
        emptySchedule.style.display = 'block';
        return;
    }
    
    scheduleList.style.display = 'flex';
    emptySchedule.style.display = 'none';
    
    scheduleList.innerHTML = dayTasks.map(task => `
        <div class="schedule-item ${task.completed ? 'completed' : ''}" style="border-left-color: ${task.color};">
            <div class="schedule-checkbox">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                       onchange="toggleTarefaConcluida(${task.id})"
                       id="task-${task.id}">
                <div class="checkbox-custom">
                    <i class="fas fa-check"></i>
                </div>
            </div>
            
            <div class="schedule-content">
                <div class="schedule-title">
                    ${task.title}
                </div>
                <div class="schedule-meta">
                    <div class="schedule-time">
                        <i class="fas fa-clock"></i>
                        ${task.start_time} - ${task.end_time}
                    </div>
                    <div class="schedule-category">
                        ${getCategoryEmoji(task.category)} ${task.category}
                    </div>
                </div>
            </div>
            
            <div class="schedule-actions">
                <button class="schedule-btn" onclick="editarTarefa(${task.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="schedule-btn delete" onclick="excluirTarefa(${task.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function toggleTarefaConcluida(taskId) {
    try {
        const response = await fetch(`/api/routine/tasks/${taskId}/toggle`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            // Atualizar estado local
            const task = window.routineTasks.find(t => t.id === taskId);
            if (task) {
                task.completed = data.completed;
            }
            renderizarCronograma();
        }
    } catch (error) {
        console.error('Erro ao marcar tarefa:', error);
        showNotification('Erro ao atualizar tarefa', 'error');
    }
}

async function resetarCronograma() {
    if (!confirm('Deseja resetar todas as marcações do dia atual?')) {
        return;
    }
    
    try {
        const tasks = window.routineTasks || [];
        const dayTasks = tasks.filter(task => task.days.includes(currentRoutineDay) && task.completed);
        
        for (const task of dayTasks) {
            await fetch(`/api/routine/tasks/${task.id}/toggle`, {
                method: 'POST'
            });
        }
        
        await carregarTarefas();
        showNotification('Cronograma resetado!', 'success');
    } catch (error) {
        console.error('Erro ao resetar:', error);
        showNotification('Erro ao resetar cronograma', 'error');
    }
}

async function inicializarCronograma() {
    try {
        const response = await fetch('/api/routine/initialize', {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('Cronograma padrão criado com sucesso!', 'success');
            await carregarTarefas();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Erro ao criar cronograma', 'info');
        }
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        showNotification('Erro ao criar cronograma', 'error');
    }
}

function renderizarTimeline() {
    // Função antiga - manter para compatibilidade
    renderizarCronograma();
}

function getCategoryEmoji(category) {
    const emojis = {
        'estudo': '📚',
        'trabalho': '💼',
        'academia': '💪',
        'lazer': '🎮',
        'alimentação': '🍽️',
        'descanso': '😴',
        'outro': '📌'
    };
    return emojis[category] || '📌';
}

function abrirFormTarefa(taskId = null) {
    editingTaskId = taskId;
    const modal = document.getElementById('taskFormModal');
    const title = document.getElementById('taskFormTitle');
    
    if (taskId) {
        title.innerHTML = '<i class="fas fa-edit"></i> Editar Atividade';
        const task = window.routineTasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('taskIdInput').value = task.id;
            document.getElementById('taskTitleInput').value = task.title;
            document.getElementById('taskCategoryInput').value = task.category;
            document.getElementById('taskStartTimeInput').value = task.start_time;
            document.getElementById('taskEndTimeInput').value = task.end_time;
            document.getElementById('taskColorInput').value = task.color;
            
            // Marcar dias
            document.querySelectorAll('.days-checkbox input').forEach(checkbox => {
                checkbox.checked = task.days.includes(checkbox.value);
            });
        }
    } else {
        title.innerHTML = '<i class="fas fa-plus-circle"></i> Nova Atividade';
        limparFormTarefa();
    }
    
    modal.style.display = 'flex';
}

function fecharFormTarefa() {
    document.getElementById('taskFormModal').style.display = 'none';
    limparFormTarefa();
    editingTaskId = null;
}

function limparFormTarefa() {
    document.getElementById('taskIdInput').value = '';
    document.getElementById('taskTitleInput').value = '';
    document.getElementById('taskCategoryInput').value = 'estudo';
    document.getElementById('taskStartTimeInput').value = '';
    document.getElementById('taskEndTimeInput').value = '';
    document.getElementById('taskColorInput').value = '#6366f1';
    document.querySelectorAll('.days-checkbox input').forEach(checkbox => {
        checkbox.checked = false;
    });
}

async function salvarTarefa() {
    const title = document.getElementById('taskTitleInput').value.trim();
    const category = document.getElementById('taskCategoryInput').value;
    const startTime = document.getElementById('taskStartTimeInput').value;
    const endTime = document.getElementById('taskEndTimeInput').value;
    const color = document.getElementById('taskColorInput').value;
    
    // Coletar dias selecionados
    const selectedDays = [];
    document.querySelectorAll('.days-checkbox input:checked').forEach(checkbox => {
        selectedDays.push(checkbox.value);
    });
    
    // Validação
    if (!title) {
        showNotification('Digite um título para a atividade', 'error');
        return;
    }
    
    if (!startTime || !endTime) {
        showNotification('Defina os horários de início e fim', 'error');
        return;
    }
    
    if (selectedDays.length === 0) {
        showNotification('Selecione pelo menos um dia da semana', 'error');
        return;
    }
    
    const taskData = {
        title,
        category,
        start_time: startTime,
        end_time: endTime,
        days: selectedDays.join(','),
        color
    };
    
    try {
        let response;
        if (editingTaskId) {
            response = await fetch(`/api/routine/tasks/${editingTaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        } else {
            response = await fetch('/api/routine/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        }
        
        if (response.ok) {
            showNotification(editingTaskId ? 'Atividade atualizada!' : 'Atividade criada!', 'success');
            fecharFormTarefa();
            await carregarTarefas();
        } else {
            showNotification('Erro ao salvar atividade', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao salvar atividade', 'error');
    }
}

function editarTarefa(taskId) {
    abrirFormTarefa(taskId);
}

async function excluirTarefa(taskId) {
    if (!confirm('Deseja realmente excluir esta atividade?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/routine/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Atividade excluída!', 'success');
            await carregarTarefas();
        } else {
            showNotification('Erro ao excluir atividade', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao excluir atividade', 'error');
    }
}

// ===== ONBOARDING =====
function closeOnboarding(startTour = false) {
    const modal = document.getElementById('onboardingModal');
    modal.style.display = 'none';
    
    if (startTour) {
        showToast('Explore as funcionalidades do BNStudy!', 'info');
        // Destaque opcional: piscar o botão de adicionar pasta
        const addFolderBtn = document.getElementById('addFolderBtn');
        if (addFolderBtn) {
            addFolderBtn.style.animation = 'pulse 1.5s ease-in-out 3';
        }
    }
}

// ===== EXPORTAÇÃO DE DADOS =====
async function exportNotes() {
    showGlobalLoading('Exportando notas...');
    try {
        const response = await fetch('/api/export/notes');
        const data = await response.json();
        
        // Download como JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bnstudy-notas-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Notas exportadas com sucesso!', 'success');
    } catch (error) {
        console.error('❌ Erro ao exportar notas:', error);
        showToast('Erro ao exportar notas', 'error');
    } finally {
        hideGlobalLoading();
    }
}

async function exportStats() {
    showGlobalLoading('Exportando estatísticas...');
    try {
        const response = await fetch('/api/export/stats');
        const data = await response.json();
        
        // Download como JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bnstudy-estatisticas-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Estatísticas exportadas com sucesso!', 'success');
    } catch (error) {
        console.error('❌ Erro ao exportar estatísticas:', error);
        showToast('Erro ao exportar estatísticas', 'error');
    } finally {
        hideGlobalLoading();
    }
}
