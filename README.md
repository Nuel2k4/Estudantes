# StudyHub - Plataforma de Estudos

Aplicacao web para organizacao de estudos com autenticacao, pastas/notas, cronometro com historico e estatisticas, rotina semanal e assistente IA usando Gemini. Recuperacao de senha via email e painel admin para gerenciar usuarios.

## Funcionalidades
- Autenticacao com reset de senha por email
- Pastas e notas com auto-save
- Cronometro de estudo com historico e estatisticas
- Agenda de rotina semanal com categorias e cores
- Assistente IA (Gemini 2.5 Flash) com contexto do usuario
- Painel admin para listar, promover/demover e excluir usuarios
- UI responsiva com tema escuro

## Tecnologias
- Flask 3, SQLAlchemy, Flask-Limiter, Flask-Mail, Flask-CORS
- Google Gemini (google-genai)
- SQLite em desenvolvimento; PostgreSQL suportado via `DATABASE_URL`
- HTML, CSS, JavaScript vanilla

## Configuracao rapida
1. Criar ambiente virtual (opcional):
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
2. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Copiar `.env.example` para `.env` e preencher:
   - `SECRET_KEY` (qualquer string segura)
   - `GEMINI_API_KEY` (https://aistudio.google.com/apikey)
   - `MAIL_USERNAME` e `MAIL_PASSWORD` (use App Password no Gmail)
   - Opcional: `DATABASE_URL` para PostgreSQL, `DEBUG=True` para logs
4. Rodar localmente:
   ```bash
   python app.py
   ```
   Acesse http://localhost:5000

## Variaveis de ambiente (resumo)
- `SECRET_KEY` chave da sessao Flask
- `GEMINI_API_KEY` chave do Google Gemini
- `DATABASE_URL` URL do Postgres (ex: postgresql://user:pass@host:5432/db)
- `MAIL_SERVER` (padrao smtp.gmail.com)
- `MAIL_PORT` (587)
- `MAIL_USE_TLS` (True/False)
- `MAIL_USERNAME` e `MAIL_PASSWORD`
- `MAIL_DEFAULT_SENDER` (email exibido no reset)
- `DEBUG` (True/False)

## Estrutura
```
novo_projeto/
├── app.py              # Backend Flask e rotas
├── requirements.txt
├── Procfile            # gunicorn para deploy
├── .env.example
├── database/
├── templates/          # login.html, index.html, admin.html, erros
└── static/
    ├── css/
    └── js/
```

## Deploy rapido (Railway/Render/Heroku)
- Use o `Procfile` existente: `web: gunicorn -w 4 -b 0.0.0.0:$PORT app:app`
- Configure variaveis no painel: `SECRET_KEY`, `GEMINI_API_KEY`, `MAIL_*`, `DATABASE_URL`
- Para Postgres, a plataforma fornece `DATABASE_URL`; o app corrige o prefixo `postgres://`
- Habilite buildpack Python (Heroku) ou escolha template Flask (Railway/Render)

## Notas
- Banco SQLite e pastas sao criados automaticamente em desenvolvimento
- Limites de uso configurados via Flask-Limiter
- Gemini e email so funcionam se as variaveis estiverem preenchidas

## 🤝 Próximos Passos Sugeridos

- [ ] Sistema de login e registro
- [ ] Estatísticas de estudo (gráficos)
- [ ] Exportar notas para PDF
- [ ] Modo de revisão com flashcards
- [ ] Integração com Google Calendar
- [ ] Aplicativo mobile (React Native)
- [ ] Tema claro/escuro
- [ ] Compartilhamento de notas

## 📄 Licença

Este projeto é livre para uso pessoal e educacional.

## 👨‍💻 Desenvolvedor

Criado com ❤️ para estudantes que querem se organizar melhor!

---

**Dica:** Para melhor experiência, use navegadores modernos como Chrome, Firefox ou Edge.
