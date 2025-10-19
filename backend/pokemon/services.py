from typing import Dict, Optional, List, Tuple
import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import TipoPokemon, PokemonCache
from django.conf import settings

POKEAPI_BASE = getattr(settings, 'POKEAPI_BASE', 'https://pokeapi.co/api/v2')
POKE_IMG_BASE = os.getenv(
    "POKEMON_IMAGE_BASE",
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork",
)


def _http_session() -> requests.Session:
    retry = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    s = requests.Session()
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s


def _cache_ttl_seconds() -> int:
    try:
        return int(os.getenv("POKEMON_CACHE_TTL_SECONDS", "86400"))  # 24h default
    except Exception:
        return 86400


def sync_types_from_pokeapi(verify_override: Optional[bool] = None) -> Dict[str, int]:
    """Fetch types from PokéAPI and upsert into TipoPokemon. Idempotent.

    Parameters:
    - verify_override: if provided, force SSL verification on/off; else uses env POKEAPI_VERIFY_SSL.
    """
    if verify_override is None:
        verify_ssl = os.getenv("POKEAPI_VERIFY_SSL", "1") == "1"
    else:
        verify_ssl = bool(verify_override)

    url = f"{POKEAPI_BASE}/type"
    session = _http_session()
    resp = session.get(url, timeout=20, verify=verify_ssl)
    resp.raise_for_status()
    data = resp.json()
    tipos = [item["name"] for item in data.get("results", [])]

    created, existing = 0, 0
    with transaction.atomic():
        for nome in tipos:
            _, was_created = TipoPokemon.objects.get_or_create(descricao=nome)
            if was_created:
                created += 1
            else:
                existing += 1
    return {"created": created, "existing": existing, "count": len(tipos)}


def _verify_flag(override: Optional[bool] = None) -> bool:
    if override is None:
        return os.getenv("POKEAPI_VERIFY_SSL", "1") == "1"
    return bool(override)


def normalize_pokemon_detail(raw: Dict) -> Dict:
    sprites = raw.get("sprites", {})
    # melhor imagem pública estável
    image = sprites.get("other", {}).get("official-artwork", {}).get("front_default") or sprites.get("front_default")
    tipos = [t["type"]["name"] for t in raw.get("types", [])]
    return {
        "codigo": raw.get("id"),
        "nome": raw.get("name"),
        "tipos": tipos,
        "imagemUrl": image or "",
    }


def image_url_for(codigo: int) -> str:
    return f"{POKE_IMG_BASE}/{codigo}.png"


def get_pokemon_detail(codigo: int, verify_override: Optional[bool] = None) -> Dict:
    # cache first with TTL
    cached = PokemonCache.objects.filter(codigo=codigo).first()
    if cached:
        ttl = _cache_ttl_seconds()
        if cached.dtAtualizado and timezone.now() - cached.dtAtualizado < timedelta(seconds=ttl):
            return {"codigo": cached.codigo, "nome": cached.nome, "tipos": cached.tipos, "imagemUrl": cached.imagemUrl}

    verify = _verify_flag(verify_override)
    s = _http_session()
    resp = s.get(f"{POKEAPI_BASE}/pokemon/{codigo}", timeout=20, verify=verify)
    resp.raise_for_status()
    norm = normalize_pokemon_detail(resp.json())

    PokemonCache.objects.update_or_create(
        codigo=norm["codigo"],
        defaults={"nome": norm["nome"], "tipos": norm["tipos"], "imagemUrl": norm["imagemUrl"]},
    )
    return norm


def list_by_generation_and_name(
    generation: Optional[int],
    name: Optional[str],
    limit: int,
    offset: int,
    verify_override: Optional[bool] = None,
) -> Tuple[int, List[Dict]]:
    """Lista pokémon filtrando por geração e nome (contains), paginado de forma eficiente.

    Mudanças importantes:
    - Evita baixar detalhes de todos os pokémon para só depois paginar (o que é muito lento).
    - Coleta apenas a lista base de códigos e nomes (rápido) e aplica filtro/paginação nessa lista.
    - Busca detalhes APENAS dos itens da página corrente.
    """
    verify = _verify_flag(verify_override)
    s = _http_session()

    # Caso mais comum e barato: sem geração e sem filtro de nome -> proxy da paginação do próprio endpoint /pokemon
    if not generation and not name:
        r = s.get(f"{POKEAPI_BASE}/pokemon?limit={limit}&offset={offset}", timeout=20, verify=verify)
        r.raise_for_status()
        data = r.json()
        results = data.get("results", [])
        page_items: List[Dict] = []
        for item in results:
            url = (item.get("url") or "").rstrip("/")
            try:
                codigo = int(url.split("/")[-1])
            except Exception:
                continue
            page_items.append({
                "codigo": codigo,
                "nome": item.get("name") or "",
                "tipos": [],
                "imagemUrl": image_url_for(codigo),
            })
        total = int(data.get("count", len(page_items)))
        return total, page_items

    # Demais casos: precisamos de uma lista base de (codigo, nome) para filtrar e paginar
    base_list: List[Tuple[int, str]] = []  # (codigo, nome)

    if generation:
        # Resolve species da geração e trabalhe com a lista de nomes primeiro
        r = s.get(f"{POKEAPI_BASE}/generation/{generation}", timeout=20, verify=verify)
        r.raise_for_status()
        species_names = [sp["name"] for sp in r.json().get("pokemon_species", [])]
        if name:
            low = name.lower()
            species_names = [n for n in species_names if low in n.lower()]
        total = len(species_names)
        page_names = species_names[offset: offset + limit]
        # Converta apenas os nomes da página para (id, name) e construa itens mínimos (sem tipos) para velocidade
        page_items: List[Dict] = []
        for sp_name in page_names:
            try:
                rs = s.get(f"{POKEAPI_BASE}/pokemon-species/{sp_name}", timeout=20, verify=verify)
                rs.raise_for_status()
                codigo = int(rs.json().get("id"))
                page_items.append({
                    "codigo": codigo,
                    "nome": sp_name,
                    "tipos": [],
                    "imagemUrl": image_url_for(codigo),
                })
            except Exception:
                continue
        return total, page_items
    else:
        # Sem geração, mas com filtro de nome: carregue um catálogo razoável e filtre
        r = s.get(f"{POKEAPI_BASE}/pokemon?limit=1000&offset=0", timeout=20, verify=verify)
        r.raise_for_status()
        results = r.json().get("results", [])
        for item in results:
            url = (item.get("url") or "").rstrip("/")
            try:
                codigo = int(url.split("/")[-1])
            except Exception:
                continue
            base_list.append((codigo, item.get("name") or ""))
        if name:
            low = name.lower()
            base_list = [(c, n) for (c, n) in base_list if low in n.lower()]
        total = len(base_list)
        page_slice = base_list[offset: offset + limit]
        page_items: List[Dict] = []
        for pk, nm in page_slice:
            page_items.append({
                "codigo": pk,
                "nome": nm,
                "tipos": [],
                "imagemUrl": image_url_for(pk),
            })
        return total, page_items
