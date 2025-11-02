# OldSchoolGames V2 - Backend

<div align="center">

**Plateforme de jeux en ligne retro avec communication temps réel**

Built with **NestJS** • **PostgreSQL** • **Socket.IO** • **JWT**

</div>

---

## 📋 À propos

OldSchoolGames V2 Backend est une API moderne et performante pour une plateforme de jeux classiques en ligne. Elle gère l'authentification des utilisateurs, les profils, les invitations entre joueurs et l'orchestration des jeux en temps réel.

### Fonctionnalités principales

- ✅ **Authentification JWT** - Sécurisée avec tokens stateless
- ✅ **Gestion des profils** - Avec support des avatars personnalisés
- ✅ **Système d'invitations** - Entre joueurs pour démarrer des parties
- ✅ **Communication temps réel** - Via WebSocket (Socket.IO)
- ✅ **Jeu Morpion** - Implémentation complète du Tic-Tac-Toe
- ✅ **API REST documentée** - Swagger/OpenAPI intégré
- ✅ **Tests unitaires** - Avec Jest et couverture de code
- ✅ **CI/CD** - Pipeline Jenkins automatisé

---

## 🛠 Stack Technologique

| Catégorie | Technologies |
|-----------|--------------|
| **Framework** | NestJS 11, Express, TypeScript |
| **Base de données** | PostgreSQL, Prisma ORM |
| **Temps réel** | Socket.IO, WebSockets |
| **Authentification** | JWT, Passport, Bcrypt |
| **Validation** | Class Validator, Class Transformer |
| **Tests** | Jest, Supertest |
| **Documentation** | Swagger/OpenAPI |
| **DevOps** | Docker, Jenkins |

---

## 📁 Architecture du projet

```
src/
├── auth/                    # Module d'authentification
│   ├── auth.controller.ts   # Routes: /auth/register, /auth/login
│   ├── auth.service.ts      # Logique d'authentification
│   ├── guard/               # Guards JWT
│   └── strategy/            # Stratégies Passport
│
├── users/                   # Module utilisateurs
│   ├── users.controller.ts  # Routes: /users/me
│   └── users.service.ts     # Gestion des profils
│
├── events/                  # Module WebSocket & Jeux
│   ├── events.gateway.ts    # Gateway WebSocket (/events)
│   ├── Games/               # Logique des jeux
│   │   └── Morpion/        # Implémentation du Tic-Tac-Toe
│   ├── invitations/         # Gestion des invitations
│   └── users/               # Gestion des connexions
│
├── prisma/                  # Module base de données
│   └── prisma.service.ts    # Wrapper PrismaClient
│
└── commons/                 # Utilitaires partagés
    └── utils/               # Helpers de fichiers, casting
```

---

## 🚀 Installation & Démarrage

### Prérequis

- Node.js 22+
- PostgreSQL 12+
- npm ou yarn

### Installation

```bash
# Cloner le repository
git clone <repository>
cd OldSchoolGames/V2/Backend

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres (DATABASE_URL, JWT_SECRET, etc.)
```

### Variables d'environnement requises

```env
DATABASE_URL=postgresql://user:password@localhost:5432/oldschoolgames
JWT_SECRET=your_jwt_secret_key
SALT_ROUNDS=10
PORT=3000
```

### Démarrage

```bash
# Mode développement (avec reload automatique)
npm run start:dev

# Mode production
npm run build
npm run start:prod

# Mode debug
npm run start:debug

# Initialization (build + migrations + start)
npm run init
```

### 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:cov

# Tests E2E
npm run test:e2e
```

### 🎨 Code Quality

```bash
# Vérifier le linting
npm run lint

# Corriger automatiquement les erreurs
npm run lint_fix

# Formater le code
npm run format
```

---

## 📡 API REST Endpoints

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/` | ❌ | Health check |
| `POST` | `/auth/register` | ❌ | Inscription avec avatar |
| `POST` | `/auth/login` | ❌ | Connexion |
| `GET` | `/users/me` | ✅ JWT | Profil courant |
| `PUT` | `/users/me` | ✅ JWT | Mise à jour profil |

### Documentation interactive

Une fois le serveur démarré, accédez à la documentation Swagger:
```
http://localhost:3000/api/docs
```

---

