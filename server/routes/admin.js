const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const Ban = require('../models/Ban');
const Permissions = require('../services/Permissions');
const { authenticateToken } = require('./auth');
const db = require('../database');

// This router needs access to the io object for real-time actions like kicking
function createAdminRouter(io) {
  const router = express.Router();

  // --- Middleware for Permission Checks ---
  const requireRole = (role) => (req, res, next) => {
    User.findById(req.user.id, (err, user) => {
      if (err || !user || !Permissions.hasPermission(user.role, role)) {
        return res.status(403).json({ error: 'Permission insuffisante' });
      }
      req.moderator = user; // Attach moderator's user object to the request
      next();
    });
  };

  // --- User Management ---
  router.get('/users', authenticateToken, requireRole('admin'), (req, res) => {
    db.all(
      "SELECT id, pseudo, email, gender, role, verified, verification_badge, online, last_seen FROM users",
      (err, users) => {
        if (err) return res.status(500).json({ error: 'Erreur serveur' });
        res.json(users);
      }
    );
  });

  router.put('/users/:id/role', authenticateToken, requireRole('admin'), (req, res) => {
    const { role } = req.body;
    if (!Permissions.canSetRole(req.moderator, role)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas attribuer ce rôle' });
    }
    User.updateRole(req.params.id, role, role, (err) => {
      if (err) return res.status(500).json({ error: 'Erreur lors de la mise à jour du rôle' });
      res.json({ message: 'Rôle mis à jour' });
    });
  });

  router.post('/users/:id/verify', authenticateToken, requireRole('owner'), (req, res) => {
      const { badge } = req.body;
      User.updateProfile(req.params.id, { verified: 1, verification_badge: badge }, (err) => {
          if (err) return res.status(500).json({ error: 'Erreur serveur' });
          res.json({ message: 'Badge de vérification attribué' });
      });
  });

  // --- Ban Management ---
  router.get('/bans', authenticateToken, requireRole('opp'), (req, res) => {
    Ban.findAll((err, bans) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(bans);
    });
  });

  router.post('/ban', authenticateToken, requireRole('opp'), (req, res) => {
    const { userId, roomId, reason, duration } = req.body;

    User.findById(userId, (err, targetUser) => {
      if (err || !targetUser) return res.status(404).json({ error: 'Utilisateur cible non trouvé' });
      if (!Permissions.canBan(req.moderator, targetUser)) {
        return res.status(403).json({ error: 'Vous ne pouvez pas bannir cet utilisateur' });
      }

      // Calculer la date d'expiration
      let expires_at = null;
      if (duration && duration !== 'perm') {
          expires_at = new Date();
          const amount = parseInt(duration.slice(0, -1));
          const unit = duration.slice(-1);
          if (unit === 'h') expires_at.setHours(expires_at.getHours() + amount);
          if (unit === 'd') expires_at.setDate(expires_at.getDate() + amount);
      }

      Ban.create({ user_id: userId, room_id: roomId, banned_by: req.moderator.id, reason, expires_at }, (err) => {
        if (err) return res.status(500).json({ error: 'Erreur lors du bannissement' });

        // Déconnecter l'utilisateur s'il est en ligne
        io.in(`user_${userId}`).disconnectSockets(true);

        res.status(201).json({ message: 'Utilisateur banni avec succès' });
      });
    });
  });

  router.delete('/bans/:banId', authenticateToken, requireRole('opp'), (req, res) => {
      Ban.delete(req.params.banId, (err) => {
          if (err) return res.status(500).json({ error: 'Erreur lors du dé-bannissement' });
          res.json({ message: 'Bannissement révoqué' });
      });
  });

  // --- Kick Management ---
  router.post('/kick', authenticateToken, requireRole('half-opp'), (req, res) => {
      const { userId, roomId, reason } = req.body;

      User.findById(userId, (err, targetUser) => {
          if (err || !targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });
          if (!Permissions.canKick(req.moderator, targetUser)) {
              return res.status(403).json({ error: 'Vous ne pouvez pas expulser cet utilisateur' });
          }

          // Émettre un événement de kick au client
          io.to(`room_${roomId}`).emit('kick', { userId, reason: reason || 'Expulsé par un modérateur' });

          // Faire quitter la room au socket de l'utilisateur
          io.in(`user_${userId}`).socketsLeave(`room_${roomId}`);

          res.json({ message: 'Utilisateur expulsé avec succès' });
      });
  });

  return router;
}

module.exports = createAdminRouter;