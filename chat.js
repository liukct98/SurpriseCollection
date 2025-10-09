// Chat tra due utenti
// Usa window.supabase già inizializzato in app.js

// Ottieni l'id dell'amico dalla query string
function getFriendIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('friend_id');
}

// Carica info amico e mostra nome
async function loadFriendInfo(friendId) {
  const { data: friend, error } = await supabase
    .from('users')
    .select('id, username, mail')
    .eq('id', friendId)
    .single();
  if (error || !friend) {
    document.getElementById('chat-title').textContent = 'Chat';
    return;
  }
  document.getElementById('chat-title').textContent = `Chat con ${friend.username || friend.mail}`;
}

// Carica messaggi
async function loadMessages(friendId) {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return;
  // Recupera il vero users.id
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('mail', authUser.email)
    .single();
  if (!userRow) return;
  // Messaggi tra userRow.id e friendId
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, created_at')
    .or(`and(sender_id.eq.${userRow.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userRow.id})`)
    .order('created_at', { ascending: true });
  if (error) {
    document.getElementById('chat-messages').innerHTML = `<p>Errore: ${error.message}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    document.getElementById('chat-messages').innerHTML = '<p>Nessun messaggio.</p>';
    window._allChatMessages = [];
    return;
  }
  window._allChatMessages = data;
  await renderChatMessages(data);

  // Setup filtro ricerca
  const searchInput = document.getElementById('chat-search');
  if (searchInput && !searchInput._listenerAdded) {
    searchInput.addEventListener('input', function() {
      const query = this.value.trim().toLowerCase();
      const filtered = window._allChatMessages.filter(msg => msg.content.toLowerCase().includes(query));
      renderChatMessages(filtered);
    });
    searchInput._listenerAdded = true;
  }
}

// Renderizza messaggi (usato anche per filtro)
async function renderChatMessages(messages) {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  let userId = null;
  if (authUser) {
    const userRow = window._userRowCache;
    userId = userRow ? userRow.id : null;
  }
  document.getElementById('chat-messages').innerHTML = messages.length === 0 ? '<p>Nessun messaggio.</p>' : messages.map(msg => {
    const isMine = userId && msg.sender_id === userId;
    return `<div style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};margin-bottom:8px;">
      <div style="background:${isMine ? '#43aa8b' : '#eee'};color:${isMine ? '#fff' : '#333'};padding:10px 14px;border-radius:12px;max-width:70%;">
        ${msg.content}
        <div style="font-size:0.85em;color:#888;margin-top:4px;text-align:right;">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>`;
  }).join('');
}

// Invia messaggio
async function sendMessage(friendId, content) {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return;
  }
  // Recupera il vero users.id
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('mail', authUser.email)
    .single();
  if (!userRow) {
    return;
  }
  const { error } = await supabase
    .from('messages')
    .insert({ sender_id: userRow.id, receiver_id: friendId, content });
  if (error) {
    console.error('[DEBUG] Errore Supabase:', error);
    return;
  }
  console.log('[DEBUG] Messaggio inviato con successo');
  loadMessages(friendId);
}

// Setup eventi
window.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('chat-form');
  if (!form) return;
  const friendId = getFriendIdFromUrl();
  if (!friendId) {
    document.getElementById('chat-messages').innerHTML = '<p style="color:red;font-weight:bold;">Errore: nessun amico selezionato per la chat.</p>';
    return;
  }
  loadFriendInfo(friendId);
  // Recupera e cache users.id per renderChatMessages
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const email = user.email;
  supabase
    .from('users')
    .select('id')
    .eq('mail', email)
    .single()
    .then(({ data }) => {
      window._userRowCache = data;
      loadMessages(friendId);
    });

  form.addEventListener('submit', function(e) {
    console.log('[DEBUG] submit form chiamato!');
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) {
      return;
    }
    sendMessage(friendId, text);
    input.value = '';
    input.focus();
  });
});
