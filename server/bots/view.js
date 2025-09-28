const User = require('../models/User');
const moment = require('moment'); // Using moment for easier date formatting

class ViewBot {
  constructor(io) {
    this.io = io;
    this.name = "View";
  }

  // Répondre à la commande !seen
  handleSeenCommand(requester, targetPseudo) {
    User.findByPseudo(targetPseudo, (err, targetUser) => {
      if (err) {
        console.error("Erreur ViewBot:", err);
        return;
      }

      let message;
      if (!targetUser) {
        message = `Utilisateur "${targetPseudo}" introuvable.`;
      } else if (targetUser.online) {
        message = `${targetUser.pseudo} est actuellement connecté.`;
      } else {
        // moment.locale('fr'); // Ensure french locale for formatting
        const lastSeenFormatted = moment(targetUser.last_seen).fromNow();
        message = `${targetUser.pseudo} a été vu pour la dernière fois ${lastSeenFormatted}.`;
      }

      this.io.to(`user_${requester.id}`).emit('bot_message', {
        bot: this.name,
        message: message,
        type: 'info'
      });
    });
  }

  // Traiter les commandes
  processCommand(command, user) {
    const parts = command.trim().split(' ');
    const mainCommand = parts[0].toLowerCase();

    if (mainCommand !== '!seen') return false;

    const target = parts.slice(1).join(' ').trim();
    if (!target) {
        this.io.to(`user_${user.id}`).emit('bot_message', {
            bot: this.name,
            message: 'Veuillez spécifier un pseudo. Usage: !seen <pseudo>',
            type: 'error'
        });
        return true;
    }

    this.handleSeenCommand(user, target);
    return true;
  }
}

module.exports = ViewBot;