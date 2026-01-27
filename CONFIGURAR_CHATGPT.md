# 🤖 Como Configurar o ChatGPT no StudyHub

## 📋 Opções de Configuração

Existem **3 formas** de configurar sua API key do ChatGPT:

---

## ✅ **Opção 1: Variável de Ambiente (Recomendado)**

### Windows PowerShell:
```powershell
$env:OPENAI_API_KEY = "sua-api-key-aqui"
python app.py
```

### Windows CMD:
```cmd
set OPENAI_API_KEY=sua-api-key-aqui
python app.py
```

---

## ✅ **Opção 2: Arquivo .env**

1. Renomeie o arquivo `.env.example` para `.env`
2. Edite o arquivo `.env` e adicione sua chave:
```
OPENAI_API_KEY=sua-api-key-aqui
```
3. Instale a biblioteca python-dotenv:
```bash
pip install python-dotenv
```
4. Adicione no início do `app.py`:
```python
from dotenv import load_dotenv
load_dotenv()
```

---

## ✅ **Opção 3: Direto no Código (Menos Seguro)**

Edite o arquivo `app.py` e substitua esta linha:

```python
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
```

Por:

```python
OPENAI_API_KEY = 'sua-api-key-aqui'
```

**⚠️ ATENÇÃO:** Não compartilhe seu código com a API key exposta!

---

## 🔑 Como Obter sua API Key do OpenAI

### 1. **Acesse o site:**
https://platform.openai.com/api-keys

### 2. **Crie uma conta (se não tiver)**
- Você pode usar conta Google, Microsoft ou e-mail

### 3. **Crie uma nova chave:**
- Clique em **"Create new secret key"**
- Dê um nome para identificar (ex: "StudyHub")
- Copie a chave e salve em local seguro

### 4. **Adicione créditos (se necessário):**
- Novos usuários geralmente recebem créditos gratuitos
- Acesse: https://platform.openai.com/account/billing
- Adicione um método de pagamento se necessário

---

## 💰 Preços da API (Janeiro 2026)

### GPT-3.5-turbo (Recomendado para começar):
- **Entrada:** $0.0005 por 1.000 tokens (~750 palavras)
- **Saída:** $0.0015 por 1.000 tokens

### Exemplo prático:
- 100 perguntas ao ChatGPT ≈ $0.10 - $0.30 USD
- Muito econômico para uso pessoal!

---

## 🧪 Testar a Integração

Depois de configurar:

1. **Reinicie o servidor Flask**
2. **Acesse:** http://localhost:5000
3. **Vá no chat da IA**
4. **Digite:** "Olá, você está funcionando?"
5. **Aguarde a resposta do ChatGPT**

---

## ❌ Solução de Problemas

### Erro: "Por favor, configure sua API key"
✅ A API key não está configurada. Use uma das opções acima.

### Erro: "Incorrect API key provided"
✅ Verifique se copiou a chave completa e sem espaços.

### Erro: "You exceeded your current quota"
✅ Adicione créditos em: https://platform.openai.com/account/billing

### Erro: "Rate limit exceeded"
✅ Aguarde alguns segundos entre as requisições.

---

## 🔒 Dicas de Segurança

1. ✅ **Nunca** compartilhe sua API key publicamente
2. ✅ **Não** faça commit do arquivo `.env` no Git
3. ✅ Use variáveis de ambiente em produção
4. ✅ Monitore o uso em: https://platform.openai.com/usage
5. ✅ Defina limites de gastos na plataforma OpenAI

---

## 🚀 Modelos Disponíveis

Você pode alterar o modelo em `app.py`:

```python
model="gpt-3.5-turbo",  # Mais barato e rápido
# model="gpt-4",        # Mais inteligente, mais caro
# model="gpt-4-turbo",  # Melhor custo-benefício
```

---

## 📚 Documentação Oficial

- **API OpenAI:** https://platform.openai.com/docs
- **Preços:** https://openai.com/pricing
- **Exemplos:** https://platform.openai.com/examples

---

**✨ Pronto! Agora você tem um assistente IA real integrado ao seu app de estudos!**
