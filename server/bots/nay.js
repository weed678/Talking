const User = require('../models/User');
const db = require('../database');

class NayBot {
  constructor(io) {
    this.io = io;
    this.name = "Nay";
    this.commands = {
      // --- Commandes fun ---
      '!help': {
        description: 'Affiche ce message d\'aide.',
        handler: (user) => this.handleHelpCommand(user)
      },
      '!kiss': {
        description: 'Envoie un bisou virtuel. Usage: !kiss <pseudo>',
        handler: (user, args, room) => this.handleFunCommand('kiss', user, args, room)
      },
      '!hug': {
        description: 'Fait un câlin virtuel. Usage: !hug <pseudo>',
        handler: (user, args, room) => this.handleFunCommand('hug', user, args, room)
      },
      '!slap': {
        description: 'Donne une claque amicale. Usage: !slap <pseudo>',
        handler: (user, args, room) => this.handleFunCommand('slap', user, args, room)
      },
      '!dance': {
        description: 'Montre que vous dansez.',
        handler: (user, args, room) => this.handleFunCommand('dance', user, args, room)
      },
      '!love': {
        description: 'Calcule le pourcentage d\'amour. Usage: !love <pseudo>',
        handler: (user, args, room) => {
            if (!args) return this.sendPrivateMessage(user, "Veuillez spécifier un pseudo.");
            const lovePercent = Math.floor(Math.random() * 101);
            this.sendPublicMessage(room, `${user.pseudo} a ${lovePercent}% d'amour pour ${args} ❤️`);
        }
      },

      // --- Commandes utilitaires ---
      '!whois': {
        description: 'Donne des informations sur un utilisateur. Usage: !whois <pseudo>',
        handler: (user, args) => this.handleWhoisCommand(user, args)
      },
      '!stats': {
        description: 'Affiche les statistiques du salon.',
        handler: (user, args, room) => this.handleStatsCommand(user, room)
      },

      // --- Commandes de modération ---
      '!kick': {
        description: 'Expulse un utilisateur du salon. (Modérateurs)',
        handler: (user, args, room) => this.handleModCommand('kick', user, args, room)
      },
      '!op': {
        description: 'Donne le statut d\'opérateur à un utilisateur. (Admins)',
        handler: (user, args, room) => this.handleModCommand('op', user, args, room)
      }
    };
  }

  // --- Handlers de commandes ---

  handleHelpCommand(user) {
    const funCommands = `\n🎉 Commandes fun et câlins :\n` +
        `!kiss <pseudo> 💋, !hug <pseudo> 🤗, !slap <pseudo> 😜, !dance 💃, !love <pseudo> ❤️`;

    const utilCommands = `\n🛠️ Commandes utiles :\n` +
        `!whois <pseudo> 🕵️, !stats 📊, !help 📜`;

    const adminCommands = `\n🛡️ Pour les admins/propriétaires :\n` +
        `!kick <pseudo> 👢, !op <pseudo> 👑`;

    const helpMessage = `Hey toi! 😎 Voilà la liste magique ✨ :\n${funCommands}\n${utilCommands}\n${adminCommands}\n\n*La commande !seen est gérée par le bot "View".*`;

    this.sendPrivateMessage(user, helpMessage);
  }

  handleFunCommand(action, user, target, room) {
    const actions = {
      'kiss': `envoie un bisou à ${target} 💋`,
      'hug': `fait un gros câlin à ${target} 🤗`,
      'slap': `donne une claque amicale à ${target} 😜`,
      'dance': `se met à danser dans le salon! 💃🕺`
    };

    if (!actions[action]) return;

    if (['kiss', 'hug', 'slap'].includes(action) && !target) {
        this.sendPrivateMessage(user, `Veuillez spécifier un pseudo.`);
        return;
    }

    const message = `${user.pseudo} ${actions[action]}`;
    this.sendPublicMessage(room, message, 'fun');
  }

  handleWhoisCommand(requester, targetPseudo) {
    if (!targetPseudo) return this.sendPrivateMessage(requester, "Veuillez spécifier un pseudo.");

    User.findByPseudo(targetPseudo, (err, user) => {
        if (err || !user) return this.sendPrivateMessage(requester, `Utilisateur "${targetPseudo}" introuvable.`);

        const info = `--- Infos sur ${user.pseudo} ---\n` +
                     `Rôle: ${user.role}\n` +
                     `Ville: ${user.city}\n` +
                     `Statut: ${user.online ? 'En ligne' : 'Hors ligne'}\n` +
                     `Inscrit le: ${new Date(user.created_at).toLocaleDateString('fr-FR')}`;

        this.sendPrivateMessage(requester, info);
    });
  }

  handleStatsCommand(requester, room) {
    db.get(`SELECT id FROM rooms WHERE name = ?`, [room], (err, roomData) => {
        if (err || !roomData) return;

        db.get(`SELECT COUNT(*) as count FROM messages WHERE room_id = ?`, [roomData.id], (err, msgStats) => {
            if (err) return;
            this.sendPublicMessage(room, `Statistiques pour #${room}: ${msgStats.count} messages ont été envoyés ici.`);
        });
    });
  }

  async handleModCommand(action, moderator, targetPseudo, room) {
    const modUser = await this.findUser(moderator.id);
    if (!['opp', 'admin', 'owner'].includes(modUser.role)) {
        return this.sendPrivateMessage(moderator, "Vous n'avez pas les droits pour cette commande.");
    }

    const targetUser = await this.findUserByPseudo(targetPseudo);
    if (!targetUser) return this.sendPrivateMessage(moderator, `Utilisateur "${targetPseudo}" introuvable.`);

    switch(action) {
        case 'kick':
            // Logique de kick (émettre un événement que le client peut intercepter)
            this.io.to(room).emit('kick_user', { userId: targetUser.id, reason: 'Expulsé par un modérateur' });
            this.sendPublicMessage(room, `${targetUser.pseudo} a été expulsé par ${moderator.pseudo}.`);
            break;
        case 'op':
            if (modUser.role !== 'admin' && modUser.role !== 'owner') {
                return this.sendPrivateMessage(moderator, "Seuls les admins et propriétaires peuvent nommer des opérateurs.");
            }
            User.updateRole(targetUser.id, 'opp', 'opp', (err) => {
                if (err) return this.sendPrivateMessage(moderator, "Erreur lors de l'attribution du rôle.");
                this.sendPublicMessage(room, `${targetUser.pseudo} est maintenant un opérateur.`);
            });
            break;
    }
  }

  // --- Helpers ---
  async findUser(id) {
    return new Promise((resolve, reject) => User.findById(id, (err, user) => err ? reject(err) : resolve(user)));
  }
  async findUserByPseudo(pseudo) {
    return new Promise((resolve, reject) => User.findByPseudo(pseudo, (err, user) => err ? reject(err) : resolve(user)));
  }
  sendPrivateMessage(user, message, type = 'info') {
    this.io.to(`user_${user.id}`).emit('bot_message', { bot: this.name, message, type });
  }
  sendPublicMessage(room, message, type = 'info') {
    this.io.to(room).emit('bot_message', { bot: this.name, message, type });
  }

  // --- Processeur de messages ---
  processMessage(message, user, room) {
    if (!message.startsWith('!')) return false;

    const [commandName, ...args] = message.split(' ');
    const command = this.commands[commandName.toLowerCase()];

    if (command) {
      command.handler(user, args.join(' '), room);
      return true;
    }

    return false;
  }
}

module.exports = NayBot;