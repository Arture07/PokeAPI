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