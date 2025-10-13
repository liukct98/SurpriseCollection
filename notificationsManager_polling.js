// =========================
// GESTORE NOTIFICHE CHAT - VERSIONE POLLING
// (per Supabase senza Real-time)
// =========================


class ChatNotificationsManager {
  constructor() {
    this.supabase = null;
    this.currentUserId = null;
    this.notificationCount = 0;
    this.isInitialized = false;
    this.pollingInterval = null;
    this.pollingFrequency = 3000; // Controlla ogni 3 secondi
    
    // Badge sarà creato durante l'inizializzazione quando il DOM è pronto
  }

  // Inizializza il gestore notifiche
  async init() {
    try {
      
      // Crea sempre il badge, indipendentemente dall'autenticazione
      this.createNotificationBadge();
      
      // Verifica che Supabase client sia disponibile (già configurato in app.js)
      if (typeof supabase === 'undefined') {
        return false;
      }

      // Usa il client Supabase già configurato
      this.supabase = supabase;

      // Ottieni l'utente corrente
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      // Ottieni l'ID utente dalla tabella users
      const { data: userRow, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('mail', user.email)
        .single();


      if (error || !userRow) {
        return false;
      }

      this.currentUserId = userRow.id;

      // Richiedi permessi notifiche
      await this.requestNotificationPermission();

      // Conta messaggi non letti esistenti
      await this.updateUnreadCount();

      // Avvia il polling
      this.startPolling();

      this.isInitialized = true;
      return true;

    } catch (error) {
      // Anche se c'è un errore, il badge dovrebbe essere creato
      return false;
    }
  }

  // Richiedi l'autorizzazione per le notifiche browser
  async requestNotificationPermission() {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        return true;
      }
    }

