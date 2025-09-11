const db = require('../database');
const bcrypt = require('bcryptjs');

class User {
  // Crée un nouvel utilisateur
  static create(userData, callback) {
    const { email, password, pseudo, birthdate, city, gender, bio = '', avatar = null } = userData;

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return callback(err);

      db.run(
        `INSERT INTO users (email, password, pseudo, birthdate, city, gender, bio, avatar) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, pseudo, birthdate, city, gender, bio, avatar],
        function(err) {
          if (err) return callback(err);
          callback(null, {
            id: this.lastID,
            email,
            pseudo,
            birthdate,
            city,
            gender,
            bio,
            avatar
          });
        }
      );
    });
  }

  // Trouve un utilisateur par email
  static findByEmail(email, callback) {
    db.get("SELECT * FROM users WHERE email = ?", [email], callback);
  }

  // Trouve un utilisateur par pseudo
  static findByPseudo(pseudo, callback) {
    db.get("SELECT * FROM users WHERE pseudo = ?", [pseudo], callback);
  }

  // Trouve un utilisateur par ID
  static findById(id, callback) {
    db.get(
      `SELECT id, email, pseudo, birthdate, city, gender, bio, avatar, verified, verification_badge, role, online, last_seen 
       FROM users WHERE id = ?`,
      [id],
      callback
    );
  }

  // Met à jour le profil d'un utilisateur
  static updateProfile(userId, updates, callback) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(userId);

    db.run(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) return callback(err);
        callback(null, this.changes);
      }
    );
  }

  // Met à jour le statut en ligne de l'utilisateur
  static setOnlineStatus(userId, isOnline, callback) {
    db.run(
      "UPDATE users SET online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?",
      [isOnline ? 1 : 0, userId],
      function(err) {
        if (err) return callback(err);
        callback(null, this.changes);
      }
    );
  }

  // Récupère tous les utilisateurs en ligne
  static getAllOnline(callback) {
    db.all(
      "SELECT id, pseudo, gender, verified, verification_badge, role FROM users WHERE online = 1",
      callback
    );
  }

  // Vérifie le mot de passe
  static verifyPassword(plainPassword, hashedPassword, callback) {
    bcrypt.compare(plainPassword, hashedPassword, callback);
  }

  // Met à jour le rôle et le badge d'un utilisateur
  static updateRole(userId, role, badge, callback) {
    db.run(
      "UPDATE users SET role = ?, verification_badge = ? WHERE id = ?",
      [role, badge, userId],
      function(err) {
        if (err) return callback(err);
        callback(null, this.changes);
      }
    );
  }
}

module.exports = User;