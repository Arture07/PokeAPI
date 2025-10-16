# Kogui PokeAPI – Desafio

Projeto full-stack para Pokédex com favoritos e equipe de batalha.

## Stack (decisão)
- Back-end: Django + Django REST Framework, JWT (simplejwt), SQLite, requests, CORS.
- Front-end: Angular + Angular Material.

Por que Django/DRF (vs Flask):
- Autenticação JWT madura (simplejwt) e permissões nativas do DRF.
- ORM e migrações rápidas; Django Admin ajuda na gestão de dados.
- DRF oferece paginação, filtros e viewsets prontos.
- Centraliza a integração com a PokéAPI com menos "cola" entre libs.

Quando Flask seria melhor: microserviços minimalistas ou quando você já tem boilerplate pronto.

## Estrutura
```
backend/        # API Django (DRF)
frontend/       # App Angular (em etapas futuras)
```

## Como rodar (Windows PowerShell)
1. Criar e ativar venv
```
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
```
2. Instalar dependências e migrar DB
```
pip install -r backend/requirements.txt
python backend/manage.py migrate
```
3. Subir o servidor
```
python backend/manage.py runserver 8000
```
4. Health check
- Acesse: http://127.0.0.1:8000/health/

## Próximos passos
- P1: concluir bootstrap, custom User e JWT.
- P2: domínios de Pokémon, integração e cache.
- P3: endpoints de negócio (lista, favoritos, equipe).
- P4: telas Angular (Login, Listagem, Favoritos, Equipe).

## Parte 1 (P1) — Backend pronto com Usuário e JWT
Status: concluído.

Entregas da P1:
- Projeto Django/DRF operacional com `/health`.
- Modelo de usuário custom `core.Usuario` (login como USERNAME_FIELD) + admin.
- Autenticação JWT (SimpleJWT) configurada.
- Endpoints de autenticação e teste protegidos.

Endpoints:
- GET /health
- POST /auth/register { login, email, password, nome }
- POST /auth/login { login, password } -> { access, refresh }
- POST /auth/refresh { refresh } -> { access }
- GET /auth/me (Bearer access) -> dados do usuário

Como verificar rapidamente (PowerShell):
1) Criar usuário:
```
$body = @{login='ash'; email='ash@example.com'; password='Poke@123'; nome='Ash Ketchum'} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/auth/register/ -ContentType 'application/json' -Body $body
```
2) Obter tokens e chamar rota protegida:
```
$login = @{login='ash'; password='Poke@123'} | ConvertTo-Json
$tokens = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/auth/login/ -ContentType 'application/json' -Body $login
$headers = @{ Authorization = ('Bearer ' + $tokens.access) }
Invoke-RestMethod -Headers $headers -Method Get -Uri http://127.0.0.1:8000/auth/me/
```
3) Admin (opcional):
- Crie um superuser: `python backend/manage.py createsuperuser`
- Acesse: http://127.0.0.1:8000/admin/

Próxima Parte (P2):
- Modelos `TipoPokemon` e `PokemonUsuario`.
- Integração com PokéAPI (cache) e primeiras listas filtradas.