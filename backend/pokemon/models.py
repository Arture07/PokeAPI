from django.db import models
from django.conf import settings


class TipoPokemon(models.Model):
    idTipoPokemon = models.AutoField(primary_key=True)
    descricao = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = "Tipo de Pokémon"
        verbose_name_plural = "Tipos de Pokémon"

    def __str__(self):
        return self.descricao


class PokemonUsuario(models.Model):
    idPokemonUsuario = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    # Tornar opcional: um pokémon pode ter múltiplos tipos; aqui registramos um tipo principal se disponível
    idTipoPokemon = models.ForeignKey(TipoPokemon, on_delete=models.PROTECT, null=True, blank=True)

    codigo = models.IntegerField()  # Pokédex code/id de PokéAPI
    imagemUrl = models.URLField(max_length=400)
    nome = models.CharField(max_length=100)

    grupoBatalha = models.BooleanField(default=False)
    favorito = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Pokémon do Usuário"
        verbose_name_plural = "Pokémon dos Usuários"
        unique_together = ("usuario", "codigo")

    def __str__(self):
        return f"{self.nome} (#{self.codigo}) - {self.usuario}"


class PokemonCache(models.Model):
    """Cache simples para dados normalizados de Pokémon.
    Usado para reduzir chamadas à PokéAPI em listagens e buscas.
    """
    codigo = models.IntegerField(primary_key=True)
    nome = models.CharField(max_length=100)
    tipos = models.JSONField(default=list)
    imagemUrl = models.URLField(max_length=400)
    dtAtualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cache de Pokémon"
        verbose_name_plural = "Cache de Pokémon"

    def __str__(self):
        return f"{self.nome} (#{self.codigo})"
