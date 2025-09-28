const User = require('../models/User');
const AutoRole = require('../models/AutoRole');

class DriseBot {
  constructor(io) {
    this.io = io;
    this.name = "Drise";
  }

  /**
   * Gère l'arrivée d'un utilisateur dans un salon.
   * Vérifie les rôles automatiques et annonce l'arrivée.
   * @param {object} user - L'objet utilisateur.
   * @param {string} roomName - Le nom du salon pour le socket (ex: "room_1").
   * @param {number} roomId - L'ID du salon dans la base de données.
   */
  handleUserJoin(user, roomName, roomId) {
    AutoRole.find(user.id, roomId, (err, autoRole) => {
      if (err) {
        console.error("DriseBot Error:", err);
        // En cas d'erreur, on annonce quand même l'arrivée de l'utilisateur
        this.announceUserJoin(user, roomName);
        return;
      }

      if (autoRole && autoRole.role) {
        // Un rôle automatique a été trouvé, on met à jour le rôle de l'utilisateur.
        // NOTE: Ceci met à jour le rôle global de l'utilisateur. Un système de rôle par salon serait une amélioration future.
        User.updateRole(user.id, autoRole.role, autoRole.role, (err) => {
          if (err) {
            console.error("DriseBot: Erreur lors de la mise à jour du rôle", err);
            this.announceUserJoin(user, roomName); // Annoncer avec l'ancien rôle en cas d'échec
            return;
          }

          // On récupère l'utilisateur avec son nouveau rôle pour l'annonce
          User.findById(user.id, (err, updatedUser) => {
            if (err || !updatedUser) {
              this.announceUserJoin(user, roomName); // Fallback si la récupération échoue
              return;
            }
            this.announceUserJoin(updatedUser, roomName);
          });
        });
      } else {
        // Pas de rôle automatique trouvé, on annonce simplement l'arrivée
        this.announceUserJoin(user, roomName);
      }
    });
  }

  /**
   * Annonce l'arrivée d'un utilisateur dans un salon avec le préfixe de son rôle.
   * @param {object} user - L'objet utilisateur.
   * @param {string} roomName - Le nom du salon pour le socket.
   */
  announceUserJoin(user, roomName) {
    if (!user || !roomName) return;

    const rolePrefixes = {
      'owner': '~',
      'admin': '&',
      'opp': '%',
      'half-opp': '@',
      'voice': '+'
    };

    const prefix = rolePrefixes[user.role] || '';
    const announcement = `${prefix}${user.pseudo} a rejoint le salon`;

    this.io.to(roomName).emit('bot_message', {
      bot: this.name,
      message: announcement,
      type: 'info'
    });
  }

  /**
   * Annonce le départ d'un utilisateur d'un salon.
   * @param {object} user - L'objet utilisateur.
   * @param {string} roomName - Le nom du salon pour le socket.
   */
  announceUserLeave(user, roomName) {
    if (!user || !roomName) return;

    this.io.to(roomName).emit('bot_message', {
      bot: this.name,
      message: `${user.pseudo} a quitté le salon`,
      type: 'info'
    });
  }
}

module.exports = DriseBot;