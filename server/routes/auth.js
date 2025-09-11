const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getAge } = require('../utils/helpers');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt';

// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { email, password, pseudo, birthdate, city, gender } = req.body;
    
    // Validation des données
    if (!email || !password || !pseudo || !birthdate || !city || !gender) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    
    // Vérifier l'âge
    const age = getAge(birthdate);
    if (age < 13) {
      return res.status(400).json({ error: 'Vous devez avoir au moins 13 ans pour vous inscrire' });
    }
    
    // Vérifier si l'email existe déjà
    User.findByEmail(email, (err, existingEmail) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      
      if (existingEmail) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
      
      // Vérifier si le pseudo existe déjà
      User.findByPseudo(pseudo, (err, existingPseudo) => {
        if (err) {
          return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        if (existingPseudo) {
          return res.status(400).json({ error: 'Ce pseudo est déjà utilisé' });
        }
        
        // Créer l'utilisateur
        User.create({ email, password, pseudo, birthdate, city, gender }, (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Erreur lors de la création du compte' });
          }
          
          // Générer un token JWT
          const token = jwt.sign(
            { id: user.id, pseudo: user.pseudo, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          res.status(201).json({
            message: 'Compte créé avec succès',
            token,
            user: {
              id: user.id,
              pseudo: user.pseudo,
              email: user.email,
              city: user.city,
              gender: user.gender
            }
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion
router.post('/login', (req, res) => {
  try {
    const { pseudo, password } = req.body;
    
    if (!pseudo || !password) {
      return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
    }
    
    // Trouver l'utilisateur par pseudo
    User.findByPseudo(pseudo, (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }
      
      // Vérifier le mot de passe
      User.verifyPassword(password, user.password, (err, isMatch) => {
        if (err || !isMatch) {
          return res.status(401).json({ error: 'Identifiants incorrects' });
        }
        
        // Mettre à jour le statut en ligne
        User.setOnlineStatus(user.id, true, (err) => {
          if (err) {
            console.error('Erreur lors de la mise à jour du statut:', err);
          }
        });
        
        // Générer un token JWT
        const token = jwt.sign(
          { id: user.id, pseudo: user.pseudo, email: user.email },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        res.json({
          message: 'Connexion réussie',
          token,
          user: {
            id: user.id,
            pseudo: user.pseudo,
            email: user.email,
            city: user.city,
            gender: user.gender,
            role: user.role,
            verified: user.verified,
            verification_badge: user.verification_badge
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Déconnexion
router.post('/logout', authenticateToken, (req, res) => {
  User.setOnlineStatus(req.user.id, false, (err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
    }
    res.json({ message: 'Déconnexion réussie' });
  });
});

// Vérifier le token
router.get('/verify', authenticateToken, (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({
      user: {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        city: user.city,
        gender: user.gender,
        role: user.role,
        verified: user.verified,
        verification_badge: user.verification_badge,
        online: user.online
      }
    });
  });
});

module.exports = router;
