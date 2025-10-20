#!/usr/bin/env sh
set -e

# Migrations
python manage.py migrate --noinput

# Cria admin automático (opcional)
if [ -n "$ADMIN_LOGIN" ] && [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
	python manage.py create_admin || true
fi

# Collectstatic (não usado agora, mas deixado comentado)
# python manage.py collectstatic --noinput

# Start Gunicorn
exec gunicorn pokeback.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 60
