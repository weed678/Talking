const db = require('../database');

class Message {
  /**
   * Crée un nouveau message (public ou privé)
   * @param {Object} messageData - { content, user_id, room_id, is_private, recipient_id, mentioned_users }
   * @param {Function} callback 
   */
  static create(messageData, callback) {
    const { content, user_id, room_id, is_private = 0, recipient_id = null, mentioned_users = null } = messageData;

    db.run(
      `INSERT INTO messages (content, user_id, room_id, is_private, recipient_id, mentioned_users) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [content, user_id, room_id, is_private, recipient_id, mentioned_users],
      function(err) {
        if (err) return callback(err);

        if (!this.lastID) return callback(new Error("Impossible de récupérer l'ID du message"));

        // Récupérer le message complet avec infos utilisateur
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

  /**
   * Récupère les messages publics d'une salle
   * @param {number} roomId 
   * @param {number} limit 
   * @param {Function} callback 
   */
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

  /**
   * Récupère les messages privés entre deux utilisateurs
   * @param {number} userId 
   * @param {number} recipientId 
   * @param {Function} callback 
   */
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

  /**
   * Supprime un message
   * @param {number} messageId 
   * @param {Function} callback 
   */
  static delete(messageId, callback) {
    db.run(
      "DELETE FROM messages WHERE id = ?",
      [messageId],
      function(err) {
        if (err) return callback(err);
        callback(null, this.changes);
      }
    );
  }

  /**
   * Récupère les messages où un utilisateur est mentionné
   * @param {number} userId 
   * @param {Function} callback 
   */
  static findMentions(userId, callback) {
    db.all(
      `SELECT m.*, u.pseudo AS author_pseudo, r.name AS room_name 
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