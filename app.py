from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_mail import Mail, Message
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os
from google import genai
from google.genai import types
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import re
import secrets
import time
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)

# Criar diretório do banco de dados se não existir
db_path = os.path.join(os.path.dirname(__file__), 'database')
os.makedirs(db_path, exist_ok=True)

# Configuração do banco de dados (PostgreSQL em produção, SQLite em desenvolvimento)
DATABASE_URL = os.getenv('DATABASE_URL', '').strip()
if not DATABASE_URL:
    # Usar SQLite se DATABASE_URL não estiver configurado
    DATABASE_URL = f'sqlite:///{os.path.join(db_path, "estudante.db")}'
elif DATABASE_URL.startswith('postgres://'):
    # Corrigir URL do Heroku (postgres:// -> postgresql://)
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'chave-padrao-desenvolver-apenas')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Configuração Flask-Mail
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME', 'noreply@bnstudy.com')

mail = Mail(app)

# CORS configurado
frontend_origins = ["http://localhost:5000", "http://127.0.0.1:5000"]
extra_origin = os.getenv('FRONTEND_ORIGIN', '').strip()
if extra_origin:
    frontend_origins.append(extra_origin)

CORS(app, resources={
    r"/api/*": {
        "origins": frontend_origins,
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"]
    }
})

# Rate Limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Configuração Google Gemini (GRATUITO!)
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    client = None

db = SQLAlchemy(app)

# Funções auxiliares
def validate_email(email):
    """Valida formato de email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Valida força da senha"""
    if len(password) < 6:
        return False, "Senha deve ter no mínimo 6 caracteres"
    return True, "OK"

def generate_reset_token():
    """Gera token seguro para reset de senha"""
    return secrets.token_urlsafe(32)

# Modelos do Banco de Dados
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    folders = db.relationship('Folder', backref='user', lazy=True, cascade='all, delete-orphan')

class Folder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.relationship('Note', backref='folder', lazy=True, cascade='all, delete-orphan')

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class StudySession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    duration_seconds = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class RoutineTask(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # estudo, trabalho, academia, lazer, etc
    start_time = db.Column(db.String(5), nullable=False)  # HH:MM
    end_time = db.Column(db.String(5), nullable=False)    # HH:MM
    days = db.Column(db.String(50), nullable=False)  # segunda,terça,quarta...
    color = db.Column(db.String(7), default='#6366f1')
    completed = db.Column(db.Boolean, default=False)
    order_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Decorator para proteger rotas
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

# Decorator para proteger rotas de admin
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            return jsonify({'error': 'Acesso negado. Apenas administradores.'}), 403
        return f(*args, **kwargs)
    return decorated_function

# Criar tabelas
with app.app_context():
    db.create_all()

# Rotas
# ===== ROTAS DE AUTENTICAÇÃO =====
@app.route('/')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/app')
@login_required
def index():
    user = User.query.get(session['user_id'])
    show_welcome = session.pop('show_welcome', False)
    return render_template('index.html', user=user, show_welcome=show_welcome)

# ===== ROTAS DE ADMIN =====
@app.route('/admin')
@login_required
def admin_page():
    user = User.query.get(session['user_id'])
    if not user.is_admin:
        return redirect(url_for('index'))
    return render_template('admin.html', user=user)

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'name': u.name,
        'email': u.email,
        'is_admin': u.is_admin,
        'created_at': u.created_at.isoformat(),
        'folders_count': len(u.folders)
    } for u in users])

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    # Não pode deletar a si mesmo
    if user_id == session['user_id']:
        return jsonify({'success': False, 'message': 'Você não pode deletar sua própria conta'}), 400
    
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Usuário deletado com sucesso'})

@app.route('/api/admin/users/<int:user_id>/toggle-admin', methods=['POST'])
@admin_required
def toggle_admin(user_id):
    # Não pode remover admin de si mesmo
    if user_id == session['user_id']:
        return jsonify({'success': False, 'message': 'Você não pode alterar seu próprio status de admin'}), 400
    
    user = User.query.get_or_404(user_id)
    user.is_admin = not user.is_admin
    db.session.commit()
    return jsonify({'success': True, 'is_admin': user.is_admin})


