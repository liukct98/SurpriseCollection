// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================
console.log("🚀 Script serie.js caricato!");

const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";

const supa = supabase.createClient(supabaseUrl, supabaseKey);

// =========================
// VERIFICA SESSIONE
// =========================
async function checkAuth() {
  const {
    data: { session },
  } = await supa.auth.getSession();

  if (!session) {
    alert("Devi fare login!");
    window.location.href = "index.html";
    return null;
  }

  console.log("✅ Utente loggato:", session.user.email);
  return session.user;
}

// =========================
// FUNZIONI
// =========================

// Funzione per ottenere l'ID della serie dall'URL
function getSerieIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Funzione per caricare e mostrare i dati della serie corrente
async function loadCurrentSerie() {
  const serieId = getSerieIdFromUrl();
  if (!serieId) {
    alert("❌ ID serie mancante nell'URL!");
    window.location.href = "home.html";
    return null;
  }

  console.log("🔍 Caricamento serie con ID:", serieId);
  
  const { data: serie, error } = await supa.from("series").select("*").eq("id", serieId).single();
  if (error) {
    console.error("❌ Errore caricamento serie:", error.message);
    alert("❌ Serie non trovata!");
    window.location.href = "home.html";
    return null;
  }

  // Aggiorna il titolo della pagina
  const serieTitle = document.getElementById("serie-title");
  if (serieTitle) {
    serieTitle.textContent = serie.nome;
  }

  // Mostra i controlli della serie
  const serieControls = document.getElementById("serie-controls");
  if (serieControls) {
    serieControls.style.display = "block";
  }

  // Aggiorna il link "Aggiungi" per includere l'ID della serie
  const addLink = document.querySelector('a[href="addItem.html"]');
  if (addLink) {
    addLink.href = `addItem.html?serie_id=${serieId}`;
    console.log("🔗 Link Aggiungi aggiornato:", addLink.href);
  }

  console.log("✅ Serie caricata:", serie);
  return serie;
}

// Funzione per caricare gli oggetti della serie corrente
async function loadCollection() {
  const seriesList = document.getElementById("items-list");
  if (!seriesList) return;

  const serieId = getSerieIdFromUrl();
  if (!serieId) {
    seriesList.innerHTML = `<p>❌ ID serie mancante!</p>`;
    return;
  }

  seriesList.innerHTML = `<div class="spinner"></div><p>Caricamento oggetti della serie...</p>`;

  try {
    // Ottieni l'utente corrente
    const currentUser = await getCurrentUserAsync();
    if (!currentUser) {
      throw new Error('Utente non autenticato');
    }

    // Carica solo gli oggetti di questa serie specifica
    const { data: items, error } = await supa
      .from("item")
      .select("*")
      .eq("serie_id", serieId)
      .order("numero", { ascending: true });

    if (error) {
      throw error;
    }

    // Carica le informazioni della wishlist per questi oggetti (solo per dettagli aggiuntivi)
    const itemIds = items.map(item => item.id);
    const { data: wishlistDetails, error: wishlistError } = await supa
      .from("wishlist")
      .select("item_id, priority, notes, estimated_price, purchase_url")
      .eq("user_id", currentUser.id)
      .in("item_id", itemIds);

    if (wishlistError) {
      console.error('Errore caricamento dettagli wishlist:', wishlistError);
      // Non bloccare il caricamento se la wishlist fallisce
    }

    // Crea una mappa per accesso rapido ai dettagli wishlist
    const wishlistDetailsMap = {};
    if (wishlistDetails) {
      wishlistDetails.forEach(w => {
        wishlistDetailsMap[w.item_id] = w;
      });
    }

    if (items.length === 0) {
      seriesList.innerHTML = `<p>Nessun oggetto presente in questa serie. <a href='addItem.html?serie_id=${serieId}'>Aggiungi il primo oggetto!</a></p>`;
    } else {
      seriesList.innerHTML = items.map((i, index) => {
        // Usa il campo wishlist direttamente dalla tabella item
        const isInWishlist = !!i.wishlist;
        return `
        <div class="item fade-in ${!i.mancante ? 'item-present' : 'item-missing'}" style="animation-delay: ${0.1 * index}s;">
          <div class="item-header">
            <h3>${i.nome} (#${i.numero})</h3>
            <div class="item-status">
              <label class="checkbox-container">
                <input type="checkbox" 
                       class="item-checkbox" 
                       data-item-id="${i.id}" 
                       ${!i.mancante ? 'checked' : ''}>
                <span class="checkmark"></span>
                <span class="status-text">${!i.mancante ? 'Presente' : 'Mancante'}</span>
              </label>
              ${i.mancante ? `
                <label class="wishlist-checkbox-container">
                  <input type="checkbox" 
                         class="wishlist-checkbox" 
                         data-item-id="${i.id}"
                         data-item-name="${i.nome}"
                         data-item-number="${i.numero}"
                         ${isInWishlist ? 'checked' : ''}>
                  <span class="wishlist-checkmark">💝</span>
                  <span class="wishlist-text">${isInWishlist ? 'In Wishlist' : 'Wishlist'}</span>
                </label>
              ` : ''}
            </div>
          </div>
          <p>${i.accessori || ""}</p>
          <p>Valore: ${i.valore || "?"}</p>
          ${i.foto ? `<img src="${i.foto}" alt="${i.nome}" class="item-foto">` : ""}
          <div class="item-actions">
            <button class="btn-item-action btn-item-edit" data-action="edit-item" data-id="${i.id}">✏️ Modifica</button>
            <button class="btn-item-action btn-item-delete" data-action="delete-item" data-id="${i.id}" data-name="${i.nome}">🗑️ Elimina</button>
          </div>
        </div>
      `}).join("");
      
      // Aggiungi event listeners per i pulsanti degli oggetti
      setupItemActionButtons();
      
      // Aggiungi event listeners per i checkbox
      setupItemCheckboxes();
      
      // Aggiungi event listeners per i checkbox wishlist
      setupWishlistCheckboxes();
    }

    console.log(`✅ Caricati ${items.length} oggetti per la serie ${serieId}`);
    
  } catch (error) {
    console.error('Errore caricamento collezione:', error);
    seriesList.innerHTML = `<p>❌ Errore caricamento oggetti: ${error.message}</p>`;
  }
}

