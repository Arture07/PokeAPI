import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Cria um usuário admin a partir de variáveis de ambiente (ADMIN_LOGIN, ADMIN_EMAIL, ADMIN_PASSWORD). Idempotente."

    def handle(self, *args, **kwargs):
        User = get_user_model()
        login = os.getenv('ADMIN_LOGIN')
        email = os.getenv('ADMIN_EMAIL')
        password = os.getenv('ADMIN_PASSWORD')
        if not (login and email and password):
            self.stdout.write("Variáveis ADMIN_LOGIN, ADMIN_EMAIL e ADMIN_PASSWORD não definidas. Pulando.")
            return
        u = User.objects.filter(login=login).first()
        if u:
            updated = []
            if not u.is_staff:
                u.is_staff = True
                updated.append('is_staff')
            if not u.is_superuser:
                u.is_superuser = True
                updated.append('is_superuser')
            if not u.is_active:
                u.is_active = True
                updated.append('is_active')
            if updated:
                u.save(update_fields=updated)
            self.stdout.write(self.style.SUCCESS(f"Admin '{login}' já existe. Atualizado: {', '.join(updated) if updated else 'nada'}."))
            return
        u = User.objects.create_superuser(login=login, email=email, password=password, name='Administrador')
        self.stdout.write(self.style.SUCCESS(f"Admin '{login}' criado."))
