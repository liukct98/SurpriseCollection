// notifiche.js
// Gestione notifiche globali per modifiche/aggiunte serie catalogo

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
    console.error('Errore caricamento utenti per notifica:', utentiError);
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
    console.error('Errore inserimento notifiche:', insertError);
  }
}

// Esempio di utilizzo:
// aggiungiNotificaCatalogo('aggiunta', 'Sorpresine Kinder - I Puffi');
// aggiungiNotificaCatalogo('modifica', 'Sorpresine Kinder - I Puffi');
