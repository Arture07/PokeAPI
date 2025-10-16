import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TipoPokemon',
            fields=[
                ('idTipoPokemon', models.AutoField(primary_key=True, serialize=False)),
                ('descricao', models.CharField(max_length=50, unique=True)),
            ],
            options={
                'verbose_name': 'Tipo de Pokémon',
                'verbose_name_plural': 'Tipos de Pokémon',
            },
        ),
        migrations.CreateModel(
            name='PokemonUsuario',
            fields=[
                ('idPokemonUsuario', models.AutoField(primary_key=True, serialize=False)),
                ('codigo', models.IntegerField()),
                ('imagemUrl', models.URLField(max_length=400)),
                ('nome', models.CharField(max_length=100)),
                ('grupoBatalha', models.BooleanField(default=False)),
                ('favorito', models.BooleanField(default=False)),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('idTipoPokemon', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='pokemon.tipopokemon')),
            ],
            options={
                'verbose_name': 'Pokémon do Usuário',
                'verbose_name_plural': 'Pokémon dos Usuários',
                'unique_together': {('usuario', 'codigo')},
            },
        ),
    ]