## 🔌 WebSocket Events

**Namespace:** `/events`

### Événements disponibles

| Événement | Direction | Description |
|-----------|-----------|-------------|
| `userList` | Send | Récupérer liste des utilisateurs connectés |
| `invitation` | Bi-directionnel | Invitation de jeu (create/accept/cancel) |
| `game` | Bi-directionnel | Événements du jeu (play, reload, leave) |

### Exemple de connexion WebSocket

```javascript
const socket = io('http://localhost:3000/events', {
  auth: {
    token: 'your_jwt_token'
  }
});

socket.on('userList', (users) => {
  console.log('Connected users:', users);
});
```

---

## 🎮 Implémentation du Jeu Morpion

Le jeu Morpion (Tic-Tac-Toe) est entièrement implémenté avec:

- **Grille 3x3** - Cellules nommées c11 à c33
- **Système de tour** - Alternance joueur1 (X) / joueur2 (O)
- **Détection de victoire** - Horizontale, verticale, diagonale
- **Gestion des égalités** - Détection automatique
- **Confirmation de reload** - Nécessite accord des 2 joueurs

**Fichiers relatifs:**
- `src/events/Games/Morpion/Morpion.ts` - Logique du jeu
- `src/events/Games/gamesEvents.service.ts` - Service d'orchestration

---

## 📊 Modèle de données

### User
```
- id: Int (PK)
- pseudo: String
- email: String
- password: String (bcrypt)
- avatarUrl: String
- invitationsFrom: Invitation[]
- invitationsTo: Invitation[]
- createdAt: DateTime
- updatedAt: DateTime
```

### Invitation
```
- id: Int (PK)
- fromUser: User
- toUser: User
- game: String
```

---

## 🐳 Docker

### Build l'image Docker

```bash
docker build -t oldschoolgames-backend:latest .
```

### Lancer le conteneur

```bash
docker run -p 3000:3000 \
  --env-file .env \
  oldschoolgames-backend:latest
```

---

## 🔐 Sécurité

- **Mots de passe** - Hashés avec bcrypt (SALT_ROUNDS configurable)
- **Avatars** - Validés et nettoyés (sanitisation des noms)
- **JWT** - Tokens avec expiration (1 jour par défaut)
- **CORS** - Activé sur WebSocket pour tous les origins
- **Input validation** - DTOs avec Class Validator
- **SQL Injection** - Prévenue par Prisma ORM

---

## 📈 Performance & Scalabilité

- **ORM** - Prisma pour requêtes optimisées
- **WebSocket** - Socket.IO pour communication bidirectionnelle
- **Namespace** - Organisation des événements par namespace
- **Room** - Isolation des parties par room WebSocket
- **Stateless JWT** - Pas de session serveur requise

---

## 🚦 CI/CD Pipeline

Pipeline Jenkins automatisé pour:
- ✅ Vérification ESLint
- ✅ Build du projet
- ✅ Build & Push image Docker
- ✅ Déploiement automatique (branche main)

**Déploiement multi-environnements:**
- Feature branches → Tagged with branch name
- Branche dev → Dev environment
- Branche main → Production (latest tag)

---

## 📝 TODO & Améliorations

Items de travail en cours:
- [ ] Exporter la validation d'avatar vers un service dédié
- [ ] Notifier les WebSocket lors d'une nouvelle inscription
- [ ] Gestion complète des erreurs en cas d'utilisateur manquant
- [ ] Validation complète lors de la création du jeu
- [ ] Vérification de validité pour l'annulation d'invitation
- [ ] Notifications WebSocket pour annulation d'invitation
- [ ] Gestion des salles de jeu des utilisateurs déconnectés
- [ ] Refactorisation centralisée de gestion d'erreurs

---

## 🤝 Contribution

Pour contribuer au projet:

1. Créer une feature branch: `git checkout -b feature/description`
2. Commit vos changements: `git commit -m "type: description"`
3. Push vers la branche: `git push origin feature/description`
4. Ouvrir une Pull Request

---

## 📄 License

Proprietary - Codevert Organization

---

## 📧 Support

Pour des questions ou rapports de bug, consultez la section Issues du repository.

**Branche actuelle:** 14-gestion-morpion-game
**Dernière mise à jour:** 2025-11-02
