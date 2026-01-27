# 🎵 Como Configurar a API do YouTube (GRATUITO)

## 📋 Passo a Passo Completo:

### 1️⃣ **Acessar Google Cloud Console**
- Acesse: https://console.cloud.google.com/
- Faça login com sua conta Google

---

### 2️⃣ **Criar um Projeto**
1. Clique no menu superior onde diz o nome do projeto
2. Clique em **"NOVO PROJETO"**
3. Nome do projeto: `StudyHub` (ou qualquer nome)
4. Clique em **"CRIAR"**
5. Aguarde a criação do projeto

---

### 3️⃣ **Ativar YouTube Data API v3**
1. No menu lateral, vá em: **"APIs e Serviços"** → **"Biblioteca"**
2. Na barra de busca, digite: `YouTube Data API v3`
3. Clique em **"YouTube Data API v3"**
4. Clique em **"ATIVAR"**
5. Aguarde alguns segundos

---

### 4️⃣ **Criar Credenciais (API Key)**
1. No menu lateral, vá em: **"APIs e Serviços"** → **"Credenciais"**
2. Clique em **"+ CRIAR CREDENCIAIS"** (no topo)
3. Selecione: **"Chave de API"**
4. Sua API key será criada automaticamente!
5. **COPIE A CHAVE** (ela começa com `AIza...`)

---

### 5️⃣ **Adicionar a API Key no Projeto**

Abra o arquivo `app.py` e encontre a linha 161:

```python
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY', 'AIzaSyDxzN20DJCZ2x3HkLBFMAbmcxO-yvwjeEc')
```

Substitua por:

```python
YOUTUBE_API_KEY = 'SUA_API_KEY_AQUI'
```

---

### 6️⃣ **Reiniciar o Servidor**

1. No terminal, pressione `Ctrl+C` para parar o servidor
2. Execute novamente: `python app.py`
3. Atualize a página no navegador

---

## 💰 **É Gratuito?**

✅ **SIM! 100% GRATUITO**

- **10.000 buscas por dia** de graça
- Não precisa de cartão de crédito
- Suficiente para uso pessoal

---

## 🎯 **Quotas Gratuitas:**

| Operação | Limite Gratuito/Dia |
|----------|---------------------|
| Buscas | 10.000 |
| Visualizações de vídeo | Ilimitado |
| Custo | $0 (Grátis) |

---

## ❓ **Problemas Comuns:**

### Erro: "API key not valid"
✅ Certifique-se de que:
1. Ativou a **YouTube Data API v3**
2. Copiou a chave completa
3. Não tem espaços extras

### Erro: "quotaExceeded"
✅ Você atingiu o limite de 10.000 buscas por dia
- Aguarde até amanhã
- Ou crie outro projeto

### Erro: "Access Not Configured"
✅ A API não foi ativada corretamente
- Volte ao passo 3
- Certifique-se de clicar em "ATIVAR"

---

## 🔒 **Segurança:**

⚠️ **NÃO compartilhe sua API key publicamente**
- Não faça commit no GitHub
- Use variáveis de ambiente em produção

---

## 📺 **Teste Rápido:**

Depois de configurar:

1. Vá no app: http://127.0.0.1:5000
2. Digite no campo de busca: "Coldplay"
3. Deve aparecer uma lista de vídeos reais!

---

**✨ Pronto! Agora você pode buscar QUALQUER música livremente!**
