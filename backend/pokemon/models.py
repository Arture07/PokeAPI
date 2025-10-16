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
    idTipoPokemon = models.ForeignKey(TipoPokemon, on_delete=models.PROTECT)

    codigo = models.IntegerField()  # Pokédex code/id from PokéAPI
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
