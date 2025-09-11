// Gestion de l'interface utilisateur

// Afficher l'écran d'authentification
function showAuthScreen() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById('auth-screen').classList.add('active');
    showLoginForm();
}

// Afficher l'écran de chat
function showChatScreen() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById('chat-screen').classList.add('active');
}

// Afficher l'écran de profil
function showProfileScreen() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById('profile-screen').classList.add('active');
    loadProfile();
}

// Afficher le formulaire de connexion
function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

// Afficher le formulaire d'inscription
function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

// Afficher le profil
function showProfile(userId = null) {
    if (userId && userId !== currentUser.id) {
        // Charger le profil d'un autre utilisateur
        loadUserProfile(userId);
    } else {
        // Charger son propre profil
        showProfileScreen();
    }
}

// Charger le profil utilisateur
async function loadProfile() {
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderProfile(data.user);
            loadProfileComments(data.user.id);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
    }
}

// Charger le profil d'un autre utilisateur
async function loadUserProfile(userId) {
    try {
        // Cette route devrait exister dans une API réelle
        const response = await fetch(`/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            renderProfile(user);
            loadProfileComments(userId);
            showProfileScreen();
        }
    } catch (error) {
        console.error('Erreur lors du chargement du profil utilisateur:', error);
    }
}

// Afficher le profil
function renderProfile(user) {
    document.getElementById('profile-pseudo').textContent = user.pseudo;
    document.getElementById('profile-location').textContent = `Ville: ${user.city}`;
    document.getElementById('profile-status').textContent = `Status: ${user.online ? 'En ligne' : 'Hors ligne'}`;
    document.getElementById('profile-bio').textContent = user.bio || 'Aucune bio pour le moment.';
    
    const avatar = document.getElementById('profile-avatar');
    if (user.avatar) {
        avatar.style.backgroundImage = `url(${user.avatar})`;
        avatar.textContent = '';
    } else {
        avatar.style.backgroundImage = '';
        avatar.textContent = user.pseudo.charAt(0).toUpperCase();
    }
}

// Charger les commentaires de profil
async function loadProfileComments(userId) {
    try {
        // Cette route devrait exister dans une API réelle
        const response = await fetch(`/api/users/${userId}/comments`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const comments = await response.json();
            renderProfileComments(comments);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des commentaires:', error);
    }
}

// Afficher les commentaires de profil
function renderProfileComments(comments) {
    const container = document.getElementById('profile-comments');
    container.innerHTML = '';
    
    if (comments.length === 0) {
        container.innerHTML = '<p>Aucun commentaire pour le moment.</p>';
        return;
    }
    
    comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        
        const commentHeader = document.createElement('div');
        commentHeader.className = 'comment-header';
        
        const author = document.createElement('span');
        author.className = 'comment-author';
        author.textContent = comment.author_pseudo;
        
        const time = document.createElement('span');
        time.className = 'comment-time';
        time.textContent = new Date(comment.created_at).toLocaleDateString();
        
        commentHeader.appendChild(author);
        commentHeader.appendChild(time);
        
        const content = document.createElement('div');
        content.className = 'comment-content';
        content.textContent = comment.content;
        
        commentEl.appendChild(commentHeader);
        commentEl.appendChild(content);
        
        container.appendChild(commentEl);
    });
}

// Ajouter un commentaire
async function addComment() {
    const content = document.getElementById('comment-input').value.trim();
    
    if (!content) return;
    
    try {
        // Cette route devrait exister dans une API réelle
        const response = await fetch('/api/profile/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                content: content,
                user_id: currentUser.id
            })
        });
        
        if (response.ok) {
            document.getElementById('comment-input').value = '';
            loadProfileComments(currentUser.id);
        } else {
            alert('Erreur lors de l\'ajout du commentaire');
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
    }
}

// Retour au chat
function showChat() {
    showChatScreen();
}

// Gestion des notifications
function showNotification(message, type = 'info') {
    // Créer une notification toast
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animation d'apparition
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Gestion des erreurs
function handleError(error, context = '') {
    console.error(`Erreur ${context}:`, error);
    showNotification(`Une erreur s'est produite: ${error.message}`, 'error');
}

// Initialiser les écouteurs d'événements
function initEventListeners() {
    // Navigation entre les formulaires d'authentification
    document.querySelectorAll('.auth-switch a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.textContent === "S'inscrire") {
                showRegisterForm();
            } else {
                showLoginForm();
            }
        });
    });
    
    // Soumission des formulaires avec la touche Entrée
    document.querySelectorAll('.auth-form input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const form = input.closest('.auth-form');
                if (form.id === 'login-form') {
                    login();
                } else {
                    register();
                }
            }
        });
    });
}

// Initialiser l'interface au chargement
document.addEventListener('DOMContentLoaded', initEventListeners);
