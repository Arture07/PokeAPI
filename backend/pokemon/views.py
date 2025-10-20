from typing import List
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import TipoPokemon, PokemonUsuario
from .services import sync_types_from_pokeapi, list_by_generation_and_name, get_pokemon_detail, get_pokemon_full
from django.conf import settings
from rest_framework import serializers

POKEAPI_BASE = "https://pokeapi.co/api/v2"


@api_view(["POST"])  # temporário: facilitar seed em dev
@permission_classes([AllowAny])
def sync_tipos(request):
    # Gate por DEBUG para evitar uso em produção
    if not settings.DEBUG:
        return Response({"detail": "Rota desabilitada em produção"}, status=status.HTTP_404_NOT_FOUND)
    try:
        verify_param = request.query_params.get("verify")
        verify = None
        if verify_param in ("0", "1"):
            verify = verify_param == "1"
        result = sync_types_from_pokeapi(verify_override=verify)
        return Response(result)
    except Exception as exc:
        return Response({"detail": f"Erro ao consultar PokéAPI: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)


class PokemonListQuery(serializers.Serializer):
    generation = serializers.IntegerField(required=False, min_value=1)
    name = serializers.CharField(required=False, allow_blank=True)
    limit = serializers.IntegerField(required=False, min_value=1)
    offset = serializers.IntegerField(required=False, min_value=0)
    verify = serializers.ChoiceField(required=False, choices=["0", "1"])


@api_view(["GET"])  # público para a listagem
@permission_classes([AllowAny])
def list_pokemon(request):
    q = PokemonListQuery(data=request.query_params)
    if not q.is_valid():
        return Response(q.errors, status=status.HTTP_400_BAD_REQUEST)

    data = q.validated_data
    generation = data.get("generation")
    name = data.get("name")
    limit = data.get("limit", getattr(settings, 'DEFAULT_POKEMON_LIMIT', 20))
    offset = data.get("offset", 0)
    max_limit = getattr(settings, 'MAX_POKEMON_LIMIT', 100)
    if limit > max_limit:
        return Response({"detail": f"limit máximo é {max_limit}"}, status=status.HTTP_400_BAD_REQUEST)

    verify_flag = None
    if data.get("verify") in ("0", "1"):
        verify_flag = data["verify"] == "1"

    try:
        total, results = list_by_generation_and_name(generation, name, limit, offset, verify_override=verify_flag)
        return Response({"count": total, "results": results})
    except Exception as exc:
        return Response({"detail": f"Erro ao listar Pokémon: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(["GET"])  # público
@permission_classes([AllowAny])
def get_pokemon(request, codigo: int):
    try:
        verify_param = request.query_params.get("verify")
        verify = None
        if verify_param in ("0", "1"):
            verify = verify_param == "1"
        data = get_pokemon_detail(codigo, verify_override=verify)
        return Response(data)
    except Exception as exc:
        return Response({"detail": f"Erro ao consultar PokéAPI: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(["GET"])  # público
@permission_classes([AllowAny])
def get_pokemon_completo(request, codigo: int):
    try:
        verify_param = request.query_params.get("verify")
        verify = None
        if verify_param in ("0", "1"):
            verify = verify_param == "1"
        data = get_pokemon_full(codigo, verify_override=verify)
        return Response(data)
    except Exception as exc:
        return Response({"detail": f"Erro ao consultar PokéAPI: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)


# ---- Favoritos ----
class CodigoBody(serializers.Serializer):
    codigo = serializers.IntegerField(min_value=1)


@api_view(["GET", "POST"])  # autenticado
@permission_classes([IsAuthenticated])
def favorites_view(request):
    user = request.user
    if request.method == "GET":
        qs = PokemonUsuario.objects.filter(usuario=user, favorito=True)
        results: List[dict] = []
        for pu in qs:
            try:
                det = get_pokemon_detail(pu.codigo)
            except Exception:
                det = {"codigo": pu.codigo, "nome": pu.nome, "tipos": [], "imagemUrl": pu.imagemUrl}
            results.append(det)
        return Response({"count": len(results), "results": results})

    # POST
    ser = CodigoBody(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    codigo = ser.validated_data["codigo"]

    try:
        det = get_pokemon_detail(codigo)
        tipo_nome = (det.get("tipos") or [None])[0]
        tipo_obj = None
        if tipo_nome:
            tipo_obj, _ = TipoPokemon.objects.get_or_create(descricao=tipo_nome)
        pu, _created = PokemonUsuario.objects.update_or_create(
            usuario=user,
            codigo=codigo,
            defaults={
                "nome": det.get("nome") or "",
                "imagemUrl": det.get("imagemUrl") or "",
                "idTipoPokemon": tipo_obj,
                "favorito": True,
            },
        )
        return Response(det, status=status.HTTP_201_CREATED)
    except Exception as exc:
        return Response({"detail": f"Não foi possível favoritar: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(["DELETE"])  # autenticado
@permission_classes([IsAuthenticated])
def favorites_detail_view(request, codigo: int):
    user = request.user
    try:
        pu = PokemonUsuario.objects.filter(usuario=user, codigo=codigo).first()
        if not pu:
            return Response(status=status.HTTP_204_NO_CONTENT)
        pu.favorito = False
        if not pu.grupoBatalha:
            pu.delete()
        else:
            pu.save(update_fields=["favorito"])
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Exception as exc:
        return Response({"detail": f"Erro ao remover favorito: {exc}"}, status=status.HTTP_400_BAD_REQUEST)


# ---- Equipe de batalha ----
MAX_TEAM = 6


@api_view(["GET", "POST"])  # autenticado
@permission_classes([IsAuthenticated])
def team_view(request):
    user = request.user
    if request.method == "GET":
        qs = PokemonUsuario.objects.filter(usuario=user, grupoBatalha=True)
        results: List[dict] = []
        for pu in qs:
            try:
                det = get_pokemon_detail(pu.codigo)
            except Exception:
                det = {"codigo": pu.codigo, "nome": pu.nome, "tipos": [], "imagemUrl": pu.imagemUrl}
            results.append(det)
        return Response({"count": len(results), "results": results})

    # POST add
    ser = CodigoBody(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    codigo = ser.validated_data["codigo"]

    # enforce max 6
    atual = PokemonUsuario.objects.filter(usuario=user, grupoBatalha=True).count()
    if atual >= MAX_TEAM:
        return Response({"detail": f"Equipe cheia. Máximo {MAX_TEAM}."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        det = get_pokemon_detail(codigo)
        tipo_nome = (det.get("tipos") or [None])[0]
        tipo_obj = None
        if tipo_nome:
            tipo_obj, _ = TipoPokemon.objects.get_or_create(descricao=tipo_nome)
        pu, _created = PokemonUsuario.objects.update_or_create(
            usuario=user,
            codigo=codigo,
            defaults={
                "nome": det.get("nome") or "",
                "imagemUrl": det.get("imagemUrl") or "",
                "idTipoPokemon": tipo_obj,
                "grupoBatalha": True,
            },
        )
        # If it already existed as favorite-only, we just toggled grupoBatalha True above
        return Response(det, status=status.HTTP_201_CREATED)
    except Exception as exc:
        return Response({"detail": f"Não foi possível adicionar à equipe: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(["DELETE"])  # autenticado
@permission_classes([IsAuthenticated])
def team_detail_view(request, codigo: int):
    user = request.user
    try:
        pu = PokemonUsuario.objects.filter(usuario=user, codigo=codigo).first()
        if not pu:
            return Response(status=status.HTTP_204_NO_CONTENT)
        pu.grupoBatalha = False
        if not pu.favorito:
            pu.delete()
        else:
            pu.save(update_fields=["grupoBatalha"])
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Exception as exc:
        return Response({"detail": f"Erro ao remover da equipe: {exc}"}, status=status.HTTP_400_BAD_REQUEST)
