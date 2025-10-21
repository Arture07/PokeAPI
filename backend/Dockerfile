# syntax=docker/dockerfile:1

FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
# Copia o frontend a partir do contexto raiz do repositório
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=pokeback.settings

WORKDIR /app

# Dependências do sistema (mínimas) e pip
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip

# Instala dependências Python
# Copia apenas os arquivos do backend necessários
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copia o código do backend
# Copia o código do backend
COPY backend/ /app/
# Copia o build do frontend para ser servido pela aplicação
COPY --from=build-frontend /app/frontend/dist/frontend/browser /app/public

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

CMD ["/app/docker-entrypoint.sh"]
