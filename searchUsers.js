// Usa window.supabase già inizializzato in app.js

// Funzione per cercare utenti
async function searchUsers(query) {
  if (!query || query.length < 2) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }
  const { data: { user: authUser } } = await supabase.auth.getUser();
  // Cerca per username o email, escludi se stesso
  const { data, error } = await supabase
    .from('users')
    .select('id, username, mail')
    .or(`username.ilike.%${query}%,mail.ilike.%${query}%`)
    .neq('mail', authUser.email)
    .limit(10);
  if (error) {
    document.getElementById('search-results').innerHTML = `<p>Errore: ${error.message}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    document.getElementById('search-results').innerHTML = '<div style="padding:18px;text-align:center;color:#888;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(60,60,60,0.04);">Nessun utente trovato.</div>';
    return;
  }
  document.getElementById('search-results').innerHTML = data.map(u => {
    return (
      '<div class="user-card" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;margin-bottom:12px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(60,60,60,0.08);">' +
        '<div style="display:flex;align-items:center;gap:14px;">' +
          '<div class="user-avatar" style="width:44px;height:44px;background:linear-gradient(135deg,#3a86ff,#ff6b35);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;font-size:1.2em;box-shadow:0 1px 4px rgba(0,0,0,0.10);">' +
            (u.username ? u.username.slice(0,2).toUpperCase() : u.mail.slice(0,2).toUpperCase()) +
          '</div>' +
          '<div>' +
            '<div style="font-weight:600;font-size:1.1em;">' + (u.username || u.mail) + '</div>' +
            '<div style="color:#888;font-size:0.97em;">' + u.mail + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="btn-add-friend" data-user-id="' + u.id + '" style="background:#3a86ff;color:#fff;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-weight:500;font-size:1em;">Aggiungi amico</button>' +
      '</div>'
    );
  }).join('');
  setupAddFriendButtons();
}

// Listener input ricerca
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  if (input) {
    input.addEventListener('input', e => {
      searchUsers(e.target.value.trim());
    });
  }
});

// Funzione per inviare richiesta amicizia
async function sendFriendRequest(targetUserId) {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    showStatus('Devi essere loggato!', 'error');
    return;
  }
  // Recupera users.id e username dell'utente loggato tramite email
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, username, mail')
    .eq('mail', authUser.email)
    .single();
  if (userError || !userRow) {
    showStatus('Errore recupero utente: ' + (userError?.message || 'Utente non trovato'), 'error');
    return;
  }
  const senderId = userRow.id;
  // Controlla se esiste già una richiesta
  const { data: existing, error: existError } = await supabase
    .from('friend_requests')
    .select('id, status')
    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${senderId})`)
    .limit(1);
  if (existError) {
    showStatus('Errore controllo richieste: ' + existError.message, 'error');
    return;
  }
  if (existing && existing.length > 0) {
    const stato = existing[0].status;
    if (stato === 'pending') {
      showStatus('Richiesta già inviata o in attesa!', 'warning');
      return;
    }
    if (stato === 'accepted') {
      showStatus('Siete già amici!', 'info');
      return;
    }
    if (stato === 'declined') {
      showStatus('Richiesta già rifiutata.', 'warning');
      return;
    }
    showStatus('Richiesta già presente.', 'warning');
    return;
  }
  // Inserisci richiesta nella tabella friend_requests
  const richiesta = { sender_id: senderId, receiver_id: targetUserId, status: 'pending', created_at: new Date().toISOString() };
  const { error } = await supabase
    .from('friend_requests')
    .insert(richiesta);
  if (error) {
    showStatus('Errore invio richiesta: ' + error.message, 'error');
    return;
  }
  // Crea una notifica per il destinatario
  const notifica = {
    user_id: targetUserId,
    titolo: 'Nuova richiesta di amicizia',
    messaggio: `Hai ricevuto una richiesta di amicizia da ${userRow.username ? userRow.username : userRow.mail}`,
    data: new Date().toISOString(),
    letto: false
  };
  await supabase.from('notification').insert(notifica);
  showStatus('Richiesta inviata!', 'success');
}

// Mostra lo stato sotto la barra di ricerca
function showStatus(msg, type) {
  let color = '#3a86ff';
  if (type === 'error') color = '#ff3b3b';
  if (type === 'warning') color = '#ffb703';
  if (type === 'info') color = '#888';
  if (type === 'success') color = '#43aa8b';
  let el = document.getElementById('search-status');
  if (!el) {
    el = document.createElement('div');
    el.id = 'search-status';
    el.style.cssText = 'margin:10px 0 18px 0;padding:10px 18px;border-radius:8px;font-weight:500;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.07);font-size:1em;';
    document.getElementById('search-results').parentNode.insertBefore(el, document.getElementById('search-results'));
  }
  el.textContent = msg;
  el.style.background = color + '22';
  el.style.color = color;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// Attiva i pulsanti "Aggiungi amico"
function setupAddFriendButtons() {
  document.querySelectorAll('.btn-add-friend').forEach(btn => {
    btn.onclick = () => sendFriendRequest(btn.dataset.userId);
  });
}
