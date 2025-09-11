const User = require('../models/User');

class DriseBot {
  constructor(io) {
    this.io = io;
    this.name = "Drise";
  }

  // Attribuer automatiquement des droits aux utilisateurs
  assignRights(userId, roomId) {
    // Cette fonction peut être appelée quand un utilisateur rejoint un salon
    console.log(`Drise attribue des droits à l'utilisateur ${userId} dans le salon ${roomId}`);
    // Exemple : donner le rôle "voice" aux nouveaux membres d'un salon public
    User.findById(userId, (err, user) => {
      if (err || !user) return;
      if (user.role === 'user') {
        this.grantRole(1, userId, 'voice', roomId); // 1 = ID du propriétaire par défaut
      }
    });
  }

  // Annoncer l'arrivée d'un utilisateur avec son rôle
  announceUserJoin(user, room) {
    if (!user || !room) return;

    const rolePrefixes = {
      'owner': '~',
      'admin': '&',
      'opp': '%',
      'half-opp': '@',
      'voice': '+'
    };

    const prefix = rolePrefixes[user.role] || '';
    const announcement = `${prefix}${user.pseudo} a rejoint le salon`;

    this.io.to(room).emit('bot_message', {
      bot: this.name,
      message: announcement,
      type: 'info'
    });
  }

  // Annoncer le départ d'un utilisateur
  announceUserLeave(user, room) {
    if (!user || !room) return;

    this.io.to(room).emit('bot_message', {
      bot: this.name,
      message: `${user.pseudo} a quitté le salon`,
      type: 'info'
    });
  }

  // Donner un rôle à un utilisateur
  grantRole(granterId, targetId, role, roomId) {
    User.findById(granterId, (err, granter) => {
      if (err || !granter) return;

      // Seul le propriétaire peut attribuer des rôles
      if (granter.role !== 'owner') return;

      User.updateRole(targetId, role, role, (err) => {
        if (err) return;

        User.findById(targetId, (err, targetUser) => {
          if (err || !targetUser) return;

          this.io.to(roomId).emit('bot_message', {
            bot: this.name,
            message: `${targetUser.pseudo} est maintenant ${role}`,
            type: 'success'
          });
        });
      });
    });
  }
}

module.exports = DriseBot;