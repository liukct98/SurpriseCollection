// =========================
// GESTORE NOTIFICHE CHAT - VERSIONE POLLING
// (per Supabase senza Real-time)
// =========================
console.log("🔔 NotificationsManager (Polling) caricato!");

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
      console.warn("🚀 Inizio init() NotificationsManager...");
      
      // Crea sempre il badge, indipendentemente dall'autenticazione
      this.createNotificationBadge();
      console.warn("✅ Badge creato");
      
      // Verifica che Supabase client sia disponibile (già configurato in app.js)
      if (typeof supabase === 'undefined') {
        console.error("❌ Supabase client non disponibile per NotificationsManager");
        return false;
      }

      // Usa il client Supabase già configurato
      this.supabase = supabase;
      console.warn("✅ Supabase client assegnato");

      // Ottieni l'utente corrente
      console.warn("🔍 Ottengo utente corrente...");
      const { data: { user } } = await this.supabase.auth.getUser();
      console.warn("👤 Utente:", user?.email || "non loggato");
      
      if (!user) {
        console.warn("ℹ️ Utente non loggato, badge creato ma notifiche non attive");
        return false;
      }

      // Ottieni l'ID utente dalla tabella users
      console.warn("🔍 Cerco ID utente nella tabella users...");
      const { data: userRow, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('mail', user.email)
        .single();

      console.warn("👤 UserRow:", userRow, "Error:", error);

      if (error || !userRow) {
        console.error("❌ ID utente non trovato:", error);
        return false;
      }

      this.currentUserId = userRow.id;
      console.warn("✅ NotificationsManager (Polling) inizializzato per utente:", this.currentUserId);

      // Richiedi permessi notifiche
      console.warn("🔍 Richiedo permessi notifiche...");
      await this.requestNotificationPermission();

      // Conta messaggi non letti esistenti
      console.warn("🔍 Conto messaggi non letti...");
      await this.updateUnreadCount();

      // Avvia il polling
      console.warn("🔍 Avvio polling...");
      this.startPolling();

      this.isInitialized = true;
      console.warn("🎉 Init completato con successo!");
      return true;

    } catch (error) {
      console.error("❌ Errore inizializzazione NotificationsManager:", error);
      // Anche se c'è un errore, il badge dovrebbe essere creato
      return false;
    }
  }

  // Richiedi l'autorizzazione per le notifiche browser
  async requestNotificationPermission() {
    if (!("Notification" in window)) {
      console.log("ℹ️ Questo browser non supporta le notifiche");
      return false;
    }

    if (Notification.permission === "granted") {
      console.log("✅ Permessi notifiche già concessi");
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("✅ Permessi notifiche concessi");
        return true;
      }
    }

    console.log("⚠️ Permessi notifiche negati");
    return false;
  }

  // Usa il badge delle notifiche esistente nell'header
  createNotificationBadge() {
    console.log("🔗 Integrazione con badge notifiche esistente nell'header");
    
    // Verifica che il badge nell'header esista
    const headerBadge = document.getElementById('notifiche-badge');
    const headerBtn = document.getElementById('nav-notifiche-btn');
    
    if (!headerBadge || !headerBtn) {
      console.warn("⚠️ Badge header non trovato, riprovo tra un po'...");
      setTimeout(() => this.createNotificationBadge(), 500);
      return;
    }

    // Il badge serve SOLO per mostrare il numero
    // NON aggiungiamo click listener - solo le notifiche browser portano alle chat
    
    console.log("✅ Badge header configurato (solo visual, no click)");
  }

  // Aggiorna il contatore badge nell'header
  updateBadge(count) {
    console.warn("🔄 updateBadge chiamato con count:", count);
    
    const headerBadge = document.getElementById('notifiche-badge');
    const headerBtn = document.getElementById('nav-notifiche-btn');
    
    console.warn("🔍 headerBadge:", headerBadge);
    console.warn("🔍 headerBtn:", headerBtn);
    
    if (!headerBadge) {
      console.warn("⚠️ Badge header non trovato per aggiornamento - tentativo ricerca alternativa");
      // Prova a cercarlo in modo diverso
      const allBadges = document.querySelectorAll('[id*="badge"], [class*="badge"]');
      console.warn("🔍 Tutti i badge trovati:", allBadges);
      return;
    }

    if (count > 0) {
      headerBadge.textContent = count > 99 ? '99+' : count.toString();
      headerBadge.style.display = 'inline-block';
      headerBadge.style.visibility = 'visible';
      if (headerBtn) {
        headerBtn.style.position = 'relative'; // Per posizionare il badge
      }
      console.warn("📊 Badge header aggiornato:", count, "- display:", headerBadge.style.display);
    } else {
      headerBadge.style.display = 'none';
      console.warn("📊 Badge header nascosto (0 messaggi)");
    }
  }

  // Avvia il controllo periodico (polling)
  startPolling() {
    if (!this.currentUserId) return;

    console.log("🔄 Avvio polling notifiche ogni", this.pollingFrequency / 1000, "secondi");

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
      console.warn("🔄 Controllo messaggi non letti per utente:", this.currentUserId);
      
      // Aggiorna il contatore dei messaggi non letti
      await this.updateUnreadCount();

    } catch (error) {
      console.error("❌ Errore polling:", error);
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
        console.error("❌ Errore conteggio messaggi non letti:", error);
        this.notificationCount = 0;
        this.updateBadge(0);
        return;
      }

      const unreadCount = unreadMessages ? unreadMessages.length : 0;
      
      this.notificationCount = unreadCount;
      this.updateBadge(this.notificationCount);
      console.warn("📊 Messaggi non letti:", this.notificationCount);

    } catch (error) {
      console.error("❌ Errore updateUnreadCount:", error);
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
      console.log("ℹ️ Tabella unread_messages già esistente");
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
        console.error("❌ Errore caricamento mittente:", error);
        return;
      }

      const senderName = sender.username || sender.mail;

      // Controlla se l'utente è nella pagina chat con questo mittente
      const currentPage = window.location.pathname;
      const isInChatWithSender = currentPage.includes('chat.html') && 
                                new URLSearchParams(window.location.search).get('friend_id') === message.sender_id.toString();

      if (isInChatWithSender) {
        // Se è nella chat con il mittente, ricarica i messaggi invece di notificare
        console.log("📱 Utente nella chat attiva, ricarico messaggi...");
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
          console.log("ℹ️ Notifica già esistente per messaggio:", message.id);
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
          console.error("❌ Errore inserimento notifica:", insertError);
        } else {
          console.log("✅ Notifica aggiunta al pannello:", `Messaggio da ${senderName}`);
        }

      } catch (error) {
        console.error("❌ Errore aggiunta notifica al pannello:", error);
      }

      console.log("✅ Notifica messaggio gestita per:", senderName);

    } catch (error) {
      console.error("❌ Errore gestione nuovo messaggio:", error);
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
        console.error("❌ Errore marcatura messaggi letti:", error);
        return;
      }

      console.log("✅ Messaggi marcati come letti per sender:", senderId);
      await this.updateUnreadCount();

    } catch (error) {
      console.error("❌ Errore markMessagesAsRead:", error);
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
        console.error("❌ Errore marcatura tutti messaggi letti:", error);
        return;
      }

      console.log("✅ Tutti i messaggi marcati come letti");
      await this.updateUnreadCount();

    } catch (error) {
      console.error("❌ Errore markAllMessagesAsRead:", error);
    }
  }

  // Modifica la frequenza di polling
  setPollingFrequency(milliseconds) {
    this.pollingFrequency = milliseconds;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.startPolling();
      console.log("🔄 Frequenza polling aggiornata a", milliseconds / 1000, "secondi");
    }
  }

  // Pulisce il polling
  cleanup() {
    console.log("🧹 Pulizia NotificationsManager...");
    
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
    console.log("🔧 Forzatura creazione badge...");
    this.createNotificationBadge();
  }
}

