from django.contrib import admin
from .models import TipoPokemon, PokemonUsuario


@admin.register(TipoPokemon)
class TipoPokemonAdmin(admin.ModelAdmin):
    list_display = ("idTipoPokemon", "descricao")
    search_fields = ("descricao",)


@admin.register(PokemonUsuario)
class PokemonUsuarioAdmin(admin.ModelAdmin):
    list_display = ("idPokemonUsuario", "usuario", "codigo", "nome", "idTipoPokemon", "favorito", "grupoBatalha")
    list_filter = ("favorito", "grupoBatalha", "idTipoPokemon")
    search_fields = ("nome", "codigo", "usuario__login")
