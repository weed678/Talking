const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('./database');
const Ban = require('./models/Ban');

// Import des bots
const DriseBot = require('./bots/drise');
const NayBot = require('./bots/nay');
const ViewBot = require('./bots/view');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- Routes de l'API ---
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const createAdminRouter = require('./routes/admin');
const profileRoutes = require('./routes/profile');

app.use('/api/auth', authRoutes.router);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', createAdminRouter(io)); // Passe l'instance io au routeur admin
app.use('/api/profile', profileRoutes);


// Instanciation des bots
const driseBot = new DriseBot(io);
const nayBot = new NayBot(io);
const viewBot = new ViewBot(io);

// --- Helper functions ---
const getAge = (birthdate) => {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const checkRoomAccess = (user, room) => {
  if (room.is_private && user.role === 'user') return false;
  if (room.is_age_restricted) {
    const age = getAge(user.birthdate);
    if (age < room.min_age || age > room.max_age) {
      if (user.role === 'user') return false;
    }
  }
  return true;
};

// --- Socket.io ---
io.on('connection', (socket) => {
  console.log('Utilisateur connecté:', socket.id);

  // Authentification via socket
  socket.on('authenticate', (token) => {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        socket.emit('auth_error', { message: 'Token invalide' });
        return;
      }

      socket.userId = user.id;
      socket.userPseudo = user.pseudo;

      // Rejoindre sa room privée pour messages directs
      socket.join(`user_${socket.userId}`);

      // Mettre à jour le statut en ligne
      db.run("UPDATE users SET online = 1 WHERE id = ?", [socket.userId]);

      socket.emit('authenticated', { user });
      console.log(`Utilisateur authentifié: ${user.pseudo}`);
    });
  });

  // Rejoindre un salon
  socket.on('join_room', (roomName) => {
    if (!socket.userId) return;

    db.get("SELECT * FROM users WHERE id = ?", [socket.userId], (err, user) => {
      if (err || !user) return;

      db.get("SELECT * FROM rooms WHERE name = ?", [roomName], (err, room) => {
        if (err || !room) return;

        // Vérifier si l'utilisateur est banni
        Ban.findActiveBan(user.id, room.id, (err, ban) => {
            if (err) {
                console.error("Erreur lors de la vérification du ban:", err);
                return;
            }
            if (ban) {
                return socket.emit('access_denied', {
                    room: roomName,
                    message: `Vous êtes banni de ce salon. Raison: ${ban.reason || 'Aucune'}.`
                });
            }

            if (!checkRoomAccess(user, room)) {
              socket.emit('access_denied', { room: roomName, message: 'Accès refusé à ce salon' });
              return;
            }

            const socketRoomName = `room_${room.id}`;
        socket.join(socketRoomName);

        // DriseBot gère l'annonce et l'attribution des rôles
        driseBot.handleUserJoin(user, socketRoomName, room.id);

        console.log(`${user.pseudo} a rejoint le salon ${roomName}`);
      });
    });
  });

  // Quitter un salon
  socket.on('leave_room', (roomName) => {
    db.get("SELECT * FROM rooms WHERE name = ?", [roomName], (err, room) => {
      if (!err && room) {
        socket.leave(`room_${room.id}`);
        db.get("SELECT * FROM users WHERE id = ?", [socket.userId], (err, user) => {
          if (!err && user) driseBot.announceUserLeave(user, `room_${room.id}`);
        });
      }
    });
  });

  // Envoyer un message
  socket.on('send_message', (data) => {
    const { room, content, isPrivate, recipientId } = data;
    if (!content || content.trim() === '') return;

    // Bots
    if (content.startsWith('!')) {
      const handled = nayBot.processMessage(content, { id: socket.userId, pseudo: socket.userPseudo }, room)
                   || viewBot.processCommand(content, { id: socket.userId, pseudo: socket.userPseudo }, room);
      if (handled) return;
    }

    // Message privé
    if (isPrivate && recipientId) {
      db.run(
        `INSERT INTO messages (content, user_id, room_id, is_private, recipient_id) VALUES (?, ?, NULL, 1, ?)`,
        [content.trim(), socket.userId, recipientId],
        function(err) {
          if (err) return console.error(err);

          db.get(
            `SELECT m.*, u.pseudo, u.gender, u.verified, u.verification_badge, u.role 
             FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?`,
            [this.lastID],
            (err, message) => {
              if (err) return console.error(err);

              // Diffuser aux deux utilisateurs
              io.to(`user_${recipientId}`).emit('receive_message', message);
              socket.emit('receive_message', message);
            }
          );
        }
      );
      return;
    }

    // Message public
    db.get("SELECT * FROM rooms WHERE name = ?", [room], (err, roomObj) => {
      if (err || !roomObj) return;
      db.get("SELECT * FROM users WHERE id = ?", [socket.userId], (err, user) => {
        if (err || !user) return;
        if (!checkRoomAccess(user, roomObj)) return;

        db.run(
          `INSERT INTO messages (content, user_id, room_id, is_private) VALUES (?, ?, ?, 0)`,
          [content.trim(), socket.userId, roomObj.id],
          function(err) {
            if (err) return console.error(err);

            db.get(
              `SELECT m.*, u.pseudo, u.gender, u.verified, u.verification_badge, u.role 
               FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?`,
              [this.lastID],
              (err, message) => {
                if (err) return console.error(err);
                io.to(`room_${roomObj.id}`).emit('receive_message', message);
              }
            );
          }
        );
      });
    });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    if (socket.userId) {
      db.run("UPDATE users SET online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?", [socket.userId]);
      console.log(`Utilisateur déconnecté: ${socket.userPseudo || socket.userId}`);
    }
  });
});

// Route frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Démarrage
server.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));