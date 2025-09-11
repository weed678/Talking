const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Middleware pour vérifier que l'utilisateur est owner
const requireOwner = (req, res, next) => {
  User.findById(req.user.id, (err, user) => {
    if (err || !user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Accès réservé au propriétaire' });
    }
    next();
  });
};

// Obtenir tous les utilisateurs
router.get('/users', authenticateToken, requireOwner, (req, res) => {
  // Cette requête devrait normalement utiliser un système de pagination
  db.all("SELECT id, pseudo, email, gender, role, verified, verification_badge, online, last_seen FROM users", (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    
    res.json(users);
  });
});

// Modifier le rôle d'un utilisateur
router.put('/users/:id/role', authenticateToken, requireOwner, (req, res) => {
  const userId = parseInt(req.params.id);
  const { role, badge } = req.body;
  
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'ID utilisateur invalide' });
  }
  
  const allowedRoles = ['user', 'voice', 'half-opp', 'opp', 'admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }
  
  User.updateRole(userId, role, badge, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la modification du rôle' });
    }
    
    res.json({ message: 'Rôle mis à jour avec succès' });
  });
});

// Attribuer un badge de vérification
router.post('/users/:id/verify', authenticateToken, requireOwner, (req, res) => {
  const userId = parseInt(req.params.id);
  const { badge } = req.body;
  
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'ID utilisateur invalide' });
  }
  
  db.run(
    "UPDATE users SET verified = 1, verification_badge = ? WHERE id = ?",
    [badge, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de l\'attribution du badge' });
      }
      
      res.json({ message: 'Badge attribué avec succès' });
    }
  );
});

// Retirer un badge de vérification
router.delete('/users/:id/verify', authenticateToken, requireOwner, (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'ID utilisateur invalide' });
  }
  
  db.run(
    "UPDATE users SET verified = 0, verification_badge = NULL WHERE id = ?",
    [userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors du retrait du badge' });
      }
      
      res.json({ message: 'Badge retiré avec succès' });
    }
  );
});

// Créer un nouveau salon
router.post('/rooms', authenticateToken, requireOwner, (req, res) => {
  const { name, topic, is_private, is_age_restricted, min_age, max_age, password } = req.body;
  
  if (!name || !topic) {
    return res.status(400).json({ error: 'Nom et sujet du salon requis' });
  }
  
  Room.create({
    name,
    topic,
    is_private: is_private ? 1 : 0,
    is_age_restricted: is_age_restricted ? 1 : 0,
    min_age: min_age || null,
    max_age: max_age || null,
    password: password || null,
    created_by: req.user.id
  }, (err, room) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la création du salon' });
    }
    
    res.status(201).json(room);
  });
});

// Modifier un salon
router.put('/rooms/:id', authenticateToken, requireOwner, (req, res) => {
  const roomId = parseInt(req.params.id);
  const updates = req.body;
  
  if (isNaN(roomId)) {
    return res.status(400).json({ error: 'ID salon invalide' });
  }
  
  Room.update(roomId, updates, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la modification du salon' });
    }
    
    res.json({ message: 'Salon modifié avec succès' });
  });
});

// Supprimer un salon
router.delete('/rooms/:id', authenticateToken, requireOwner, (req, res) => {
  const roomId = parseInt(req.params.id);
  
  if (isNaN(roomId)) {
    return res.status(400).json({ error: 'ID salon invalide' });
  }
  
  Room.delete(roomId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la suppression du salon' });
    }
    
    res.json({ message: 'Salon supprimé avec succès' });
  });
});

module.exports = router;
