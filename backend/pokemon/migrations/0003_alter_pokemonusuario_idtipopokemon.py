from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pokemon', '0002_pokemoncache'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pokemonusuario',
            name='idTipoPokemon',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                to='pokemon.tipopokemon',
            ),
        ),
    ]