@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        print(f"DEBUG Register - Name: '{name}', Email: '{email}', Password length: {len(password)}")
        
        # Validações
        if not name or len(name) < 2:
            print(f"ERRO: Nome inválido - '{name}'")
            return jsonify({'success': False, 'message': 'Nome deve ter pelo menos 2 caracteres'}), 400
        
        if not email or '@' not in email:
            print(f"ERRO: Email inválido - '{email}'")
            return jsonify({'success': False, 'message': 'Email inválido'}), 400
        
        if not password or len(password) < 6:
            print(f"ERRO: Senha inválida - length {len(password)}")
            return jsonify({'success': False, 'message': 'Senha deve ter pelo menos 6 caracteres'}), 400
        
        # Verificar se email já existe
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            print(f"ERRO: Email já existe - '{email}'")
            return jsonify({'success': False, 'message': 'Este email já está cadastrado'}), 400
        
        # Criar usuário (primeiro usuário é admin automaticamente)
        is_first_user = User.query.count() == 0
        password_hash = generate_password_hash(password)
        user = User(name=name, email=email, password_hash=password_hash, is_admin=is_first_user)
        db.session.add(user)
        db.session.commit()
        
        # Login automático
        session['user_id'] = user.id
        session['user_name'] = user.name
        session['user_email'] = user.email
        session['is_admin'] = user.is_admin
        session['show_welcome'] = True
        
        return jsonify({'success': True, 'message': 'Conta criada com sucesso!'})
    except Exception as e:
        print(f"Erro no registro: {e}")
        return jsonify({'success': False, 'message': 'Erro ao criar conta'}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'message': 'Preencha todos os campos'}), 400
        
        # Buscar usuário
        user = User.query.filter_by(email=email).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'success': False, 'message': 'Email ou senha incorretos'}), 401
        
        # Criar sessão
        session['user_id'] = user.id
        session['user_name'] = user.name
        session['user_email'] = user.email
        session['is_admin'] = user.is_admin
        session['show_welcome'] = True
        
        return jsonify({'success': True, 'message': 'Login realizado com sucesso!'})
    except Exception as e:
        print(f"Erro no login: {e}")
        return jsonify({'success': False, 'message': 'Erro ao fazer login'}), 500

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login_page'))

# ===== API - PASTAS =====
@app.route('/api/folders', methods=['GET'])
@login_required
def get_folders():
    user_id = session.get('user_id')
    folders = Folder.query.filter_by(user_id=user_id).all()
    return jsonify([{
        'id': f.id,
        'name': f.name,
        'created_at': f.created_at.isoformat(),
        'notes_count': len(f.notes)
    } for f in folders])

@app.route('/api/folders', methods=['POST'])
@login_required
def create_folder():
    user_id = session.get('user_id')
    data = request.get_json()
    folder = Folder(name=data['name'], user_id=user_id)
    db.session.add(folder)
    db.session.commit()
    return jsonify({
        'id': folder.id,
        'name': folder.name,
        'created_at': folder.created_at.isoformat()
    }), 201

@app.route('/api/folders/<int:folder_id>', methods=['DELETE'])
@login_required
def delete_folder(folder_id):
    user_id = session.get('user_id')
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first_or_404()
    db.session.delete(folder)
    db.session.commit()
    return '', 204

# API - Notas
@app.route('/api/folders/<int:folder_id>/notes', methods=['GET'])
@login_required
def get_notes(folder_id):
    user_id = session.get('user_id')
    # Verificar se a pasta pertence ao usuário
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first_or_404()
    notes = Note.query.filter_by(folder_id=folder_id).all()
    return jsonify([{
        'id': n.id,
        'title': n.title,
        'content': n.content,
        'created_at': n.created_at.isoformat(),
        'updated_at': n.updated_at.isoformat()
    } for n in notes])

