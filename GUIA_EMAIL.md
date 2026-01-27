# 📧 Guia Rápido: Configurar Email

## ⏱️ Tempo: 15 minutos

---

## 🎯 Gmail (Recomendado - Gratuito)

### 1️⃣ Ativar Verificação em 2 Etapas

1. Acesse: https://myaccount.google.com/security
2. Clique em "Verificação em duas etapas"
3. Siga os passos para ativar

### 2️⃣ Gerar Senha de App

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione:
   - App: **Email**
   - Dispositivo: **Outro (nome personalizado)**
   - Digite: **BNStudy**
3. Clique em **GERAR**
4. **COPIE A SENHA** (16 caracteres sem espaços)

### 3️⃣ Configurar no .env

```env
# Adicione estas linhas no .env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=seu_email@gmail.com
MAIL_PASSWORD=abcd efgh ijkl mnop  # Cole a senha de app gerada
```

### 4️⃣ Testar

```bash
# Reinicie o servidor
python app.py

# Teste a recuperação de senha
# 1. Vá para http://localhost:5000
# 2. Clique em "Esqueci minha senha"
# 3. Digite seu email cadastrado
# 4. Verifique sua caixa de entrada!
```

---

## 📮 SendGrid (Alternativa Profissional)

### Vantagens:
- Mais confiável que Gmail
- 100 emails/dia grátis
- Melhor deliverability

### Setup:

1. **Cadastre-se**: https://sendgrid.com/free/
2. **Crie API Key**:
   - Settings → API Keys → Create API Key
   - Nome: BNStudy
   - Permissões: Full Access
   - **COPIE A KEY** (começa com SG.)

3. **Configure no .env**:
```env
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.sua_api_key_aqui
```

---

## 🔧 Outlook/Hotmail

```env
MAIL_SERVER=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=seu_email@outlook.com
MAIL_PASSWORD=sua_senha_normal
```

**Nota**: Pode precisar ativar "Acesso a apps menos seguros" nas configurações.

---

## 🐛 Troubleshooting

### Erro: "Authentication failed"
- ✅ Gmail: Use senha de app, não senha da conta
- ✅ Verifique se 2FA está ativo
- ✅ Senha sem espaços no .env

### Erro: "Connection refused"
- ✅ Verifique MAIL_SERVER e MAIL_PORT
- ✅ Tente MAIL_PORT=465 com MAIL_USE_SSL=True

### Email não chega
- ✅ Verifique spam/lixo eletrônico
- ✅ Aguarde 1-2 minutos
- ✅ Veja console do servidor para erros

### Testar manualmente

```python
# No terminal Python
from flask_mail import Mail, Message
from app import app, mail

with app.app_context():
    msg = Message(
        'Teste BNStudy',
        recipients=['seu_email@gmail.com']
    )
    msg.body = 'Se você recebeu este email, está funcionando!'
    mail.send(msg)
    print("Email enviado!")
```

---

## 🎯 Configurações Alternativas

### Usar outro servidor SMTP:

| Serviço | Server | Port | TLS |
|---------|--------|------|-----|
| Gmail | smtp.gmail.com | 587 | True |
| SendGrid | smtp.sendgrid.net | 587 | True |
| Mailgun | smtp.mailgun.org | 587 | True |
| Outlook | smtp-mail.outlook.com | 587 | True |
| Yahoo | smtp.mail.yahoo.com | 587 | True |
| Zoho | smtp.zoho.com | 587 | True |

---

## ✅ Verificação Final

### Checklist:
- [ ] MAIL_USERNAME está no .env
- [ ] MAIL_PASSWORD está no .env
- [ ] MAIL_SERVER correto
- [ ] MAIL_PORT correto
- [ ] Servidor reiniciado após alterações
- [ ] Teste de recuperação de senha funcionou
- [ ] Email chegou (verifique spam também)

### Comando para testar:

```bash
# Ver logs do servidor em tempo real
python app.py

# Em outro terminal/navegador
# Teste a recuperação de senha
# O log mostrará se o email foi enviado
```

---

## 🎉 Pronto!

Seu sistema de email está configurado. Agora os usuários podem:
- ✅ Recuperar senha via email
- ✅ Receber notificações (futuro)
- ✅ Confirmação de cadastro (futuro)

---

## 📝 Segurança

### Boas Práticas:
1. ⚠️ **NUNCA** commite o .env no Git
2. ✅ Use senhas de app, não senhas principais
3. ✅ Revogue senhas de app se não usar mais
4. ✅ Configure rate limiting (já está no código)
5. ✅ Monitore uso de emails para evitar spam

### Limites:
- **Gmail**: ~500 emails/dia
- **SendGrid Free**: 100 emails/dia
- **Mailgun Free**: 100 emails/dia

---

**⏱️ Tempo total**: 10-15 minutos
**💰 Custo**: Gratuito
**🎯 Resultado**: Sistema de recuperação de senha 100% funcional!
