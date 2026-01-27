# 🚀 INÍCIO RÁPIDO - ChatGPT Integrado

## ✅ Status: ChatGPT está PRONTO para uso!

A integração com o ChatGPT está completa. Agora você precisa apenas adicionar sua API key.

---

## 🔑 Configure sua API Key (ESCOLHA UMA OPÇÃO):

### 🟢 **MAIS FÁCIL - PowerShell (Temporário):**

Abra um novo PowerShell e execute:

```powershell
$env:OPENAI_API_KEY = "sk-sua-chave-aqui"
cd "c:\Users\nuelm\Desktop\novo_projeto"
python app.py
```

---

### 🟢 **PERMANENTE - Direto no código:**

1. Abra o arquivo `app.py`
2. Encontre a linha 15:
```python
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
```

3. Substitua por:
```python
OPENAI_API_KEY = 'sk-sua-chave-aqui'
```

4. Salve e reinicie o servidor

---

## 🎯 Onde conseguir a API Key:

1. **Acesse:** https://platform.openai.com/api-keys
2. **Faça login** ou crie uma conta
3. **Clique:** "Create new secret key"
4. **Copie** a chave (começa com "sk-")
5. **Cole** usando uma das opções acima

---

## 🧪 Testar agora:

1. Acesse: http://127.0.0.1:5000
2. Vá no chat da IA (lado direito)
3. Digite: "Explique o que é fotossíntese"
4. Aguarde a resposta real do ChatGPT!

---

## 💡 Sem API Key?

O app funciona normalmente, mas o chat exibirá uma mensagem pedindo para configurar a chave.

Todas as outras funcionalidades (pastas, notas, cronômetro, YouTube) funcionam perfeitamente!

---

## 📖 Documentação Completa:

Veja o arquivo `CONFIGURAR_CHATGPT.md` para mais detalhes.