// =========================
// EVENT LISTENER DOMContentLoaded
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  // Verifica autenticazione
  const user = await checkAuth();
  if (!user) {
    return;
  }

  // Carica i dati della serie corrente dall'URL
  const currentSerie = await loadCurrentSerie();
  if (!currentSerie) {
    return;
  }

  // Carica lista oggetti
  loadCollection();

  // Event listeners per pulsanti serie
  const editSerieBtn = document.getElementById("edit-serie-btn");
  const deleteSerieBtn = document.getElementById("delete-serie-btn");
  
  if (editSerieBtn) {
    editSerieBtn.addEventListener("click", editSerie);
  }
  
  if (deleteSerieBtn) {
    deleteSerieBtn.addEventListener("click", deleteSerie);
  }

  // Lightbox click sulle immagini
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("item-foto")) {
      const lightbox = document.getElementById("lightbox");
      const lightboxImg = document.getElementById("lightbox-img");
      lightboxImg.src = e.target.src;
      lightbox.style.display = "flex";
    }
    if (e.target.id === "lightbox" || e.target.id === "lightbox-img") {
      document.getElementById("lightbox").style.display = "none";
    }
  });
});

// =========================
// FUNZIONI MODIFICA/ELIMINAZIONE SERIE
// =========================
async function editSerie() {
  const serieId = getSerieIdFromUrl();
  if (!serieId) return;
  
  // Redirect alla pagina di modifica serie (da creare)
  window.location.href = `editSerie.html?id=${serieId}`;
}

async function deleteSerie() {
  const serieId = getSerieIdFromUrl();
  if (!serieId) return;
  
  const confirmDelete = confirm("⚠️ Sei sicuro di voler eliminare questa serie?\n\nATTENZIONE: Verranno eliminati anche tutti gli oggetti al suo interno!");
  if (!confirmDelete) return;
  
  console.log("🗑️ Eliminazione serie:", serieId);
  
  // Prima elimina tutti gli oggetti della serie
  const { error: itemsError } = await supa
    .from("item")
    .delete()
    .eq("serie_id", serieId);
  
  if (itemsError) {
    console.error("❌ Errore eliminazione oggetti:", itemsError);
    alert("❌ Errore durante l'eliminazione degli oggetti: " + itemsError.message);
    return;
  }
  
  // Poi elimina la serie
  const { error: serieError } = await supa
    .from("series")
    .delete()
    .eq("id", serieId);
  
  if (serieError) {
    console.error("❌ Errore eliminazione serie:", serieError);
    alert("❌ Errore durante l'eliminazione della serie: " + serieError.message);
    return;
  }
  
  alert("✅ Serie eliminata correttamente!");
  window.location.href = "collection.html";
}

