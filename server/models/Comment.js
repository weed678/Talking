const db = require('../database');

class Comment {
  static create(commentData, callback) {
    const { user_id, author_id, content } = commentData;
    
    db.run(
      "INSERT INTO profile_comments (user_id, author_id, content) VALUES (?, ?, ?)",
      [user_id, author_id, content],
      function(err) {
        if (err) return callback(err);
        
        // Récupérer le commentaire complet avec les informations de l'auteur
        db.get(
          `SELECT c.*, u.pseudo as author_pseudo, u.verified as author_verified, 
                  u.verification_badge as author_badge, u.role as author_role 
           FROM profile_comments c 
           JOIN users u ON c.author_id = u.id 
           WHERE c.id = ?`,
          [this.lastID],
          callback
        );
      }
    );
  }

  static findByUser(userId, callback) {
    db.all(
      `SELECT c.*, u.pseudo as author_pseudo, u.verified as author_verified, 
              u.verification_badge as author_badge, u.role as author_role 
       FROM profile_comments c 
       JOIN users u ON c.author_id = u.id 
       WHERE c.user_id = ? 
       ORDER BY c.created_at DESC`,
      [userId],
      callback
    );
  }

  static like(commentId, callback) {
    db.run(
      "UPDATE profile_comments SET likes = likes + 1 WHERE id = ?",
      [commentId],
      function(err) {
        callback(err, this.changes);
      }
    );
  }

  static delete(commentId, callback) {
    db.run("DELETE FROM profile_comments WHERE id = ?", [commentId], callback);
  }
}

module.exports = Comment;
