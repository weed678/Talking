const db = require('../database');
const bcrypt = require('bcryptjs');

class User {
  static create(userData, callback) {
    const { email, password, pseudo, birthdate, city, gender } = userData;
    
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return callback(err);
      
      db.run(
        `INSERT INTO users (email, password, pseudo, birthdate, city, gender) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, pseudo, birthdate, city, gender],
        function(err) {
          if (err) return callback(err);
          callback(null, { id: this.lastID, email, pseudo, birthdate, city, gender });
        }
      );
    });
  }

  static findByEmail(email, callback) {
    db.get("SELECT * FROM users WHERE email = ?", [email], callback);
  }

  static findByPseudo(pseudo, callback) {
    db.get("SELECT * FROM users WHERE pseudo = ?", [pseudo], callback);
  }

  static findById(id, callback) {
    db.get("SELECT id, email, pseudo, birthdate, city, gender, bio, avatar, verified, verification_badge, role, online, last_seen FROM users WHERE id = ?", [id], callback);
  }

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
        callback(err, this.changes);
      }
    );
  }

  static setOnlineStatus(userId, isOnline, callback) {
    db.run(
      "UPDATE users SET online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?",
      [isOnline ? 1 : 0, userId],
      callback
    );
  }

  static getAllOnline(callback) {
    db.all("SELECT id, pseudo, gender, verified, verification_badge, role FROM users WHERE online = 1", callback);
  }

  static verifyPassword(plainPassword, hashedPassword, callback) {
    bcrypt.compare(plainPassword, hashedPassword, callback);
  }

  static updateRole(userId, role, badge, callback) {
    db.run(
      "UPDATE users SET role = ?, verification_badge = ? WHERE id = ?",
      [role, badge, userId],
      callback
    );
  }
}

module.exports = User;
