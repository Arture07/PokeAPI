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

## Parte 1 (P1) — Backend com Usuário e JWT
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

## Parte 2 (P2) — Domínio de Pokémon e cache
Status: implementado (lista/detalhe + favoritos + equipe) e testes básicos com mock.

Novos modelos/serviços:
- `pokemon.PokemonCache`: cache normalizado de Pokémon (nome, tipos, imagem, dtAtualizado) com TTL simples.
- Serviços com sessão HTTP e Retry; flag de verificação TLS configurável; normalização de detalhe.

Novos endpoints públicos:
- GET /pokemon/?generation=&name=&limit=&offset=&verify=  -> listagem com filtros e paginação simples.
- GET /pokemon/<codigo>/?verify=                         -> detalhe por código.

Endpoints autenticados (JWT Bearer):
- GET /pokemon/favorites/                                -> lista favoritos do usuário.
- POST /pokemon/favorites/ { codigo }                    -> adiciona/atualiza favorito.
- DELETE /pokemon/favorites/<codigo>/                    -> remove favorito.
- GET /pokemon/team/                                     -> lista equipe de batalha (máx. 6).
- POST /pokemon/team/ { codigo }                         -> adiciona à equipe (enforce máx. 6).
- DELETE /pokemon/team/<codigo>/                         -> remove da equipe.

Notas de implementação:
- FK `PokemonUsuario.idTipoPokemon` é opcional (null/blank) para não travar o fluxo se tipos não estiverem seedados.
- Endpoint dev de seed: POST /pokemon/sync-types/?verify=0|1 (use apenas em dev; para prod, use o comando de management: `python backend/manage.py sync_pokemon_types`).

### Variáveis de ambiente
Crie `backend/.env` (carregado no settings):
- `DJANGO_SECRET_KEY` — chave secreta (trocar em prod).
- `DEBUG=1|0`
- `ALLOWED_HOSTS=*` (ou lista separada por vírgula)
- `POKEAPI_VERIFY_SSL=1|0` — verificação TLS nas chamadas à PokéAPI (mantenha 1 em produção; 0 só para redes corporativas com inspeção).
- `POKEMON_CACHE_TTL_SECONDS=86400` — TTL do cache de Pokémon (padrão 24h).

### Testes
- Testes unitários básicos com mocks para não depender da PokéAPI.
```
python backend/manage.py test pokemon -v 2
```

### Verificação rápida dos novos endpoints (PowerShell)
Assumindo `$headers` já definido com Bearer acima:
```
# Listagem pública (primeiros itens)
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/pokemon/?limit=5&offset=0"

# Detalhe público
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/pokemon/1/"

# Favoritar (autenticado)
Invoke-RestMethod -Headers $headers -Method Post -Uri "http://127.0.0.1:8000/pokemon/favorites/" -ContentType 'application/json' -Body (@{codigo=25} | ConvertTo-Json)
Invoke-RestMethod -Headers $headers -Method Get -Uri "http://127.0.0.1:8000/pokemon/favorites/"
Invoke-RestMethod -Headers $headers -Method Delete -Uri "http://127.0.0.1:8000/pokemon/favorites/25/"

# Equipe (autenticado; máx 6)
1..6 | ForEach-Object { Invoke-RestMethod -Headers $headers -Method Post -Uri "http://127.0.0.1:8000/pokemon/team/" -ContentType 'application/json' -Body (@{codigo=$_} | ConvertTo-Json) }
Invoke-RestMethod -Headers $headers -Method Get -Uri "http://127.0.0.1:8000/pokemon/team/"
Invoke-RestMethod -Headers $headers -Method Delete -Uri "http://127.0.0.1:8000/pokemon/team/3/"
```

### O que é site-packages?
- Pasta dentro do virtualenv (`.venv/Lib/site-packages`) onde ficam bibliotecas de terceiros (ex.: Django, DRF, requests). Não faz parte do repositório; não edite arquivos lá.

### Dica Git – "Author identity unknown"
Configure uma identidade:
```
# global
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
# ou somente neste repo
# git config user.name "Seu Nome"
# git config user.email "seu-email@exemplo.com"
```

## Próximas melhorias (roadmap)
- Reduzir chamadas externas na listagem (batching/concurrency) e pré-preenchimento de cache em background.
- Remover endpoint dev `/pokemon/sync-types/` em produção (usar apenas management command).
- Paginação DRF padrão e filtros avançados (django-filter).
- Melhorar manuseio de TLS corporativo (cert store/CA customizada em vez de `verify=False`).
- Front-end Angular (login, listagem, favoritos, equipe).