from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
)


class UsuarioManager(BaseUserManager):
    def create_user(self, login, email, password=None, name=None, **extra_fields):
        if not login:
            raise ValueError("O login é obrigatório")
        if not email:
            raise ValueError("O email é obrigatório")
        email = self.normalize_email(email)
        # Evitar conflito: quando REQUIRED_FIELDS inclui 'nome', o createsuperuser
        # envia 'nome' dentro de extra_fields. Removemos de extra_fields e priorizamos
        # esse valor em relação ao parâmetro 'name'.
        nome_from_extra = extra_fields.pop("nome", None)
        final_nome = nome_from_extra if nome_from_extra is not None else name
        user = self.model(login=login, email=email, nome=final_nome or "", **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, login, email, password, name=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(login, email, password, name=name, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    """Usuário customizado conforme diagrama do desafio.

    Campos principais:
    - nome
    - login (único) -> será usado como USERNAME_FIELD
    - email (único)
    - senha (herdado de AbstractBaseUser)
    - dtInclusao / dtAlteracao
    - is_active / is_staff (requisitos do admin Django)
    """

    nome = models.CharField(max_length=150)
    login = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)

    dtInclusao = models.DateTimeField(auto_now_add=True)
    dtAlteracao = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = "login"
    REQUIRED_FIELDS = ["email", "nome"]

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

    def __str__(self) -> str:
        return self.login
