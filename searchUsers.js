// searchUsers.js - DO NOT redeclare supabaseUrl/supabaseKey, use window.supabase from app.js
console.log('🔍 searchUsers.js loaded');

let currentUserId = null;

// Function to show status messages
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('search-status');
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  statusDiv.style.backgroundColor = type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#eef';
  statusDiv.style.color = type === 'error' ? '#c00' : type === 'success' ? '#0a0' : '#00c';
  
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}

// Function to search users
async function searchUsers(query) {
  console.log('[searchUsers] Called with query:', query);
  const resultsContainer = document.getElementById('search-results');
  
  if (!query || query.trim().length < 2) {
    resultsContainer.innerHTML = '<p style="text-align: center; color: #888;">Digita almeno 2 caratteri per cercare...</p>';
    return;
  }

  try {
    resultsContainer.innerHTML = '<div class="spinner"></div><p style="text-align: center;">Ricerca in corso...</p>';
    
    const searchTerm = query.trim().toLowerCase();
    console.log('[searchUsers] Searching for:', searchTerm);

    // Search for users by username or email
    const { data: users, error } = await window.supabase
      .from('users')
      .select('id, username, mail')
      .or(`username.ilike.%${searchTerm}%,mail.ilike.%${searchTerm}%`);

    console.log('[searchUsers] Results:', users);

    if (error) {
      console.error('[searchUsers] Error:', error);
      resultsContainer.innerHTML = `<p style="color: red;">❌ Errore nella ricerca: ${error.message}</p>`;
      return;
    }

    if (!users || users.length === 0) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888;">
          <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
          <h3 style="margin: 10px 0;">Nessun utente trovato</h3>
          <p>Prova con un altro termine di ricerca</p>
        </div>
      `;
      return;
    }

    // Filter out current user
    const filteredUsers = users.filter(u => u.id !== currentUserId);

    if (filteredUsers.length === 0) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888;">
          <div style="font-size: 48px; margin-bottom: 10px;">👤</div>
          <h3 style="margin: 10px 0;">Nessun altro utente trovato</h3>
          <p>Sei l'unico risultato della ricerca</p>
        </div>
      `;
      return;
    }

    // Display results as cards
    resultsContainer.innerHTML = filteredUsers.map(user => `
      <div class="user-card" style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        margin: 12px 0;
        border: 1px solid #ddd;
        border-radius: 12px;
        background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: transform 0.2s;
      ">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
          <div style="
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 20px;
          ">
            ${(user.username || user.mail).substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div style="font-weight: 600; font-size: 16px;">${user.username || user.mail.split('@')[0]}</div>
            <div style="font-size: 14px; color: #666;">${user.mail}</div>
          </div>
        </div>
        <button 
          onclick="sendFriendRequest('${user.id}', '${(user.username || user.mail).replace(/'/g, "\\'")}', event)"
          style="
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: transform 0.2s;
          "
          onmouseover="this.style.transform='scale(1.05)'"
          onmouseout="this.style.transform='scale(1)'"
        >
          Aggiungi amico
        </button>
      </div>
    `).join('');

  } catch (err) {
    console.error('[searchUsers] Exception:', err);
    resultsContainer.innerHTML = `<p style="color: red;">❌ Errore: ${err.message}</p>`;
  }
}

// Function to send friend request
async function sendFriendRequest(receiverId, receiverName, event) {
  if (event) event.stopPropagation();
  
  console.log('[sendFriendRequest] Sending request to:', receiverId, receiverName);

  try {
    // Get current user's users.id (not auth id)
    const { data: { user: authUser } } = await window.supabase.auth.getUser();
    if (!authUser) {
      showStatus('Errore: utente non autenticato', 'error');
      return;
    }

    const { data: userRow, error: userError } = await window.supabase
      .from('users')
      .select('id, username, mail')
      .eq('mail', authUser.email)
      .single();

    if (userError || !userRow) {
      console.error('[sendFriendRequest] Error getting sender user:', userError);
      showStatus('Errore: impossibile identificare l\'utente', 'error');
      return;
    }

    const senderId = userRow.id;
    const senderName = userRow.username || userRow.mail;
    console.log('[sendFriendRequest] Sender ID:', senderId, 'Receiver ID:', receiverId);

    // Check if request already exists (in any direction)
    const { data: existingRequests, error: checkError } = await window.supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`);

    if (checkError) {
      console.error('[sendFriendRequest] Error checking existing requests:', checkError);
    }

    if (existingRequests && existingRequests.length > 0) {
      showStatus('Esiste già una richiesta di amicizia tra voi', 'error');
      return;
    }

    // Insert friend request
    const requestData = {
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('[sendFriendRequest] Inserting request:', requestData);

    const { data: requestResult, error: requestError } = await window.supabase
      .from('friend_requests')
      .insert([requestData])
      .select()
      .single();

    if (requestError) {
      console.error('[sendFriendRequest] Error inserting request:', requestError);
      showStatus(`Errore invio richiesta: ${requestError.message}`, 'error');
      return;
    }

    console.log('[sendFriendRequest] Request inserted:', requestResult);

    // Create notification for receiver
    const notificationData = {
      user_id: receiverId,
      titolo: 'Nuova richiesta di amicizia',
      messaggio: `${senderName} ti ha inviato una richiesta di amicizia`,
      data: new Date().toISOString(),
      letto: false
    };

    console.log('[sendFriendRequest] Creating notification:', notificationData);

    const { error: notifError } = await window.supabase
      .from('notification')
      .insert([notificationData]);

    if (notifError) {
      console.error('[sendFriendRequest] Error creating notification:', notifError);
    } else {
      console.log('[sendFriendRequest] Notification created successfully');
    }

    showStatus(`✅ Richiesta di amicizia inviata a ${receiverName}!`, 'success');

  } catch (err) {
    console.error('[sendFriendRequest] Exception:', err);
    showStatus(`Errore: ${err.message}`, 'error');
  }
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[searchUsers] DOMContentLoaded');

  // Check auth and get current user ID
  try {
    const { data: { user: authUser } } = await window.supabase.auth.getUser();
    if (!authUser) {
      window.location.href = 'index.html';
      return;
    }

    const { data: userRow, error: userError } = await window.supabase
      .from('users')
      .select('id')
      .eq('mail', authUser.email)
      .single();

    if (userError || !userRow) {
      console.error('[searchUsers] Error getting user ID:', userError);
      alert('Errore nel caricamento profilo utente');
      return;
    }

    currentUserId = userRow.id;
    console.log('[searchUsers] Current user ID:', currentUserId);

  } catch (err) {
    console.error('[searchUsers] Error in initialization:', err);
    alert('Errore: ' + err.message);
    return;
  }

  // Setup search input listener
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value;
      console.log('[searchUsers] Input event, query:', query);
      
      searchTimeout = setTimeout(() => {
        searchUsers(query);
      }, 500); // Debounce for 500ms
    });
    console.log('[searchUsers] Search input listener attached');
  } else {
    console.error('[searchUsers] Search input element not found!');
  }
});
