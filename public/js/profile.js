// Gestion du profil utilisateur

// Éditer la bio
async function editBio() {
    const newBio = prompt('Entrez votre nouvelle bio:', currentUser.bio || '');
    
    if (newBio !== null) {
        try {
            const response = await fetch('/api/profile/bio', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ bio: newBio })
            });
            
            if (response.ok) {
                currentUser.bio = newBio;
                document.getElementById('profile-bio').textContent = newBio;
                showNotification('Bio mise à jour avec succès', 'success');
            } else {
                showNotification('Erreur lors de la mise à jour de la bio', 'error');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur de connexion au serveur', 'error');
        }
    }
}

// Changer la photo de profil
async function changeAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Vérifier la taille du fichier
        if (file.size > 5 * 1024 * 1024) { // 5MB max
            showNotification('L\'image ne doit pas dépasser 5MB', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('avatar', file);
        
        try {
            const response = await fetch('/api/profile/avatar', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser.avatar = data.avatarUrl;
                
                const avatar = document.getElementById('profile-avatar');
                avatar.style.backgroundImage = `url(${data.avatarUrl})`;
                avatar.textContent = '';
                
                showNotification('Photo de profil mise à jour', 'success');
            } else {
                showNotification('Erreur lors du changement de photo', 'error');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur de connexion au serveur', 'error');
        }
    };
    
    input.click();
}

// Aimer un commentaire
async function likeComment(commentId) {
    try {
        const response = await fetch(`/api/comments/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            // Recharger les commentaires pour afficher le nouveau nombre de likes
            loadProfileComments(currentUser.id);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Supprimer un commentaire (seulement pour ses propres commentaires ou si modérateur)
async function deleteComment(commentId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            // Recharger les commentaires
            loadProfileComments(currentUser.id);
            showNotification('Commentaire supprimé', 'success');
        } else {
            showNotification('Erreur lors de la suppression du commentaire', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

// Initialiser les événements du profil
function initProfileEvents() {
    // Double-clic sur l'avatar pour le changer
    const avatar = document.getElementById('profile-avatar');
    if (avatar) {
        avatar.addEventListener('dblclick', changeAvatar);
    }
    
    // Double-clic sur la bio pour l'éditer
    const bio = document.getElementById('profile-bio');
    if (bio) {
        bio.addEventListener('dblclick', editBio);
    }
}

// Initialiser les événements au chargement de la page
if (document.getElementById('profile-screen')) {
    document.addEventListener('DOMContentLoaded', initProfileEvents);
}
