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

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
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

const getVerificationBadge = (role) => {
  const badges = {
    'owner': '🟢', // Pastille verte
    'admin': '🟠', // Pastille orange
    'opp': '🔴',   // Pastille rouge
    'half-opp': '🟡', // Pastille jaune
    'voice': '🔵', // Pastille bleue
    'bot': '🟣'    // Pastille rose
  };
  
  return badges[role] || '';
};

const getRolePrefix = (role) => {
  const prefixes = {
    'owner': '~',
    'admin': '&',
    'opp': '%',
    'half-opp': '@',
    'voice': '+'
  };
  
  return prefixes[role] || '';
};

module.exports = {
  getAge,
  formatTime,
  formatDate,
  escapeHtml,
  detectMentions,
  getVerificationBadge,
  getRolePrefix
};
