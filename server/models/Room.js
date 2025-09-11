const db = require('../database');

class Room {
  static findAll(callback) {
    db.all("SELECT * FROM rooms ORDER BY name", callback);
  }

  static findByName(name, callback) {
    db.get("SELECT * FROM rooms WHERE name = ?", [name], callback);
  }

  static findById(id, callback) {
    db.get("SELECT * FROM rooms WHERE id = ?", [id], callback);
  }

  static create(roomData, callback) {
    const { name, topic, is_private = 0, is_age_restricted = 0, min_age = null, max_age = null, password = null, created_by } = roomData;

    db.run(
      `INSERT INTO rooms (name, topic, is_private, is_age_restricted, min_age, max_age, password, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, topic, is_private, is_age_restricted, min_age, max_age, password, created_by],
      function(err) {
        if (err) return callback(err);
        callback(null, { id: this.lastID, name, topic });
      }
    );
  }

  static update(roomId, updates, callback) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(roomId);

    db.run(
      `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) return callback(err);
        callback(null, this.changes);
      }
    );
  }

  static delete(roomId, callback) {
    db.run("DELETE FROM rooms WHERE id = ?", [roomId], function(err) {
      if (err) return callback(err);
      callback(null, this.changes);
    });
  }

  /**
   * Vérifie si un utilisateur peut rejoindre un salon
   */
  static canUserJoin(userId, roomId, callback) {
    db.get(
      `SELECT r.*, u.birthdate, u.role 
       FROM rooms r 
       JOIN users u ON u.id = ? 
       WHERE r.id = ?`,
      [userId, roomId],
      (err, row) => {
        if (err) return callback(err);
        if (!row) return callback(null, false);

        // Salon privé → vérifier si l'utilisateur est modérateur
        if (row.is_private === 1) {
          db.get(
            "SELECT * FROM room_moderators WHERE room_id = ? AND user_id = ?",
            [roomId, userId],
            (err, moderator) => {
              if (err) return callback(err);
              return callback(null, !!moderator);
            }
          );
        } 
        // Salon avec restriction d'âge
        else if (row.is_age_restricted === 1) {
          const birthdate = new Date(row.birthdate);
          const today = new Date();
          let age = today.getFullYear() - birthdate.getFullYear();
          const monthDiff = today.getMonth() - birthdate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) age--;

          // Les modérateurs ou rôles spéciaux peuvent toujours rejoindre
          if (row.role !== 'user') {
            return callback(null, true);
          }

          return callback(null, age >= row.min_age && age <= row.max_age);
        } 
        // Salon ouvert
        else {
          return callback(null, true);
        }
      }
    );
  }
}

module.exports = Room;