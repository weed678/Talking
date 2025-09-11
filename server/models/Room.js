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
    const { name, topic, is_private, is_age_restricted, min_age, max_age, password, created_by } = roomData;
    
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
        callback(err, this.changes);
      }
    );
  }

  static delete(roomId, callback) {
    db.run("DELETE FROM rooms WHERE id = ?", [roomId], callback);
  }

  static canUserJoin(userId, roomId, callback) {
    // Vérifier si l'utilisateur peut rejoindre le salon
    db.get(
      `SELECT r.*, u.birthdate, u.role 
       FROM rooms r, users u 
       WHERE r.id = ? AND u.id = ?`,
      [roomId, userId],
      (err, row) => {
        if (err) return callback(err);
        
        if (!row) return callback(null, false);
        
        // Si le salon est privé, vérifier les permissions
        if (row.is_private === 1) {
          db.get(
            "SELECT * FROM room_moderators WHERE room_id = ? AND user_id = ?",
            [roomId, userId],
            (err, moderator) => {
              callback(null, !!moderator);
            }
          );
        } 
        // Si le salon a des restrictions d'âge
        else if (row.is_age_restricted === 1) {
          const birthdate = new Date(row.birthdate);
          const today = new Date();
          let age = today.getFullYear() - birthdate.getFullYear();
          const monthDiff = today.getMonth() - birthdate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
            age--;
          }
          
          // Les modérateurs peuvent toujours rejoindre
          if (row.role !== 'user') {
            callback(null, true);
          } else {
            callback(null, age >= row.min_age && age <= row.max_age);
          }
        } 
        // Sinon, tout le monde peut rejoindre
        else {
          callback(null, true);
        }
      }
    );
  }
}

module.exports = Room;
