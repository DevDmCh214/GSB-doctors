# GSB-Doctors

Application web de gestion des visites médicales pour les visiteurs pharmaceutiques du laboratoire **GSB (Galaxy Swiss Bourdin)**.

---

## Présentation

Les visiteurs médicaux utilisent cette application pour :

- Consulter la liste complète des médecins et filtrer par département
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

```bash
docker-compose up -d
```

> MySQL 8 démarre sur le port **3306**. Les identifiants sont définis dans `docker-compose.yml` (`gsb / gsb`).

### 3. Configurer le backend

```bash
cd backend
cp .env.example .env      # ajuster si besoin
npm install
```

Variables d'environnement (`.env`) :

```env
DATABASE_URL="mysql://gsb:gsb@localhost:3306/gsbrapports"
JWT_SECRET=change_me_in_production
PORT=3001
```

### 4. Initialiser la base de données

```bash
# Introspection du schéma existant (pas de migration destructive)
npx prisma db pull

# Peupler la base avec les données de démonstration
node prisma/seed.js
```

Le script `seed.js` :
1. Charge le dump SQL complet (`/sql/sql.sql`) dans la base
2. Élargit la colonne `visiteur.mdp` à `CHAR(60)` pour accueillir les hachages bcrypt
3. Génère un unique hachage bcrypt du mot de passe `"password"` (coût 10)
4. Met à jour tous les utilisateurs avec ce hachage
5. Affiche un tableau récapitulatif des identifiants

> **Mot de passe universel après le seed : `password`**

### 5. Démarrer le backend

```bash
cd backend
node src/index.js
# → Backend running on port 3001
```

Vérification :

```bash
curl http://localhost:3001/api/health
# → {"ok":true}
```

### 6. Démarrer le frontend

```bash
cd frontend
npm install
ng serve
# → http://localhost:4200
```

---

## Identifiants de démonstration

| Login | Mot de passe | Département | Notes |
|-------|-------------|-------------|-------|
| aribiA | password | 46 | Utilisateur principal, nombreux rapports |
| ltusseau | password | 46 | Même département |
| fdaburon | password | 94 | Département différent |
| fdudouit | password | 23 | Autre région |

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
| Authentification | JWT stocké en cookie httpOnly |
| Communication HTTP | Angular HttpClient + services injectables |

---

## Structure du projet

```
GSB-doctors/
│
├── docker-compose.yml          # MySQL 8 en conteneur
├── sql/
│   └── sql.sql                 # Dump complet de la base gsbrapports
│
├── backend/
│   ├── .env                    # Variables d'environnement (non versionné)
│   ├── .env.example            # Modèle de configuration
│   ├── src/
│   │   ├── index.js            # Point d'entrée Express (CORS, cookies, routes)
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

Base URL : `http://localhost:3001`

Toutes les routes protégées nécessitent un cookie JWT valide (`token`).  
Les erreurs retournent toujours : `{ "error": "Message en français" }` + code HTTP approprié.

---

### Authentification

#### `POST /api/auth/login`
Connexion d'un visiteur. Pose le cookie httpOnly `token`.

```json
// Corps de la requête
{ "login": "aribiA", "mdp": "password" }

// Réponse 200
{ "visiteur": { "id": "a131", "nom": "Arbi", "prenom": "Amélie", "cp": "46000" } }
```

#### `POST /api/auth/register`
Inscription d'un nouveau visiteur.

```json
// Corps
{
  "nom": "Dupont", "prenom": "Jean", "login": "jdupont",
  "mdp": "motdepasse", "adresse": "1 rue de la Paix",
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
               │
              offrir
               │
           medicament >── famille
```

| Table | Description |
|-------|-------------|
| `visiteur` | Utilisateurs de l'application (représentants) |
| `medecin` | Médecins visités |
| `rapport` | Compte-rendu d'une visite (lié à 1 visiteur + 1 médecin) |
| `medicament` | Catalogue des médicaments |
| `famille` | Famille thérapeutique d'un médicament |
| `offrir` | Table de jonction rapport ↔ médicament (avec quantité) |

### Relations clés

- Un `rapport` appartient à **un** `visiteur` et concerne **un** `medecin`
- Un `rapport` peut contenir **plusieurs** `medicament` via la table `offrir`
- Un `medicament` appartient à **une** `famille`
- La suppression d'un rapport supprime d'abord ses lignes `offrir` (transaction)

---

## Décisions d'architecture

| Décision | Raison |
|----------|--------|
| JWT en cookie httpOnly | Protection XSS : le token n'est pas accessible en JavaScript |
| `sameSite: lax` | Compatible avec les redirections tout en bloquant les requêtes cross-site |
| Prisma en mode `db pull` | La base existante ne doit pas être modifiée — introspection sans migration |
| Colonne `mdp` élargie à CHAR(60) | Les hachages bcrypt font 60 caractères, la colonne originale était trop courte |
| Filtre département par substring du CP | `parseInt(cp.substring(0, 2))` donne le numéro de département pour les CP à 5 chiffres |
| Transactions Prisma pour `offrir` | Garantit la cohérence : si l'insertion d'un échantillon échoue, tout est annulé |
| Composants Angular standalone | Pas de NgModules, tree-shaking optimisé, conforme Angular 17+ |
| `APP_INITIALIZER` + `GET /api/auth/me` | Rehydrate l'état d'authentification au démarrage sans redirection inutile |

---

## Périmètre de l'application

### Inclus
- Authentification (connexion / inscription / déconnexion)
- Tableau de bord personnel
- Liste et recherche de médecins avec filtre département
- Modal de détail médecin avec historique de visites
- Création, modification, suppression de rapports
- Gestion des échantillons (recherche, ajout, quantité)
- Popup d'information détaillée sur un médicament

### Hors périmètre
- Réinitialisation de mot de passe
- Gestion de fichiers ou d'images
- Fonctionnalités temps réel
- Tests automatisés
- Contrôle d'accès par rôle (tous les visiteurs ont les mêmes droits)
- Responsive mobile
- Panneau d'administration

---

## Données connues

- Le filtre "Mon département" pour `aribiA` (CP `46000`) retourne 0 résultats car les médecins de la base de démonstration ont des numéros de département 1–9, pas 46. C'est une contrainte des données existantes, pas un bug du code.
