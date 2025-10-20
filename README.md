# PokeAPI – Backend Django + DRF

API em Django/DRF que integra com a PokéAPI, com autenticação JWT, listagem/detalhe de Pokémon, favoritos e equipe de batalha (máx 6). Inclui testes e containerização.

## Sumário
- Visão geral e arquitetura
- Variáveis de ambiente
- Como executar (local e Docker Compose)
- Uso da API (endpoints e exemplos)
- Testes
- Solução de problemas (Windows/volumes/migrações)
- Notas de produção e próximos passos

## Visão geral e arquitetura
- Stack: Django 5, DRF, SimpleJWT, requests, SQLite, CORS.
- Apps:
  - `core`: usuário customizado (`Usuario`) com `login` como USERNAME_FIELD.
  - `pokemon`: modelos, serviços de integração, views, admin, tests e comando de management.
- Integração com PokéAPI com retries/backoff e cache local (`PokemonCache`) com TTL.
- Regras de negócio: favoritos por usuário e equipe de batalha com máximo de 6.
- Throttling padrão no DRF (anon 60/min, user 120/min).

## Variáveis de ambiente (arquivo `backend/.env`)
Obrigatórias em dev:
- DEBUG=1
- ALLOWED_HOSTS=*
- DJANGO_SECRET_KEY=change-me-in-prod

Opcionais:
- DEFAULT_POKEMON_LIMIT=20
- MAX_POKEMON_LIMIT=100
- POKEAPI_BASE=https://pokeapi.co/api/v2
- POKEAPI_VERIFY_SSL=1  (use 0 se houver problemas de SSL na sua rede)
- POKEMON_CACHE_TTL_SECONDS=86400 (24h)

## Como executar
### Docker Compose (recomendado)
- Subir o serviço:
```powershell
docker compose up -d --build
```
- Verificar saúde:
```powershell
curl http://localhost:8000/health/
```
- Logs (opcional):
```powershell
docker compose logs -f backend
```
Notas Windows:
- Por padrão, o Compose NÃO monta o `db.sqlite3` do host, evitando conflitos de migração/locks. O banco fica dentro do container.
- Se quiser persistir localmente, veja a seção “Persistência do SQLite (opcional)”.

### Execução local (sem Docker)
1) (Opcional) Criar e ativar venv
2) Instalar dependências:
```powershell
pip install -r backend/requirements.txt
```
3) Migrar e rodar:
```powershell
python backend/manage.py migrate
python backend/manage.py runserver 0.0.0.0:8000
```

### Persistência do SQLite (opcional)
Se quiser ter o `db.sqlite3` persistido no host com Compose:
1) Pare o Compose: `docker compose down`
2) Crie o arquivo do banco (se não existir):
```powershell
New-Item -ItemType File -Path .\backend\db.sqlite3 -Force | Out-Null
```
3) Edite `docker-compose.yml` adicionando o volume no serviço backend:
```
    volumes:
      - ./backend/db.sqlite3:/app/db.sqlite3
```
4) Suba novamente: `docker compose up -d --build`

Se aparecer “InconsistentMigrationHistory”, apague o arquivo `backend/db.sqlite3`, suba o Compose para aplicar migrações do zero, e depois use normalmente.

## Uso da API (endpoints e exemplos)
Base URL (local): `http://localhost:8000`

### Saúde
- GET `/health/` → 200 {"status":"ok"}

### Autenticação
- POST `/auth/register/`
  - body: `{ "login": "ash", "email": "ash@example.com", "password": "Aa@123456", "nome": "Ash" }`
  - 201 com id/login/email/nome
- POST `/auth/login/`
  - body: `{ "login": "ash", "password": "Aa@123456" }`
  - 200 `{ access, refresh }`
- POST `/auth/refresh/` → 200 `{ access }`
- GET `/auth/me/` (Bearer access)

Exemplo (PowerShell):
```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8000/auth/login/ -ContentType 'application/json' -Body '{"login":"ash","password":"Aa@123456"}'
curl http://localhost:8000/auth/me/ -Headers @{ Authorization = "Bearer $($login.access)" }
```

### Pokémon (público)
- GET `/pokemon/?generation=&name=&limit=&offset=&verify=0|1`
  - Retorna `{ count, results }`. `limit` respeita MAX_POKEMON_LIMIT.
- GET `/pokemon/<codigo>/`
  - Retorna detalhe normalizado `{ codigo, nome, tipos[], imagemUrl }` (usa cache TTL).

### Favoritos (autenticado)
- GET `/pokemon/favorites/`
- POST `/pokemon/favorites/` body `{ "codigo": 25 }`
- DELETE `/pokemon/favorites/25/`

Respostas tipicamente retornam dados normalizados do Pokémon. Ao remover, 204 mesmo se já ausente.

