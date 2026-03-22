# OldSchoolGames V2 - Backend

<div align="center">

**Plateforme de jeux en ligne retro avec communication temps réel**

Built with **NestJS** • **PostgreSQL** • **Socket.IO** • **JWT**

</div>

---

## 📋 À propos

OldSchoolGames V2 Backend est une API pour une plateforme de jeux classiques en ligne. Elle gère l'authentification des utilisateurs, les profils, les invitations entre joueurs et l'orchestration des jeux en temps réel.

### Fonctionnalités principales

- ✅ **Authentification JWT** - Sécurisée avec tokens stateless
- ✅ **Gestion des profils** - Avec support des avatars personnalisés
- ✅ **Système d'invitations** - Entre joueurs pour démarrer des parties
- ✅ **Communication temps réel** - Via WebSocket (Socket.IO)
- ✅ **Jeu Morpion** - Grille 3×3, détection victoire/nul
- ✅ **Jeu Puissance4** - Grille 7×6, gravité, anti wrap-around
- ✅ **Jeu Reversi** - Grille 8×8, retournement de pions, cas pass, fin de partie
- ✅ **Statistiques de parties** - Agrégation par période (semaine/mois/année) et par jeu
- ✅ **Logs persistants** - JSON avec rotation sur 2 mois glissants et archivage `.tar.gz`
- ✅ **CI/CD** - Pipeline Jenkins automatisé

---

## 🛠 Stack Technologique

| Catégorie | Technologies |
|-----------|--------------|
| **Framework** | NestJS 11, Express, TypeScript |
| **Base de données** | PostgreSQL, Prisma ORM v6 |
| **Temps réel** | Socket.IO (namespace `/events`) |
| **Authentification** | JWT, Passport, Bcrypt |
| **Validation** | Class Validator, Class Transformer |
| **Upload** | Multer (avatars → `./assets/user_avatars`) |
| **Rate limiting** | @nestjs/throttler |
| **Logging** | NestJS Logger + FileLogger custom (JSON, rotation, archivage tar.gz) |
| **Documentation** | Swagger/OpenAPI (`/api`) |
| **Tests** | Jest |
| **DevOps** | Docker, Jenkins |

---

## 📁 Architecture du projet

```
src/
├── auth/                        # Module d'authentification
│   ├── auth.controller.ts       # Routes: /auth/register, /auth/login
│   ├── auth.service.ts          # Logique d'authentification
│   ├── DTO/                     # LoginDTO
│   ├── guard/                   # Guards JWT
│   └── strategy/                # Stratégies Passport
│
├── users/                       # Module utilisateurs
│   ├── users.controller.ts      # Routes: /users/me
│   ├── users.service.ts         # Gestion des profils
│   └── DTO/                     # UpdateMeDTO
│
├── events/                      # Module WebSocket & Jeux
│   ├── events.gateway.ts        # Gateway WebSocket (/events)
│   ├── Games/
│   │   ├── commons/
│   │   │   └── GridGame.ts      # Classe abstraite de base (héritage)
│   │   ├── Morpion/
│   │   │   └── Morpion.ts       # Logique Morpion (3×3)
│   │   ├── Puissance4/
│   │   │   └── Puissance4.ts    # Logique Puissance4 (7×6)
│   │   ├── Reversi/
│   │   │   └── Reversi.ts       # Logique Reversi (8×8)
│   │   └── gamesEvents.service.ts  # Orchestration + GAMES_REGISTRY
│   ├── invitations/             # Gestion des invitations
│   └── users/                   # Gestion des connexions
│
├── prisma/                      # Module base de données
│   └── prisma.service.ts
│
└── commons/                     # Utilitaires partagés
    ├── multer.config.ts         # Config Multer centralisée
    └── utils/
        └── env.ts               # SALT_ROUNDS
```

---

## 🎮 Design Patterns

### Héritage — classe abstraite `GridGame`

Tous les jeux héritent de `GridGame` (`src/events/Games/commons/GridGame.ts`) :
- Encodage des cellules : `cCOLROW` — col = dizaine, row = unité (ex: `c44` = col 4, row 4)
- Vecteurs : `[-11, -10, -9, +1, +11, +10, +9, -1]` — horizontal `±10`, vertical `±1`
- Méthodes communes : `checkPlay()`, `switchTurn()`, `getCells()`, `requestReload()`
- `play()` déclaré abstract — chaque jeu implémente sa propre logique

### Registry pattern — `GAMES_REGISTRY`

`gamesEvents.service.ts` maintient un registre typé des classes de jeu :
```typescript
const GAMES_REGISTRY = {
  morpion: MorpionGame,
  puissance4: Puissance4Game,
  reversi: ReversiGame,
};
```
Instanciation dynamique à la création d'une room, sans switch/case.

---

## 🚀 Installation & Démarrage

### Prérequis

- Node.js 22+
- PostgreSQL 12+

### Installation

```bash
cd OldSchoolGames/V2/Backend
npm install
cp .env.example .env
# Éditer .env
```

### Variables d'environnement

```env
DATABASE_URL=postgresql://user:password@localhost:5432/oldschoolgames
JWT_SECRET=your_jwt_secret_key
SALT_ROUNDS=10
PORT=3000
```

### Démarrage

```bash
npm run start:dev      # Développement (hot reload)
npm run build          # Build production
npm run start:prod     # Production
npm run init           # Build + migrations + start
```

### Tests

```bash
npm run test           # Tests unitaires
npm run test:watch     # Mode watch
npm run test:cov       # Couverture de code
npm run test:e2e       # Tests E2E
```

### Code Quality

```bash
npm run lint
npm run lint_fix
npm run format
```

---

## 📡 API REST

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/` | ❌ | Health check |
| `POST` | `/auth/register` | ❌ | Inscription avec avatar |
| `POST` | `/auth/login` | ❌ | Connexion |
| `GET` | `/users/me` | ✅ JWT | Profil courant |
| `PUT` | `/users/me` | ✅ JWT | Mise à jour profil |
| `GET` | `/users/me/stats?period=week\|month\|year` | ✅ JWT | Statistiques de parties |

Documentation interactive : `http://localhost:3000/api`

---

## 🔌 WebSocket Events

**Namespace:** `/events`

| Événement | Direction | Description |
|-----------|-----------|-------------|
| `userList` | Send | Liste des utilisateurs connectés |
| `invitation` | Bi-directionnel | Invitation de jeu (create/accept/cancel) |
| `game` | Bi-directionnel | Événements du jeu (play, reload, leave) |

---

## 📊 Modèle de données

### User
```
id, pseudo, email, password (bcrypt), avatarUrl
invitationsFrom[], invitationsTo[]
createdAt, updatedAt
```

### Invitation
```
id, fromUser, toUser, game
```

### GameMatch
```
id, game, winnerId (nullable), loserId (nullable), draw (boolean), date
```

---

## 🐳 Docker

```bash
docker build -t oldschoolgames-backend:latest .
docker run -p 3000:3000 --env-file .env oldschoolgames-backend:latest
```

---

## 🔐 Sécurité

- Mots de passe hashés avec bcrypt (`SALT_ROUNDS` configurable)
- Avatars validés et nettoyés (sanitize-filename)
- JWT avec expiration (1 jour)
- Input validation via DTOs + Class Validator
- SQL injection prévenue par Prisma ORM

---

## 🚦 CI/CD

Pipeline Jenkins :
- ✅ ESLint
- ✅ Build
- ✅ Build & Push image Docker
- ✅ Déploiement automatique (branche main)

---

**Dernière mise à jour:** 2026-03-21
