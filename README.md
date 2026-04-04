# GSB-Doctors

Application web de gestion des visites médicales pour les visiteurs pharmaceutiques du laboratoire **GSB (Galaxy Swiss Bourdin)**.

---

## Présentation

Les visiteurs médicaux utilisent cette application pour :

- Consulter la liste complète des médecins
- Créer, modifier et supprimer des rapports de visite
- Associer des échantillons de médicaments à chaque visite (avec quantités)
- Accéder à un tableau de bord récapitulatif de leur activité

---

## Prérequis

| Outil | Version minimum |
|-------|----------------|
| Node.js | 20.x |
| npm | 9.x |
| Docker + Docker Compose | 24.x |
| Angular CLI | 17.x (`npm install -g @angular/cli`) |

---

## Installation et démarrage

### 1. Cloner le dépôt

```bash
git clone https://github.com/DevDmCh214/GSB-doctors.git
cd GSB-doctors
```

### 2. Lancer la base de données MySQL

> Vérifiez que vous avez lancé docker.

```bash
docker-compose up -d
```

> MySQL 8 démarre sur le port **3306**. Les identifiants sont définis dans `docker-compose.yml` (`gsb / gsb`).

### 3. Configurer le backend

```bash
cd backend
npm install
```

Copier .env.exemple dans /backend et le renommer en .env
Variables d'environnement (`.env`) :

```env
DATABASE_URL="mysql://gsb:gsb@localhost:3306/gsbrapports"
JWT_SECRET=change_me_in_production
PORT=3001
```

### 4. Initialiser la base de données

```bash
cd backend

# Peupler la base avec les données de démonstration et créer les tables
node prisma/seed.js

# Générer le client Prisma à partir du schéma
npx prisma generate
```

Le script `seed.js` :
1. Charge le dump SQL complet (`/sql/sql.sql`) dans la base
2. Élargit la colonne `visiteur.mdp` à `CHAR(60)` pour accueillir les hachages bcrypt
3. Crée les tables `session`, `connexions` et `audit_log` (avec triggers)
4. Attribue un mot de passe unique à chaque utilisateur principal (voir tableau ci-dessous)
5. Les autres utilisateurs reçoivent le mot de passe par défaut `Gsb_User!01`
6. Affiche un tableau récapitulatif des identifiants


### 5. Générer les certificats HTTPS

```bash
cd GSB-doctors
node certs/generate.js
```

Le script génère `certs/key.pem` et `certs/cert.pem` (certificat auto-signé pour `localhost`, valide 365 jours).  
Il utilise `openssl` s'il est disponible (inclus dans Git Bash), sinon un générateur Node.js intégré.  
Si les fichiers existent déjà, le script ne les régénère pas.

### 6. Démarrer le backend

```bash
cd backend
node src/index.js
# → Backend running on https://localhost:3001
```


> **Vérifier le HTTPS :** ouvrir `https://localhost:3001/api/health` dans le navigateur.  
> Le navigateur affichera un avertissement de certificat auto-signé — c'est la preuve que la connexion est bien chiffrée via TLS.  
> Cliquer sur l'icône du cadenas pour inspecter le certificat (CN=localhost).  
> Une requête en `http://localhost:3001` échouera car le serveur ne sert que du HTTPS.


### 7. Démarrer le frontend

```bash
cd frontend
npm install
ng serve
# → http://localhost:4200
```

> Le frontend utilise un **proxy Angular** (`proxy.conf.json`) qui redirige les appels `/api` vers `https://localhost:3001`.  
> Le navigateur ne voit jamais le certificat auto-signé — aucune alerte de sécurité.

---

## Tests

### Backend (Jest + Supertest) — 58 tests

```bash
cd backend
npm test
```

