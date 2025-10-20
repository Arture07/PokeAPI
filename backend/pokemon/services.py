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

# Cache simples para traduções (sessão do processo)
_TRANSLATE_CACHE: Dict[Tuple[str, str], str] = {}


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
    # stats principais
    stats_list = raw.get("stats", [])
    def _stat(name: str) -> int:
        for s in stats_list:
            if s.get("stat", {}).get("name") == name:
                try:
                    return int(s.get("base_stat") or 0)
                except Exception:
                    return 0
        return 0
    stats_list = raw.get("stats", [])
    # campos adicionais
    hp = _stat("hp")
    atk = _stat("attack")
    deff = _stat("defense")
    sp_atk = _stat("special-attack")
    sp_def = _stat("special-defense")
    spd = _stat("speed")
    total = hp + atk + deff + sp_atk + sp_def + spd
    return {
        "codigo": raw.get("id"),
        "nome": raw.get("name"),
        "tipos": tipos,
        "imagemUrl": image or "",
        "stats": {
            "hp": hp,
            "attack": atk,
            "defense": deff,
            "spAttack": sp_atk,
            "spDefense": sp_def,
            "speed": spd,
            "total": total,
        },
    }


def image_url_for(codigo: int) -> str:
    return f"{POKE_IMG_BASE}/{codigo}.png"


def get_pokemon_detail(codigo: int, verify_override: Optional[bool] = None) -> Dict:
    # cache first with TTL
    cached = PokemonCache.objects.filter(codigo=codigo).first()
    if cached:
        ttl = _cache_ttl_seconds()
        if cached.dtAtualizado and timezone.now() - cached.dtAtualizado < timedelta(seconds=ttl):
            payload = {"codigo": cached.codigo, "nome": cached.nome, "tipos": cached.tipos, "imagemUrl": cached.imagemUrl}
            # stats podem não existir em versões antigas do cache; nesse caso, siga sem stats
            try:
                extra = getattr(cached, "extra", None)
                if isinstance(extra, dict) and "stats" in extra:
                    payload["stats"] = extra["stats"]
            except Exception:
                pass
            # Se ainda não há stats, busque do endpoint uma vez (não persiste stats no cache para evitar migração)
            if "stats" not in payload:
                verify = _verify_flag(verify_override)
                s = _http_session()
                r = s.get(f"{POKEAPI_BASE}/pokemon/{codigo}", timeout=20, verify=verify)
                r.raise_for_status()
                raw = r.json()
                norm = normalize_pokemon_detail(raw)
                payload["stats"] = norm.get("stats", {})
            return payload

    verify = _verify_flag(verify_override)
    s = _http_session()
    resp = s.get(f"{POKEAPI_BASE}/pokemon/{codigo}", timeout=20, verify=verify)
    resp.raise_for_status()
    norm = normalize_pokemon_detail(resp.json())
    # Nome localizado (melhorar UX em PT)
    try:
        loc_name = _localized_species_name(s, codigo, verify, fallback=norm.get("nome"))
        if loc_name:
            norm["nome"] = loc_name
    except Exception:
        pass

    PokemonCache.objects.update_or_create(
        codigo=norm["codigo"],
        defaults={
            "nome": norm["nome"],
            "tipos": norm["tipos"],
            "imagemUrl": norm["imagemUrl"],
            # guarde stats num campo extra JSON se existir no model
        },
    )
    return norm


# -------- Composite detail (species, abilities, evolution, multipliers) --------

LANG_PREF = ["pt-BR", "pt", "es", "en"]


def _pick_lang_entry(entries: List[Dict], key_lang: str = "language") -> Optional[Dict]:
    for pref in LANG_PREF:
        for e in entries or []:
            try:
                lang = e.get(key_lang, {}).get("name")
                if lang == pref:
                    return e
            except Exception:
                continue
    # fallback to first
    if entries:
        return entries[0]
    return None


