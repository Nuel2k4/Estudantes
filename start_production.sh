#!/bin/bash
# Script de inicialização para produção com Gunicorn

# Número de workers (recomendado: 2-4 x número de CPUs)
WORKERS=4

# Porta
PORT=5000

# Timeout (segundos)
TIMEOUT=120

# Logs
ACCESS_LOG="logs/access.log"
ERROR_LOG="logs/error.log"

# Criar diretório de logs se não existir
mkdir -p logs

echo "🚀 Iniciando BNStudy em modo produção..."
echo "📊 Workers: $WORKERS"
echo "🔌 Porta: $PORT"

# Ativar ambiente virtual se existir
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Executar Gunicorn
gunicorn \
    --workers $WORKERS \
    --bind 0.0.0.0:$PORT \
    --timeout $TIMEOUT \
    --access-logfile $ACCESS_LOG \
    --error-logfile $ERROR_LOG \
    --log-level info \
    --preload \
    app:app