Tests couverts :
- Authentification : login (identifiants invalides, valides), register (validations : nom, prénom, politique mot de passe, cp, login unique, longueur max, inscription sans champs optionnels)
- Sessions : création à la connexion et à l'inscription, rejet si session inactive ou expirée, accès autorisé si session valide, invalidation au logout
- Connexions / Rate limiting : enregistrement des tentatives échouées (avec/sans visiteur), enregistrement des tentatives réussies, blocage après 5 échecs (429), déblocage après expiration du timeout, déclenchement du blocage à la 5e tentative
- Rapports : validation POST (champs requis, longueurs, date invalide, échantillons), GET detail (404, 403, 200), DELETE (404, 403)
- Médecins : PATCH validation (adresse requise, trop longue, tel invalide, succès), DELETE (404, succès)
- Middleware auth : 401 sans cookie, 401 avec token invalide, 401 si session expirée
- HTTPS : présence et validité des certificats PEM, réponse du serveur HTTPS, flag `Secure` sur les cookies de login et logout, flag `HttpOnly`
- Health check

### Frontend (Karma + Jasmine) — 15 tests

```bash
cd frontend
ng test --watch=false --browsers=ChromeHeadless
```

Tests couverts :
- AppComponent : création, rendu navbar
- AuthService : état initial, login, logout, me, register (requêtes HTTP + état BehaviorSubject)
- RapportService : getRapports, getRapportById, createRapport, deleteRapport, passage des paramètres de recherche

---

## Identifiants de démonstration

| Login | Mot de passe |
|-------|-------------|
| aribiA | `Gsb@2025!a` |
| ltusseau | `Pharma#L8x` |
| fdaburon | `Visite$F94` | 
| fdudouit | `Rapport&D7` |

> Tous les autres utilisateurs ont le mot de passe : `Gsb_User!01`  
> La liste complète des logins se trouve dans le bloc `INSERT INTO visiteur` du fichier `sql/sql.sql`.

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | Angular 17 (standalone components, pas de NgModules) |
| Styles | Tailwind CSS |
| Backend | Express.js (Node 20) |
| Base de données | MySQL 8 via Docker |
| ORM | Prisma 5 (mode `db pull`, pas de migrations) |
| Authentification | JWT + sessions serveur (cookie httpOnly, expiration 30 min) |
| Hachage des mots de passe | bcrypt (haché et salé individuellement) |
| Protection brute-force | Table `connexions` + blocage IP après 5 échecs (30 s) |
| HTTPS | Certificat auto-signé pour le développement, proxy Angular pour éviter les alertes navigateur |
| Communication HTTP | Angular HttpClient + services injectables via proxy `/api` → `https://localhost:3001` |

---

## Structure du projet

