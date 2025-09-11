class Permissions {
  static canKick(user, target) {
    // Les owners et admins peuvent kick anyone
    if (user.role === 'owner' || user.role === 'admin') return true;
    
    // Les opps peuvent kick les users normaux et voices
    if (user.role === 'opp') {
      return target.role === 'user' || target.role === 'voice';
    }
    
    // Les half-opps peuvent kick les users normaux
    if (user.role === 'half-opp') {
      return target.role === 'user';
    }
    
    return false;
  }

  static canBan(user, target) {
    // Seuls les owners, admins et opps peuvent bannir
    if (user.role === 'owner' || user.role === 'admin' || user.role === 'opp') {
      // Mais ils ne peuvent pas bannir quelqu'un de rang égal ou supérieur
      return this.getRoleLevel(user.role) > this.getRoleLevel(target.role);
    }
    
    return false;
  }

  static canMute(user, target) {
    // Les owners, admins, opps et half-opps peuvent mute
    if (['owner', 'admin', 'opp', 'half-opp'].includes(user.role)) {
      return this.getRoleLevel(user.role) > this.getRoleLevel(target.role);
    }
    
    return false;
  }

  static canGrantRole(granter, targetRole) {
    // Seul le owner peut attribuer tous les rôles
    if (granter.role === 'owner') return true;
    
    // Les admins peuvent attribuer des rôles inférieurs
    if (granter.role === 'admin') {
      return this.getRoleLevel(targetRole) < this.getRoleLevel('admin');
    }
    
    return false;
  }

  static getRoleLevel(role) {
    const levels = {
      'owner': 5,
      'admin': 4,
      'opp': 3,
      'half-opp': 2,
      'voice': 1,
      'user': 0
    };
    
    return levels[role] || 0;
  }

  static canAccessRoom(user, room) {
    // Si le salon est privé, vérifier les permissions
    if (room.is_private) {
      // Ici, on devrait vérifier si l'utilisateur est modérateur de ce salon
      // Pour la démo, on suppose que seuls les modérateurs peuvent accéder aux salons privés
      return user.role !== 'user';
    }
    
    // Si le salon a des restrictions d'âge
    if (room.is_age_restricted) {
      // Calculer l'âge de l'utilisateur
      const birthdate = new Date(user.birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthdate.getFullYear();
      const monthDiff = today.getMonth() - birthdate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
      }
      
      // Les modérateurs peuvent toujours rejoindre
      if (user.role !== 'user') {
        return true;
      }
      
      return age >= room.min_age && age <= room.max_age;
    }
    
    // Sinon, tout le monde peut rejoindre
    return true;
  }
}

module.exports = Permissions;
