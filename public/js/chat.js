let socket = null;
let currentUser = null;
let currentRoom = 'general';
let rooms = [];
let onlineUsers = [];

// Initialisation de l'application
function initApp() {
    const token = localStorage.getItem('authToken');
    
    if (token) {
        // Vérifier si le token est encore valide
        fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                connectToChat(token);
                showChatScreen();
                loadRooms();
                loadOnlineUsers();
            } else {
                localStorage.removeItem('authToken');
                showAuthScreen();
            }
        })
        .catch(error => {
            console.error('Erreur de vérification du token:', error);
            localStorage.removeItem('authToken');
            showAuthScreen();
        });
    } else {
        showAuthScreen();
    }
}

// Connexion au serveur de chat
function connectToChat(token) {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connecté au serveur');
        socket.emit('authenticate', token);
    });
    
    socket.on('authenticated', (data) => {
        console.log('Authentifié:', data.user.pseudo);
        currentUser = data.user;
        document.getElementById('current-user').textContent = currentUser.pseudo;
        
        // Rejoindre le salon par défaut
        joinRoom('general');
    });
    
    socket.on('auth_error', (data) => {
        console.error('Erreur d\'authentification:', data.message);
        localStorage.removeItem('authToken');
        showAuthScreen();
    });
    
    socket.on('receive_message', (message) => {
        addMessageToChat(message);
    });
    
    socket.on('bot_message', (data) => {
        addBotMessage(data.bot, data.message, data.type);
    });
    
    socket.on('user_joined', (data) => {
        addSystemMessage(`${data.user} a rejoint le salon`);
        loadOnlineUsers();
    });
    
    socket.on('user_left', (data) => {
        addSystemMessage(`${data.user} a quitté le salon`);
        loadOnlineUsers();
    });
    
    socket.on('disconnect', () => {
        console.log('Déconnecté du serveur');
    });
}

// Connexion
async function login() {
    const pseudo = document.getElementById('login-pseudo').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pseudo, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            currentUser = data.user;
            connectToChat(data.token);
            showChatScreen();
            loadRooms();
            loadOnlineUsers();
        } else {
            alert(data.error || 'Erreur de connexion');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion au serveur');
    }
}

// Inscription
async function register() {
    const email = document.getElementById('register-email').value;
    const birthdate = document.getElementById('register-birthdate').value;
    const pseudo = document.getElementById('register-pseudo').value;
    const city = document.getElementById('register-city').value;
    const gender = document.getElementById('register-gender').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, birthdate, pseudo, city, gender, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            currentUser = data.user;
            connectToChat(data.token);
            showChatScreen();
            loadRooms();
            loadOnlineUsers();
        } else {
            alert(data.error || 'Erreur d\'inscription');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion au serveur');
    }
}

// Déconnexion
function logout() {
    if (socket) {
        socket.disconnect();
    }
    
    localStorage.removeItem('authToken');
    currentUser = null;
    showAuthScreen();
}

// Rejoindre un salon
function joinRoom(roomName) {
    if (socket && currentRoom !== roomName) {
        // Quitter le salon actuel
        if (currentRoom) {
            socket.emit('leave_room', currentRoom);
        }
        
        // Rejoindre le nouveau salon
        socket.emit('join_room', roomName);
        currentRoom = roomName;
        
        // Mettre à jour l'interface
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.room === roomName) {
                item.classList.add('active');
            }
        });
        
        // Charger les messages du salon
        loadRoomMessages(roomName);
    }
}

