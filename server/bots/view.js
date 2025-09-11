class ViewBot {
  constructor(io) {
    this.io = io;
    this.name = "View";
  }

  // Répondre à la commande !seen
  handleSeenCommand(user, targetPseudo) {
    // Dans une implémentation réelle, on irait chercher l'information en base de données
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
      message = `${targetPseudo} était en ligne le ${lastSeen.toLocaleDateString()}`;
    }
    
    this.io.to(user.id).emit('bot_message', {
      bot: this.name,
      message: message,
      type: 'info'
    });
  }

  // Traiter les commandes
  processCommand(command, user, room) {
    if (!command.startsWith('!seen ')) return false;
    
    const targetPseudo = command.substring(6).trim();
    if (!targetPseudo) return false;
    
    this.handleSeenCommand(user, targetPseudo);
    return true;
  }
}

module.exports = ViewBot;
