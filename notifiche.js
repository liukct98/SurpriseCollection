// notifiche.js
// Gestione notifiche globali (popup, badge) riutilizzabile in tutte le pagine

// Funzione per aggiungere una notifica per tutti gli utenti
async function aggiungiNotificaCatalogo(tipo, nomeSerie) {
  if (!window.supabase) return;
  let titolo = 'Catalogo aggiornato';
  let messaggio = '';
  if (tipo === 'aggiunta') {
    messaggio = `È stata aggiunta una serie: <b>${nomeSerie}</b>`;
  } else if (tipo === 'modifica') {
    messaggio = `È stata modificata la serie: <b>${nomeSerie}</b>`;
  } else {
    messaggio = `Aggiornamento catalogo: <b>${nomeSerie}</b>`;
  }

  // Recupera tutti gli utenti
  const { data: utenti, error: utentiError } = await supabase.from('users').select('id');
  if (utentiError) {
    return;
  }

  // Crea una notifica per ogni utente
  const notifiche = utenti.map(u => ({
    user_id: u.id,
    titolo,
    messaggio,
    data: new Date().toISOString(),
    letto: false
  }));

  // Inserisci tutte le notifiche
  const { error: insertError } = await supabase.from('notification').insert(notifiche);
  if (insertError) {
  }
}

// Esempio di utilizzo:
// aggiungiNotificaCatalogo('aggiunta', 'Sorpresine Kinder - I Puffi');
// aggiungiNotificaCatalogo('modifica', 'Sorpresine Kinder - I Puffi');

// ============ FUNZIONI POPUP/BADGE GLOBALI ============

// Evita ridefinizioni se alcune pagine hanno già versioni inline
if (!window.loadNotifichePersonali) {
  window.loadNotifichePersonali = async function loadNotifichePersonali() {
    if (!window.supabase) return [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    // Recupera users.id tramite email
    const { data: userRow } = await supabase
      .from('users')
      .select('id, username, mail')
      .eq('mail', user.email)
      .single();
    if (!userRow) return [];
    const userId = userRow.id;

    // Messaggi chat non letti
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at, sender:sender_id(username, mail)')
      .eq('receiver_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });
    const messaggiNotifiche = (unreadMessages || []).map(m => ({
      id: 'message-' + m.id,
      titolo: `Messaggio da ${m.sender?.username || m.sender?.mail || m.sender_id}`,
      messaggio: m.content && m.content.length > 50 ? m.content.substring(0, 50) + '...' : (m.content || ''),
      data: m.created_at,
      letto: false,
      tipo: 'chat_message',
      sender_id: m.sender_id,
      message_id: m.id
    }));

    // Notifiche classiche
    const { data: notifiche } = await supabase
      .from('notification')
      .select('*')
      .eq('user_id', userId)
      .order('data', { ascending: false });
    const nonLetti = (notifiche || []).filter(n => !n.letto);

    // Richieste amicizia pendenti
    const { data: richieste } = await supabase
      .from('friend_requests')
      .select('id, sender_id, status, created_at, sender:sender_id(username, mail)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    const richiesteNotifiche = (richieste || []).map(r => ({
      id: 'friendreq-' + r.id,
      titolo: 'Richiesta di amicizia',
      messaggio: `Hai ricevuto una richiesta da ${r.sender?.username || r.sender?.mail || r.sender_id}`,
      data: r.created_at,
      letto: false,
      tipo: 'friend_request',
      friendRequestId: r.id
    }));

    return [...messaggiNotifiche, ...nonLetti, ...richiesteNotifiche]
      .sort((a, b) => new Date(b.data) - new Date(a.data));
  }
}

