from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Promove um usuário para staff/superuser pelo login"

    def add_arguments(self, parser):
        parser.add_argument('--login', required=True, help='Login do usuário')
        parser.add_argument('--staff', action='store_true', help='Tornar staff')
        parser.add_argument('--superuser', action='store_true', help='Tornar superuser')
        parser.add_argument('--active', action='store_true', help='Ativar usuário (is_active=True)')

    def handle(self, *args, **options):
        User = get_user_model()
        login = options['login']
        u = User.objects.filter(login=login).first()
        if not u:
            raise CommandError(f"Usuário com login '{login}' não encontrado")
        changed = []
        if options['staff'] and not u.is_staff:
            u.is_staff = True
            changed.append('is_staff')
        if options['superuser'] and not u.is_superuser:
            u.is_superuser = True
            changed.append('is_superuser')
        if options['active'] and not u.is_active:
            u.is_active = True
            changed.append('is_active')
        if changed:
            u.save(update_fields=changed)
        self.stdout.write(self.style.SUCCESS(f"Usuário '{login}' atualizado: {', '.join(changed) if changed else 'sem mudanças'}"))