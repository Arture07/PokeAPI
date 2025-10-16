from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from unittest.mock import patch


class PokemonApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # cria um usuário para possíveis testes autenticados no futuro
        User = get_user_model()
        self.user = User.objects.create_user(login="tester", email="t@example.com", password="Test@123", name="Tester")

    def test_health(self):
        resp = self.client.get("/health/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get("status"), "ok")

    def test_register_and_login(self):
        r = self.client.post("/auth/register/", {"login": "p2", "email": "p2@example.com", "password": "Aa@123456", "nome": "P2"}, format="json")
        self.assertEqual(r.status_code, 201)
        l = self.client.post("/auth/login/", {"login": "p2", "password": "Aa@123456"}, format="json")
        self.assertEqual(l.status_code, 200)
        self.assertIn("access", l.json())

    @patch("pokemon.views.list_by_generation_and_name", return_value=(2, [
        {"codigo": 1, "nome": "bulbasaur", "tipos": ["grass"], "imagemUrl": "u"},
    ]))
    def test_pokemon_list_public_endpoint_exists(self, _mock_list):
        # limit=1 deve retornar 1 item; offset=0
        resp = self.client.get("/pokemon/?limit=1&offset=0")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body.get("count"), 2)
        self.assertEqual(len(body.get("results") or []), 1)

    @patch("pokemon.views.get_pokemon_detail", return_value={"codigo": 1, "nome": "bulbasaur", "tipos": ["grass"], "imagemUrl": "u"})
    def test_pokemon_detail_public_endpoint_exists(self, _mock_detail):
        resp = self.client.get("/pokemon/1/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get("codigo"), 1)

    @patch("pokemon.views.get_pokemon_detail")
    def test_favorites_flow(self, mock_detail):
        mock_detail.side_effect = lambda codigo, **kwargs: {"codigo": int(codigo), "nome": f"poke{codigo}", "tipos": ["electric"], "imagemUrl": "img"}
        # autentica
        self.client.force_authenticate(user=self.user)
        # adiciona favorito
        r = self.client.post("/pokemon/favorites/", {"codigo": 25}, format="json")
        self.assertEqual(r.status_code, 201)
        # lista
        g = self.client.get("/pokemon/favorites/")
        self.assertEqual(g.status_code, 200)
        self.assertEqual(g.json().get("count"), 1)
        # remove
        d = self.client.delete("/pokemon/favorites/25/")
        self.assertEqual(d.status_code, 204)
        g2 = self.client.get("/pokemon/favorites/")
        self.assertEqual(g2.json().get("count"), 0)

    @patch("pokemon.views.get_pokemon_detail")
    def test_team_flow_with_limit(self, mock_detail):
        mock_detail.side_effect = lambda codigo, **kwargs: {"codigo": int(codigo), "nome": f"poke{codigo}", "tipos": ["normal"], "imagemUrl": "img"}
        self.client.force_authenticate(user=self.user)
        # adiciona 6
        for i in range(1, 7):
            r = self.client.post("/pokemon/team/", {"codigo": i}, format="json")
            self.assertEqual(r.status_code, 201)
        # sétimo deve falhar
        r7 = self.client.post("/pokemon/team/", {"codigo": 7}, format="json")
        self.assertEqual(r7.status_code, 400)
        # lista
        g = self.client.get("/pokemon/team/")
        self.assertEqual(g.status_code, 200)
        self.assertEqual(g.json().get("count"), 6)
        # remove um e ver 5
        d = self.client.delete("/pokemon/team/3/")
        self.assertEqual(d.status_code, 204)
        g2 = self.client.get("/pokemon/team/")
        self.assertEqual(g2.json().get("count"), 5)