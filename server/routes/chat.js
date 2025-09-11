const express = require('express');
const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Obtenir la liste des salons
router.get('/rooms', authenticateToken, (req, res) => {
  Room.findAll((err, rooms) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    
    // Filtrer les salons selon les permissions de l'utilisateur
    User.findById(req.user.id, (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      
      const accessibleRooms = rooms.filter(room => {
        // Vérifier si l'utilisateur peut accéder à ce salon
        // Cette logique serait normalement dans Permissions.canAccessRoom
        if (room.is_private) {
          return user.role !== 'user'; // Seuls les modérateurs peuvent accéder aux salons privés
        }
        
        if (room.is_age_restricted) {
          const age = getAge(user.birthdate);
          return age >= room.min_age && age <= room.max_age || user.role !== 'user';
        }
        
        return true;
      });
      
      res.json(accessibleRooms);
    });
  });
});

// Rejoindre un salon
router.post('/rooms/:name/join', authenticateToken, (req, res) => {
  const roomName = req.params.name;
  
  Room.findByName(roomName, (err, room) => {
    if (err || !room) {
      return res.status(404).json({ error: 'Salon non trouvé' });
    }
    
    User.findById(req.user.id, (err, user) => {
      if (err || !user) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      
      // Vérifier les permissions d'accès
      if (room.is_private && user.role === 'user') {
        return res.status(403).json({ error: 'Accès refusé à ce salon' });
      }
      
      if (room.is_age_restricted) {
        const age = getAge(user.birthdate);
        if (age < room.min_age || age > room.max_age) {
          if (user.role === 'user') {
            return res.status(403).json({ error: 'Vous n\'avez pas l\'âge requis pour ce salon' });
          }
        }
      }
      
      res.json({
        room,
        message: `Vous avez rejoint le salon ${roomName}`
      });
    });
  });
});

// Obtenir les messages d'un salon
router.get('/rooms/:name/messages', authenticateToken, (req, res) => {
  const roomName = req.params.name;
  const limit = parseInt(req.query.limit) || 100;
  
  Room.findByName(roomName, (err, room) => {
    if (err || !room) {
      return res.status(404).json({ error: 'Salon non trouvé' });
    }
    
    Message.findByRoom(room.id, limit, (err, messages) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      
      res.json(messages.reverse()); // Inverser pour avoir les plus anciens en premier
    });
  });
});

// Envoyer un message
router.post('/rooms/:name/messages', authenticateToken, (req, res) => {
  const roomName = req.params.name;
  const { content, is_private, recipient_id } = req.body;
  
  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Le message ne peut pas être vide' });
  }
  
  Room.findByName(roomName, (err, room) => {
    if (err || !room) {
      return res.status(404).json({ error: 'Salon non trouvé' });
    }
    
    // Détecter les mentions
    const mentions = detectMentions(content);
    
    Message.create({
      content: content.trim(),
      user_id: req.user.id,
      room_id: room.id,
      is_private: is_private || 0,
      recipient_id: recipient_id || null,
      mentioned_users: mentions.join(',')
    }, (err, message) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
      }
      
      res.json(message);
    });
  });
});

// Obtenir les messages privés avec un utilisateur
router.get('/messages/private/:userId', authenticateToken, (req, res) => {
  const otherUserId = parseInt(req.params.userId);
  
  if (isNaN(otherUserId)) {
    return res.status(400).json({ error: 'ID utilisateur invalide' });
  }
  
  Message.findPrivateMessages(req.user.id, otherUserId, (err, messages) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    
    res.json(messages);
  });
});

// Obtenir les utilisateurs en ligne
router.get('/users/online', authenticateToken, (req, res) => {
  User.getAllOnline((err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    
    res.json(users);
  });
});

// Helper functions (seraient normalement importées)
const getAge = (birthdate) => {
  const today = new Date();
  const birthDate = new Date(birthdate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

const detectMentions = (text) => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

module.exports = router;
