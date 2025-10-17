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


def list_by_generation_and_name(generation: Optional[int], name: Optional[str], limit: int, offset: int, verify_override: Optional[bool] = None) -> Tuple[int, List[Dict]]:
    """Lista pokémon filtrando por geração e nome (contains), paginado.
    - generation: se fornecido, resolve via endpoint /generation/{id} -> lista species, converte species->pokemon (id/código).
    - name: filtro contains sobre o nome normalizado (aplicado pós-normalização).
    """
    verify = _verify_flag(verify_override)
    s = _http_session()

    codigos: List[int] = []
    if generation:
        # resolve species da geração
        r = s.get(f"{POKEAPI_BASE}/generation/{generation}", timeout=20, verify=verify)
        r.raise_for_status()
        species = [sp["name"] for sp in r.json().get("pokemon_species", [])]
        # pegar id a partir do endpoint species/{name}
        for sp_name in species:
            rs = s.get(f"{POKEAPI_BASE}/pokemon-species/{sp_name}", timeout=20, verify=verify)
            rs.raise_for_status()
            codigos.append(rs.json().get("id"))
    else:
        # fallback simples: usa a listagem de /pokemon para obter um range de ids (até 1000 por padrão)
        r = s.get(f"{POKEAPI_BASE}/pokemon?limit=1000&offset=0", timeout=20, verify=verify)
        r.raise_for_status()
        results = r.json().get("results", [])
        # urls terminam com /pokemon/{id}/
        for item in results:
            url = item.get("url", "").rstrip("/")
            try:
                codigos.append(int(url.split("/")[-1]))
            except Exception:
                continue

    # normaliza e filtra por nome se necessário
    items: List[Dict] = []
    for pk in codigos:
        try:
            det = get_pokemon_detail(pk, verify_override=verify)
            items.append(det)
        except Exception:
            continue

    if name:
        low = name.lower()
        items = [x for x in items if low in (x.get("nome") or "").lower()]

    total = len(items)
    page = items[offset: offset + limit]
    return total, page