// =========================
// FUNZIONI MODIFICA/ELIMINAZIONE OGGETTI
// =========================
async function editItem(itemId) {
  // Redirect alla pagina di modifica oggetto (da creare)
  const serieId = getSerieIdFromUrl();
  window.location.href = `editItem.html?id=${itemId}&serie_id=${serieId}`;
}

async function deleteItem(itemId, itemName) {
  const confirmDelete = confirm(`⚠️ Sei sicuro di voler eliminare l'oggetto "${itemName}"?`);
  if (!confirmDelete) return;
  
  console.log("🗑️ Eliminazione oggetto:", itemId);
  
  const { error } = await supa
    .from("item")
    .delete()
    .eq("id", itemId);
  
  if (error) {
    console.error("❌ Errore eliminazione oggetto:", error);
    alert("❌ Errore durante l'eliminazione: " + error.message);
    return;
  }
  
  alert("✅ Oggetto eliminato correttamente!");
  
  // Ricarica la lista degli oggetti
  loadCollection();
}

// =========================
// SETUP ITEM ACTION BUTTONS
// =========================
function setupItemActionButtons() {
  const editButtons = document.querySelectorAll('[data-action="edit-item"]');
  const deleteButtons = document.querySelectorAll('[data-action="delete-item"]');
  
  // Event listeners per pulsanti modifica oggetto
  editButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = button.getAttribute('data-id');
      editItem(itemId);
    });
  });
  
  // Event listeners per pulsanti elimina oggetto
  deleteButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = button.getAttribute('data-id');
      const itemName = button.getAttribute('data-name');
      deleteItem(itemId, itemName);
    });
  });
}

// =========================
// SETUP ITEM CHECKBOXES
// =========================
function setupItemCheckboxes() {
  const checkboxes = document.querySelectorAll('.item-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const itemId = checkbox.getAttribute('data-item-id');
      const isPresent = checkbox.checked;
      const statusText = checkbox.parentElement.querySelector('.status-text');
      
      try {
        // Aggiorna lo stato dell'oggetto nel database
        const { error } = await supa
          .from('item')
          .update({ mancante: !isPresent })
          .eq('id', itemId);
        
        if (error) {
          throw error;
        }
        
        // Se l'oggetto diventa presente, rimuovilo dalla wishlist
        if (isPresent) {
          // Aggiorna il campo wishlist nella tabella item
          const { error: itemWishlistError } = await supa
            .from('item')
            .update({ wishlist: false })
            .eq('id', itemId);
          
          if (itemWishlistError) {
            console.error('Errore aggiornamento campo wishlist item:', itemWishlistError);
          }
          
          // Rimuovi dalla tabella wishlist
          const currentUser = await getCurrentUserAsync();
          if (currentUser) {
            const { error: wishlistError } = await supa
              .from('wishlist')
              .delete()
              .eq('user_id', currentUser.id)
              .eq('item_id', itemId);
            
            if (wishlistError) {
              console.error('Errore rimozione da tabella wishlist:', wishlistError);
            }
          }
        }
        
        // Aggiorna il testo dello stato
        statusText.textContent = isPresent ? 'Presente' : 'Mancante';
        
        // Aggiorna la classe dell'item per styling
        const itemDiv = checkbox.closest('.item');
        if (isPresent) {
          itemDiv.classList.remove('item-missing');
          itemDiv.classList.add('item-present');
          
          // Nascondi la checkbox wishlist se l'oggetto è ora presente
          const wishlistContainer = itemDiv.querySelector('.wishlist-checkbox-container');
          if (wishlistContainer) {
            wishlistContainer.style.display = 'none';
          }
          
        } else {
          itemDiv.classList.remove('item-present');
          itemDiv.classList.add('item-missing');
          
          // Mostra la checkbox wishlist se l'oggetto è ora mancante
          let wishlistContainer = itemDiv.querySelector('.wishlist-checkbox-container');
          if (!wishlistContainer) {
            // Crea la checkbox wishlist se non esiste
            const itemName = itemDiv.querySelector('h3').textContent;
            const itemNumber = itemDiv.querySelector('p').textContent.replace('Numero: ', '');
            
            const itemStatus = itemDiv.querySelector('.item-status');
            wishlistContainer = document.createElement('label');
            wishlistContainer.className = 'wishlist-checkbox-container';
            wishlistContainer.innerHTML = `
              <input type="checkbox" 
                     class="wishlist-checkbox" 
                     data-item-id="${itemId}"
                     data-item-name="${itemName}"
                     data-item-number="${itemNumber}">
              <span class="wishlist-checkmark">💝</span>
              <span class="wishlist-text">Wishlist</span>
            `;
            itemStatus.appendChild(wishlistContainer);
            
            // Aggiungi event listener alla nuova checkbox
            const newWishlistCheckbox = wishlistContainer.querySelector('.wishlist-checkbox');
            setupSingleWishlistCheckbox(newWishlistCheckbox);
          } else {
            wishlistContainer.style.display = 'flex';
          }
        }
        
        console.log(`✅ Aggiornato stato oggetto ${itemId}: ${isPresent ? 'presente' : 'mancante'}`);
        
      } catch (error) {
        console.error('Errore aggiornamento stato:', error);
        
        // Ripristina lo stato precedente del checkbox in caso di errore
        checkbox.checked = !checkbox.checked;
        alert('❌ Errore nell\'aggiornamento dello stato: ' + error.message);
      }
    });
  });
}

