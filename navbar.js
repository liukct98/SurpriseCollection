// navbar.js - Gestione centralizzata della navbar utente


// Funzione per mostrare nome e iniziali utente nella navbar (robusta su tutti i client)
async function showUserName(retry = 0) {
    if (!window.supabase) {
        if (retry < 10) setTimeout(() => showUserName(retry + 1), 300);
        return;
    }
    if (!window.supabase.auth) {
        if (retry < 10) setTimeout(() => showUserName(retry + 1), 300);
        return;
    }
    const nameEl = document.getElementById('nav-user-name');
    const initialsEl = document.getElementById('user-initials');
    if (!nameEl || !initialsEl) {
        if (retry < 10) setTimeout(() => showUserName(retry + 1), 300);
        return;
    }
    try {
        const { data, error } = await window.supabase.auth.getUser();
        if (error || !data.user) {
            nameEl.textContent = 'NOLOGIN';
            initialsEl.textContent = '?';
            return;
        }
        const { data: userProfile, error: profileError } = await window.supabase
            .from('users')
            .select('username')
            .eq('mail', data.user.email)
            .single();
        if (userProfile && userProfile.username) {
            const username = userProfile.username;
            const initials = username.slice(0, 2).toUpperCase();
            nameEl.textContent = username;
            initialsEl.textContent = initials;
        } else {
            const displayName = data.user.email.split('@')[0];
            const initials = displayName.slice(0, 2).toUpperCase();
            nameEl.textContent = displayName;
            initialsEl.textContent = initials;
        }
    } catch (err) {
        nameEl.textContent = 'Errore';
        initialsEl.textContent = '?';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    showUserName();
});