@app.route('/api/notes', methods=['POST'])
@login_required
def create_note():
    user_id = session.get('user_id')
    data = request.get_json()
    # Verificar se a pasta pertence ao usuário
    folder = Folder.query.filter_by(id=data['folder_id'], user_id=user_id).first_or_404()
    note = Note(
        title=data['title'],
        content=data.get('content', ''),
        folder_id=data['folder_id']
    )
    db.session.add(note)
    db.session.commit()
    return jsonify({
        'id': note.id,
        'title': note.title,
        'content': note.content,
        'folder_id': note.folder_id
    }), 201

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
@login_required
def update_note(note_id):
    user_id = session.get('user_id')
    note = Note.query.get_or_404(note_id)
    # Verificar se a nota pertence a uma pasta do usuário
    folder = Folder.query.filter_by(id=note.folder_id, user_id=user_id).first_or_404()
    data = request.get_json()
    
    if 'title' in data:
        note.title = data['title']
    if 'content' in data:
        note.content = data['content']
    
    note.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'id': note.id,
        'title': note.title,
        'content': note.content,
        'updated_at': note.updated_at.isoformat()
    })

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    user_id = session.get('user_id')
    note = Note.query.get_or_404(note_id)
    # Verificar se a nota pertence a uma pasta do usuário
    folder = Folder.query.filter_by(id=note.folder_id, user_id=user_id).first_or_404()
    db.session.delete(note)
    db.session.commit()
    return '', 204

# API - Sessões de Estudo
@app.route('/api/study-sessions', methods=['GET'])
@login_required
def get_study_sessions():
    user_id = session.get('user_id')
    sessions = StudySession.query.filter_by(user_id=user_id).order_by(StudySession.created_at.desc()).limit(10).all()
    return jsonify([{
        'id': s.id,
        'start_time': s.start_time.isoformat(),
        'end_time': s.end_time.isoformat() if s.end_time else None,
        'duration_seconds': s.duration_seconds
    } for s in sessions])

