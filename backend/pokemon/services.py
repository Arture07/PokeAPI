from typing import Dict, Optional
import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from django.db import transaction
from .models import TipoPokemon

POKEAPI_BASE = "https://pokeapi.co/api/v2"


def _http_session() -> requests.Session:
    retry = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    s = requests.Session()
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s


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