    return false;
  }

  // Usa il badge delle notifiche esistente nell'header
  createNotificationBadge() {
    
    // Verifica che il badge nell'header esista
    const headerBadge = document.getElementById('notifiche-badge');
    const headerBtn = document.getElementById('nav-notifiche-btn');
    
    if (!headerBadge || !headerBtn) {
      setTimeout(() => this.createNotificationBadge(), 500);
      return;
    }

    // Il badge serve SOLO per mostrare il numero
    // NON aggiungiamo click listener - solo le notifiche browser portano alle chat
    
  }

  // Aggiorna il contatore badge nell'header
  updateBadge(count) {
    
    const headerBadge = document.getElementById('notifiche-badge');
    const headerBtn = document.getElementById('nav-notifiche-btn');
    
    
    if (!headerBadge) {
      // Prova a cercarlo in modo diverso
      const allBadges = document.querySelectorAll('[id*="badge"], [class*="badge"]');
      return;
    }

    if (count > 0) {
      headerBadge.textContent = count > 99 ? '99+' : count.toString();
      headerBadge.style.display = 'inline-block';
      headerBadge.style.visibility = 'visible';
      if (headerBtn) {
        headerBtn.style.position = 'relative'; // Per posizionare il badge
      }
    } else {
      headerBadge.style.display = 'none';
    }
  }

  // Avvia il controllo periodico (polling)
  startPolling() {
    if (!this.currentUserId) return;


    // Salva il timestamp dell'ultimo controllo
    this.lastCheck = new Date();

    this.pollingInterval = setInterval(async () => {
      await this.checkForNewMessages();
    }, this.pollingFrequency);

    // Primo controllo immediato
    this.checkForNewMessages();
  }

  // Controlla se ci sono nuovi messaggi
  async checkForNewMessages() {
    if (!this.currentUserId) return;

    try {
      
      // Aggiorna il contatore dei messaggi non letti
      await this.updateUnreadCount();

    } catch (error) {
    }
  }

  // Conta i messaggi non letti direttamente dalla tabella messages
  async updateUnreadCount() {
    if (!this.currentUserId) return;

    try {
      // Conta i messaggi non letti ricevuti da questo utente
      const { data: unreadMessages, error } = await this.supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', this.currentUserId)
        .eq('read', false);

      if (error) {
        this.notificationCount = 0;
        this.updateBadge(0);
        return;
      }

      const unreadCount = unreadMessages ? unreadMessages.length : 0;
      
      this.notificationCount = unreadCount;
      this.updateBadge(this.notificationCount);

    } catch (error) {
      // Fallback: inizializza con 0
      this.notificationCount = 0;
      this.updateBadge(0);
    }
  }

  // Assicura che esista la tabella unread_messages
  async ensureUnreadMessagesTable() {
    // Tenta di creare la tabella (ignorerà se esiste già)
    try {
      await this.supabase.rpc('create_unread_messages_table_if_not_exists');
    } catch (error) {
      // Ignora errori, probabilmente la tabella esiste già
    }
  }

  // Gestisce l'arrivo di un nuovo messaggio
  async handleNewMessage(message) {
    try {
      // Ottieni info sul mittente
      const { data: sender, error } = await this.supabase
        .from('users')
        .select('username, mail')
        .eq('id', message.sender_id)
        .single();

      if (error) {
        return;
      }

      const senderName = sender.username || sender.mail;

      // Controlla se l'utente è nella pagina chat con questo mittente
      const currentPage = window.location.pathname;
      const isInChatWithSender = currentPage.includes('chat.html') && 
                                new URLSearchParams(window.location.search).get('friend_id') === message.sender_id.toString();

      if (isInChatWithSender) {
        // Se è nella chat con il mittente, ricarica i messaggi invece di notificare
        if (typeof loadMessages === 'function') {
          loadMessages(message.sender_id);
        }
        return;
      }

      // Aggiungi alla tabella unread_messages
      await this.supabase
        .from('unread_messages')
        .insert({
          user_id: this.currentUserId,
          message_id: message.id,
          sender_id: message.sender_id,
          created_at: new Date().toISOString()
        });

      // Aggiungi messaggio al pannello notifiche (NO notifiche browser)
      try {
        // Controlla se esiste già una notifica per questo messaggio
        const { data: existingNotification } = await this.supabase
          .from('notification')
          .select('id')
          .eq('user_id', this.currentUserId)
          .eq('tipo', 'chat_message')
          .eq('message_id', message.id)
          .single();

        if (existingNotification) {
          return;
        }

        const messagePreview = message.content.length > 50 ? 
          message.content.substring(0, 50) + '...' : 
          message.content;

        const notificationData = {
          user_id: this.currentUserId,
          titolo: `Messaggio da ${senderName}`,
          messaggio: messagePreview,
          data: new Date().toISOString(),
          letto: false,
          tipo: 'chat_message',
          sender_id: message.sender_id,
          message_id: message.id
        };

        const { error: insertError } = await this.supabase
          .from('notification')
          .insert(notificationData);

        if (insertError) {
        } else {
        }

      } catch (error) {
      }


    } catch (error) {
    }
  }

  // Marca i messaggi come letti per un mittente specifico
  async markMessagesAsRead(senderId) {
    if (!this.currentUserId) return;

    try {
      const { error } = await this.supabase
        .from('unread_messages')
        .delete()
        .eq('user_id', this.currentUserId)
        .eq('sender_id', senderId);

      if (error) {
        return;
      }

      await this.updateUnreadCount();

    } catch (error) {
    }
  }

  // Marca tutti i messaggi come letti
  async markAllMessagesAsRead() {
    if (!this.currentUserId) return;

    try {
      const { error } = await this.supabase
        .from('unread_messages')
        .delete()
        .eq('user_id', this.currentUserId);

      if (error) {
        return;
      }

      await this.updateUnreadCount();

    } catch (error) {
    }
  }

  // Modifica la frequenza di polling
  setPollingFrequency(milliseconds) {
    this.pollingFrequency = milliseconds;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.startPolling();
    }
  }

  // Pulisce il polling
  cleanup() {
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Resetta badge header
    const headerBadge = document.getElementById('notifiche-badge');
    if (headerBadge) {
      headerBadge.style.display = 'none';
      headerBadge.textContent = '0';
    }
  }

  // Getter per verificare se è inizializzato
  get initialized() {
    return this.isInitialized;
  }

  // Metodo pubblico per forzare la creazione del badge
  forceBadgeCreation() {
    this.createNotificationBadge();
  }
}

// Crea istanza globale
window.notificationsManager = new ChatNotificationsManager();

// Auto-inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', async () => {
  
  // Aspetta che Supabase sia disponibile
  let retries = 0;
  const maxRetries = 10;
  
  const waitForSupabase = async () => {
    if (typeof supabase !== 'undefined') {
      const success = await window.notificationsManager.init();
      if (success) {
      } else {
      }
    } else {
      retries++;
      if (retries < maxRetries) {
        setTimeout(waitForSupabase, 500);
      } else {
      }
    }
  };
  
  waitForSupabase();
});

// Pulizia quando la pagina viene scaricata
window.addEventListener('beforeunload', () => {
  if (window.notificationsManager) {
    window.notificationsManager.cleanup();
  }
});

// Metti in pausa il polling quando la tab non è attiva (risparmia risorse)
document.addEventListener('visibilitychange', () => {
  if (window.notificationsManager && window.notificationsManager.initialized) {
    if (document.hidden) {
      // Tab nascosta - riduci frequenza polling
      window.notificationsManager.setPollingFrequency(10000); // 10 secondi
    } else {
      // Tab attiva - ripristina frequenza normale
      window.notificationsManager.setPollingFrequency(3000); // 3 secondi
    }
  }
});