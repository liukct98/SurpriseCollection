// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================

// Usa il client globale creato in supabaseClient.js
window.supabase = window.supabaseClient;
var supa = window.supabase;

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
async function loadMessages(friendId, isAutoRefresh = false) {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return;
  // Recupera il vero users.id
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('mail', authUser.email)
    .single();
  if (!userRow) return;
  
  // Marca i messaggi da questo mittente come letti
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('receiver_id', userRow.id)
    .eq('sender_id', friendId)
    .eq('read', false);
  

  
  // Messaggi tra userRow.id e friendId
  const chatMessagesDiv = document.getElementById('chat-messages');
  
  // Salva posizione scroll solo per auto-refresh
  let previousScrollTop = 0;
  let wasAtBottom = true;
  if (isAutoRefresh) {
    previousScrollTop = chatMessagesDiv.scrollTop;
    wasAtBottom = chatMessagesDiv.scrollTop >= (chatMessagesDiv.scrollHeight - chatMessagesDiv.clientHeight - 50);
  } else {
    chatMessagesDiv.innerHTML = '<div class="spinner" style="margin:30px auto;text-align:center;"></div>';
  }
  
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, created_at')
    .or(`and(sender_id.eq.${userRow.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userRow.id})`)
    .order('created_at', { ascending: true });
  if (error) {
    chatMessagesDiv.innerHTML = `<p>Errore: ${error.message}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    chatMessagesDiv.innerHTML = '<p>Nessun messaggio.</p>';
    window._allChatMessages = [];
    return;
  }
  
  // Controlla se ci sono nuovi messaggi
  const previousMessageCount = window._allChatMessages ? window._allChatMessages.length : 0;
  const hasNewMessages = data.length > previousMessageCount;
  
  window._allChatMessages = data;
  await renderChatMessages(data);
  
  // Gestisci scroll intelligente
  if (isAutoRefresh) {
    if (hasNewMessages && wasAtBottom) {
      // Se eri in fondo e ci sono nuovi messaggi, vai in fondo
      scrollToBottomNow();
    } else if (!hasNewMessages) {
      // Se non ci sono nuovi messaggi, mantieni posizione
      chatMessagesDiv.scrollTop = previousScrollTop;
    }
    // Se non eri in fondo e ci sono nuovi messaggi, non cambiare scroll
  } else {
    // Per caricamento iniziale, vai sempre in fondo (forza anche lo scroll della finestra)
    scrollToBottomHard();
  }

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
      <div style="background:${isMine ? '#43aa8b' : '#f5f5f5'};color:${isMine ? '#fff' : '#333'};padding:12px 16px;border-radius:16px;max-width:70%;box-shadow:0 2px 8px #0001;">
        ${msg.content}
        <div style="font-size:0.85em;color:#888;margin-top:4px;text-align:right;">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>`;
  }).join('');
}

// ===== Helper di scroll affidabili =====
function scrollToBottomNow() {
  const chatDiv = document.getElementById('chat-messages');
  if (chatDiv) {
    chatDiv.scrollTop = chatDiv.scrollHeight + 1000; // vai ben oltre il fondo del container
  }
  // fallback: scroll della pagina intera, utile se il container non è scrollabile
  window.scrollTo(0, document.body.scrollHeight);
}

function scrollToBottomHard() {
  // più tentativi per coprire render asincroni/layout
  scrollToBottomNow();
  requestAnimationFrame(scrollToBottomNow);
  setTimeout(scrollToBottomNow, 100);
  setTimeout(scrollToBottomNow, 250);
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

  loadMessages(friendId, false); // false = caricamento normale
}

// Auto-refresh della chat
let chatRefreshInterval = null;
let currentFriendId = null;

function startChatAutoRefresh(friendId) {
  currentFriendId = friendId;
  
  // Ferma eventuali refresh precedenti
  if (chatRefreshInterval) {
    clearInterval(chatRefreshInterval);
  }
  

  
  // Refresh ogni 3 secondi
  chatRefreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {

      loadMessages(friendId, true); // true = isAutoRefresh
    }
  }, 3000);
}

function stopChatAutoRefresh() {
  if (chatRefreshInterval) {
    clearInterval(chatRefreshInterval);
    chatRefreshInterval = null;

  }
}

// Setup eventi
window.addEventListener('DOMContentLoaded', async () => {
  // Emoji picker
  const emojiBtn = document.getElementById('emoji-btn');
  const emojiPicker = document.getElementById('emoji-picker');
  const chatInput = document.getElementById('chat-input');
  const emojiList = ['😀','😁','😂','🤣','😊','😍','😎','😢','😡','👍','🙏','🎉','❤️','🔥','🥳','😅','😇','😜','🤔','🙌','💯'];
  if (emojiBtn && emojiPicker && chatInput) {
    emojiBtn.addEventListener('click', function(e) {
      e.preventDefault();
      emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
      emojiPicker.innerHTML = emojiList.map(emoji => `<button type='button' style='font-size:18px;padding:4px 7px;border:none;background:none;cursor:pointer;'>${emoji}</button>`).join('');
      // Posiziona il picker sotto il bottone
      const rect = emojiBtn.getBoundingClientRect();
      emojiPicker.style.left = rect.left + 'px';
      emojiPicker.style.bottom = (window.innerHeight - rect.bottom + 40) + 'px';
    });
    emojiPicker.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON') {
        chatInput.value += e.target.textContent;
        chatInput.focus();
        emojiPicker.style.display = 'none';
      }
    });
    document.addEventListener('click', function(e) {
      if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
      }
    });
  }
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
      
      // 🚀 Attiva auto-refresh della chat
      startChatAutoRefresh(friendId);
    });

  form.addEventListener('submit', function(e) {

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

// Ferma auto-refresh quando si esce dalla pagina
window.addEventListener('beforeunload', () => {
  stopChatAutoRefresh();
});
