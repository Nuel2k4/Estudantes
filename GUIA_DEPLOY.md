# 🚀 Guia de Deploy - BNStudy

## 📋 Pré-requisitos

- Python 3.8+
- Servidor Linux (Ubuntu 20.04+ recomendado)
- Domínio configurado (opcional, mas recomendado)
- Certificado SSL (Let's Encrypt gratuito)

---

## 1️⃣ Preparação do Servidor

### Atualizar sistema:
```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar dependências:
```bash
sudo apt install python3-pip python3-venv nginx supervisor -y
```

---

## 2️⃣ Upload do Projeto

### Via Git:
```bash
cd /var/www
sudo git clone https://github.com/seu-usuario/bnstudy.git
cd bnstudy
```

### Via SCP (se não usar Git):
```bash
scp -r ./novo_projeto usuario@servidor:/var/www/bnstudy
```

---

## 3️⃣ Configurar Ambiente Python

### Criar virtual environment:
```bash
cd /var/www/bnstudy
python3 -m venv venv
source venv/bin/activate
```

### Instalar dependências:
```bash
pip install -r requirements.txt
pip install gunicorn
```

---

## 4️⃣ Configurar Variáveis de Ambiente

### Editar arquivo .env:
```bash
nano .env
```

### Conteúdo (substitua os valores):
```env
SECRET_KEY=seu_secret_key_super_seguro_aqui_64_caracteres_minimo
GEMINI_API_KEY=sua_chave_gemini_api_aqui
DEBUG=False
DATABASE_URL=sqlite:///database/estudante.db
FLASK_ENV=production
```

### Gerar SECRET_KEY seguro:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 5️⃣ Inicializar Banco de Dados

```bash
python3 -c "from app import db, app; app.app_context().push(); db.create_all()"
```

---

## 6️⃣ Configurar Gunicorn

### Criar arquivo de configuração:
```bash
sudo nano /etc/supervisor/conf.d/bnstudy.conf
```

### Conteúdo:
```ini
[program:bnstudy]
directory=/var/www/bnstudy
command=/var/www/bnstudy/venv/bin/gunicorn -w 4 -b 127.0.0.1:8000 app:app
user=www-data
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/bnstudy/error.log
stdout_logfile=/var/log/bnstudy/access.log
environment=PATH="/var/www/bnstudy/venv/bin"
```

### Criar diretório de logs:
```bash
sudo mkdir -p /var/log/bnstudy
sudo chown www-data:www-data /var/log/bnstudy
```

### Atualizar Supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start bnstudy
```

### Verificar status:
```bash
sudo supervisorctl status bnstudy
```

---

## 7️⃣ Configurar Nginx

### Criar configuração do site:
```bash
sudo nano /etc/nginx/sites-available/bnstudy
```

### Conteúdo (sem SSL):
```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/bnstudy/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 20M;
}
```

### Ativar site:
```bash
sudo ln -s /etc/nginx/sites-available/bnstudy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8️⃣ Configurar SSL (HTTPS) com Let's Encrypt

### Instalar Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obter certificado:
```bash
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

### Renovação automática (já configurado pelo certbot):
```bash
sudo certbot renew --dry-run
```

---

## 9️⃣ Atualizar CORS no Código

### Editar app.py:
```python
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5000",
            "https://seudominio.com",
            "https://www.seudominio.com"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"]
    }
})
```

### Reiniciar aplicação:
```bash
sudo supervisorctl restart bnstudy
```

---

## 🔟 Configurações Adicionais

### Firewall (UFW):
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Permissões de arquivos:
```bash
sudo chown -R www-data:www-data /var/www/bnstudy
sudo chmod -R 755 /var/www/bnstudy
sudo chmod 600 /var/www/bnstudy/.env
```

---

## 📧 Configurar Envio de Emails (Opcional)

### Instalar Flask-Mail:
```bash
pip install Flask-Mail
```

### Adicionar ao app.py:
```python
from flask_mail import Mail, Message

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

mail = Mail(app)
```

### Adicionar ao .env:
```env
MAIL_USERNAME=seu_email@gmail.com
MAIL_PASSWORD=sua_senha_de_app
```

### Implementar envio no forgot-password:
```python
@app.route('/api/forgot-password', methods=['POST'])
@limiter.limit("3 per hour")
def forgot_password():
    # ... código existente ...
    
    # Enviar email
    reset_link = f"https://seudominio.com/reset-password?token={token}"
    msg = Message(
        'Recuperação de Senha - BNStudy',
        recipients=[user.email]
    )
    msg.body = f'''Olá {user.name},

Você solicitou a recuperação de senha.
Clique no link abaixo para redefinir sua senha:

{reset_link}

Este link expira em 1 hora.

Se você não solicitou isso, ignore este email.

Atenciosamente,
Equipe BNStudy
'''
    mail.send(msg)
    
    return jsonify({'success': True, 'message': 'Email enviado com instruções'})
```

---

## 🔄 Comandos Úteis de Manutenção

### Ver logs em tempo real:
```bash
sudo tail -f /var/log/bnstudy/error.log
sudo tail -f /var/log/bnstudy/access.log
```

### Reiniciar aplicação:
```bash
sudo supervisorctl restart bnstudy
```

### Reiniciar nginx:
```bash
sudo systemctl restart nginx
```

### Backup do banco de dados:
```bash
cp /var/www/bnstudy/database/estudante.db /backup/estudante_$(date +%Y%m%d).db
```

### Atualizar código (via Git):
```bash
cd /var/www/bnstudy
git pull origin main
sudo supervisorctl restart bnstudy
```

---

## 🐳 Deploy com Docker (Alternativa)

### Criar Dockerfile:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]
```

### Criar docker-compose.yml:
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./database:/app/database
    env_file:
      - .env
    restart: unless-stopped
```

### Build e run:
```bash
docker-compose up -d --build
```

---

## ☁️ Deploy em Plataformas Cloud

### Heroku:
```bash
# Criar Procfile
echo "web: gunicorn app:app" > Procfile

# Deploy
heroku create bnstudy-app
git push heroku main
heroku config:set SECRET_KEY=sua_chave
heroku config:set GEMINI_API_KEY=sua_chave
```

### AWS Elastic Beanstalk:
```bash
eb init -p python-3.11 bnstudy
eb create bnstudy-env
eb setenv SECRET_KEY=sua_chave GEMINI_API_KEY=sua_chave
eb deploy
```

### DigitalOcean App Platform:
1. Conectar repositório GitHub
2. Escolher Python
3. Adicionar variáveis de ambiente
4. Deploy automático

---

## 🎯 Checklist Final

- [ ] Servidor configurado e atualizado
- [ ] Python e dependências instaladas
- [ ] Arquivo .env configurado com SECRET_KEY seguro
- [ ] Banco de dados inicializado
- [ ] Gunicorn configurado via Supervisor
- [ ] Nginx configurado e rodando
- [ ] SSL/HTTPS ativo (Let's Encrypt)
- [ ] CORS atualizado com domínio de produção
- [ ] Firewall configurado (UFW)
- [ ] Permissões de arquivos corretas
- [ ] Logs acessíveis e monitorados
- [ ] Backup do banco configurado
- [ ] Email de recuperação funcionando (opcional)
- [ ] Testes realizados em produção
- [ ] Monitoramento ativo

---

## 🆘 Troubleshooting

### App não inicia:
```bash
sudo supervisorctl status bnstudy
sudo tail -f /var/log/bnstudy/error.log
```

### Erro 502 Bad Gateway:
```bash
sudo systemctl status nginx
sudo supervisorctl restart bnstudy
```

### Banco de dados não encontrado:
```bash
ls -la /var/www/bnstudy/database/
sudo chown www-data:www-data /var/www/bnstudy/database/estudante.db
```

### Rate limit muito restritivo:
Editar `app.py`:
```python
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["500 per day", "100 per hour"],  # Aumentado
    storage_uri="memory://"
)
```

---

## 📞 Suporte

**Documentação:** `/FUNCIONALIDADES_COMPLETAS.md`
**Segurança:** `/SEGURANCA_PRODUCAO.md`

**Status:** 🟢 Production Ready
**Última atualização:** 15/06/2025