```
GSB-doctors/
│
├── docker-compose.yml          # MySQL 8 en conteneur
├── certs/
│   ├── generate.js             # Script de génération des certificats auto-signés
│   ├── key.pem                 # Clé privée RSA (générée)
│   └── cert.pem                # Certificat auto-signé pour localhost (généré)
├── sql/
│   ├── sql.sql                 # Dump complet de la base gsbrapports
│   ├── audit_log.sql           # Définition de la table audit_log
│   ├── session.sql             # Définition de la table session
│   └── connexions.sql          # Définition de la table connexions
│
├── backend/
│   ├── .env                    # Variables d'environnement (non versionné)
│   ├── .env.example            # Modèle de configuration
│   ├── src/
│   │   ├── index.js            # Point d'entrée HTTPS (charge les certificats, démarre le serveur)
│   │   ├── middleware/
│   │   │   └── auth.js         # Middleware JWT : vérifie le cookie, injecte req.visiteur
│   │   ├── lib/
│   │   │   └── prisma.js       # Singleton Prisma Client
│   │   └── routes/
│   │       ├── auth.js         # POST login / register / logout, GET me
│   │       ├── medecins.js     # GET /medecins, GET /medecins/:id
│   │       ├── rapports.js     # CRUD /rapports
│   │       ├── medicaments.js  # GET /medicaments, GET /medicaments/:id
│   │       └── dashboard.js    # GET /dashboard
│   └── prisma/
│       ├── schema.prisma       # Schéma introspécté (ne pas modifier manuellement)
│       └── seed.js             # Script d'initialisation des données
│
├── frontend/
│   ├── proxy.conf.json         # Proxy Angular : /api → https://localhost:3001
│   └── src/app/
│       ├── app.component.ts    # Racine : navbar + router-outlet
│       ├── app.config.ts       # Bootstrap Angular (APP_INITIALIZER, intercepteur)
│       ├── app.routes.ts       # Toutes les routes avec AuthGuard
│       ├── core/
│       │   ├── guards/
│       │   │   └── auth.guard.ts           # Redirige vers /login si non connecté
│       │   ├── interceptors/
│       │   │   └── auth.interceptor.ts     # withCredentials + redirect 401 → /login
│       │   └── services/
│       │       ├── auth.service.ts         # BehaviorSubject visiteur, login/logout/me
│       │       ├── dashboard.service.ts    # GET /api/dashboard
│       │       ├── medecin.service.ts      # GET /api/medecins[/:id]
│       │       ├── rapport.service.ts      # CRUD /api/rapports
│       │       └── medicament.service.ts   # GET /api/medicaments[/:id]
│       ├── features/
│       │   ├── auth/
│       │   │   ├── login.component.ts      # Page /login
│       │   │   └── register.component.ts   # Page /register
│       │   ├── dashboard/
│       │   │   └── dashboard.component.ts  # Page / (tableau de bord)
│       │   ├── medecins/
│       │   │   ├── medecins.component.ts           # Page /medecins
│       │   │   └── doctor-detail-modal.component.ts # Modal détail médecin
│       │   └── rapports/
│       │       ├── rapport-detail.component.ts      # Page /rapports/:id
│       │       ├── rapport-form.component.ts        # Pages /rapports/new et /rapports/:id/edit
│       │       └── medicament-detail-modal.component.ts # Popup détail médicament
│       └── shared/
│           └── navbar/
│               └── navbar.component.ts     # Barre de navigation
│
└── docs/
    └── screenshots/            # Maquettes de référence (wireframes PNG)
```

---

## Documentation de l'API

Base URL : `https://localhost:3001`

Toutes les routes protégées nécessitent un cookie JWT valide (`token`).  
Les erreurs retournent toujours : `{ "error": "Message en français" }` + code HTTP approprié.

---

### Authentification

#### `POST /api/auth/login`
Connexion d'un visiteur. Pose le cookie httpOnly `token`.

```json
// Corps de la requête
{ "login": "aribiA", "mdp": "Gsb@2025!a" }

// Réponse 200
{ "visiteur": { "id": "a131", "nom": "Arbi", "prenom": "Amélie", "cp": "46000" } }
```

#### `POST /api/auth/register`
Inscription d'un nouveau visiteur. Les champs `adresse`, `cp`, `ville` et `dateEmbauche` sont optionnels.

**Politique de mot de passe :** le mot de passe doit respecter toutes les règles suivantes :
- Au moins **8 caractères**
- Au moins une **lettre minuscule** (a-z)
- Au moins une **lettre majuscule** (A-Z)
- Au moins un **chiffre** (0-9)
- Au moins un **caractère spécial** (ex. `!@#$%^&*`)

Les mots de passe sont **hachés et salés** individuellement avec bcrypt (10 rounds) avant stockage en base.

```json
// Corps
{
  "nom": "Dupont", "prenom": "Jean", "login": "jdupont",
  "mdp": "MonPass1!", "adresse": "1 rue de la Paix",
  "cp": "75001", "ville": "Paris", "dateEmbauche": "2024-01-15"
}
// Réponse 201 : même forme que login
```

#### `POST /api/auth/logout`
Efface le cookie. Réponse : `{ "success": true }`

#### `GET /api/auth/me`
Retourne le visiteur connecté. Utilisé à l'initialisation de l'app Angular.

---

### Médecins

#### `GET /api/medecins`
Liste des médecins avec filtres optionnels.

