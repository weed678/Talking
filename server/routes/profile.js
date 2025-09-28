const express = require('express');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { authenticateToken } = require('./auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// --- Configuration de Multer pour l'upload d'avatar ---
const storage = multer.diskStorage({
    destination: './public/uploads/avatars/',
    filename: function(req, file, cb){
        cb(null, 'avatar-' + req.user.id + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
}).single('avatar');

function checkFileType(file, cb){
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if(mimetype && extname){
        return cb(null, true);
    } else {
        cb('Erreur: Seules les images sont autorisées!');
    }
}


// --- Routes de l'API de profil ---

// Obtenir le profil public d'un utilisateur
router.get('/:userId', authenticateToken, (req, res) => {
    User.findById(req.params.userId, (err, user) => {
        if (err) return res.status(500).json({ error: 'Erreur serveur' });
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        // Ne pas exposer l'email ou d'autres données sensibles
        const { id, pseudo, city, gender, bio, avatar, verified, verification_badge, online, last_seen } = user;
        res.json({ id, pseudo, city, gender, bio, avatar, verified, verification_badge, online, last_seen });
    });
});

// Mettre à jour la bio de l'utilisateur connecté
router.put('/bio', authenticateToken, (req, res) => {
    const { bio } = req.body;
    User.updateProfile(req.user.id, { bio }, (err) => {
        if (err) return res.status(500).json({ error: 'Erreur lors de la mise à jour de la bio' });
        res.json({ message: 'Bio mise à jour avec succès' });
    });
});

// Uploader un avatar
router.post('/avatar', authenticateToken, (req, res) => {
    upload(req, res, (err) => {
        if(err){
            return res.status(400).json({ error: err });
        }
        if(req.file == undefined){
            return res.status(400).json({ error: 'Aucun fichier sélectionné' });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        // L'avatar nécessite une approbation
        User.updateProfile(req.user.id, { avatar: avatarUrl, avatar_approved: 0 }, (err) => {
            if (err) return res.status(500).json({ error: 'Erreur lors de la sauvegarde de l\'avatar' });
            res.json({
                message: 'Avatar uploadé. En attente d\'approbation.',
                avatarUrl: avatarUrl
            });
        });
    });
});

// --- Routes pour les commentaires de profil ---

// Obtenir les commentaires du profil d'un utilisateur
router.get('/:userId/comments', authenticateToken, (req, res) => {
    Comment.findByUser(req.params.userId, (err, comments) => {
        if (err) return res.status(500).json({ error: 'Erreur serveur' });
        res.json(comments);
    });
});

// Poster un commentaire sur le profil d'un utilisateur
router.post('/:userId/comments', authenticateToken, (req, res) => {
    const { content } = req.body;
    const userId = req.params.userId;
    const authorId = req.user.id;

    if (!content) return res.status(400).json({ error: 'Le contenu du commentaire ne peut pas être vide' });

    Comment.create({ user_id: userId, author_id: authorId, content }, (err, comment) => {
        if (err) return res.status(500).json({ error: 'Erreur lors de la création du commentaire' });
        res.status(201).json(comment);
    });
});

// Aimer un commentaire
router.post('/comments/:commentId/like', authenticateToken, (req, res) => {
    Comment.like(req.params.commentId, (err) => {
        if (err) return res.status(500).json({ error: 'Erreur lors du like' });
        res.json({ message: 'Commentaire liké' });
    });
});

// Supprimer un commentaire
router.delete('/comments/:commentId', authenticateToken, (req, res) => {
    const commentId = req.params.commentId;
    const requesterId = req.user.id;

    Comment.findById(commentId, (err, comment) => {
        if (err) return res.status(500).json({ error: 'Erreur serveur' });
        if (!comment) return res.status(404).json({ error: 'Commentaire non trouvé' });

        User.findById(requesterId, (err, requester) => {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });

            // Autoriser la suppression si l'utilisateur est l'auteur ou un modérateur/admin/owner
            if (comment.author_id === requesterId || ['opp', 'admin', 'owner'].includes(requester.role)) {
                Comment.delete(commentId, (err) => {
                    if (err) return res.status(500).json({ error: 'Erreur lors de la suppression' });
                    res.json({ message: 'Commentaire supprimé avec succès' });
                });
            } else {
                res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer ce commentaire' });
            }
        });
    });
});

module.exports = router;