const db = require('../database');

class Comment {
  /**
   * Crée un nouveau commentaire de profil
   * @param {Object} commentData - { user_id, author_id, content }
   * @param {Function} callback - callback(err, result)
   */
  static create(commentData, callback) {
    const { user_id, author_id, content } = commentData;

    db.run(
      "INSERT INTO profile_comments (user_id, author_id, content) VALUES (?, ?, ?)",
      [user_id, author_id, content],
      function(err) {
        if (err) return callback(err);

        if (!this.lastID) return callback(new Error("Impossible de récupérer l'ID du commentaire"));

        // Récupérer le commentaire complet avec infos de l'auteur
        db.get(
          `SELECT c.*, 
                  u.pseudo AS author_pseudo, 
                  u.verified AS author_verified, 
                  u.verification_badge AS author_badge, 
                  u.role AS author_role 
           FROM profile_comments c 
           JOIN users u ON c.author_id = u.id 
           WHERE c.id = ?`,
          [this.lastID],
          callback
        );
      }
    );
  }

  /**
   * Récupère tous les commentaires pour un utilisateur
   * @param {number} userId 
   * @param {Function} callback 
   */
  static findByUser(userId, callback) {
    db.all(
      `SELECT c.*, 
              u.pseudo AS author_pseudo, 
              u.verified AS author_verified, 
              u.verification_badge AS author_badge, 
              u.role AS author_role 
       FROM profile_comments c 
       JOIN users u ON c.author_id = u.id 
       WHERE c.user_id = ? 
       ORDER BY c.created_at DESC`,
      [userId],
      callback
    );
  }

  /**
   * Ajoute un like à un commentaire
   * @param {number} commentId 
   * @param {Function} callback 
   */
  static like(commentId, callback) {
    db.run(
      "UPDATE profile_comments SET likes = likes + 1 WHERE id = ?",
      [commentId],
      function(err) {
        if (err) return callback(err);
        callback(null, this.changes); // this.changes = nombre de lignes affectées
      }
    );
  }

  /**
   * Supprime un commentaire
   * @param {number} commentId 
   * @param {Function} callback 
   */
  static delete(commentId, callback) {
    db.run(
      "DELETE FROM profile_comments WHERE id = ?",
      [commentId],
      function(err) {
        if (err) return callback(err);
        callback(null, this.changes);
      }
    );
  }
}

module.exports = Comment;