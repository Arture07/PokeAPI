from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from pokemon.views import (
    sync_tipos,
    list_pokemon,
    get_pokemon,
    get_pokemon_completo,
    favorites_view,
    favorites_detail_view,
    team_view,
    team_detail_view,
)


User = get_user_model()


def health_view(request):
    return JsonResponse({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    """Public endpoint to create a new user.
    Expected payload: {"login", "email", "password", "nome"}
    """
    data = request.data or {}
    login = data.get("login")
    email = data.get("email")
    password = data.get("password")
    nome = data.get("nome", "")

    if not login or not email or not password:
        return Response({"detail": "login, email e password são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(login=login).exists():
        return Response({"detail": "login já utilizado"}, status=status.HTTP_409_CONFLICT)
    if User.objects.filter(email=email).exists():
        return Response({"detail": "email já utilizado"}, status=status.HTTP_409_CONFLICT)

    user = User.objects.create_user(login=login, email=email, password=password, name=nome)
    return Response({"id": user.id, "login": user.login, "email": user.email, "nome": user.nome}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    return Response({
        "id": user.id,
        "login": user.login,
        "email": user.email,
        "nome": user.nome,
        "is_staff": bool(getattr(user, 'is_staff', False)),
        "is_superuser": bool(getattr(user, 'is_superuser', False)),
        "is_active": bool(getattr(user, 'is_active', True)),
    })


@api_view(["PATCH"])  # atualiza nome/email do próprio usuário
@permission_classes([IsAuthenticated])
def me_update_view(request):
    user = request.user
    data = request.data or {}
    nome = data.get("nome")
    email = data.get("email")
    updates = []
    if nome is not None:
        user.nome = str(nome)
        updates.append('nome')
    if email is not None:
        user.email = str(email)
        updates.append('email')
    if updates:
        user.save(update_fields=updates)
    return Response({"detail": "Atualizado", "updated": updates})


@api_view(["POST"])  # troca de senha do próprio usuário
@permission_classes([IsAuthenticated])
def change_password_view(request):
    user = request.user
    data = request.data or {}
    current = data.get('current_password')
    new = data.get('new_password')
    if not current or not new:
        return Response({"detail": "current_password e new_password são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)
    if not user.check_password(current):
        return Response({"detail": "Senha atual inválida"}, status=status.HTTP_400_BAD_REQUEST)
    if len(str(new)) < 8:
        return Response({"detail": "Nova senha muito curta (mín. 8)"}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(str(new))
    user.save(update_fields=['password'])
    return Response({"detail": "Senha alterada"})


@api_view(["GET"])  # lista simples de usuários (apenas staff)
@permission_classes([IsAdminUser])
def users_list_view(request):
    qs = User.objects.all().order_by('id')[:200]
    return Response([
        {"id": u.id, "login": u.login, "email": u.email, "nome": u.nome, "is_active": u.is_active}
        for u in qs
    ])


@api_view(["PATCH", "GET"])  # detalhe e atualização simples de usuário (apenas staff)
@permission_classes([IsAdminUser])
def users_detail_view(request, user_id: int):
    u = User.objects.filter(id=user_id).first()
    if not u:
        return Response({"detail": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        return Response({
            "id": u.id, "login": u.login, "email": u.email, "nome": u.nome,
            "is_active": u.is_active, "is_staff": u.is_staff, "is_superuser": u.is_superuser
        })
    data = request.data or {}
    # Permitimos atualização de nome, email e is_active
    nome = data.get("nome")
    email = data.get("email")
    is_active = data.get("is_active")
    updates = []
    if nome is not None:
        u.nome = str(nome)
        updates.append('nome')
    if email is not None:
        u.email = str(email)
        updates.append('email')
    if is_active is not None:
        u.is_active = bool(is_active)
        updates.append('is_active')
    if updates:
        u.save(update_fields=updates)
    return Response({"detail": "Atualizado", "updated": updates})


@api_view(["POST"])  # reset de senha administrativo (apenas staff)
@permission_classes([IsAdminUser])
def admin_reset_user_password(request, user_id: int):
    u = User.objects.filter(id=user_id).first()
    if not u:
        return Response({"detail": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND)
    new_password = (request.data or {}).get('new_password')
    if not new_password or len(str(new_password)) < 8:
        return Response({"detail": "new_password é obrigatório (mín. 8 caracteres)"}, status=status.HTTP_400_BAD_REQUEST)
    u.set_password(str(new_password))
    u.save(update_fields=['password'])
    return Response({"detail": "Senha redefinida"})


@api_view(["POST"])  # inicia reset emitindo token (dev)
@permission_classes([AllowAny])
def request_password_reset_token(request):
    login = (request.data or {}).get('login')
    if not login:
        return Response({"detail": "login é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.filter(login=login).first()
    if not user:
        # não revela existência para segurança básica
        return Response({"detail": "Se o usuário existir, um token foi gerado."})
    token = default_token_generator.make_token(user)
    return Response({"login": login, "token": token})


@api_view(["POST"])  # confirma reset trocando a senha
@permission_classes([AllowAny])
def confirm_password_reset(request):
    data = request.data or {}
    login = data.get('login')
    token = data.get('token')
    new_password = data.get('new_password')
    if not all([login, token, new_password]):
        return Response({"detail": "login, token e new_password são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.filter(login=login).first()
    if not user or not default_token_generator.check_token(user, token):
        return Response({"detail": "Token inválido"}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.save(update_fields=['password'])
    return Response({"detail": "Senha redefinida com sucesso"})


api_urlpatterns = [
    path('health/', health_view, name='health'),
    # auth
    path('auth/register/', register_view, name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', me_view, name='me'),
    path('auth/me/update/', me_update_view, name='me_update'),
    path('auth/change-password/', change_password_view, name='change_password'),

    # pokemon (dev helper + listagem)
    path('pokemon/sync-types/', sync_tipos, name='pokemon_sync_types'),
    path('pokemon/', list_pokemon, name='pokemon_list'),
    path('pokemon/<int:codigo>/', get_pokemon, name='pokemon_detail'),
    path('pokemon/<int:codigo>/full/', get_pokemon_completo, name='pokemon_detail_full'),

    # favoritos
    path('pokemon/favorites/', favorites_view, name='pokemon_favorites'),
    path('pokemon/favorites/<int:codigo>/', favorites_detail_view, name='pokemon_favorites_detail'),

    # equipe de batalha
    path('pokemon/team/', team_view, name='pokemon_team'),
    path('pokemon/team/<int:codigo>/', team_detail_view, name='pokemon_team_detail'),

    # Diferenciais: gestão simples de usuários e reset de senha (fluxo dev-friendly)
    path('admin/users/', users_list_view, name='admin_users_list'),
    path('admin/users/<int:user_id>/', users_detail_view, name='admin_users_detail'),
    path('admin/users/<int:user_id>/reset-password/', admin_reset_user_password, name='admin_users_reset_password'),
    path('auth/reset-password/', request_password_reset_token, name='request_password_reset_token'),
    path('auth/reset-password/confirm/', confirm_password_reset, name='confirm_password_reset'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    # sem prefixo (retrocompatibilidade)
    path('', include(api_urlpatterns)),
    # com prefixo /api
    path('api/', include((api_urlpatterns, 'api'), namespace='api')),
]
