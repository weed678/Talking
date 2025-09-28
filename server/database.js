const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erreur lors de l'ouverture de la base de données :", err.message);
  } else {
    console.log("Base de données SQLite connectée.");
  }
});

// Initialisation de la base de données
db.serialize(() => {
  // Table des utilisateurs
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    pseudo TEXT UNIQUE NOT NULL,
    birthdate TEXT NOT NULL,
    city TEXT NOT NULL,
    gender TEXT NOT NULL,
    bio TEXT,
    avatar TEXT,
    avatar_approved INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    verification_badge TEXT,
    role TEXT DEFAULT 'user',
    online INTEGER DEFAULT 0,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error("Erreur création table users :", err.message);
  });

  // Table des salles
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    topic TEXT,
    is_private INTEGER DEFAULT 0,
    is_age_restricted INTEGER DEFAULT 0,
    min_age INTEGER,
    max_age INTEGER,
    password TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`, (err) => {
    if (err) console.error("Erreur création table rooms :", err.message);
  });

  // Table des messages
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    is_private INTEGER DEFAULT 0,
    recipient_id INTEGER,
    mentioned_users TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (room_id) REFERENCES rooms (id),
    FOREIGN KEY (recipient_id) REFERENCES users (id)
  )`, (err) => {
    if (err) console.error("Erreur création table messages :", err.message);
  });

  // Table des commentaires de profil
  db.run(`CREATE TABLE IF NOT EXISTS profile_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (author_id) REFERENCES users (id)
  )`, (err) => {
    if (err) console.error("Erreur création table profile_comments :", err.message);
  });

  // Table des modérateurs de salons
  db.run(`CREATE TABLE IF NOT EXISTS room_moderators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    granted_by INTEGER,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (granted_by) REFERENCES users (id)
  )`, (err) => {
    if (err) console.error("Erreur création table room_moderators :", err.message);
  });

  // Table pour les rôles automatiques (pour DriseBot)
  db.run(`CREATE TABLE IF NOT EXISTS auto_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    UNIQUE(user_id, room_id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (room_id) REFERENCES rooms (id)
  )`, (err) => {
    if (err) console.error("Erreur création table auto_roles :", err.message);
  });

  // Table pour les bannissements
  db.run(`CREATE TABLE IF NOT EXISTS bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER, -- NULL pour un ban global
    banned_by INTEGER NOT NULL,
    reason TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (room_id) REFERENCES rooms (id),
    FOREIGN KEY (banned_by) REFERENCES users (id)
  )`, (err) => {
    if (err) console.error("Erreur création table bans :", err.message);
  });

  // Insertion des salles par défaut si aucune n'existe
  db.get("SELECT COUNT(*) AS count FROM rooms", (err, row) => {
    if (err) return console.error("Erreur lecture rooms :", err.message);
    if (row.count === 0) {
      const defaultRooms = [
        { name: 'general', topic: 'Discussion générale', is_private: 0, is_age_restricted: 0 },
        { name: 'ados', topic: 'Salon réservé aux 11-17 ans', is_private: 0, is_age_restricted: 1, min_age: 11, max_age: 17 },
        { name: 'aide', topic: 'Aide et support', is_private: 0, is_age_restricted: 0 },
        { name: 'moderation', topic: 'Salon de modération', is_private: 1, is_age_restricted: 0 }
      ];

      const stmt = db.prepare("INSERT INTO rooms (name, topic, is_private, is_age_restricted, min_age, max_age) VALUES (?, ?, ?, ?, ?, ?)");
      defaultRooms.forEach(room => {
        stmt.run(
          room.name, 
          room.topic, 
          room.is_private, 
          room.is_age_restricted, 
          room.min_age || null, 
          room.max_age || null,
          (err) => {
            if (err) console.error(`Erreur insertion salle ${room.name} :`, err.message);
          }
        );
      });
      stmt.finalize();
    }
  });

  // Création du propriétaire par défaut si inexistant
  db.get("SELECT COUNT(*) AS count FROM users WHERE email = ?", ['jenniferlouis550@gmail.com'], (err, row) => {
    if (err) return console.error("Erreur lecture users :", err.message);
    if (row.count === 0) {
      const hashedPassword = bcrypt.hashSync('12345678900', 10);
      db.run(
        "INSERT INTO users (email, password, pseudo, birthdate, city, gender, bio, verified, verification_badge, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          'jenniferlouis550@gmail.com',
          hashedPassword,
          'Jennifer',
          '1990-01-01',
          'Paris',
          'female',
          'Propriétaire de TALKING',
          1,
          'owner',
          'owner'
        ],
        (err) => {
          if (err) console.error("Erreur création utilisateur owner :", err.message);
        }
      );
    }
  });
});

module.exports = db;