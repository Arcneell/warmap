# Spécifications — Docker & Déploiement

## docker-compose.yml

```yaml
version: "3.8"

services:
  wardrove:
    build: .
    container_name: wardrove
    ports:
      - "8847:8000"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    environment:
      - TZ=Indian/Reunion
```

## Dockerfile

- Base image : `python:3.12-slim`
- Workdir : `/app`
- Installer les dépendances depuis `requirements.txt`
- Copier `app/` dans le container
- Créer `/app/data` pour la DB SQLite
- Servir avec uvicorn sur le port 8000
- FastAPI sert les fichiers statiques depuis `app/static/`

## requirements.txt

```
fastapi==0.115.6
uvicorn==0.34.0
python-multipart==0.0.20
aiosqlite==0.20.0
```

## Volume

Le dossier `./data` est monté en volume. Il contient :
- `wardrove.db` : la base SQLite (créée au premier lancement si absente)

## Routes FastAPI — Montage

- `app/static/` servi en `StaticFiles` sur `/` (fallback sur `index.html`)
- Les routes API montées sous `/api/`
- L'index.html est la SPA, servie pour toute route non-API

## Premier lancement

Au démarrage, si la DB n'existe pas :
1. Créer le fichier SQLite
2. Exécuter les CREATE TABLE
3. Prêt à recevoir des uploads

## Usage CLI pour upload automatisé

```bash
# Upload un fichier depuis la ligne de commande
curl -X POST http://localhost:8847/api/upload \
  -F "file=@20240115_WARHOG.wigle.csv"

# Réponse JSON
# {"session_id":1,"filename":"20240115_WARHOG.wigle.csv","imported":142,"updated":38,"skipped":5}

# Récupérer les stats
curl http://localhost:8847/api/stats

# Export GeoJSON
curl http://localhost:8847/api/accesspoints/geojson > export.geojson
```
