@echo off
REM Script de inicialização para produção com Gunicorn (Windows)

SET WORKERS=4
SET PORT=5000
SET TIMEOUT=120

IF NOT EXIST logs mkdir logs

echo 🚀 Iniciando BNStudy em modo produção...
echo 📊 Workers: %WORKERS%
echo 🔌 Porta: %PORT%

REM Ativar ambiente virtual se existir
IF EXIST venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Executar Gunicorn
gunicorn ^
    --workers %WORKERS% ^
    --bind 0.0.0.0:%PORT% ^
    --timeout %TIMEOUT% ^
    --access-logfile logs/access.log ^
    --error-logfile logs/error.log ^
    --log-level info ^
    --preload ^
    app:app