### Equipe de batalha (autenticado)
- GET `/pokemon/team/`
- POST `/pokemon/team/` body `{ "codigo": 6 }`
- DELETE `/pokemon/team/6/`
- Regra: máximo de 6 na equipe. Ao tentar adicionar o 7º, retorna 400 com mensagem.

### Utilidades e dev
- POST `/pokemon/sync-types/` (apenas quando `DEBUG=1`) → popula `TipoPokemon` a partir da PokéAPI.
- GET `/admin/users/` (apenas staff) → lista simples de usuários.
- POST `/auth/reset-password/` → gera token de reset (dev-friendly, sem e-mail)
- POST `/auth/reset-password/confirm/` → aplica nova senha com `{ login, token, new_password }`

## Testes
Executar testes do app `pokemon`:
```powershell
python backend/manage.py test pokemon -v 2
```

## Solução de problemas
- PowerShell + caminhos Windows
  - Em comandos `docker run`, prefira `--mount` com `source="$($pwd.Path)\backend\db.sqlite3"`.
  - Arquivo precisa existir antes para bind de arquivo.
  - Habilite File Sharing do drive C: no Docker Desktop.
- “InconsistentMigrationHistory” ao usar volume do SQLite
  - Pare containers, apague `backend/db.sqlite3`, suba novamente para migrar do zero.
- Porta 8000 em uso
  - Ajuste o mapeamento no compose para `- "8001:8000"` e acesse `http://localhost:8001`.
- Name conflict do container
  - `docker stop pokeapi-backend` antes de subir de novo com mesmo nome.
- SSL/Firewall corporativo com PokéAPI
  - Tente `POKEAPI_VERIFY_SSL=0` no `.env` (ou `verify=0` nos endpoints públicos) apenas em dev.

## Notas de produção

## Deploy na Render

Este repositório já possui um `render.yaml` para deploy automático de:

- Backend (Django + Gunicorn) como serviço Web (Docker)
- Frontend (Angular) como site estático com proxy de `/api/*` para o backend

Passos:

1. Importe o repositório na Render e escolha “Blueprint (render.yaml)”.
2. Se preferir criar manualmente:
  - Crie um serviço Web (Docker) apontando para `backend/`.
  - Crie um Static Site apontando para `frontend/`, build `npm ci && npm run build`, publish `dist/frontend/browser`.
  - Em “Routes” do Static, adicione um rewrite: `source: /api/*` → `destination: https://<BACKEND_HOST>/api/*`.
3. Variáveis de ambiente no backend:
  - `DJANGO_SECRET_KEY` (Generate
)
  - `DEBUG=0`
  - `ALLOWED_HOSTS=*` (ou seu domínio)
4. O Angular em produção usa `apiBaseUrl: '/api'` (arquivo `frontend/src/environments/environment.ts`).
  O proxy é feito pelo Static Site via `routes`.

Se o backend subir em outro domínio/nome, ajuste o `render.yaml` na rota do frontend ou defina `apiBaseUrl` conforme sua CDN/domínio.
## Próximos passos (P3 – Frontend Angular)
- Bootstrap do front: Angular + Material, AuthInterceptor/Guard, serviço de API e tela de Login.
- Telas: Listagem (filtros por geração/nome, cards com tipos, ações Favorito/Equipe), Favoritos e Equipe (máx 6).
- Integração com endpoints já prontos e tratamento de erros/paginação.

---

## Roadmap por partes (P1, P2, P3)

- P1 – Fundamentos do backend [CONCLUÍDO]
  - Projeto Django + DRF, health check `/health/`.
  - Usuário customizado (`core.Usuario`) e autenticação JWT (register/login/refresh/me).
  - Admin habilitado e CORS/configs essenciais.

- P2 – Domínio Pokémon e regras [CONCLUÍDO]
  - Modelagem: `TipoPokemon`, `PokemonUsuario`, `PokemonCache`.
  - Integração PokéAPI: retries/backoff, verify SSL configurável, normalização.
  - Endpoints: listagem/filtragem, detalhe, favoritos (CRUD), equipe de batalha (máx 6), sync de tipos (DEBUG).
  - Diferenciais: throttling leve, endpoints auxiliares (lista de usuários admin e fluxo dev de reset de senha), testes.

- P3 – Frontend Angular [EM ANDAMENTO]
  - Bootstrap do front, autenticação (Interceptor/Guard), tela de Login.
  - Telas de Listagem/Favoritos/Equipe integradas ao backend.
  - UX: paginação/infinite scroll, feedbacks de regra de 6.

- Opcionais/Futuros
  - Persistência do SQLite via volume com procedimento seguro.
  - Postgres para produção, CI, métricas, e2e no front, fluxo completo de reset por e-mail.

