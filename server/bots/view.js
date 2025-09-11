class ViewBot {
  constructor(io) {
    this.io = io;
    this.name = "View";
  }

  // Répondre à la commande !seen
  handleSeenCommand(user, targetPseudo) {
    // Simulation d'accès à la base de données
    const now = new Date();
    const lastSeen = new Date(now.getTime() - Math.floor(Math.random() * 14400000)); // 0-4 heures ago

    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    let message;
    if (diffMins < 2) {
      message = `${targetPseudo} est actuellement en ligne`;
    } else if (diffHours < 1) {
      message = `${targetPseudo} était en ligne il y a ${diffMins} minutes`;
    } else if (diffHours < 24) {
      message = `${targetPseudo} était en ligne il y a ${diffHours} heures`;
    } else {
      message = `${targetPseudo} était en ligne le ${lastSeen.toLocaleDateString('fr-FR')}`;
    }

    this.io.to(user.id).emit('bot_message', {
      bot: this.name,
      message: message,
      type: 'info'
    });
  }

  // Traiter les commandes
  processCommand(command, user, room) {
    const parts = command.trim().split(' ');
    const mainCommand = parts[0].toLowerCase();
    const target = parts.slice(1).join(' ').trim();

    if (mainCommand !== '!seen' || !target) return false;

    this.handleSeenCommand(user, target);
    return true;
  }
}

module.exports = ViewBot;