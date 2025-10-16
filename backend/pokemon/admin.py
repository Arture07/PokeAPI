from django.contrib import admin
from .models import TipoPokemon, PokemonUsuario, PokemonCache


@admin.register(TipoPokemon)
class TipoPokemonAdmin(admin.ModelAdmin):
    list_display = ("idTipoPokemon", "descricao")
    search_fields = ("descricao",)


@admin.register(PokemonUsuario)
class PokemonUsuarioAdmin(admin.ModelAdmin):
    list_display = ("idPokemonUsuario", "usuario", "codigo", "nome", "idTipoPokemon", "favorito", "grupoBatalha")
    list_filter = ("favorito", "grupoBatalha", "idTipoPokemon")
    search_fields = ("nome", "codigo", "usuario__login")


@admin.register(PokemonCache)
class PokemonCacheAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nome", "tipos", "imagemUrl", "dtAtualizado")
    search_fields = ("nome", "codigo")
