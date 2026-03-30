# Spécifications techniques — Backend

## Base de données SQLite

### Table `access_points`

```sql
CREATE TABLE access_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bssid TEXT UNIQUE NOT NULL,          -- MAC address (clé de dédoublonnage)
    ssid TEXT DEFAULT '',                 -- nom du réseau
    encryption TEXT DEFAULT 'Unknown',    -- WPA3, WPA2, WPA, WEP, Open, Unknown
    channel INTEGER DEFAULT 0,
    rssi INTEGER DEFAULT -100,            -- meilleur signal observé
    latitude REAL DEFAULT 0.0,
    longitude REAL DEFAULT 0.0,
    first_seen TEXT NOT NULL,             -- ISO 8601
    last_seen TEXT NOT NULL,              -- ISO 8601
    device_type TEXT DEFAULT 'WIFI',      -- WIFI, BT, BLE, CELL
    session_id INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX idx_bssid ON access_points(bssid);
CREATE INDEX idx_encryption ON access_points(encryption);
CREATE INDEX idx_coords ON access_points(latitude, longitude);
```

### Table `sessions`

```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,            -- ISO 8601
    ap_imported INTEGER DEFAULT 0,
    ap_updated INTEGER DEFAULT 0,
    ap_skipped INTEGER DEFAULT 0
);
```

## Parsing du WiGLE CSV v1.6

Le format est le suivant :

```
WigleWifi-1.6,appRelease=...,model=...,release=...,device=...,display=...,board=...,brand=...
MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
aa:bb:cc:dd:ee:ff,MonReseau,[WPA2-PSK-CCMP][ESS],2024-01-15 14:30:00,6,-45,48.8566,2.3522,35.0,10.0,WIFI
```

### Règles de parsing

- **Ligne 1** : header WiGLE avec métadonnées de l'appareil → ignorer ou stocker dans la session
- **Ligne 2** : noms des colonnes → utiliser pour mapper les champs
- **Lignes 3+** : données AP, une par ligne

### Mapping des colonnes

| Colonne CSV | Champ DB | Transformation |
|-------------|----------|----------------|
| `MAC` | `bssid` | Uppercase, trim |
| `SSID` | `ssid` | Trim |
| `AuthMode` | `encryption` | Parser `[WPA2-...]` → catégorie simplifiée (voir ci-dessous) |
| `FirstSeen` | `first_seen` / `last_seen` | Parse datetime |
| `Channel` | `channel` | Integer |
| `RSSI` | `rssi` | Integer (négatif, en dBm) |
| `CurrentLatitude` | `latitude` | Float |
| `CurrentLongitude` | `longitude` | Float |
| `Type` | `device_type` | WIFI, BT, BLE, CELL |

### Normalisation du chiffrement (`AuthMode`)

Le champ AuthMode WiGLE ressemble à `[WPA2-PSK-CCMP][RSN-PSK-CCMP][ESS]` ou `[WEP][ESS]` ou juste `[ESS]`.

Logique de classification (par priorité) :

1. Contient `WPA3` ou `SAE` → `WPA3`
2. Contient `WPA2` ou `RSN` → `WPA2`
3. Contient `WPA` (mais pas WPA2/WPA3) → `WPA`
4. Contient `WEP` → `WEP`
5. Ne contient aucun des précédents (ou juste `[ESS]`, `[IBSS]`) → `Open`
6. Champ vide ou non parsable → `Unknown`

### Logique de dédoublonnage

À l'import, pour chaque AP dans le CSV :

1. Chercher en base par `bssid`
2. Si **n'existe pas** → INSERT (nouveau)
3. Si **existe** :
   - Mettre à jour `last_seen` si la date du CSV est plus récente
   - Mettre à jour `rssi` si le nouveau signal est meilleur (plus proche de 0)
   - Mettre à jour `latitude`/`longitude` seulement si le nouveau RSSI est meilleur (position plus fiable)
   - Mettre à jour `ssid` si l'ancien était vide et le nouveau ne l'est pas
   - Mettre à jour `encryption` si l'ancien était `Unknown`
   - Compter comme "updated"
4. Si les coordonnées sont `0.0, 0.0` → ignorer cet AP (pas de fix GPS)

## API REST — Détails

### `POST /api/upload`

- Content-Type: `multipart/form-data`
- Champ: `file` (le .wigle.csv)
- Réponse 200 :
```json
{
  "session_id": 12,
  "filename": "20240115_WARHOG.wigle.csv",
  "imported": 142,
  "updated": 38,
  "skipped": 5
}
```

### `GET /api/accesspoints`

- Query params optionnels : `encryption=WPA2`, `ssid=MonRes`, `limit=100`, `offset=0`
- Réponse : tableau JSON d'AP

### `GET /api/accesspoints/geojson`

- Query params optionnels : mêmes filtres
- Réponse : FeatureCollection GeoJSON standard, chaque Feature = un AP avec properties (ssid, encryption, rssi, channel, etc.)
- C'est cet endpoint que Leaflet consomme pour afficher les markers

### `GET /api/stats`

- Réponse :
```json
{
  "total_aps": 3847,
  "by_encryption": {
    "WPA3": 120,
    "WPA2": 2890,
    "WPA": 340,
    "WEP": 42,
    "Open": 410,
    "Unknown": 45
  },
  "top_ssids": [
    {"ssid": "Freebox-XXXX", "count": 12},
    ...
  ],
  "total_sessions": 8,
  "last_session": "2024-06-15T18:30:00"
}
```

### `GET /api/sessions`

- Réponse : tableau de sessions avec stats par session

### `DELETE /api/accesspoints/{id}`

- Supprime un AP par son ID
- Réponse 204 No Content
