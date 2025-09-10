
TALKING-CHAT 🗨️

TALKING-CHAT est une application de chat en temps réel inspirée des systèmes IRC modernes, avec gestion complète des rôles, modération avancée, profils utilisateurs, et bots interactifs.


---

📂 Structure du projet

talking-chat/
├── server/
│   ├── database.js              # Connexion et configuration MongoDB
│   ├── models/
│   │   ├── User.js              # Modèle utilisateur
│   │   ├── Room.js              # Modèle des salons
│   │   ├── Message.js           # Modèle des messages
│   │   └── Comment.js           # Modèle des commentaires
│   ├── bots/
│   │   ├── drise.js             # Bot de modération automatique
│   │   ├── nay.js               # Bot fun et commandes utilisateurs
│   │   └── view.js              # Bot pour !seen et suivi utilisateurs
│   ├── utils/
│   │   ├── permissions.js       # Gestion des rôles et permissions
│   │   └── helpers.js           # Fonctions utilitaires
│   ├── routes/
│   │   ├── auth.js              # Routes inscription/connexion
│   │   ├── chat.js              # Routes pour chat et messages
│   │   └── admin.js             # Routes pour gestion admin/modération
│   └── server.js                # Serveur principal Node.js
├── public/
│   ├── css/
│   │   └── style.css             # Styles du chat
│   ├── js/
│   │   ├── chat.js               # Logique chat côté client
│   │   ├── ui.js                 # Gestion de l’interface utilisateur
│   │   └── profile.js            # Gestion des profils utilisateurs
│   └── index.html                # Page principale
├── package.json
└── .env


---

⚡ Fonctionnalités principales

1. Authentification et profils

Inscription avec email, mot de passe, pseudo, sexe, date de naissance, ville.

Connexion pour utilisateurs existants.

Profils avec :

Bio

Photo (requiert approbation modérateur)

Commentaires et likes sur le profil

Informations sur les salons fréquentés et le pays (via IP)


Pseudos uniques.


2. Interface Chat

Messages affichés avec pseudo coloré selon sexe :

Homme → vert

Femme → rose


Messages horodatés.

Mentions avec notification sonore.

Commande !seen <pseudo> avec bot view pour savoir la dernière activité.

Défilement automatique des messages (comme Kiwi IRC).


3. Rôles et badges

Rôle	Symbole	Badge/Coche

Owner	~	Vert
Admin	&	Rouge
OP (Opérateur)	%	Rouge
Half-OP	@	Jaune
Voice (+)	+	Bleu
Bot	-	Rose


Le propriétaire peut :

Nommer ou retirer rôles (OP, Half-OP, Voice, Admin)

Vérifier utilisateurs (pastille de vérification)

Contrôler tous les salons et utilisateurs




---

🛠️ Salons

Salon	Accès	Bot	Règles

Accueil	≥ 18 ans ; modérateurs exception	Nay	Filtre âge, log
Ados	11–17 ans ; exceptions OP/Half-OP/Owner	Nay	Filtre âge, kick si interdit
Aide	Tous utilisateurs + modérateurs	AideBot	Assiste utilisateurs
Modération	OP, Half-OP, Owner, Admin	Nay	Discussions staff
Musique	Tous	MusicBot	Partage audio
Jeux	Tous	FunBot	Jeux et challenges
Créations	Tous	FunBot	Partage créatif



---

🤖 Bots intégrés

Drise

Accueille les utilisateurs

Attribue automatiquement les droits (Op, Half-OP, Voice)

Surveille le chat pour modération

Gère les logs


Nay

Fun, interactions et commandes : !kiss, !hug, !slap, !poke, !pat, !love, !dance, etc.

Commandes administratives : !kick, !ban, !op, !deop, !mute, !unmute

Commande !help pour afficher toutes les commandes.


View

Commande !seen <pseudo> pour savoir quand un utilisateur était en ligne

Notification si l’utilisateur est connecté



---

⚙️ Installation

1. Cloner le dépôt



git clone https://github.com/tonutilisateur/talking-chat.git
cd talking-chat

2. Installer les dépendances



npm install

3. Configurer .env avec :



MONGODB_URI=<votre_mongodb_uri>
PORT=3000
OWNER_EMAIL=jenniferlouis550@gmail.com
OWNER_PASSWORD=12345678900

4. Lancer le serveur



node server/server.js

5. Accéder au chat via navigateur



http://localhost:3000


---

📜 Commandes principales

Utilisateur

!help → Liste des commandes

!kiss <pseudo>, !hug <pseudo>, !slap <pseudo> …

!seen <pseudo> → Dernière connexion

Mentions avec @pseudo


Modérateur / Admin

!kick <pseudo>, !ban <pseudo>, !mute <pseudo> …

Donner ou retirer rôles : !op <pseudo>, !deop <pseudo>


Owner

Contrôle total : gestion rôles, vérifications, pastilles, salons

Commandes cs register, cs op, cs set founder (comme ChanServ IRC)



---

🔒 Règles et sécurité

Respect obligatoire, pas de spam, contenus inappropriés interdits.

Salon “Ados” : 11–17 ans.

Salon “Accueil” : ≥ 18 ans.

Confidentialité respectée : photos publiées après validation modérateur.



---

🎨 Styles et Interface

Messages colorés selon sexe

Pseudos avec symbole et badge de rôle

Fenêtre principale :

Liste messages au centre

Zone de saisie en bas

Liste utilisateurs à droite

Onglets pour chaque salon / MP


Panels Admin et Owner pour gérer salons et utilisateurs



