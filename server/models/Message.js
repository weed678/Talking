const db = require('../database');

class Message {
  static create(messageData, callback) {
    const { content, user_id, room_id, is_private, recipient_id, mentioned_users } = messageData;
    
    db.run(
      `INSERT INTO messages (content, user_id, room_id, is_private, recipient_id, mentioned_users) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [content, user_id, room_id, is_private, recipient_id, mentioned_users],
      function(err) {
        if (err) return callback(err);
        
        // Récupérer le message complet avec les informations utilisateur
        db.get(
          `SELECT m.*, u.pseudo, u.gender, u.verified, u.verification_badge, u.role 
           FROM messages m 
           JOIN users u ON m.user_id = u.id 
           WHERE m.id = ?`,
          [this.lastID],
          callback
        );
      }
    );
  }

  static findByRoom(roomId, limit = 100, callback) {
    db.all(
      `SELECT m.*, u.pseudo, u.gender, u.verified, u.verification_badge, u.role 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.room_id = ? AND m.is_private = 0 
       ORDER BY m.created_at DESC 
       LIMIT ?`,
      [roomId, limit],
      callback
    );
  }

  static findPrivateMessages(userId, recipientId, callback) {
    db.all(
      `SELECT m.*, u.pseudo, u.gender, u.verified, u.verification_badge, u.role 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.is_private = 1 
       AND ((m.user_id = ? AND m.recipient_id = ?) OR (m.user_id = ? AND m.recipient_id = ?)) 
       ORDER BY m.created_at`,
      [userId, recipientId, recipientId, userId],
      callback
    );
  }

  static delete(messageId, callback) {
    db.run("DELETE FROM messages WHERE id = ?", [messageId], callback);
  }

  static findMentions(userId, callback) {
    db.all(
      `SELECT m.*, u.pseudo as author_pseudo, r.name as room_name 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       JOIN rooms r ON m.room_id = r.id 
       WHERE m.mentioned_users LIKE ? 
       ORDER BY m.created_at DESC`,
      [`%${userId}%`],
      callback
    );
  }
}

module.exports = Message;