| Paramètre | Type | Description |
|-----------|------|-------------|
| `search` | string | Filtre sur nom + prénom (LIKE insensible à la casse) |
| `dept` | int | Filtre sur `medecin.departement` (entier, ex. `46`) |

```json
// Réponse 200
{
  "medecins": [
    { "id": 1, "nom": "Martin", "prenom": "Sophie", "adresse": "...", "tel": "...",
      "specialitecomplementaire": "Cardiologie", "departement": 75 }
  ],
  "count": 1
}
```

#### `GET /api/medecins/:id`
Détail d'un médecin + liste des rapports du visiteur connecté.

```json
// Réponse 200
{
  "medecin": { "id": 1, "nom": "Martin", "prenom": "Sophie", "adresse": "...", "tel": "...", "specialitecomplementaire": "..." },
  "rapports": [ { "id": 42, "date": "2024-03-10T00:00:00.000Z", "motif": "Présentation produit" } ],
  "rapportCount": 5
}
```

> `rapports` : uniquement les rapports du visiteur connecté.  
> `rapportCount` : total tous visiteurs confondus.

---

### Rapports

#### `GET /api/rapports`
Liste des rapports du visiteur connecté.

| Paramètre | Valeurs | Description |
|-----------|---------|-------------|
| `search` | string | Filtre sur nom/prénom médecin + motif |
| `sortDate` | `asc` \| `desc` | Tri par date |
| `sortMotif` | `asc` \| `desc` | Tri par motif |
| `sortNom` | `asc` \| `desc` | Tri par nom du médecin |

```json
// Réponse 200
{
  "rapports": [
    { "id": 42, "date": "2024-03-10T00:00:00.000Z", "motif": "Présentation",
      "medecin": { "id": 1, "nom": "Martin", "prenom": "Sophie" } }
  ],
  "count": 1
}
```

#### `GET /api/rapports/:id`
Détail complet d'un rapport (403 si le visiteur n'en est pas l'auteur).

```json
// Réponse 200
{
  "rapport": { "id": 42, "date": "...", "motif": "...", "bilan": "..." },
  "medecin": { "id": 1, "nom": "Martin", "prenom": "Sophie", "specialitecomplementaire": "..." },
  "echantillons": [
    { "idMedicament": "DOLIP500", "nomCommercial": "Doliprane 500mg",
      "libelle": "Antalgique", "quantite": 3 }
  ]
}
```

#### `POST /api/rapports`
Créer un rapport avec ses échantillons (transaction Prisma).

```json
// Corps
{
  "idMedecin": 1,
  "date": "2024-03-15",
  "motif": "Présentation produit",
  "bilan": "Médecin intéressé",
  "echantillons": [
    { "idMedicament": "DOLIP500", "quantite": 2 }
  ]
}
// Réponse 201
{ "rapport": { "id": 43, "date": "...", "motif": "...", "bilan": "...", "idMedecin": 1 } }
```

#### `PUT /api/rapports/:id`
Modifier un rapport. Remplace intégralement les échantillons (delete + insert en transaction).

```json
// Corps : mêmes champs que POST sauf idMedecin
// Réponse 200 : { "rapport": { "id": 43, "date": "...", "motif": "...", "bilan": "..." } }
```

#### `DELETE /api/rapports/:id`
Supprimer un rapport et ses échantillons (transaction). Réponse : `{ "success": true }`

---

### Médicaments

#### `GET /api/medicaments`

| Paramètre | Description |
|-----------|-------------|
| `search` | Filtre sur `nomCommercial` + `libelle` de la famille |

```json
// Réponse 200
{
  "medicaments": [
    { "id": "DOLIP500", "nomCommercial": "Doliprane 500mg",
      "libelle": "Antalgique", "idFamille": "ANTDOUL" }
  ]
}
```

#### `GET /api/medicaments/:id`
```json
// Réponse 200
{
  "medicament": {
    "id": "DOLIP500", "nomCommercial": "Doliprane 500mg",
    "idFamille": "ANTDOUL", "libelle": "Antalgique",
    "composition": "Paracétamol 500mg",
    "effets": "Antalgique, antipyrétique",
    "contreIndications": "Insuffisance hépatique"
  }
}
```