@app.route('/api/study-sessions', methods=['POST'])
@login_required
def create_study_session():
    try:
        user_id = session.get('user_id')
        
        # Aceitar tanto JSON normal quanto sendBeacon
        if request.is_json:
            data = request.get_json()
        else:
            # sendBeacon envia como text/plain, precisamos parsear
            data = json.loads(request.data.decode('utf-8'))
        
        # Log para debug
        print(f"Salvando sessão: user_id={user_id}, duration={data.get('duration_seconds')}s")
        
        # Remover Z e converter para datetime
        start_str = data['start_time'].replace('Z', '').replace('+00:00', '')
        end_str = data['end_time'].replace('Z', '').replace('+00:00', '') if data.get('end_time') else None
        
        study_session = StudySession(
            user_id=user_id,
            start_time=datetime.fromisoformat(start_str),
            end_time=datetime.fromisoformat(end_str) if end_str else None,
            duration_seconds=data.get('duration_seconds', 0)
        )
        db.session.add(study_session)
        db.session.commit()
        
        print(f"Sessão salva com sucesso! ID: {study_session.id}")
        return jsonify({'id': study_session.id, 'success': True}), 201
    except Exception as e:
        print(f"Erro ao salvar sessão: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===== APIs DE MÚSICA/YOUTUBE REMOVIDAS =====

#
@app.route('/api/chat', methods=['POST'])
@login_required
def chat_with_ai():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'Mensagem vazia'}), 400
        
        # Verificar se cliente está configurado
        if not client:
            return jsonify({
                'response': '🔑 API do Gemini não configurada!\n\n'
                           '📍 Configure GEMINI_API_KEY no arquivo .env'
            }), 200
        
        # Criar contexto para o assistente
        prompt = f"""Você é um assistente de estudos amigável e prestativo chamado BNStudy Assistant.
        Ajude estudantes com suas dúvidas, explique conceitos de forma clara e objetiva.
        Forneça dicas de estudo e seja sempre educado e motivador.
        
        Pergunta do estudante: {user_message}
        
        Responda de forma concisa (máximo 300 palavras):"""
        
        # Tentar com retry (máximo 2 tentativas)
        max_retries = 2
        retry_delay = 4
        
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                
                ai_response = response.text
                return jsonify({'response': ai_response}), 200
                
            except Exception as retry_error:
                error_msg = str(retry_error)
                
                # Se for erro de quota e não for última tentativa, aguardar e tentar novamente
                if ('429' in error_msg or 'quota' in error_msg.lower() or 'RESOURCE_EXHAUSTED' in error_msg):
                    if attempt < max_retries - 1:
                        print(f"⏳ Tentativa {attempt + 1} falhou. Aguardando {retry_delay}s antes de tentar novamente...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Dobrar delay para próxima tentativa
                        continue
                    else:
                        # Última tentativa falhou
                        return jsonify({
                            'response': '⏱️ Serviço temporariamente ocupado.\n\n'
                                       '🔄 A IA está processando muitas requisições.\n'
                                       '✨ Aguarde 10 segundos e tente novamente.\n\n'
                                       '💡 Dica: O limite é de 15 perguntas por minuto.'
                        }), 200
                else:
                    # Outro tipo de erro, propagar
                    raise retry_error
        
    except Exception as e:
        error_message = str(e)
        print(f"Erro ao chamar API do Gemini: {error_message}")
        
        # Tratamento de erros
        if 'API_KEY_INVALID' in error_message or 'invalid' in error_message.lower():
            return jsonify({
                'response': '🔑 API key inválida!\n\n'
                           '📍 Como resolver:\n'
                           '1. Acesse: https://aistudio.google.com/apikey\n'
                           '2. Crie uma nova API key\n'
                           '3. Substitua no arquivo .env\n\n'
                           '💡 É 100% gratuito!'
            }), 200
        elif '429' in error_message or 'quota' in error_message.lower() or 'RESOURCE_EXHAUSTED' in error_message:
            return jsonify({
                'response': '⏱️ Limite de requisições atingido.\n\n'
                           '📊 Usando gemini-2.5-flash (modelo mais recente).\n'
                           '✨ Limite: 15 requisições por minuto.\n\n'
                           '🔄 Tente novamente em alguns segundos!'
            }), 200
        elif 'limit' in error_message.lower():
            return jsonify({
                'response': '⏱️ Limite temporário atingido.\n\n'
                           'Aguarde alguns segundos e tente novamente.\n'
                           'O Google Gemini é gratuito mas tem limite por minuto.'
            }), 200
        else:
            return jsonify({
                'response': f'🤖 Desculpe, ocorreu um erro ao processar sua mensagem.\n\n'
                           f'💡 Tente perguntar de outra forma ou aguarde alguns segundos.\n\n'
                           f'Erro: {error_message[:150]}'
            }), 200

    db.session.add(session)
    db.session.commit()
    return jsonify({'id': session.id}), 201

@app.route('/api/study-sessions/total', methods=['GET'])
@login_required
def get_total_study_time():
    sessions = StudySession.query.filter_by(user_id=session['user_id']).all()
    total_seconds = sum(s.duration_seconds for s in sessions)
    return jsonify({'total_seconds': total_seconds})

@app.route('/api/study-sessions/stats', methods=['GET'])
@login_required
def get_study_stats():
    from datetime import datetime, timedelta
    from sqlalchemy import func, extract
    
    user_id = session['user_id']
    now = datetime.now()
    
    print(f"\n=== Calculando estatísticas para user_id={user_id} ===")
    
    # Hoje
    today_start = datetime(now.year, now.month, now.day)
    today_sessions = StudySession.query.filter(
        StudySession.user_id == user_id,
        StudySession.start_time >= today_start
    ).all()
    today_seconds = sum(s.duration_seconds for s in today_sessions)
    print(f"Hoje: {len(today_sessions)} sessões, {today_seconds} segundos")
    
    # Esta semana (segunda a domingo)
    week_start = today_start - timedelta(days=now.weekday())
    week_sessions = StudySession.query.filter(
        StudySession.user_id == user_id,
        StudySession.start_time >= week_start
    ).all()
    week_seconds = sum(s.duration_seconds for s in week_sessions)
    print(f"Esta semana: {len(week_sessions)} sessões, {week_seconds} segundos")
    
    # Este mês
    month_start = datetime(now.year, now.month, 1)
    month_sessions = StudySession.query.filter(
        StudySession.user_id == user_id,
        StudySession.start_time >= month_start
    ).all()
    month_seconds = sum(s.duration_seconds for s in month_sessions)
    print(f"Este mês: {len(month_sessions)} sessões, {month_seconds} segundos")
    
    # Este ano
    year_start = datetime(now.year, 1, 1)
    year_sessions = StudySession.query.filter(
        StudySession.user_id == user_id,
        StudySession.start_time >= year_start
    ).all()
    year_seconds = sum(s.duration_seconds for s in year_sessions)
    print(f"Este ano: {len(year_sessions)} sessões, {year_seconds} segundos")
    
    # Últimos 7 dias (para gráfico)
    last_7_days = []
    for i in range(6, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_sessions = StudySession.query.filter(
            StudySession.user_id == user_id,
            StudySession.start_time >= day_start,
            StudySession.start_time < day_end
        ).all()
        day_seconds = sum(s.duration_seconds for s in day_sessions)
        last_7_days.append({
            'date': day_start.strftime('%d/%m'),
            'seconds': day_seconds
        })
    
    return jsonify({
        'today': today_seconds,
        'week': week_seconds,
        'month': month_seconds,
        'year': year_seconds,
        'last_7_days': last_7_days
    })

# ===== ROTAS DE ROTINA =====
@app.route('/api/routine/tasks', methods=['GET'])
@login_required
def get_routine_tasks():
    tasks = RoutineTask.query.filter_by(user_id=session['user_id']).order_by(RoutineTask.order_index).all()
    return jsonify([{
        'id': t.id,
        'title': t.title,
        'category': t.category,
        'start_time': t.start_time,
        'end_time': t.end_time,
        'days': t.days.split(','),
        'color': t.color,
        'completed': t.completed,
        'order_index': t.order_index
    } for t in tasks])

@app.route('/api/routine/tasks', methods=['POST'])
@login_required
def create_routine_task():
    data = request.json
    
    # Obter o maior order_index atual
    max_order = db.session.query(db.func.max(RoutineTask.order_index)).filter_by(user_id=session['user_id']).scalar()
    next_order = (max_order or -1) + 1
    
    task = RoutineTask(
        user_id=session['user_id'],
        title=data['title'],
        category=data['category'],
        start_time=data['start_time'],
        end_time=data['end_time'],
        days=data['days'],
        color=data.get('color', '#6366f1'),
        completed=False,
        order_index=next_order
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'id': task.id}), 201

@app.route('/api/routine/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_routine_task(task_id):
    task = RoutineTask.query.get_or_404(task_id)
    if task.user_id != session['user_id']:
        return jsonify({'error': 'Não autorizado'}), 403
    
    data = request.json
    task.title = data.get('title', task.title)
    task.category = data.get('category', task.category)
    task.start_time = data.get('start_time', task.start_time)
    task.end_time = data.get('end_time', task.end_time)
    task.days = data.get('days', task.days)
    task.color = data.get('color', task.color)
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/routine/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_routine_task(task_id):
    task = RoutineTask.query.get_or_404(task_id)
    if task.user_id != session['user_id']:
        return jsonify({'error': 'Não autorizado'}), 403
    
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/routine/tasks/<int:task_id>/toggle', methods=['POST'])
@login_required
def toggle_task_completion(task_id):
    task = RoutineTask.query.get_or_404(task_id)
    if task.user_id != session['user_id']:
        return jsonify({'error': 'Não autorizado'}), 403
    
    task.completed = not task.completed
    db.session.commit()
    return jsonify({'success': True, 'completed': task.completed})

@app.route('/api/routine/initialize', methods=['POST'])
@login_required
def initialize_routine():
    # Verificar se já tem tarefas
    existing = RoutineTask.query.filter_by(user_id=session['user_id']).first()
    if existing:
        return jsonify({'message': 'Cronograma já existe'}), 200
    
    # Criar cronograma padrão
    default_tasks = [
        {'title': 'Acordar e tomar café da manhã', 'category': 'alimentação', 'start_time': '07:00', 'end_time': '07:30', 'color': '#f59e0b', 'order': 0},
        {'title': 'Sessão de estudos manhã', 'category': 'estudo', 'start_time': '08:00', 'end_time': '10:00', 'color': '#6366f1', 'order': 1},
        {'title': 'Intervalo / Lanche', 'category': 'descanso', 'start_time': '10:00', 'end_time': '10:30', 'color': '#8b5cf6', 'order': 2},
        {'title': 'Estudos / Trabalho', 'category': 'trabalho', 'start_time': '10:30', 'end_time': '12:30', 'color': '#3b82f6', 'order': 3},
        {'title': 'Almoço', 'category': 'alimentação', 'start_time': '12:30', 'end_time': '13:30', 'color': '#f59e0b', 'order': 4},
        {'title': 'Descanso', 'category': 'descanso', 'start_time': '13:30', 'end_time': '14:00', 'color': '#8b5cf6', 'order': 5},
        {'title': 'Sessão de estudos tarde', 'category': 'estudo', 'start_time': '14:00', 'end_time': '16:00', 'color': '#6366f1', 'order': 6},
        {'title': 'Academia / Exercícios', 'category': 'academia', 'start_time': '16:30', 'end_time': '17:30', 'color': '#10b981', 'order': 7},
        {'title': 'Banho e descanso', 'category': 'descanso', 'start_time': '17:30', 'end_time': '18:00', 'color': '#8b5cf6', 'order': 8},
        {'title': 'Jantar', 'category': 'alimentação', 'start_time': '18:30', 'end_time': '19:30', 'color': '#f59e0b', 'order': 9},
        {'title': 'Revisão do dia / Estudos leves', 'category': 'estudo', 'start_time': '19:30', 'end_time': '21:00', 'color': '#6366f1', 'order': 10},
        {'title': 'Lazer / Tempo livre', 'category': 'lazer', 'start_time': '21:00', 'end_time': '22:30', 'color': '#ec4899', 'order': 11},
        {'title': 'Preparar para dormir', 'category': 'descanso', 'start_time': '22:30', 'end_time': '23:00', 'color': '#8b5cf6', 'order': 12}
    ]
    
    for task_data in default_tasks:
        task = RoutineTask(
            user_id=session['user_id'],
            title=task_data['title'],
            category=task_data['category'],
            start_time=task_data['start_time'],
            end_time=task_data['end_time'],
            days='segunda,terça,quarta,quinta,sexta,sábado,domingo',
            color=task_data['color'],
            order_index=task_data['order'],
            completed=False
        )
        db.session.add(task)
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'Cronograma padrão criado!'})

