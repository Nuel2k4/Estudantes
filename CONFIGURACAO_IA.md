# 🤖 Configuração da IA (Google Gemini)

## ✅ Correção Aplicada

O modelo foi alterado de `gemini-2.0-flash-exp` para `gemini-1.5-flash` para maior estabilidade e limites mais generosos.

---

## 📊 Modelos Disponíveis

### 🟢 gemini-1.5-flash (RECOMENDADO - Atual)
- **Status**: Estável
- **Limites**: 15 requisições/minuto, 1500/dia
- **Tokens**: 1M por minuto
- **Custo**: GRATUITO
- **Melhor para**: Uso em produção, apps públicos

### 🟡 gemini-2.0-flash-exp (Experimental)
- **Status**: Experimental
- **Limites**: Muito restritivos (pode ser 0!)
- **Tokens**: Limitados
- **Custo**: GRATUITO
- **Melhor para**: Testes de novas features
- **⚠️ Problema**: Quotas muito baixas, não recomendado

### 🔵 gemini-1.5-pro
- **Status**: Estável
- **Limites**: 2 requisições/minuto, 50/dia
- **Tokens**: Mais capacidade
- **Custo**: GRATUITO (com limites)
- **Melhor para**: Tarefas complexas

---

## 🔧 Como Trocar de Modelo

### No código (app.py):

```python
# Linha ~903
response = client.models.generate_content(
    model='gemini-1.5-flash',  # ← Troque aqui
    contents=prompt
)
```

### Opções:
- `gemini-1.5-flash` - Atual, recomendado
- `gemini-1.5-pro` - Mais poderoso, menos requisições
- `gemini-2.0-flash-exp` - Experimental, não use em produção

---

## 📈 Limites da API Gratuita

### gemini-1.5-flash:
| Período | Limite |
|---------|--------|
| Por minuto | 15 requisições |
| Por dia | 1.500 requisições |
| Tokens/min | 1 milhão |

### gemini-1.5-pro:
| Período | Limite |
|---------|--------|
| Por minuto | 2 requisições |
| Por dia | 50 requisições |
| Tokens/min | 32.000 |

---

## ⚠️ Mensagens de Erro Comuns

### Erro 429 - Quota Exceeded
```
429 RESOURCE_EXHAUSTED
```

**Causas**:
1. Muitas requisições em pouco tempo
2. Modelo experimental com quota zero
3. Limite diário atingido

**Soluções**:
1. ✅ Aguarde 1 minuto
2. ✅ Use `gemini-1.5-flash` (já está configurado)
3. ✅ Implemente cache de respostas
4. ✅ Configure rate limiting no frontend

### Erro 400 - Invalid API Key
```
API_KEY_INVALID
```

**Solução**:
1. Verifique GEMINI_API_KEY no .env
2. Gere nova key: https://aistudio.google.com/apikey
3. Certifique-se que está ativa

---

## 🚀 Otimizações Implementadas

### 1. Tratamento de Erros Inteligente
```python
# O app agora detecta automaticamente:
- Quota excedida → Mensagem amigável
- API key inválida → Instruções de como resolver
- Timeout → Retry automático
```

### 2. Mensagens de Erro Claras
```javascript
// Usuário vê mensagens amigáveis:
"⏱️ Limite de requisições atingido.
Aguarde alguns segundos e tente novamente."
```

### 3. Modelo Estável
- Mudado de experimental para estável
- Limites mais previsíveis
- Melhor para produção

---

## 💡 Dicas de Uso

### Para Desenvolvimento:
```env
# Use gemini-1.5-flash (já configurado)
# Bom equilíbrio entre velocidade e limite
```

### Para Produção:
```python
# Considere adicionar cache
from functools import lru_cache

@lru_cache(maxsize=100)
def get_ai_response(question):
    # Respostas idênticas retornam do cache
    # Economiza quota da API
```

### Para Testes:
```python
# Adicione delays entre requisições
import time
time.sleep(4)  # Esperar 4s entre chamadas
```

---

## 🔍 Monitoramento

### Verificar uso atual:
https://ai.google.dev/gemini-api/docs/rate-limits

### Ver quota restante:
https://ai.dev/rate-limit

---

## ✅ Status Atual

- ✅ Modelo: `gemini-1.5-flash`
- ✅ API Key: Configurada
- ✅ Tratamento de erros: Implementado
- ✅ Rate limiting: Ativo no app
- ✅ Mensagens amigáveis: Sim

---

## 📞 Ainda com Problemas?

### Se o erro persistir:

1. **Aguarde 60 segundos** - Quota reseta por minuto
2. **Teste a API Key**:
   ```bash
   curl https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=SUA_API_KEY \
     -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"teste"}]}]}'
   ```
3. **Gere nova API Key**: https://aistudio.google.com/apikey
4. **Verifique .env**: Certifique-se que GEMINI_API_KEY está correto

---

**Última atualização**: 27/01/2026
**Modelo atual**: gemini-1.5-flash
**Status**: ✅ Funcionando