---

### Tableau de bord

#### `GET /api/dashboard`

```json
// Réponse 200
{
  "medecinsSuivis": [
    { "id": 1, "nom": "Martin", "prenom": "Sophie", "rapportCount": 4 }
  ],
  "mesRapports": [
    { "id": 42, "date": "...", "motif": "...", "medecin": { "id": 1, "nom": "Martin", "prenom": "Sophie" } }
  ]
}
```

> `medecinsSuivis` : médecins avec au moins 1 rapport du visiteur connecté, triés par `rapportCount` décroissant.  
> `mesRapports` : tous les rapports du visiteur, triés par date décroissante.

---

## Modèle de données

```
visiteur ──< rapport >── medecin
    │          │
    │        offrir
    │          │
    │      medicament >── famille
    │
    ├──< session
    └──< connexions
```

| Table | Description |
|-------|-------------|
| `visiteur` | Utilisateurs de l'application (représentants) |
| `medecin` | Médecins visités |
| `rapport` | Compte-rendu d'une visite (lié à 1 visiteur + 1 médecin) |
| `medicament` | Catalogue des médicaments |
| `famille` | Famille thérapeutique d'un médicament |
| `offrir` | Table de jonction rapport ↔ médicament (avec quantité) |
| `session` | Sessions serveur liées aux JWT (invalidation, expiration 30 min) |
| `connexions` | Tentatives de connexion par IP (protection brute-force) |
| `audit_log` | Journal d'audit automatique (via triggers MySQL) |

### Relations clés

- Un `rapport` appartient à **un** `visiteur` et concerne **un** `medecin`
- Un `rapport` peut contenir **plusieurs** `medicament` via la table `offrir`
- Un `medicament` appartient à **une** `famille`
- La suppression d'un rapport supprime d'abord ses lignes `offrir` (transaction)

---

## Sessions serveur

Les sessions côté serveur complètent l'authentification JWT pour permettre l'invalidation immédiate (logout) et l'expiration automatique après **30 minutes** d'inactivité.

### Fonctionnement

1. **Connexion** : un enregistrement `session` est créé avec un UUID. Cet UUID est inclus dans le payload du JWT.
2. **Chaque requête authentifiée** : le middleware vérifie que la session est toujours active (`is_active = true`) et non expirée (`expires_at > NOW()`).
3. **Déconnexion** : la session est marquée comme inactive (`is_active = false`), rendant le JWT immédiatement invalide.
4. **Expiration** : toute session dont `expires_at` est dépassé est automatiquement rejetée et désactivée.

### Structure de la table `session`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(36) | UUID v4, clé primaire (stocké dans le JWT) |
| `id_visiteur` | CHAR(4) | Visiteur propriétaire de la session |
| `ip_address` | VARCHAR(45) | Adresse IP du client (IPv4 ou IPv6) |
| `created_at` | DATETIME | Date de création |
| `expires_at` | DATETIME | Date d'expiration (30 min après création) |
| `is_active` | BOOLEAN | `true` = session valide, `false` = invalidée |

### Accès à la table via Docker

```bash
# Ouvrir un shell MySQL dans le conteneur
docker exec -it gsb-doctors-db-1 mysql -ugsb -pgsb gsbrapports

# Voir toutes les sessions
SELECT * FROM session ORDER BY created_at DESC;

# Sessions actives d'un visiteur
SELECT * FROM session WHERE id_visiteur = 'a131' AND is_active = TRUE AND expires_at > NOW();

# Historique des sessions avec détail visiteur
SELECT s.id, s.ip_address, s.created_at, s.expires_at, s.is_active,
       IFNULL(v.login, '(inconnu)') AS login
FROM session s
LEFT JOIN visiteur v ON s.id_visiteur = v.id
ORDER BY s.created_at DESC LIMIT 20;

# Sessions expirées encore marquées actives
SELECT * FROM session WHERE is_active = TRUE AND expires_at < NOW();

# Invalider toutes les sessions d'un visiteur
UPDATE session SET is_active = FALSE WHERE id_visiteur = 'a131';

# Purger les sessions expirées (attention : irréversible)
DELETE FROM session WHERE is_active = FALSE;
```

