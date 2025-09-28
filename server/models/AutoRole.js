const db = require('../database');

class AutoRole {
    /**
     * Trouve le rôle automatique pour un utilisateur dans un salon donné.
     * @param {number} userId - L'ID de l'utilisateur.
     * @param {number} roomId - L'ID du salon.
     * @param {function} callback - La fonction de rappel.
     */
    static find(userId, roomId, callback) {
        db.get(
            `SELECT role FROM auto_roles WHERE user_id = ? AND room_id = ?`,
            [userId, roomId],
            callback
        );
    }

    /**
     * Ajoute ou met à jour un rôle automatique pour un utilisateur dans un salon.
     * @param {number} userId - L'ID de l'utilisateur.
     * @param {number} roomId - L'ID du salon.
     * @param {string} role - Le rôle à attribuer.
     * @param {function} callback - La fonction de rappel.
     */
    static set(userId, roomId, role, callback) {
        db.run(
            `INSERT INTO auto_roles (user_id, room_id, role) VALUES (?, ?, ?)
             ON CONFLICT(user_id, room_id) DO UPDATE SET role = excluded.role`,
            [userId, roomId, role],
            function(err) {
                if (err) return callback(err);
                callback(null, { changes: this.changes });
            }
        );
    }

    /**
     * Supprime un rôle automatique.
     * @param {number} userId - L'ID de l'utilisateur.
     * @param {number} roomId - L'ID du salon.
     * @param {function} callback - La fonction de rappel.
     */
    static remove(userId, roomId, callback) {
        db.run(
            `DELETE FROM auto_roles WHERE user_id = ? AND room_id = ?`,
            [userId, roomId],
            function(err) {
                if (err) return callback(err);
                callback(null, { changes: this.changes });
            }
        );
    }
}

module.exports = AutoRole;