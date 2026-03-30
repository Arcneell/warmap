# Spécifications techniques — Frontend

## Philosophie

SPA en un seul fichier `index.html` (avec CSS/JS inline ou fichiers séparés). Pas de framework JS, pas de build step. Le but c'est que ça reste simple à maintenir et à modifier.

## Librairies externes (CDN)

- **Leaflet** 1.9+ : carte interactive — `https://unpkg.com/leaflet/dist/leaflet.js`
- **Leaflet.markercluster** : clustering des markers — `https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js`
- **Chart.js** 4+ : graphiques stats — `https://cdn.jsdelivr.net/npm/chart.js`

## Layout

Layout en une seule page, deux zones principales :

```
┌──────────────────────────────────────────────────┐
│  HEADER — logo "Wardrove" + bouton upload        │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  SIDEBAR   │           CARTE LEAFLET             │
│  (stats +  │         (pleine hauteur)            │
│  filtres)  │                                     │
│            │                                     │
│  - Total   │                                     │
│  - Chart   │                                     │
│  - Filtres │                                     │
│  - Dernière│                                     │
│    session │                                     │
│            │                                     │
├────────────┴─────────────────────────────────────┤
│  (modal upload en overlay quand on clique)        │
└──────────────────────────────────────────────────┘
```

- Sidebar : largeur fixe ~320px, scrollable
- Carte : occupe tout l'espace restant
- Responsive : sur mobile, sidebar passe en dessous ou en drawer

## Design / Ambiance

Thème sombre, ambiance "terminal hacker" mais propre et lisible. Pas du vert matrix cringe, plutôt :

- Background : gris très foncé (`#0d1117` style GitHub dark)
- Texte principal : gris clair (`#e6edf3`)
- Accent primaire : vert-cyan froid (`#00d4aa`)
- Accent secondaire : orange chaud pour les warnings/WEP (`#f0883e`)
- Font monospace pour les données techniques (BSSID, canal) : `JetBrains Mono` ou `Fira Code` (Google Fonts)
- Font sans-serif pour les titres : `Space Grotesk` ou `DM Sans`
- Bordures et séparateurs : subtils, `rgba(255,255,255,0.1)`
- Cards dans la sidebar avec léger `backdrop-filter: blur` si possible

## Carte

### Initialisation
- Centrer sur les données si disponibles, sinon centre monde
- Zoom adapté aux bounds des AP affichés
- Tuiles : `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` (CartoDB Dark Matter, cohérent avec le thème sombre)

### Markers
- Utiliser `L.circleMarker` (plus léger et plus joli que des icônes) avec rayon 6-8px
- Couleurs par encryption :
  - WPA3 : `#00d4aa` (vert-cyan)
  - WPA2 : `#58a6ff` (bleu)
  - WPA : `#f0883e` (orange)
  - WEP : `#f85149` (rouge)
  - Open : `#8b949e` (gris)
  - Unknown : `#484f58` (gris foncé)
- MarkerCluster avec style custom qui reprend le thème sombre

### Popup
Au clic sur un marker, popup avec :
```
SSID: FreeWifi_secure
BSSID: AA:BB:CC:DD:EE:FF
Encryption: WPA2
Channel: 6
Signal: -45 dBm
First seen: 2024-01-15 14:30
Last seen: 2024-06-12 09:15
```

### Filtres
- Checkboxes dans la sidebar pour filtrer par type de chiffrement (tous cochés par défaut)
- Champ de recherche texte pour filtrer par SSID
- Les filtres rechargent le GeoJSON via l'API avec les query params appropriés

## Sidebar — Stats

### Compteur principal
Gros chiffre en accent : nombre total d'AP

### Chart encryption
Donut chart (Chart.js) avec les couleurs des markers. Légende intégrée.

### Top SSID
Liste des 10 SSID les plus fréquents avec leur count, style compact.

### Infos session
- Nombre total de sessions
- Date de la dernière session
- Petit historique : AP importés par session (sparkline ou mini bar chart)

## Modal Upload

- S'ouvre au clic sur le bouton "Upload" dans le header
- Zone de drag & drop + bouton "Browse"
- Accepte `.csv` et `.wigle.csv`
- Barre de progression pendant l'upload
- Après upload, affiche le résultat : `142 imported, 38 updated, 5 skipped`
- Bouton pour fermer et la carte se rafraîchit automatiquement

## Interactions

- Au chargement de la page : `GET /api/stats` pour la sidebar + `GET /api/accesspoints/geojson` pour la carte
- Quand un filtre change : re-fetch le GeoJSON avec les nouveaux params
- Après un upload : re-fetch stats + GeoJSON
- Tout en fetch asynchrone, pas de rechargement de page

## Comportement responsive

- En dessous de 768px : sidebar se collapse en un bouton hamburger, la carte prend toute la largeur
- Le modal upload reste centré
- Les popups Leaflet s'adaptent naturellement
