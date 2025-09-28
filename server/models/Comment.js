const db = require('../database');

class Comment {
    // Créer un nouveau commentaire
    static create(data, callback) {
        const { user_id, author_id, content } = data;
        db.run(
            `INSERT INTO profile_comments (user_id, author_id, content) VALUES (?, ?, ?)`,
            [user_id, author_id, content],
            function(err) {
                if (err) return callback(err);
                Comment.findById(this.lastID, callback);
            }
        );
    }

    // Trouver un commentaire par son ID
    static findById(id, callback) {
        db.get(`
            SELECT c.*, u.pseudo as author_pseudo
            FROM profile_comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.id = ?`,
            [id], callback);
    }

    // Trouver tous les commentaires pour un utilisateur donné
    static findByUser(userId, callback) {
        db.all(`
            SELECT c.*, u.pseudo as author_pseudo
            FROM profile_comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC`,
            [userId], callback
        );
    }

    // Aimer un commentaire
    static like(id, callback) {
        db.run(`UPDATE profile_comments SET likes = likes + 1 WHERE id = ?`, [id], function(err) {
            if (err) return callback(err);
            callback(null, this.changes);
        });
    }

    // Supprimer un commentaire
    static delete(id, callback) {
        db.run(`DELETE FROM profile_comments WHERE id = ?`, [id], function(err) {
            if (err) return callback(err);
            callback(null, this.changes);
        });
    }
}

module.exports = Comment;