// =========================
// SETUP WISHLIST CHECKBOXES
// =========================
function setupWishlistCheckboxes() {
  const wishlistCheckboxes = document.querySelectorAll('.wishlist-checkbox');
  wishlistCheckboxes.forEach(checkbox => setupSingleWishlistCheckbox(checkbox));
}

function setupSingleWishlistCheckbox(checkbox) {
  // Imposta lo stato iniziale se necessario
  const wishlistText = checkbox.parentElement.querySelector('.wishlist-text');
  if (checkbox.checked && wishlistText) {
    wishlistText.textContent = 'In Wishlist';
    wishlistText.style.color = '#e74c3c';
  }
  
  // Rimuovi event listener esistenti per evitare duplicati
  const newCheckbox = checkbox.cloneNode(true);
  checkbox.parentNode.replaceChild(newCheckbox, checkbox);
  
  // Aggiungi event listener
  newCheckbox.addEventListener('change', async (e) => {
    const itemId = newCheckbox.getAttribute('data-item-id');
    const itemName = newCheckbox.getAttribute('data-item-name');
    const isInWishlist = newCheckbox.checked;
    
    try {
      const currentUser = await getCurrentUserAsync();
      if (!currentUser) {
        throw new Error('Utente non autenticato');
      }
      
      if (isInWishlist) {
        // Aggiorna il campo wishlist nella tabella item
        const { error: itemError } = await supa
          .from('item')
          .update({ wishlist: true })
          .eq('id', itemId);
        
        if (itemError) throw itemError;
        
        // Aggiungi alla tabella wishlist per i dettagli aggiuntivi
        const { error: wishlistError } = await supa
          .from('wishlist')
          .insert({
            user_id: currentUser.id,
            item_id: itemId,
            priority: 'media',
            notes: null,
            estimated_price: null,
            purchase_url: null
          });
        
        if (wishlistError) {
          console.error('Errore dettagli wishlist:', wishlistError);
          // Se fallisce l'inserimento nella wishlist, rimuovi il flag dall'item
          await supa.from('item').update({ wishlist: false }).eq('id', itemId);
          
          // Se l'errore è per record duplicato, ignora
          if (wishlistError.code === '23505') {
            console.log('Record wishlist già esistente, continuando...');
          } else {
            throw wishlistError;
          }
        }
        
      } else {
        // Aggiorna il campo wishlist nella tabella item
        const { error: itemError } = await supa
          .from('item')
          .update({ wishlist: false })
          .eq('id', itemId);
        
        if (itemError) throw itemError;
        
        // Rimuovi dalla tabella wishlist
        const { error: wishlistError } = await supa
          .from('wishlist')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('item_id', itemId);
        
        if (wishlistError) {
          console.error('Errore rimozione dettagli wishlist:', wishlistError);
          // Non bloccare per questo errore, il flag item è più importante
        }
      }
      
      console.log(`${isInWishlist ? '✅ Aggiunto' : '❌ Rimosso'} "${itemName}" ${isInWishlist ? 'alla' : 'dalla'} wishlist`);
      
      // Feedback visivo
      const wishlistText = newCheckbox.parentElement.querySelector('.wishlist-text');
      if (wishlistText) {
        wishlistText.textContent = isInWishlist ? 'In Wishlist' : 'Wishlist';
        wishlistText.style.color = isInWishlist ? '#e74c3c' : '';
      }
      
    } catch (error) {
      console.error('Errore gestione wishlist:', error);
      
      // Ripristina lo stato precedente in caso di errore
      newCheckbox.checked = !newCheckbox.checked;
      alert('❌ Errore nell\'aggiornamento della wishlist: ' + error.message);
    }
  });
}
// Funzione helper per ottenere l'utente corrente
async function getCurrentUserAsync() {
  const { data: { user } } = await supa.auth.getUser();
  return user;
}