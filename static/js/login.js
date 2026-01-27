// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    initializeFallingBooks();
    setupEventListeners();
});

// ===== LIVROS CAINDO =====
function initializeFallingBooks() {
    const booksContainer = document.querySelector('.falling-books');
    const bookEmojis = ['📚', '📖', '📕', '📗', '📘', '📙', '📔', '📓', '✏️', '✒️', '🖊️', '📝'];
    
    // Criar 15 livros
    for (let i = 0; i < 15; i++) {
        createFallingBook(booksContainer, bookEmojis, i);
    }
}

function createFallingBook(container, emojis, index) {
    const book = document.createElement('div');
    book.className = 'book';
    book.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    
    // Posição horizontal aleatória
    book.style.left = `${Math.random() * 100}%`;
    
    // Duração da animação (entre 15 e 25 segundos)
    const duration = 15 + Math.random() * 10;
    book.style.animationDuration = `${duration}s`;
    
    // Atraso inicial (distribuir os livros)
    book.style.animationDelay = `${index * 2}s`;
    
    container.appendChild(book);
    
    // Recriar o livro quando a animação terminar
    book.addEventListener('animationiteration', () => {
        book.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        book.style.left = `${Math.random() * 100}%`;
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Alternar entre login e cadastro
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
    
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    // Submits dos formulários
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

// ===== ALTERNAR FORMULÁRIOS =====
function showRegisterForm() {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.add('active');
    hideMessage();
}

function showLoginForm() {
    document.getElementById('registerForm').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
    hideMessage();
}

// ===== MENSAGENS =====
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message show ${type}`;
}

function hideMessage() {
    const messageEl = document.getElementById('message');
    messageEl.className = 'message';
}

// ===== LOGIN =====
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showMessage('Preencha todos os campos', 'error');
        return;
    }
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            setTimeout(() => {
                window.location.href = '/app';
            }, 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showMessage('Erro ao fazer login. Tente novamente.', 'error');
    }
}

// ===== CADASTRO =====
async function handleRegister(e) {
    e.preventDefault();
    
    console.log('handleRegister chamada!');
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    console.log('Dados do formulário:', { name, email, passwordLength: password.length });
    
    // Validações
    if (!name || !email || !password) {
        console.log('Erro: Campos vazios');
        showMessage('Preencha todos os campos', 'error');
        return;
    }
    
    if (name.length < 2) {
        console.log('Erro: Nome muito curto');
        showMessage('Nome deve ter pelo menos 2 caracteres', 'error');
        return;
    }
    
    if (!email.includes('@')) {
        console.log('Erro: Email inválido');
        showMessage('Email inválido', 'error');
        return;
    }
    
    if (password.length < 6) {
        console.log('Erro: Senha muito curta');
        showMessage('Senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }
    
    console.log('Enviando requisição para /register...');
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        console.log('Resposta recebida:', response.status);
        
        const data = await response.json();
        
        console.log('Dados da resposta:', data);
        
        if (data.success) {
            showMessage(data.message, 'success');
            console.log('Redirecionando para /app...');
            setTimeout(() => {
                window.location.href = '/app';
            }, 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        showMessage('Erro ao criar conta. Tente novamente.', 'error');
    }
}