def _pick_lang(entries: List[Dict], key_lang: str = "language", key_text: str = "flavor_text", default: str = "") -> str:
    e = _pick_lang_entry(entries, key_lang)
    if not e:
        return default
    txt = e.get(key_text) or e.get("short_effect") or e.get("effect") or default
    return (txt or default).replace("\n", " ").replace("\f", " ").strip()


def _translate_to_pt(text: str, src_lang: Optional[str] = None) -> str:
    """Traduz texto dinamicamente para pt-BR usando MyMemory (sem chave).

    Controlado por env ENABLE_AUTO_TRANSLATE_PT (default=1). Em caso de falha, devolve o original.
    """
    if not text:
        return text
    if os.getenv("ENABLE_AUTO_TRANSLATE_PT", "1") != "1":
        return text
    # cache
    try:
        key = (text, (src_lang or "").lower())
        if key in _TRANSLATE_CACHE:
            return _TRANSLATE_CACHE[key]
    except Exception:
        pass

    try:
        s = _http_session()
        # MyMemory exige langpair SRC|DEST com códigos de 2 letras (ou RFC3066)
        src = (src_lang or "en").split("-")[0]  # ex: pt-BR -> pt
        if src.lower() not in {"en","es","pt","fr","de","it","ja","zh","ko"}:
            src = "en"
        r = s.get(
            "https://api.mymemory.translated.net/get",
            params={"q": text, "langpair": f"{src}|pt-BR"},
            timeout=10,
            verify=True,
        )
        r.raise_for_status()
        data = r.json() or {}
        t = (data.get("responseData") or {}).get("translatedText")
        if isinstance(t, str) and t.strip() and not t.strip().upper().startswith("'AUTO' IS AN INVALID"):
            out = t.strip()
            _TRANSLATE_CACHE[key] = out
            return out
    except Exception:
        pass
    # Fallback: LibreTranslate (instância pública)
    try:
        s = _http_session()
        src = (src_lang or "en").split("-")[0]
        payload = {"q": text, "source": src, "target": "pt"}
        r = s.post("https://libretranslate.de/translate", json=payload, timeout=10, verify=True)
        r.raise_for_status()
        data = r.json() or {}
        t = data.get("translatedText") or data.get("translated_text")
        if isinstance(t, str) and t.strip():
            out = t.strip()
            _TRANSLATE_CACHE[key] = out
            return out
    except Exception:
        pass
    return text


def _localized_species_name(session: requests.Session, codigo: int, verify: bool, fallback: Optional[str] = None) -> str:
    """Obtém o nome da espécie em pt-BR/pt se disponível; senão devolve fallback/en."""
    try:
        rs = session.get(f"{POKEAPI_BASE}/pokemon-species/{codigo}", timeout=20, verify=verify)
        rs.raise_for_status()
        sp = rs.json()
        # Tenta entrada em pt-BR/pt
        for pref in ("pt-BR", "pt", "es", "en"):
            for nm in sp.get("names", []) or []:
                if (nm.get("language") or {}).get("name") == pref:
                    val = (nm.get("name") or "").strip()
                    if val:
                        return val
        # fallback ao campo padrão
        fb = fallback or sp.get("name") or ""
        return fb
    except Exception:
        return fallback or ""


def _species_id_from_url(url: str) -> Optional[int]:
    try:
        return int((url or "").rstrip("/").split("/")[-1])
    except Exception:
        return None