> **Note :** La table `session` est créée automatiquement lors du seed (`node prisma/seed.js`).

---

## Enregistrement des tentatives de connexion

La table `connexions` enregistre chaque tentative de connexion (réussie ou échouée). Après **5 tentatives échouées** depuis la même adresse IP dans les 30 dernières secondes, l'IP est temporairement bloquée pendant **30 secondes**.

### Fonctionnement

1. Chaque tentative de connexion (succès ou échec) crée un enregistrement dans `connexions`.
2. Avant chaque tentative, le serveur compte les échecs récents depuis la même IP.
3. Si 5 échecs ou plus sont détectés dans les 30 dernières secondes, la requête est rejetée avec un code **429** et le nombre de secondes restantes avant le déblocage.
4. L'écran de connexion affiche un **compte à rebours** pendant le blocage.

### Structure de la table `connexions`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | INT AUTO_INCREMENT | Identifiant unique |
| `ip_address` | VARCHAR(45) | Adresse IP du client |
| `id_visiteur` | CHAR(4) NULL | Visiteur ciblé (NULL si le login n'existe pas) |
| `attempted_at` | DATETIME | Horodatage de la tentative |
| `success` | BOOLEAN | `true` = connexion réussie, `false` = échec |

### Réponse en cas de blocage

```json
// HTTP 429 Too Many Requests
{
  "error": "Trop de tentatives. Réessayez dans 25 secondes.",
  "remainingSeconds": 25
}
```


### Accès à la table via Docker

```bash
# Ouvrir un shell MySQL dans le conteneur
docker exec -it gsb-doctors-db-1 mysql -ugsb -pgsb gsbrapports

# Voir toutes les tentatives de connexion
SELECT * FROM connexions ORDER BY attempted_at DESC;

# Tentatives échouées par IP (dernières 24h)
SELECT ip_address, COUNT(*) AS echecs
FROM connexions
WHERE success = FALSE AND attempted_at > NOW() - INTERVAL 24 HOUR
GROUP BY ip_address ORDER BY echecs DESC;

# Historique d'un visiteur
SELECT * FROM connexions WHERE id_visiteur = 'a131' ORDER BY attempted_at DESC;

# Ratio succès/échec global
SELECT success, COUNT(*) AS total FROM connexions GROUP BY success;

# Voir les tentatives récentes avec détail
SELECT c.id, c.ip_address, c.attempted_at, c.success,
       IFNULL(v.login, '(inconnu)') AS login
FROM connexions c
LEFT JOIN visiteur v ON c.id_visiteur = v.id
ORDER BY c.attempted_at DESC LIMIT 20;

# Vider la table (attention : irréversible)
DELETE FROM connexions;
```

> **Note :** La table `connexions` est créée automatiquement lors du seed (`node prisma/seed.js`).

---

## Journal d'audit (audit_log)

Toutes les modifications sur les tables `rapport`, `offrir`, `medecin` et `visiteur` sont automatiquement enregistrées via des **triggers MySQL** dans la table `audit_log`.

### Structure de la table

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | INT AUTO_INCREMENT | Identifiant unique de l'entrée |
| `created_at` | DATETIME | Horodatage de l'action |
| `id_visiteur` | CHAR(4) | Visiteur ayant effectué l'action (NULL pour les modifications médecin) |
| `table_name` | VARCHAR(30) | Table concernée (`rapport`, `offrir`, `medecin`, `visiteur`) |
| `action` | ENUM | Type d'action : `INSERT`, `UPDATE`, `DELETE` |
| `record_id` | VARCHAR(50) | Clé primaire de l'enregistrement modifié |
| `old_state` | JSON | État avant modification (NULL pour INSERT) |
| `new_state` | JSON | État après modification (NULL pour DELETE) |

### Triggers actifs

| Trigger | Table | Événement |
|---------|-------|-----------|
| `trg_rapport_insert` | rapport | AFTER INSERT |
| `trg_rapport_update` | rapport | AFTER UPDATE |
| `trg_rapport_delete` | rapport | AFTER DELETE |
| `trg_offrir_insert` | offrir | AFTER INSERT |
| `trg_offrir_delete` | offrir | AFTER DELETE |
| `trg_medecin_update` | medecin | AFTER UPDATE |
| `trg_medecin_delete` | medecin | AFTER DELETE |
| `trg_visiteur_insert` | visiteur | AFTER INSERT |

### Accès à la table via Docker

```bash
# Ouvrir un shell MySQL dans le conteneur
docker exec -it gsb-doctors-db-1 mysql -ugsb -pgsb gsbrapports

# Voir tous les logs
SELECT * FROM audit_log ORDER BY created_at DESC;

# Filtrer par table
SELECT * FROM audit_log WHERE table_name = 'rapport' ORDER BY created_at DESC;

# Filtrer par visiteur
SELECT * FROM audit_log WHERE id_visiteur = 'a131' ORDER BY created_at DESC;

# Filtrer par action
SELECT * FROM audit_log WHERE action = 'DELETE' ORDER BY created_at DESC;

# Voir les détails JSON formatés
SELECT id, created_at, id_visiteur, table_name, action, record_id,
       JSON_PRETTY(old_state) AS ancien_etat,
       JSON_PRETTY(new_state) AS nouvel_etat
FROM audit_log ORDER BY created_at DESC LIMIT 10\G

# Compter les actions par table
SELECT table_name, action, COUNT(*) AS total
FROM audit_log GROUP BY table_name, action ORDER BY table_name;

# Vider le journal (attention : irréversible)
DELETE FROM audit_log;
```

> **Note :** La table `audit_log` est créée automatiquement lors du seed (`node prisma/seed.js`). Le paramètre `log-bin-trust-function-creators=1` est activé dans `docker-compose.yml` pour permettre la création des triggers.

---

## Décisions d'architecture

| Décision | Raison |
|----------|--------|
| HTTPS obligatoire (backend) | Le backend Express sert uniquement en HTTPS via certificat auto-signé. Les cookies sont marqués `Secure` et ne transitent jamais en clair |
| Proxy Angular (`proxy.conf.json`) | Le frontend proxy les appels `/api` vers le backend HTTPS. Le navigateur ne voit pas le certificat auto-signé — aucune alerte de sécurité |
| Certificats générés via script Node.js | `node certs/generate.js` génère les certificats sans outil externe (utilise openssl si disponible, sinon Node.js natif). Fonctionne sur Windows, macOS et Linux |
| JWT en cookie httpOnly + session serveur | Le cookie httpOnly empêche l'accès au token via JavaScript (protection XSS). La session serveur permet l'invalidation immédiate au logout et l'expiration automatique après 30 min |
| Mots de passe hachés et salés (bcrypt) | Chaque mot de passe est salé individuellement par bcrypt avant stockage. Colonne `mdp` pour accueillir le hash |
| Politique de mot de passe stricte | Min. 8 caractères, majuscule, minuscule, chiffre et caractère spécial — validé côté client et serveur |
| Rate limiting par IP (table `connexions`) | Après 5 échecs de connexion en 30 s, l'IP est bloquée 30 s |
| Prisma en mode `db pull` | récupération du schéma MySQL existant sans migration destructive |
| Transactions Prisma pour `offrir` | Garantit la cohérence : la création/suppression d'un rapport et de ses échantillons est atomique |
| Composants Angular standalone | Pas de NgModules, conforme aux recommandations Angular 17+ |
| Journal d'audit via triggers MySQL | Capture automatique et transparente de toutes les modifications (INSERT/UPDATE/DELETE) sur les tables métier, sans code applicatif supplémentaire |

---

