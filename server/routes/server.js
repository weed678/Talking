const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const db = require('./database');

// Import des routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

// Import des bots
const DriseBot = require('./bots/drise');
const NayBot = require('./bots/nay');
const ViewBot = require('./bots/view');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Instanciation des bots
const driseBot = new DriseBot(io);
const nayBot = new NayBot(io);
const viewBot = new ViewBot(io);

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log('Utilisateur connecté:', socket.id);
  
  // Authentification via socket
  socket.on('authenticate', (token) => {
    // Ici, vous devriez vérifier le token JWT
    // Pour la démo, on suppose que le token est valide
    jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt', (err, user) => {
      if (err) {
        socket.emit('auth_error', { message: 'Token invalide' });
        return;
      }
      
      socket.userId = user.id;
      socket.userPseudo = user.pseudo;
      
      // Mettre à jour le statut en ligne
      db.run("UPDATE users SET online = 1 WHERE id = ?", [user.id]);
      
      socket.emit('authenticated', { user });
      console.log(`Utilisateur authentifié: ${user.pseudo}`);
    });
  });
  
  // Rejoindre un salon
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    
    // Récupérer les informations utilisateur
    db.get("SELECT * FROM users WHERE id = ?", [socket.userId], (err, user) => {
      if (!err && user) {
        // Annoncer l'arrivée de l'utilisateur
        driseBot.announceUserJoin(user, roomName);
      }
    });
    
    console.log(`${socket.userPseudo} a rejoint le salon ${roomName}`);
  });
  
  // Quitter un salon
  socket.on('leave_room', (roomName) => {
    socket.leave(roomName);
    
    // Récupérer les informations utilisateur
    db.get("SELECT * FROM users WHERE id = ?", [socket.userId], (err, user) => {
      if (!err && user) {
        // Annoncer le départ de l'utilisateur
        driseBot.announceUserLeave(user, roomName);
      }
    });
    
    console.log(`${socket.userPseudo} a quitté le salon ${roomName}`);
  });
  
  // Envoyer un message
  socket.on('send_message', (data) => {
    const { room, content, isPrivate, recipientId } = data;
    
    // Vérifier d'abord si c'est une commande pour les bots
    if (content.startsWith('!')) {
      const isBotCommand = 
        nayBot.processMessage(content, { id: socket.userId, pseudo: socket.userPseudo }, room) ||
        viewBot.processCommand(content, { id: socket.userId, pseudo: socket.userPseudo }, room);
      
      if (isBotCommand) return;
    }
    
    // Sauvegarder le message en base de données
    db.run(
      `INSERT INTO messages (content, user_id, room_id, is_private, recipient_id) 
       VALUES (?, ?, (SELECT id FROM rooms WHERE name = ?), ?, ?)`,
      [content, socket.userId, room, isPrivate ? 1 : 0, recipientId],
      function(err) {
        if (err) {
          console.error('Erreur sauvegarde message:', err);
          return;
        }
        
        // Récupérer le message complet avec les infos utilisateur
        db.get(
          `SELECT m.*, u.pseudo, u.gender, u.verified, u.verification_badge, u.role 
           FROM messages m 
           JOIN users u ON m.user_id = u.id 
           WHERE m.id = ?`,
          [this.lastID],
          (err, message) => {
            if (err) {
              console.error('Erreur récupération message:', err);
              return;
            }
            
            // Diffuser le message
            if (isPrivate && recipientId) {
              // Message privé - envoyer seulement à l'expéditeur et au destinataire
              socket.to(recipientId).emit('receive_message', message);
              socket.emit('receive_message', message);
            } else {
              // Message public - diffuser à tout le salon
              io.to(room).emit('receive_message', message);
            }
          }
        );
      }
    );
  });
  
  // Déconnexion
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.userPseudo || socket.id);
    
    if (socket.userId) {
      // Mettre à jour le statut hors ligne
      db.run("UPDATE users SET online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [socket.userId]);
    }
  });
});

// Route pour servir l'application frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