// Crea istanza globale
window.notificationsManager = new ChatNotificationsManager();

// Auto-inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🔧 DOM caricato, inizializzo NotificationsManager...");
  console.log("🔧 window.notificationsManager:", window.notificationsManager);
  
  // Aspetta che Supabase sia disponibile
  let retries = 0;
  const maxRetries = 10;
  
  const waitForSupabase = async () => {
    console.log("🔍 Controllo disponibilità Supabase...", typeof supabase);
    if (typeof supabase !== 'undefined') {
      console.log("✅ Supabase client trovato, inizializzo sistema notifiche...");
      const success = await window.notificationsManager.init();
      if (success) {
        console.log("🔔 Sistema notifiche (polling) attivo!");
        console.log("🔔 User ID:", window.notificationsManager.currentUserId);
        console.log("🔔 Polling interval:", window.notificationsManager.pollingInterval);
      } else {
        console.log("❌ Errore inizializzazione sistema notifiche");
      }
    } else {
      retries++;
      if (retries < maxRetries) {
        console.log(`⏳ Supabase client non ancora pronto, retry ${retries}/${maxRetries}...`);
        setTimeout(waitForSupabase, 500);
      } else {
        console.error("❌ Timeout: Supabase client non disponibile dopo", maxRetries, "tentativi");
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
      console.log("😴 Tab nascosta, polling ridotto");
    } else {
      // Tab attiva - ripristina frequenza normale
      window.notificationsManager.setPollingFrequency(3000); // 3 secondi
      console.log("👀 Tab attiva, polling normale");
    }
  }
});