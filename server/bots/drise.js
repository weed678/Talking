const User = require('../models/User');

class DriseBot {
  constructor(io) {
    this.io = io;
    this.name = "Drise";
  }

  // Attribuer automatiquement des droits aux utilisateurs
  assignRights(userId, roomId) {
    // Cette fonction serait appelée quand un utilisateur rejoint un salon
    // Ici on simule l'attribution de droits basée sur des règles prédéfinies
    
    // En réalité, vous auriez une logique pour déterminer quels droits attribuer
    console.log(`Drise attribue des droits à l'utilisateur ${userId} dans le salon ${roomId}`);
  }

  // Annoncer l'arrivée d'un utilisateur avec ses droits
  announceUserJoin(user, room) {
    let announcement = `${user.pseudo} a rejoint le salon`;
    
    // Ajouter le préfixe selon le rôle
    if (user.role === 'owner') {
      announcement = `~${announcement}`;
    } else if (user.role === 'admin') {
      announcement = `&${announcement}`;
    } else if (user.role === 'opp') {
      announcement = `%${announcement}`;
    } else if (user.role === 'half-opp') {
      announcement = `@${announcement}`;
    } else if (user.role === 'voice') {
      announcement = `+${announcement}`;
    }
    
    this.io.to(room).emit('bot_message', {
      bot: this.name,
      message: announcement,
      type: 'info'
    });
  }

  // Annoncer le départ d'un utilisateur
  announceUserLeave(user, room) {
    this.io.to(room).emit('bot_message', {
      bot: this.name,
      message: `${user.pseudo} a quitté le salon`,
      type: 'info'
    });
  }

  // Donner un rôle à un utilisateur
  grantRole(granterId, targetId, role, roomId) {
    // Vérifier que celui qui donne le rôle a les permissions
    User.findById(granterId, (err, granter) => {
      if (err || !granter) return;
      
      // Seul le propriétaire peut attribuer des rôles
      if (granter.role !== 'owner') return;
      
      User.updateRole(targetId, role, role, (err) => {
        if (!err) {
          User.findById(targetId, (err, targetUser) => {
            if (!err && targetUser) {
              this.io.to(roomId).emit('bot_message', {
                bot: this.name,
                message: `${targetUser.pseudo} est maintenant ${role}`,
                type: 'success'
              });
            }
          });
        }
      });
    });
  }
}

module.exports = DriseBot;
