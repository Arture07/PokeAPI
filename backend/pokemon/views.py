from django.shortcuts import render
from typing import List
import requests
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import TipoPokemon
from .services import sync_types_from_pokeapi

POKEAPI_BASE = "https://pokeapi.co/api/v2"


@api_view(["POST"])  # temporário: facilitar seed em dev
@permission_classes([AllowAny])
def sync_tipos(request):
    try:
        verify_param = request.query_params.get("verify")
        verify = None
        if verify_param in ("0", "1"):
            verify = verify_param == "1"
        result = sync_types_from_pokeapi(verify_override=verify)
        return Response(result)
    except Exception as exc:
        return Response({"detail": f"Erro ao consultar PokéAPI: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
