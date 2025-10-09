// friendRequests.js - DO NOT redeclare supabaseUrl/supabaseKey, use window.supabase from app.js
console.log('👥 friendRequests.js loaded');

let currentUserId = null;

// Function to show status message
function showStatus(message, type = 'info') {
  const statusDiv = document.createElement('div');
  statusDiv.textContent = message;
  statusDiv.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    background: ${type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#eef'};
    color: ${type === 'error' ? '#c00' : type === 'success' ? '#0a0' : '#00c'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-weight: 600;
  `;
  document.body.appendChild(statusDiv);
  
  setTimeout(() => {
    statusDiv.remove();
  }, 3000);
}

// Function to load friend requests
async function loadFriendRequests() {
  console.log('[loadFriendRequests] Starting...');
  const requestsContainer = document.getElementById('friend-requests-list');
  const debugInfo = document.getElementById('debug-info');

  try {
    // Get current user
    const { data: { user: authUser } } = await window.supabase.auth.getUser();
    if (!authUser) {
      console.error('[loadFriendRequests] No authenticated user');
      requestsContainer.innerHTML = '<p style="color: red;">❌ Utente non autenticato</p>';
      return;
    }

    const { data: userRow, error: userError } = await window.supabase
      .from('users')
      .select('id, username, mail')
      .eq('mail', authUser.email)
      .single();

    if (userError || !userRow) {
      console.error('[loadFriendRequests] Error getting user:', userError);
      requestsContainer.innerHTML = '<p style="color: red;">❌ Errore nel caricamento utente</p>';
      return;
    }

    currentUserId = userRow.id;
    console.log('[loadFriendRequests] Current user ID:', currentUserId);

    // Load pending friend requests
    const { data: requests, error: requestsError } = await window.supabase
      .from('friend_requests')
      .select('*, sender:users!friend_requests_sender_id_fkey(id, username, mail)')
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending');

    console.log('[loadFriendRequests] Requests query result:', requests);
    console.log('[loadFriendRequests] Requests error:', requestsError);

    // Show debug info
    debugInfo.innerHTML = `
      <strong>🔍 Debug Info:</strong><br>
      User ID: ${currentUserId}<br>
      Requests found: ${requests ? requests.length : 0}<br>
      Error: ${requestsError ? requestsError.message : 'none'}
    `;

    if (requestsError) {
      console.error('[loadFriendRequests] Error loading requests:', requestsError);
      requestsContainer.innerHTML = `<p style="color: red;">❌ Errore: ${requestsError.message}</p>`;
      return;
    }

    if (!requests || requests.length === 0) {
      requestsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888;">
          <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
          <h3 style="margin: 10px 0;">Nessuna richiesta</h3>
          <p>Non hai richieste di amicizia in sospeso</p>
        </div>
      `;
      return;
    }

    // Display requests
    requestsContainer.innerHTML = requests.map(req => {
      const senderName = req.sender?.username || req.sender?.mail?.split('@')[0] || 'Utente';
      const senderEmail = req.sender?.mail || '';
      
      return `
        <div class="friend-request-card" style="
          padding: 16px;
          margin: 12px 0;
          border: 2px solid #667eea;
          border-radius: 12px;
          background: linear-gradient(to right, #f8f9ff, #ffffff);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
        ">
          <div style="display: flex; align-items: center; justify-content: space-between;">
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
                ${senderName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style="font-weight: 600; font-size: 16px;">${senderName}</div>
                <div style="font-size: 14px; color: #666;">${senderEmail}</div>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">
                  ${new Date(req.created_at).toLocaleDateString('it-IT')}
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button 
                onclick="acceptFriendRequest('${req.id}', '${senderName.replace(/'/g, "\\'")}', event)"
                style="
                  padding: 10px 20px;
                  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                "
              >
                ✓ Accetta
              </button>
              <button 
                onclick="declineFriendRequest('${req.id}', '${senderName.replace(/'/g, "\\'")}', event)"
                style="
                  padding: 10px 20px;
                  background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 600;
                "
              >
                ✗ Rifiuta
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('[loadFriendRequests] Exception:', err);
    requestsContainer.innerHTML = `<p style="color: red;">❌ Errore: ${err.message}</p>`;
  }
}

// Function to load friends list
async function loadFriends() {
  console.log('[loadFriends] Starting...');
  const friendsContainer = document.getElementById('friends-list');

  try {
    if (!currentUserId) {
      const { data: { user: authUser } } = await window.supabase.auth.getUser();
      if (!authUser) return;

      const { data: userRow } = await window.supabase
        .from('users')
        .select('id')
        .eq('mail', authUser.email)
        .single();

      if (!userRow) return;
      currentUserId = userRow.id;
    }

    // Load accepted friend requests (both directions)
    const { data: friendships, error: friendsError } = await window.supabase
      .from('friend_requests')
      .select('*, sender:users!friend_requests_sender_id_fkey(id, username, mail), receiver:users!friend_requests_receiver_id_fkey(id, username, mail)')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    console.log('[loadFriends] Friendships:', friendships);

    if (friendsError) {
      console.error('[loadFriends] Error:', friendsError);
      friendsContainer.innerHTML = `<p style="color: red;">❌ Errore: ${friendsError.message}</p>`;
      return;
    }

    if (!friendships || friendships.length === 0) {
      friendsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888;">
          <div style="font-size: 48px; margin-bottom: 10px;">👤</div>
          <h3 style="margin: 10px 0;">Nessun amico</h3>
          <p>Cerca utenti e invia richieste di amicizia!</p>
          <button 
            onclick="location.href='searchUsers.html'" 
            style="margin-top: 15px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;"
          >
            🔍 Cerca Utenti
          </button>
        </div>
      `;
      return;
    }

    // Extract friend info (the other user in each friendship)
    const friends = friendships.map(f => {
      if (f.sender_id === currentUserId) {
        return { ...f.receiver, friendship_id: f.id };
      } else {
        return { ...f.sender, friendship_id: f.id };
      }
    });

    // Display friends
    friendsContainer.innerHTML = friends.map(friend => {
      const friendName = friend.username || friend.mail?.split('@')[0] || 'Utente';
      const friendEmail = friend.mail || '';

      return `
        <div class="friend-card" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          margin: 12px 0;
          border: 1px solid #ddd;
          border-radius: 12px;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 20px;
            ">
              ${friendName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 16px;">${friendName}</div>
              <div style="font-size: 14px; color: #666;">${friendEmail}</div>
            </div>
          </div>
          <div style="color: #11998e; font-size: 20px;">✓</div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('[loadFriends] Exception:', err);
    friendsContainer.innerHTML = `<p style="color: red;">❌ Errore: ${err.message}</p>`;
  }
}

// Function to accept friend request
async function acceptFriendRequest(requestId, senderName, event) {
  if (event) event.stopPropagation();
  
  console.log('[acceptFriendRequest] Accepting request:', requestId);

  try {
    // Update request status
    const { error } = await window.supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      console.error('[acceptFriendRequest] Error:', error);
      showStatus(`Errore: ${error.message}`, 'error');
      return;
    }

    // Get the sender_id from the request to send notification
    const { data: request } = await window.supabase
      .from('friend_requests')
      .select('sender_id')
      .eq('id', requestId)
      .single();

    if (request) {
      // Send notification to sender
      const { data: currentUserData } = await window.supabase
        .from('users')
        .select('username, mail')
        .eq('id', currentUserId)
        .single();

      const currentUserName = currentUserData?.username || currentUserData?.mail?.split('@')[0] || 'Un utente';

      await window.supabase
        .from('notification')
        .insert([{
          user_id: request.sender_id,
          titolo: 'Richiesta accettata',
          messaggio: `${currentUserName} ha accettato la tua richiesta di amicizia`,
          data: new Date().toISOString(),
          letto: false
        }]);
    }

    // Delete the corresponding notification for current user
    await window.supabase
      .from('notification')
      .delete()
      .eq('user_id', currentUserId)
      .ilike('messaggio', `%${senderName}%amicizia%`);

    showStatus(`✅ Richiesta di ${senderName} accettata!`, 'success');
    
    // Reload lists
    await loadFriendRequests();
    await loadFriends();

  } catch (err) {
    console.error('[acceptFriendRequest] Exception:', err);
    showStatus(`Errore: ${err.message}`, 'error');
  }
}

// Function to decline friend request
async function declineFriendRequest(requestId, senderName, event) {
  if (event) event.stopPropagation();
  
  console.log('[declineFriendRequest] Declining request:', requestId);

  try {
    // Update request status
    const { error } = await window.supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);

    if (error) {
      console.error('[declineFriendRequest] Error:', error);
      showStatus(`Errore: ${error.message}`, 'error');
      return;
    }

    // Get the sender_id from the request to send notification
    const { data: request } = await window.supabase
      .from('friend_requests')
      .select('sender_id')
      .eq('id', requestId)
      .single();

    if (request) {
      // Send notification to sender
      const { data: currentUserData } = await window.supabase
        .from('users')
        .select('username, mail')
        .eq('id', currentUserId)
        .single();

      const currentUserName = currentUserData?.username || currentUserData?.mail?.split('@')[0] || 'Un utente';

      await window.supabase
        .from('notification')
        .insert([{
          user_id: request.sender_id,
          titolo: 'Richiesta rifiutata',
          messaggio: `${currentUserName} ha rifiutato la tua richiesta di amicizia`,
          data: new Date().toISOString(),
          letto: false
        }]);
    }

    // Delete the corresponding notification for current user
    await window.supabase
      .from('notification')
      .delete()
      .eq('user_id', currentUserId)
      .ilike('messaggio', `%${senderName}%amicizia%`);

    showStatus(`Richiesta di ${senderName} rifiutata`, 'success');
    
    // Reload list
    await loadFriendRequests();

  } catch (err) {
    console.error('[declineFriendRequest] Exception:', err);
    showStatus(`Errore: ${err.message}`, 'error');
  }
}

// Setup on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[friendRequests] DOMContentLoaded - Starting initialization');
  
  try {
    // Check auth
    const { data: { user: authUser } } = await window.supabase.auth.getUser();
    if (!authUser) {
      console.error('[friendRequests] No authenticated user, redirecting...');
      window.location.href = 'index.html';
      return;
    }
    console.log('[friendRequests] Authenticated user:', authUser.email);

    // Load data
    await loadFriendRequests();
    await loadFriends();

  } catch (err) {
    console.error('[friendRequests] Error in initialization:', err);
    document.getElementById('friend-requests-list').innerHTML = `<p style="color: red;">❌ Errore: ${err.message}</p>`;
    document.getElementById('friends-list').innerHTML = `<p style="color: red;">❌ Errore: ${err.message}</p>`;
  }
});