// Charger les salons
async function loadRooms() {
    try {
        const response = await fetch('/api/chat/rooms', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            rooms = await response.json();
            renderRooms(rooms);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des salons:', error);
    }
}

// Afficher les salons
function renderRooms(rooms) {
    const container = document.getElementById('rooms-container');
    container.innerHTML = '';
    
    rooms.forEach(room => {
        const roomEl = document.createElement('div');
        roomEl.className = `room-item ${room.name === currentRoom ? 'active' : ''}`;
        roomEl.dataset.room = room.name;
        roomEl.textContent = room.name;
        roomEl.addEventListener('click', () => joinRoom(room.name));
        container.appendChild(roomEl);
    });
}

// Charger les messages d'un salon
async function loadRoomMessages(roomName) {
    try {
        const response = await fetch(`/api/chat/rooms/${roomName}/messages`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const messages = await response.json();
            renderMessages(messages);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
    }
}

// Afficher les messages
function renderMessages(messages) {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    
    messages.forEach(message => {
        addMessageToChat(message);
    });
}

// Ajouter un message à l'interface
function addMessageToChat(message) {
    const container = document.getElementById('messages-container');
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const sender = document.createElement('span');
    sender.className = `message-sender ${message.gender}`;
    
    // Ajouter le préfixe de rôle si nécessaire
    if (message.role && message.role !== 'user') {
        sender.classList.add(`prefix-${message.role}`);
    }
    
    sender.textContent = message.pseudo || message.sender;
    
    // Ajouter le badge de vérification si nécessaire
    if (message.verified && message.verification_badge) {
        const badge = document.createElement('span');
        badge.className = `badge badge-${message.verification_badge}`;
        badge.title = message.verification_badge;
        sender.appendChild(badge);
    }
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = new Date(message.created_at).toLocaleTimeString();
    
    messageHeader.appendChild(sender);
    messageHeader.appendChild(time);
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.content;
    
    messageEl.appendChild(messageHeader);
    messageEl.appendChild(content);
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

// Ajouter un message système
function addSystemMessage(text) {
    const container = document.getElementById('messages-container');
    const messageEl = document.createElement('div');
    messageEl.className = 'message system-message';
    messageEl.textContent = text;
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

// Ajouter un message de bot
function addBotMessage(botName, text, type = 'info') {
    const container = document.getElementById('messages-container');
    const messageEl = document.createElement('div');
    messageEl.className = `message bot-message ${type}`;
    
    const header = document.createElement('div');
    header.className = 'message-header';
    header.innerHTML = `<span class="message-sender bot">${botName}</span>`;
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    
    messageEl.appendChild(header);
    messageEl.appendChild(content);
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

// Envoyer un message
function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (content && socket) {
        socket.emit('send_message', {
            room: currentRoom,
            content: content
        });
        
        input.value = '';
    }
}

// Charger les utilisateurs en ligne
async function loadOnlineUsers() {
    try {
        const response = await fetch('/api/chat/users/online', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            onlineUsers = await response.json();
            renderOnlineUsers(onlineUsers);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
    }
}

// Afficher les utilisateurs en ligne
function renderOnlineUsers(users) {
    const container = document.getElementById('online-users');
    container.innerHTML = '';
    
    users.forEach(user => {
        const userEl = document.createElement('div');
        userEl.className = 'user-item';
        
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = user.pseudo.charAt(0).toUpperCase();
        
        const pseudo = document.createElement('span');
        pseudo.className = user.gender;
        
        // Ajouter le préfixe de rôle si nécessaire
        if (user.role && user.role !== 'user') {
            pseudo.classList.add(`prefix-${user.role}`);
        }
        
        pseudo.textContent = user.pseudo;
        
        // Ajouter le badge de vérification si nécessaire
        if (user.verified && user.verification_badge) {
            const badge = document.createElement('span');
            badge.className = `badge badge-${user.verification_badge}`;
            badge.title = user.verification_badge;
            pseudo.appendChild(badge);
        }
        
        userEl.appendChild(avatar);
        userEl.appendChild(pseudo);
        container.appendChild(userEl);
    });
}

// Gérer les touches pressées dans le champ de message
document.getElementById('message-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Initialiser l'application au chargement
document.addEventListener('DOMContentLoaded', initApp);
