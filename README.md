# Wardrove

Self-hosted wardriving map & dashboard. Remplacement léger de WiGLE pour ton homelab.

## Pour l'agent de code

Ce dossier contient les specs complètes du projet. Lis les fichiers dans cet ordre :

1. **PROJECT.md** — Vue d'ensemble, stack, features, structure du projet
2. **BACKEND.md** — Schéma DB SQLite, logique de parsing WiGLE CSV v1.6, dédoublonnage, API REST détaillée
3. **FRONTEND.md** — Layout, design (thème sombre), carte Leaflet, sidebar stats, modal upload, interactions
4. **DOCKER.md** — docker-compose, Dockerfile, volume, commandes CLI d'usage

Le fichier `sample_data.wigle.csv` est un exemple réaliste du format d'entrée (coordonnées à La Réunion) pour tester le parser.

## Quick start attendu

```bash
docker compose up -d --build
# → http://localhost:8847
```
