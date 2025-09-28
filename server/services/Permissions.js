const ROLES = {
    user: 0,
    voice: 1,
    'half-opp': 2,
    opp: 3,
    admin: 4,
    owner: 5
};

const hasPermission = (userRole, requiredRole) => {
    return ROLES[userRole] >= ROLES[requiredRole];
};

const Permissions = {
    // --- Vérifications de base ---
    isOwner: (user) => hasPermission(user.role, 'owner'),
    isAdmin: (user) => hasPermission(user.role, 'admin'),
    isOpp: (user) => hasPermission(user.role, 'opp'),
    isHalfOpp: (user) => hasPermission(user.role, 'half-opp'),

    // --- Actions de modération de base ---
    canKick: (user, target) => {
        // On ne peut pas kicker un utilisateur de rôle égal ou supérieur
        return hasPermission(user.role, 'half-opp') && ROLES[user.role] > ROLES[target.role];
    },
    canMute: (user, target) => {
        // On ne peut pas mute un utilisateur de rôle égal ou supérieur
        return hasPermission(user.role, 'half-opp') && ROLES[user.role] > ROLES[target.role];
    },

    // --- Actions de modération avancées ---
    canBan: (user, target) => {
        // Seuls les opp et plus peuvent bannir, et pas un rôle égal ou supérieur
        return hasPermission(user.role, 'opp') && ROLES[user.role] > ROLES[target.role];
    },

    // --- Gestion des rôles ---
    canGiveVoice: (user) => {
        return hasPermission(user.role, 'half-opp');
    },
    canSetRole: (user, targetRole) => {
        // On ne peut donner qu'un rôle inférieur au sien.
        // Seul un owner peut nommer un admin.
        if (targetRole === 'admin') {
            return hasPermission(user.role, 'owner');
        }
        if (targetRole === 'opp') {
            return hasPermission(user.role, 'admin');
        }
        if (targetRole === 'half-opp') {
            return hasPermission(user.role, 'opp');
        }
        return false;
    },
    canChangeVerificationBadge: (user) => {
        return hasPermission(user.role, 'owner');
    },

    // --- Gestion de salon ---
    canChangeTopic: (user) => {
        return hasPermission(user.role, 'half-opp');
    },
    canManageRoomSettings: (user) => {
        return hasPermission(user.role, 'opp');
    },
    canLockRoom: (user) => {
        return hasPermission(user.role, 'owner');
    }
};

module.exports = Permissions;