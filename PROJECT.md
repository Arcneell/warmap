# Wardrove — Self-hosted Wardriving Map & Dashboard

## Vision

Remplacement self-hosted léger de WiGLE pour visualiser et archiver ses données de wardriving. Tourne dans un seul container Docker. Pensé pour recevoir les `.wigle.csv` d'un M5Stack Cardputer (firmware M5PORKCHOP, mode WARHOG) mais compatible avec tout outil qui exporte en WiGLE CSV v1.6.

## Stack technique

- **Backend** : Python 3.12 + FastAPI
- **Base de données** : SQLite (fichier monté en volume Docker pour persistance)
- **Frontend** : HTML/CSS/JS vanilla — Leaflet.js + OpenStreetMap pour la carte
- **Conteneurisation** : Un seul Dockerfile, un docker-compose.yml
- **Port par défaut** : 8847

## Fonctionnalités v1

### 1. Upload de fichiers CSV

- Interface web avec drag & drop ou bouton d'upload
- Accepte les fichiers `.wigle.csv` (format WiGLE CSV v1.6)
- Endpoint API REST `POST /api/upload` pour automatiser depuis un script (ex: curl)
- Parsing du header WiGLE (2 premières lignes = métadonnées, ligne 3 = noms de colonnes, reste = données)
- Dédoublonnage par BSSID : si un AP existe déjà, on met à jour si le nouveau signal (RSSI) est meilleur ou si de nouvelles infos sont disponibles
- Retour JSON avec le nombre d'AP importés / mis à jour / ignorés

### 2. Carte interactive

- Carte pleine page avec Leaflet.js + tuiles OpenStreetMap
- Marker clustering (plugin Leaflet MarkerCluster) pour les performances avec beaucoup d'AP
- Couleur des markers par type de chiffrement :
  - 🟢 Vert = WPA3
  - 🔵 Bleu = WPA2
  - 🟠 Orange = WPA
  - 🔴 Rouge = WEP
  - ⚫ Noir = Open (pas de chiffrement)
- Popup au clic sur un marker : SSID, BSSID, canal, RSSI, type de chiffrement, date de première/dernière observation
- Filtres sur la carte : par type de chiffrement, par SSID (recherche texte)

### 3. Dashboard / Stats

- Panneau latéral ou section au-dessus de la carte avec :
  - Nombre total d'AP uniques
  - Répartition par type de chiffrement (bar chart ou donut chart, utiliser Chart.js)
  - Top 10 des SSID les plus fréquents
  - Nombre de sessions d'upload
  - Nombre d'AP par session (historique)
  - Date de la dernière session

### 4. API REST

Endpoints :

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/upload` | Upload d'un fichier .wigle.csv, retourne stats d'import |
| `GET` | `/api/accesspoints` | Liste tous les AP (avec pagination, filtres optionnels) |
| `GET` | `/api/accesspoints/geojson` | Export GeoJSON de tous les AP (pour Leaflet) |
| `GET` | `/api/stats` | Stats globales (compteurs, répartition chiffrement) |
| `GET` | `/api/sessions` | Liste des sessions d'upload |
| `DELETE` | `/api/accesspoints/{id}` | Supprimer un AP |

## Structure du projet

```
wardrove/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── app/
│   ├── main.py              # FastAPI app, montage des routes et du static
│   ├── database.py           # Init SQLite, modèles, helpers
│   ├── parser.py             # Parsing du format WiGLE CSV v1.6
│   ├── routes/
│   │   ├── upload.py         # POST /api/upload
│   │   ├── accesspoints.py   # GET /api/accesspoints, geojson, DELETE
│   │   ├── stats.py          # GET /api/stats, /api/sessions
│   └── static/
│       ├── index.html        # SPA unique — carte + dashboard + upload
│       ├── style.css
│       └── app.js
├── data/
│   └── wardrove.db           # SQLite (monté en volume Docker)
```