# Handler de erro 404
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# Handler de erro 500
@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({'error': 'Erro interno do servidor. Tente novamente mais tarde.'}), 500

# ===== SISTEMA DE RECUPERAÇÃO DE SENHA =====
@app.route('/api/forgot-password', methods=['POST'])
@limiter.limit("3 per hour")
def forgot_password():
    """Gera token de recuperação de senha"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not validate_email(email):
            return jsonify({'success': False, 'message': 'Email inválido'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            # Por segurança, retornar sucesso mesmo se usuário não existir
            return jsonify({'success': True, 'message': 'Se este email estiver cadastrado, você receberá instruções de recuperação'})
        
        # Gerar token e definir expiração (1 hora)
        token = generate_reset_token()
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        
        # Enviar email com link de recuperação
        domain = request.host_url.rstrip('/')
        reset_link = f"{domain}/reset-password?token={token}"
        
        # Tentar enviar email se configurado
        email_sent = False
        if app.config['MAIL_USERNAME'] and app.config['MAIL_PASSWORD']:
            try:
                msg = Message(
                    'Recuperação de Senha - BNStudy',
                    recipients=[user.email]
                )
                msg.body = f'''Olá {user.name},

Você solicitou a recuperação de senha no BNStudy.

Clique no link abaixo para redefinir sua senha:
{reset_link}

Este link expira em 1 hora.

Se você não solicitou isso, ignore este email.

Atenciosamente,
Equipe BNStudy
'''
                msg.html = f'''
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎓 BNStudy</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #667eea;">Recuperação de Senha</h2>
            <p>Olá <strong>{user.name}</strong>,</p>
            <p>Você solicitou a recuperação de senha no BNStudy.</p>
            <p>Clique no botão abaixo para redefinir sua senha:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Redefinir Senha
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">
                <strong>⏰ Este link expira em 1 hora.</strong>
            </p>
            <p style="color: #666; font-size: 14px;">
                Se você não solicitou isso, ignore este email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                © 2026 BNStudy - Plataforma de Estudos
            </p>
        </div>
    </div>
</body>
</html>
'''
                mail.send(msg)
                email_sent = True
                print(f"✅ Email enviado para: {user.email}")
            except Exception as email_error:
                print(f"⚠️ Erro ao enviar email: {email_error}")
                print(f"🔑 Link de recuperação (console): {reset_link}")
        else:
            print(f"⚠️ Email não configurado. Link de recuperação: {reset_link}")
        
        return jsonify({
            'success': True,
            'message': 'Se este email estiver cadastrado, você receberá instruções de recuperação',
            'dev_token': token if os.getenv('DEBUG', 'False').lower() == 'true' else None,
            'email_sent': email_sent
        })
    except Exception as e:
        print(f"❌ Erro em forgot-password: {e}")
        return jsonify({'success': False, 'message': 'Erro ao processar solicitação'}), 500

@app.route('/api/reset-password', methods=['POST'])
@limiter.limit("5 per hour")
def reset_password():
    """Redefine senha usando token"""
    try:
        data = request.json
        token = data.get('token', '')
        new_password = data.get('password', '')
        
        if not token or not new_password:
            return jsonify({'success': False, 'message': 'Token e senha são obrigatórios'}), 400
        
        if not validate_password(new_password):
            return jsonify({'success': False, 'message': 'Senha deve ter pelo menos 6 caracteres'}), 400
        
        # Buscar usuário pelo token
        user = User.query.filter_by(reset_token=token).first()
        if not user:
            return jsonify({'success': False, 'message': 'Token inválido'}), 400
        
        # Verificar se token expirou
        if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            user.reset_token = None
            user.reset_token_expires = None
            db.session.commit()
            return jsonify({'success': False, 'message': 'Token expirado. Solicite uma nova recuperação'}), 400
        
        # Redefinir senha
        user.password_hash = generate_password_hash(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        
        print(f"✅ Senha redefinida para usuário: {user.email}")
        return jsonify({'success': True, 'message': 'Senha redefinida com sucesso!'})
    except Exception as e:
        print(f"❌ Erro em reset-password: {e}")
        return jsonify({'success': False, 'message': 'Erro ao redefinir senha'}), 500

# ===== EXPORTAÇÃO DE DADOS =====
@app.route('/api/export/notes', methods=['GET'])
@login_required
def export_notes():
    """Exporta todas as notas do usuário em JSON"""
    try:
        folders = Folder.query.filter_by(user_id=session['user_id']).all()
        export_data = {
            'user': {
                'name': session['user_name'],
                'email': session['user_email']
            },
            'exported_at': datetime.utcnow().isoformat(),
            'folders': []
        }
        
        for folder in folders:
            folder_data = {
                'name': folder.name,
                'created_at': folder.created_at.isoformat(),
                'notes': []
            }
            
            for note in folder.notes:
                folder_data['notes'].append({
                    'title': note.title,
                    'content': note.content,
                    'created_at': note.created_at.isoformat(),
                    'updated_at': note.updated_at.isoformat()
                })
            
            export_data['folders'].append(folder_data)
        
        return jsonify(export_data)
    except Exception as e:
        print(f"❌ Erro ao exportar notas: {e}")
        return jsonify({'error': 'Erro ao exportar dados'}), 500

@app.route('/api/export/stats', methods=['GET'])
@login_required
def export_stats():
    """Exporta estatísticas de estudo do usuário"""
    try:
        sessions = (
            StudySession.query
            .filter_by(user_id=session['user_id'])
            .order_by(StudySession.start_time.desc())
            .all()
        )
        
        export_data = {
            'user': {
                'name': session['user_name'],
                'email': session['user_email']
            },
            'exported_at': datetime.utcnow().isoformat(),
            'total_sessions': len(sessions),
            'total_time_seconds': sum(s.duration_seconds for s in sessions),
            'sessions': []
        }
        
        for session_record in sessions:
            hours = session_record.duration_seconds // 3600
            minutes = (session_record.duration_seconds % 3600) // 60
            seconds = session_record.duration_seconds % 60
            session_date = session_record.start_time.date().isoformat() if session_record.start_time else None
            
            export_data['sessions'].append({
                'date': session_date,
                'start_time': session_record.start_time.isoformat() if session_record.start_time else None,
                'end_time': session_record.end_time.isoformat() if session_record.end_time else None,
                'duration_seconds': session_record.duration_seconds,
                'duration_formatted': f"{hours}h {minutes}min {seconds}s"
            })
        
        return jsonify(export_data)
    except Exception as e:
        print(f"❌ Erro ao exportar estatísticas: {e}")
        return jsonify({'error': 'Erro ao exportar dados'}), 500

if __name__ == '__main__':
    debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
