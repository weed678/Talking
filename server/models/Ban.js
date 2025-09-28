const db = require('../database');

class Ban {
    /**
     * Crée un nouveau bannissement.
     * @param {object} data - Les données du bannissement { user_id, room_id, banned_by, reason, expires_at }
     * @param {function} callback - La fonction de rappel.
     */
    static create(data, callback) {
        const { user_id, room_id = null, banned_by, reason = '', expires_at = null } = data;
        db.run(
            `INSERT INTO bans (user_id, room_id, banned_by, reason, expires_at) VALUES (?, ?, ?, ?, ?)`,
            [user_id, room_id, banned_by, reason, expires_at],
            function(err) {
                if (err) return callback(err);
                callback(null, { id: this.lastID });
            }
        );
    }

    /**
     * Trouve un bannissement actif pour un utilisateur dans un salon donné (ou globalement).
     * @param {number} userId - L'ID de l'utilisateur.
     * @param {number} roomId - L'ID du salon (peut être null pour un ban global).
     * @param {function} callback - La fonction de rappel.
     */
    static findActiveBan(userId, roomId, callback) {
        db.get(
            `SELECT * FROM bans
             WHERE user_id = ?
               AND (room_id = ? OR room_id IS NULL)
               AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
             ORDER BY room_id DESC`, // Priorise le ban de salon sur le ban global
            [userId, roomId],
            callback
        );
    }

    /**
     * Récupère tous les bannissements (actifs et expirés).
     * @param {function} callback - La fonction de rappel.
     */
    static findAll(callback) {
        db.all(`
            SELECT b.*, u.pseudo as user_pseudo, banner.pseudo as banner_pseudo, r.name as room_name
            FROM bans b
            JOIN users u ON b.user_id = u.id
            JOIN users banner ON b.banned_by = banner.id
            LEFT JOIN rooms r ON b.room_id = r.id
            ORDER BY b.created_at DESC
        `, callback);
    }

    /**
     * Supprime un bannissement (débannir).
     * @param {number} banId - L'ID du bannissement.
     * @param {function} callback - La fonction de rappel.
     */
    static delete(banId, callback) {
        db.run(`DELETE FROM bans WHERE id = ?`, [banId], function(err) {
            if (err) return callback(err);
            callback(null, { changes: this.changes });
        });
    }
}

module.exports = Ban;