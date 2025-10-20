#!/usr/bin/env sh
set -e

# Migrações
python manage.py migrate --noinput

# Cria admin automático (opcional)
if [ -n "$ADMIN_LOGIN" ] && [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
	python manage.py create_admin || true
fi

# Coleta de arquivos estáticos (desnecessário neste projeto)
# python manage.py collectstatic --noinput

# Inicia o Gunicorn na porta informada (Render define $PORT)
PORT="${PORT:-8000}"
exec gunicorn pokeback.wsgi:application --bind 0.0.0.0:${PORT} --workers 3 --timeout 60
