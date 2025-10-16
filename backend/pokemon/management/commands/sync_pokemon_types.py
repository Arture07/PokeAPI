from django.core.management.base import BaseCommand
from pokemon.services import sync_types_from_pokeapi


class Command(BaseCommand):
    help = "Sincroniza tipos de Pokémon da PokéAPI para a tabela TipoPokemon (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument("--verify", choices=["0", "1"], help="Força verificação SSL (0/1). Se omitido, usa env POKEAPI_VERIFY_SSL.")

    def handle(self, *args, **options):
        verify_opt = options.get("verify")
        verify = None
        if verify_opt in ("0", "1"):
            verify = verify_opt == "1"
        result = sync_types_from_pokeapi(verify_override=verify)
        self.stdout.write(self.style.SUCCESS(f"Tipos: created={result['created']} existing={result['existing']} count={result['count']}"))
