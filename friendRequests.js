// Usa window.supabase già inizializzato in app.js

// Carica richieste di amicizia ricevute
async function loadFriendRequests() {
  // Mostra info debug visivamente
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return;
  // Recupera il vero users.id tramite email
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, username, mail')
    .eq('mail', authUser.email)
    .single();
  if (userError || !userRow) {
    document.getElementById('friend-requests-list').innerHTML = '<p>Errore utente.</p>';
    return;
  }
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, status, created_at, sender:sender_id(username, mail)')
    .eq('receiver_id', userRow.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    document.getElementById('friend-requests-list').innerHTML = `<p>Errore: ${error.message}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    document.getElementById('friend-requests-list').innerHTML = '<p>Nessuna richiesta di amicizia.</p>';
    return;
  }
  document.getElementById('friend-requests-list').innerHTML = data.map(r => `
    <div class="friend-request" style="padding:12px 0;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <span style="font-weight:600;">${r.sender?.username || r.sender?.mail || r.sender_id}</span>
        <span style="color:#888;font-size:0.95em;">${r.sender?.mail || ''}</span>
      </div>
      <div>
        <button class="btn-accept-friend" data-id="${r.id}" style="background:#43aa8b;color:#fff;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;margin-right:8px;">Accetta</button>
        <button class="btn-decline-friend" data-id="${r.id}" style="background:#e74c3c;color:#fff;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;">Rifiuta</button>
      </div>
    </div>
  `).join('');
  setupFriendRequestButtons();
}

// Gestione pulsanti accetta/rifiuta
function setupFriendRequestButtons() {
  document.querySelectorAll('.btn-accept-friend').forEach(btn => {
    btn.onclick = () => respondFriendRequest(btn.dataset.id, 'accepted');
  });
  document.querySelectorAll('.btn-decline-friend').forEach(btn => {
    btn.onclick = () => respondFriendRequest(btn.dataset.id, 'declined');
  });
}

// Aggiorna stato richiesta
async function respondFriendRequest(requestId, status) {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status })
    .eq('id', requestId);
  if (error) return alert('Errore: ' + error.message);
  loadFriendRequests();
}

// Carica richieste all'avvio
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('friend-requests-list')) {
    loadFriendRequests();
    loadFriends();
  }
});

// Carica amici accettati
async function loadFriends() {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return;
  // Recupera il vero users.id tramite email
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, username, mail')
    .eq('mail', authUser.email)
    .single();
  if (userError || !userRow) {
    document.getElementById('friends-list').innerHTML = `<p>Errore utente: ${userError?.message || 'Utente non trovato'}</p>`;
    return;
  }
  // Amicizie dove l'utente è sender o receiver e status accettato
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, sender:sender_id(username, mail), receiver:receiver_id(username, mail)')
    .or(`and(sender_id.eq.${userRow.id},status.eq.accepted),and(receiver_id.eq.${userRow.id},status.eq.accepted)`);
  if (error) {
    document.getElementById('friends-list').innerHTML = `<p>Errore: ${error.message}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    document.getElementById('friends-list').innerHTML = '<p>Nessun amico trovato.</p>';
    return;
  }
  // Mostra amici (l'altro utente)
  document.getElementById('friends-list').innerHTML = data.map(r => {
    const friend = r.sender_id === userRow.id ? r.receiver : r.sender;
    const friendId = friend?.id || (r.sender_id === userRow.id ? r.receiver_id : r.sender_id);
    return `<div class="friend-card" style="background:#fff;border-radius:14px;box-shadow:0 2px 8px #0001;padding:18px 20px;margin-bottom:18px;display:flex;align-items:center;gap:18px;">
      <div style="width:48px;height:48px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;font-size:2em;color:#888;">
        <span>${friend?.username ? friend.username[0].toUpperCase() : '👤'}</span>
      </div>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:1.15em;">${friend?.username || friend?.mail || '-'}</div>
        <div style="color:#888;font-size:0.98em;">${friend?.mail || ''}</div>
      </div>
      <button class="btn-chat-friend" title="Chat" style="background:#43aa8b;border:none;color:#fff;padding:10px 13px;border-radius:50%;cursor:pointer;font-size:1.25em;display:flex;align-items:center;justify-content:center;" onclick="window.location.href='chat.html?friend_id=${friendId}'">
        <span aria-label="Chat" style="pointer-events:none;">💬</span>
      </button>
    </div>`;
  }).join('');
}