def _compute_type_multipliers(session: requests.Session, types: List[str], verify: bool) -> Dict[str, Dict[str, float]]:
    """Compute offensive (to) and defensive (from) multipliers for all 18 types."""
    all_types = [
        "normal","fire","water","electric","grass","ice","fighting","poison","ground","flying",
        "psychic","bug","rock","ghost","dragon","dark","steel","fairy"
    ]
    # init 1.0
    def_mult = {t: 1.0 for t in all_types}
    off_mult = {t: 1.0 for t in all_types}
    # defensive: for each pokemon type, multiply by relations ..._from
    for t in types or []:
        try:
            r = session.get(f"{POKEAPI_BASE}/type/{t}", timeout=20, verify=verify)
            r.raise_for_status()
            rel = r.json().get("damage_relations", {})
            for it in rel.get("double_damage_from", []):
                n = it.get("name");
                if n in def_mult: def_mult[n] *= 2.0
            for it in rel.get("half_damage_from", []):
                n = it.get("name");
                if n in def_mult: def_mult[n] *= 0.5
            for it in rel.get("no_damage_from", []):
                n = it.get("name");
                if n in def_mult: def_mult[n] *= 0.0
            # offensive baseline: how this type hits others; later we combine if two types exist we can pick max
            for it in rel.get("double_damage_to", []):
                n = it.get("name");
                if n in off_mult: off_mult[n] = max(off_mult[n], 2.0)
            for it in rel.get("half_damage_to", []):
                n = it.get("name");
                if n in off_mult: off_mult[n] = min(off_mult[n], 0.5)
            for it in rel.get("no_damage_to", []):
                n = it.get("name");
                if n in off_mult: off_mult[n] = 0.0
        except Exception:
            continue
    return {"from": def_mult, "to": off_mult}


