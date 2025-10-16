from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    model = Usuario
    list_display = ("id", "login", "email", "nome", "is_active", "is_staff", "dtInclusao")
    list_filter = ("is_active", "is_staff")
    search_fields = ("login", "email", "nome")
    ordering = ("login",)

    fieldsets = (
        (None, {"fields": ("login", "password")}),
        ("Informações pessoais", {"fields": ("nome", "email")}),
        ("Permissões", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Datas", {"fields": ("last_login", "dtInclusao", "dtAlteracao")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("login", "email", "nome", "password1", "password2", "is_staff", "is_superuser", "is_active"),
            },
        ),
    )

    readonly_fields = ("dtInclusao", "dtAlteracao")