if (!window.showNotifichePopup) {
  window.showNotifichePopup = function showNotifichePopup(notifiche) {
    let popup = document.getElementById('notifiche-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'notifiche-popup';
      popup.style.position = 'fixed';
      popup.style.top = '60px';
      popup.style.left = '20px';
      popup.style.background = '#fff';
      popup.style.border = '1px solid #ccc';
      popup.style.borderRadius = '10px';
      popup.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
      popup.style.zIndex = '2000';
      popup.style.minWidth = '270px';
      popup.style.maxWidth = '350px';
      popup.style.maxHeight = '60vh';
      popup.style.overflowY = 'auto';
      popup.style.padding = '0';
      document.body.appendChild(popup);
    }
    let html = `<div style='padding:12px 16px 8px 16px; border-bottom:1px solid #eee; display:flex; align-items:center; justify-content:space-between;'>
      <span style='font-weight:600;font-size:1.1em;'>Notifiche</span>
      <div style='display:flex; gap:8px; align-items:center;'>
        <button onclick="event.stopPropagation(); clearAllNotifications();" title='Cancella tutte' style='background:#f5f5f5;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.9em;'>Svuota</button>
        <button onclick="document.getElementById('notifiche-popup').style.display='none'" style='background:none;border:none;font-size:1.2em;cursor:pointer;'>&times;</button>
      </div>
    </div>`;
    if (!notifiche || notifiche.length === 0) {
      html += `<div style='padding:18px;text-align:center;color:#888;'>Nessuna notifica</div>`;
    } else {
      notifiche.forEach(n => {
        if (n.tipo === 'friend_request') {
          html += `
            <div style='padding:0;display:flex;justify-content:center;'>
              <div style='background:#43aa8b;padding:18px 18px 12px 18px;border-radius:14px;box-shadow:0 2px 8px rgba(60,60,60,0.10);margin:12px 0;min-width:220px;max-width:320px;width:100%;display:flex;flex-direction:column;align-items:center;cursor:pointer;' onclick="window.location.href='friendRequests.html#friend-requests-list'"> 
                <div style='font-weight:600;font-size:1.15em;color:#fff;margin-bottom:4px;'>${n.titolo || 'Richiesta di amicizia'}</div>
                <div style='font-size:1em;color:#222;margin-bottom:4px;text-align:center;'>${n.messaggio}</div>
                <div style='font-size:0.95em;color:#eee;margin-bottom:8px;'>${new Date(n.data).toLocaleString('it-IT')}</div>
                <div style='display:flex;gap:10px;'>
                  <button onclick="event.stopPropagation();accettaFriendRequest && accettaFriendRequest('${n.friendRequestId}')" style='background:#fff;color:#43aa8b;border:none;padding:7px 18px;border-radius:8px;cursor:pointer;font-weight:600;'>Accetta</button>
                  <button onclick="event.stopPropagation();rifiutaFriendRequest && rifiutaFriendRequest('${n.friendRequestId}')" style='background:#fff;color:#e74c3c;border:none;padding:7px 18px;border-radius:8px;cursor:pointer;font-weight:600;'>Rifiuta</button>
                </div>
              </div>
            </div>
          `;
        } else if (n.tipo === 'chat_message') {
          html += `
            <div style='padding:0;display:flex;justify-content:center;'>
              <div style='background:#4a90e2;padding:18px 18px 12px 18px;border-radius:14px;box-shadow:0 2px 8px rgba(60,60,60,0.10);margin:12px 0;min-width:220px;max-width:320px;width:100%;display:flex;flex-direction:column;align-items:center;cursor:pointer;' onclick="window.location.href='chat.html?friend_id=${n.sender_id}'"> 
                <div style='font-weight:600;font-size:1.15em;color:#fff;margin-bottom:4px;'>${n.titolo || 'Nuovo messaggio'}</div>
                <div style='font-size:1em;color:#222;margin-bottom:4px;text-align:center;'>${n.messaggio}</div>
                <div style='font-size:0.95em;color:#eee;margin-bottom:8px;'>${new Date(n.data).toLocaleString('it-IT')}</div>
                <div style='display:flex;gap:10px;'>
                  <button onclick="event.stopPropagation();archiviaNotifica('${n.id}')" style='background:#fff;color:#4a90e2;border:none;padding:7px 18px;border-radius:8px;cursor:pointer;font-weight:600;'>Archivia</button>
                </div>
              </div>
            </div>
          `;
        } else {
          html += `
            <div style='padding:12px 16px; border-bottom:1px solid #f3f3f3; display:flex; align-items:flex-start; gap:8px;'>
              <div style='flex:1;'>
                <div style='font-weight:500;'>${n.titolo || 'Notifica'}</div>
                <div style='font-size:0.97em;color:#444;margin-top:2px;'>${n.messaggio}</div>
                <div style='font-size:0.85em;color:#aaa;margin-top:4px;'>${new Date(n.data).toLocaleString('it-IT')}</div>
              </div>
              <button onclick="archiviaNotifica('${n.id}')" style='background:none;border:none;color:#e74c3c;font-size:1.1em;cursor:pointer;' title='Archivia'>&#128465;</button>
            </div>
          `;
        }
      });
    }
    popup.innerHTML = html;
    popup.style.display = 'block';
  }
}

if (!window.updateNotificheBadge) {
  window.updateNotificheBadge = async function updateNotificheBadge() {
    const notifiche = await window.loadNotifichePersonali();
    const badge = document.getElementById('notifiche-badge');
    if (!badge) return;
    if (notifiche.length > 0) {
      badge.textContent = notifiche.length;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

if (!window.archiviaNotifica) {
  window.archiviaNotifica = async function archiviaNotifica(id) {
    if (id.startsWith('message-')) {
      const messageId = id.replace('message-', '');
      await supabase.from('messages').update({ read: true }).eq('id', messageId);
    } else if (id.startsWith('friendreq-')) {
      return; // gestita altrove
    } else {
      await supabase.from('notification').delete().eq('id', id);
    }
    await window.updateNotificheBadge();
    const notifiche = await window.loadNotifichePersonali();
    window.showNotifichePopup(notifiche);
  }
}

if (!window.clearAllNotifications) {
  window.clearAllNotifications = async function clearAllNotifications() {
    if (!confirm('Sei sicuro di voler svuotare tutte le notifiche?')) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('mail', user.email)
      .single();
    if (!userRow) return;
    const userId = userRow.id;
    try {
      await supabase.from('messages').update({ read: true }).eq('receiver_id', userId).eq('read', false);
    } catch (e) {}
    try {
      await supabase.from('notification').delete().eq('user_id', userId);
    } catch (e) {}
    await window.updateNotificheBadge();
    const notifiche = await window.loadNotifichePersonali();
    window.showNotifichePopup(notifiche);
    if (typeof showStatus === 'function') showStatus('Notifiche svuotate', 'success');
  }
}

// Attacca il listener al bottone campanella su tutte le pagine
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('nav-notifiche-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      const notifiche = await window.loadNotifichePersonali();
      window.showNotifichePopup(notifiche);
    });
  }
  // Aggiorna badge all'avvio
  if (typeof window.updateNotificheBadge === 'function') {
    window.updateNotificheBadge();
  }
});