def get_pokemon_full(codigo: int, verify_override: Optional[bool] = None) -> Dict:
    verify = _verify_flag(verify_override)
    s = _http_session()

    # base pokemon
    rp = s.get(f"{POKEAPI_BASE}/pokemon/{codigo}", timeout=20, verify=verify)
    rp.raise_for_status()
    raw = rp.json()
    norm = normalize_pokemon_detail(raw)

    # species for flavor text, category, gender ratio, evolution chain
    rs = s.get(f"{POKEAPI_BASE}/pokemon-species/{codigo}", timeout=20, verify=verify)
    rs.raise_for_status()
    species = rs.json()
    flavor_entry = _pick_lang_entry(species.get("flavor_text_entries", []), key_lang="language") or {}
    flavor = (flavor_entry.get("flavor_text") or "").replace("\n"," ").replace("\f"," ").strip()
    flavor_version = (flavor_entry.get("version") or {}).get("name")
    flavor_lang = (flavor_entry.get("language") or {}).get("name")
    genus = _pick_lang(species.get("genera", []), key_lang="language", key_text="genus", default="")
    # Traduções para pt-BR
    if flavor and flavor_lang not in ("pt-BR", "pt"):
        flavor = _translate_to_pt(flavor, src_lang=flavor_lang)
    if genus:
        # genus costuma vir localizado, mas garantimos
        genus = _translate_to_pt(genus, src_lang=flavor_lang or "en")
    gender_rate = species.get("gender_rate", -1)
    if gender_rate == -1:
        genders = {"male": False, "female": False, "genderless": True}
    else:
        female_chance = max(0, min(8, int(gender_rate))) / 8.0
        male_chance = 1.0 - female_chance
        genders = {"male": male_chance > 0, "female": female_chance > 0, "genderless": False,
                   "maleRate": round(male_chance, 3), "femaleRate": round(female_chance, 3)}

    # abilities with descriptions
    abilities: List[Dict] = []
    for ab in raw.get("abilities", []):
        ab_name = ab.get("ability", {}).get("name")
        if not ab_name:
            continue
        try:
            ra = s.get(f"{POKEAPI_BASE}/ability/{ab_name}", timeout=20, verify=verify)
            ra.raise_for_status()
            ad = ra.json()
            # nome local
            local_name = ab_name
            for pref in ("pt-BR", "pt", "es", "en"):
                for nm in ad.get("names", []) or []:
                    if (nm.get("language") or {}).get("name") == pref:
                        val = (nm.get("name") or "").strip()
                        if val:
                            local_name = val
                            break
                else:
                    continue
                break
            desc = _pick_lang(ad.get("effect_entries", []), key_lang="language", key_text="short_effect", default="")
            if desc:
                # os effect_entries geralmente vêm em en; se vierem em outro, deixe a API decidir
                desc = _translate_to_pt(desc, src_lang=None)
        except Exception:
            desc = ""
        abilities.append({
            "nome": local_name,
            "isHidden": bool(ab.get("is_hidden")),
            "efeito": desc,
        })

    # height/weight conversions
    height_m = (raw.get("height") or 0) / 10.0
    weight_kg = (raw.get("weight") or 0) / 10.0

    # type multipliers
    mult = _compute_type_multipliers(s, norm.get("tipos", []), verify)

    # evolution chain
    evo_list: List[Dict] = []
    evo_edges: List[Dict] = []
    try:
        evo_url = species.get("evolution_chain", {}).get("url")
        if evo_url:
            re = s.get(evo_url, timeout=20, verify=verify)
            re.raise_for_status()
            chain = re.json().get("chain", {})
            def walk(node, prev_id=None):
                sp = node.get("species", {})
                name = sp.get("name")
                sid = _species_id_from_url(sp.get("url"))
                if sid:
                    evo_detail = (node.get("evolution_details") or [{}])[0]
                    # extract rich conditions
                    cond = {
                        "minLevel": evo_detail.get("min_level"),
                        "trigger": (evo_detail.get("trigger") or {}).get("name"),
                        "item": (evo_detail.get("item") or {}).get("name"),
                        "heldItem": (evo_detail.get("held_item") or {}).get("name"),
                        "timeOfDay": evo_detail.get("time_of_day"),
                        "knownMoveType": (evo_detail.get("known_move_type") or {}).get("name"),
                        "knownMove": (evo_detail.get("known_move") or {}).get("name"),
                        "location": (evo_detail.get("location") or {}).get("name"),
                        "minHappiness": evo_detail.get("min_happiness"),
                        "minAffection": evo_detail.get("min_affection"),
                        "minBeauty": evo_detail.get("min_beauty"),
                        "needsRain": bool(evo_detail.get("needs_overworld_rain")),
                        "relativeStats": evo_detail.get("relative_physical_stats"),
                        "gender": evo_detail.get("gender"),
                        "tradeSpecies": (evo_detail.get("trade_species") or {}).get("name"),
                        "turnUpsideDown": bool(evo_detail.get("turn_upside_down")),
                    }
                    local_name = _localized_species_name(s, sid, verify, fallback=name)
                    # try to fetch types for child species to compose badges
                    child_types: List[str] = []
                    try:
                        rd_child = s.get(f"{POKEAPI_BASE}/pokemon/{sid}", timeout=10, verify=verify)
                        rd_child.raise_for_status()
                        child_types = [t.get("type", {}).get("name") for t in (rd_child.json().get("types", []) or [])]
                    except Exception:
                        child_types = []
                    evo_list.append({
                        "codigo": sid,
                        "nome": local_name or name,
                        "minLevel": cond["minLevel"],
                        "trigger": cond["trigger"],
                        "imagemUrl": image_url_for(sid),
                        "detalhes": cond,
                    })
                    # Build edge from previous node to this node (skip for root)
                    if prev_id is not None:
                        evo_edges.append({
                            "from": int(prev_id),
                            "to": int(sid),
                            **cond,
                            "trigger": cond.get("trigger"),
                            "detalhes": cond,
                            "toData": {
                                "codigo": int(sid),
                                "nome": local_name or name,
                                "imagemUrl": image_url_for(sid),
                                "tipos": child_types,
                            },
                        })
                for nxt in node.get("evolves_to", []) or []:
                    walk(nxt, sid)
            walk(chain)
    except Exception:
        pass

    result = {
        **norm,
        "descricao": flavor,
        "descricaoFonte": flavor_version,
        "descricaoIdioma": flavor_lang,
        "categoria": genus,
        "altura_m": height_m,
        "peso_kg": weight_kg,
        "habilidades": abilities,
        "genero": genders,
        # Compatibilidade com frontend: fornecer efetividades com mesmo conteúdo
        "efetividades": {"defesa": mult.get("from", {}), "ataque": mult.get("to", {})},
        "multiplicadores": mult,  # { from: {type:factor}, to: {type:factor} }
        "evolucoes": evo_list,
        "evolutionEdges": evo_edges,
    }
    return result


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
            # buscar detalhe para preencher tipos e stats
            try:
                rd = s.get(f"{POKEAPI_BASE}/pokemon/{codigo}", timeout=20, verify=verify)
                rd.raise_for_status()
                norm = normalize_pokemon_detail(rd.json())
                page_items.append({
                    "codigo": codigo,
                    "nome": _localized_species_name(s, codigo, verify, fallback=item.get("name") or ""),
                    "tipos": norm.get("tipos", []),
                    "imagemUrl": norm.get("imagemUrl") or image_url_for(codigo),
                    "stats": norm.get("stats", {}),
                })
            except Exception:
                page_items.append({
                    "codigo": codigo,
                    "nome": _localized_species_name(s, codigo, verify, fallback=item.get("name") or ""),
                    "tipos": [],
                    "imagemUrl": image_url_for(codigo),
                })
        page_items.sort(key=lambda x: x.get("codigo") or 0)
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
        # Obtenha ID de todas as species para ordenar por código
        species_with_id: List[Tuple[int, str]] = []
        for sp_name in species_names:
            try:
                rs = s.get(f"{POKEAPI_BASE}/pokemon-species/{sp_name}", timeout=20, verify=verify)
                rs.raise_for_status()
                codigo = int(rs.json().get("id"))
                species_with_id.append((codigo, sp_name))
            except Exception:
                continue
        species_with_id.sort(key=lambda x: x[0])
        total = len(species_with_id)
        page_slice = species_with_id[offset: offset + limit]
        page_items: List[Dict] = []
        for codigo, sp_name in page_slice:
            try:
                rd = s.get(f"{POKEAPI_BASE}/pokemon/{codigo}", timeout=20, verify=verify)
                rd.raise_for_status()
                norm = normalize_pokemon_detail(rd.json())
                page_items.append({
                    "codigo": codigo,
                    "nome": _localized_species_name(s, codigo, verify, fallback=sp_name),
                    "tipos": norm.get("tipos", []),
                    "imagemUrl": norm.get("imagemUrl") or image_url_for(codigo),
                    "stats": norm.get("stats", {}),
                })
            except Exception:
                page_items.append({
                    "codigo": codigo,
                    "nome": _localized_species_name(s, codigo, verify, fallback=sp_name),
                    "tipos": [],
                    "imagemUrl": image_url_for(codigo),
                })
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
        base_list.sort(key=lambda x: x[0])
        total = len(base_list)
        page_slice = base_list[offset: offset + limit]
        page_items: List[Dict] = []
        for pk, nm in page_slice:
            try:
                rd = s.get(f"{POKEAPI_BASE}/pokemon/{pk}", timeout=20, verify=verify)
                rd.raise_for_status()
                norm = normalize_pokemon_detail(rd.json())
                page_items.append({
                    "codigo": pk,
                    "nome": _localized_species_name(s, pk, verify, fallback=nm),
                    "tipos": norm.get("tipos", []),
                    "imagemUrl": norm.get("imagemUrl") or image_url_for(pk),
                    "stats": norm.get("stats", {}),
                })
            except Exception:
                page_items.append({
                    "codigo": pk,
                    "nome": _localized_species_name(s, pk, verify, fallback=nm),
                    "tipos": [],
                    "imagemUrl": image_url_for(pk),
                })
        return total, page_items
