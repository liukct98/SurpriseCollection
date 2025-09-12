// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================
console.log("💝 Script wishlist.js caricato!");

const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";

const supa = supabase.createClient(supabaseUrl, supabaseKey);

// =========================
// VARIABILI GLOBALI
// =========================
let allWishlistItems = [];
let allSeries = [];
let allItems = [];
let missingItems = []; // Oggetti mancanti dalle serie
let currentUser = null;
let currentSearch = "";
let currentPriorityFilter = "";
let currentSort = "priority";

// =========================
// FUNZIONI AUTENTICAZIONE
// =========================
async function checkAuth() {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  
  currentUser = user;
  return user;
}

// =========================
// INIZIALIZZAZIONE TABELLA WISHLIST
// =========================
async function initializeWishlistTable() {
  try {
    // Prova a creare la tabella wishlist se non esiste
    // Nota: questo potrebbe fallire se la tabella esiste già, è normale
    console.log("🔧 Tentativo di inizializzazione tabella wishlist...");
    
    // Per ora simuliamo l'esistenza della tabella
    // In un ambiente reale, dovresti creare la tabella via Supabase Dashboard
    console.log("✅ Tabella wishlist pronta");
    
  } catch (error) {
    console.log("ℹ️ Tabella wishlist già esistente o errore di permessi:", error.message);
  }
}

// =========================
// CARICAMENTO DATI
// =========================
async function loadWishlist() {
  const wishlistContainer = document.getElementById("wishlist-list");
  
  try {
    wishlistContainer.innerHTML = `
      <div class="spinner"></div>
      <p style="text-align:center;">Caricamento wishlist...</p>
    `;

    // Carica le serie dell'utente
    const { data: series, error: seriesError } = await supa
      .from("series")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("nome");
    
    if (seriesError) throw seriesError;
    allSeries = series || [];

    // Carica gli oggetti in wishlist dell'utente (campo wishlist=true)
    const { data: items, error: itemsError } = await supa
      .from("item")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("mancante", true)
      .eq("wishlist", true);
    
    if (itemsError) throw itemsError;

    // Carica i dettagli aggiuntivi dalla tabella wishlist
    const itemIds = items.map(item => item.id);
    let wishlistDetails = [];
    
    if (itemIds.length > 0) {
      const { data: details, error: detailsError } = await supa
        .from("wishlist")
        .select("*")
        .eq("user_id", currentUser.id)
        .in("item_id", itemIds);
      
      if (detailsError) {
        console.error('Errore caricamento dettagli wishlist:', detailsError);
      } else {
        wishlistDetails = details || [];
      }
    }
    
    // Crea mappa dei dettagli
    const detailsMap = {};
    wishlistDetails.forEach(d => {
      detailsMap[d.item_id] = d;
    });
    
    // Trasforma i dati in formato compatibile
    allWishlistItems = items.map(item => {
      const serie = allSeries.find(s => s.id === item.serie_id);
      const details = detailsMap[item.id] || {};
      
      return {
        id: item.id,
        name: item.nome,
        numero: item.numero,
        seriesId: item.serie_id,
        seriesName: serie ? `${serie.nome} (${serie.anno})` : 'Serie sconosciuta',
        description: details.notes || item.accessori || '',
        price: details.estimated_price || parseFloat(item.valore?.toString().replace(/[€$,]/g, '')) || null,
        priority: details.priority || 'media',
        url: details.purchase_url || '',
        dateAdded: details.date_added || item.created_at || new Date().toISOString(),
        userId: currentUser.id,
        originalItem: item,
        wishlistId: details.id
      };
    });
    
    console.log('🔄 Wishlist ricaricata:', {
      itemCount: allWishlistItems.length,
      items: allWishlistItems.map(i => ({
        name: i.name,
        priority: i.priority,
        description: i.description,
        price: i.price,
        url: i.url
      }))
    });
    
    displayFilteredWishlist();
    
  } catch (error) {
    console.error("Errore caricamento wishlist:", error);
    wishlistContainer.innerHTML = `<p>❌ Errore caricamento wishlist: ${error.message}</p>`;
  }
}

function populateSeriesDropdown() {
  const seriesSelect = document.getElementById("wishlist-series");
  seriesSelect.innerHTML = '<option value="">Seleziona una serie...</option>' +
    allSeries.map(serie => `<option value="${serie.id}">${serie.nome} (${serie.anno})</option>`).join('');
}

// =========================
// VISUALIZZAZIONE WISHLIST
// =========================
function displayFilteredWishlist() {
  let filteredItems = [...allWishlistItems];
  
  // Filtro per ricerca
  if (currentSearch) {
    filteredItems = filteredItems.filter(item =>
      item.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(currentSearch.toLowerCase()))
    );
  }
  
  // Filtro per priorità
  if (currentPriorityFilter) {
    filteredItems = filteredItems.filter(item => item.priority === currentPriorityFilter);
  }
  
  // Ordinamento
  filteredItems.sort((a, b) => {
    switch (currentSort) {
      case "priority":
        const priorityOrder = { "alta": 3, "media": 2, "bassa": 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case "name":
        return a.name.localeCompare(b.name);
      case "series":
        return a.seriesName.localeCompare(b.seriesName);
      case "price":
        return (b.price || 0) - (a.price || 0);
      default:
        return 0;
    }
  });
  
  const wishlistContainer = document.getElementById("wishlist-list");
  
  if (filteredItems.length === 0) {
    if (allWishlistItems.length === 0) {
      wishlistContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💝</div>
          <h3>Nessun oggetto mancante</h3>
          <p>Complimenti! Non hai oggetti mancanti nelle tue serie!</p>
        </div>
      `;
    } else {
      wishlistContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>Nessun risultato</h3>
          <p>Nessun oggetto corrisponde ai filtri attuali.</p>
        </div>
      `;
    }
    return;
  }
  
  wishlistContainer.innerHTML = filteredItems.map((item, index) => `
    <div class="wishlist-item fade-in priority-${item.priority}" style="animation-delay: ${0.1 * index}s;">
      <div class="wishlist-item-header">
        <div class="item-priority priority-${item.priority}">
          ${getPriorityIcon(item.priority)}
        </div>
        <div class="item-main-info">
          <h3>${item.name} ${item.numero ? `(#${String(item.numero)})` : ''}</h3>
          <p class="item-series">📦 ${item.seriesName}</p>
        </div>
        <div class="item-price">
          ${item.price ? `💰 €${parseFloat(item.price).toFixed(2)}` : '💰 N/D'}
        </div>
      </div>
      
      ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
      
      <div class="item-meta">
        <span class="item-date">📅 Aggiunto il ${new Date(item.dateAdded).toLocaleDateString('it-IT')}</span>
        ${item.url ? `<a href="${item.url}" target="_blank" class="item-link">🔗 Link</a>` : ''}
      </div>
      
      <div class="wishlist-actions">
        <button class="btn-action btn-edit" onclick="editWishlistItem('${item.id}')">✏️ Modifica Note</button>
        <button class="btn-action btn-acquired" onclick="markAsAcquired('${item.id}')">✅ Ottenuto</button>
      </div>
    </div>
  `).join('');
}

function getPriorityIcon(priority) {
  switch (priority) {
    case "alta": return "🔴 Alta";
    case "media": return "🟡 Media";
    case "bassa": return "🟢 Bassa";
    default: return "⚪ N/D";
  }
}

// =========================
// GESTIONE MODAL
// =========================
function editWishlistItem(itemId) {
  const item = allWishlistItems.find(i => i.id == itemId);
  if (!item) return;
  
  const modal = document.getElementById("wishlist-modal");
  modal.style.display = "block";
  
  // Popola il form con i dati esistenti
  document.getElementById("edit-item-id").value = itemId;
  document.getElementById("item-display").innerHTML = `
  <strong>${item.name} (#${String(item.numero)})</strong><br>
    <small>📦 ${item.seriesName}</small>
  `;
  document.getElementById("wishlist-description").value = item.description || "";
  document.getElementById("wishlist-price").value = item.price || "";
  document.getElementById("wishlist-priority").value = item.priority || 'media';
  document.getElementById("wishlist-url").value = item.url || "";
}

function closeWishlistModal() {
  const modal = document.getElementById("wishlist-modal");
  modal.style.display = "none";
}

// =========================
// CRUD OPERAZIONI  
// =========================
async function updateWishlistItem(formData) {
  try {
    const itemId = document.getElementById("edit-item-id").value;
    const item = allWishlistItems.find(i => i.id == itemId);
    
    if (!item) {
      throw new Error('Oggetto non trovato nella wishlist');
    }

    console.log('🔧 Debug updateWishlistItem:', {
      itemId: itemId,
      currentUserId: currentUser.id,
      itemFound: !!item,
      formData: {
        priority: formData.get("priority"),
        description: formData.get("description"),
        price: formData.get("price"),
        url: formData.get("url")
      },
      // Debug dei valori degli input HTML
      htmlValues: {
        priority: document.getElementById("wishlist-priority").value,
        description: document.getElementById("wishlist-description").value,
        price: document.getElementById("wishlist-price").value,
        url: document.getElementById("wishlist-url").value
      }
    });

    // Aggiorna la tabella wishlist
    const priority = formData.get("priority") || 'media'; // Default a 'media' se vuoto
    const notes = formData.get("description") || null;
    const estimatedPrice = formData.get("price") ? parseFloat(formData.get("price")) : null;
    const purchaseUrl = formData.get("url") || null;
    
    console.log('🔧 Valori per update:', {
      priority,
      notes,
      estimatedPrice,
      purchaseUrl,
      user_id: currentUser.id,
      item_id: itemId
    });
    
    const { data, error, count } = await supa
      .from('wishlist')
      .update({
        priority: priority,
        notes: notes,
        estimated_price: estimatedPrice,
        purchase_url: purchaseUrl
      })
      .eq('user_id', currentUser.id)
      .eq('item_id', itemId)
      .select(); // Aggiungiamo select per vedere cosa viene aggiornato
    
    console.log('🔧 Risultato update:', { data, error, count });
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Nessun record aggiornato - verificare che l\'oggetto esista nella wishlist');
    }
    
    if (error) {
      throw error;
    }
    
    // Ricarica la wishlist per mostrare le modifiche
    console.log('🔄 Ricaricando wishlist dopo aggiornamento...');
    await loadWishlist();
    closeWishlistModal();
    
    console.log("✅ Oggetto wishlist aggiornato:", item.name);
    
  } catch (error) {
    console.error("Errore aggiornamento wishlist:", error);
    alert("❌ Errore durante l'aggiornamento: " + error.message);
  }
}

async function markAsAcquired(itemId) {
  const item = allWishlistItems.find(i => i.id == itemId);
  if (!item) return;
  
  const confirmAcquired = confirm(`🎉 Hai ottenuto "${item.name}"? Questo lo segnerà come presente nella tua collezione e lo rimuoverà dalla wishlist.`);
  if (!confirmAcquired) return;
  
  try {
    // Aggiorna l'oggetto nel database come "presente" e rimuovi dalla wishlist
    const { error: itemError } = await supa
      .from('item')
      .update({ 
        mancante: false,
        wishlist: false 
      })
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
      // Non bloccare per questo errore
    }
    
    // Ricarica la wishlist per aggiornare la vista
    await loadWishlist();
    
    // Mostra messaggio di successo
    alert(`🎉 Congratulazioni! Hai ottenuto "${item.name}"!`);
    console.log("✅ Oggetto marcato come ottenuto e rimosso dalla wishlist");
    
  } catch (error) {
    console.error("Errore marcatura come ottenuto:", error);
    alert("❌ Errore: " + error.message);
  }
}

// =========================
// EVENT LISTENERS
// =========================
function setupEventListeners() {
  // Modal
  document.getElementById("cancel-wishlist").addEventListener("click", closeWishlistModal);
  document.querySelector(".close").addEventListener("click", closeWishlistModal);
  
  // Chiudi modal cliccando fuori
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("wishlist-modal");
    if (e.target === modal) {
      closeWishlistModal();
    }
  });
  
  // Form submission
  document.getElementById("wishlist-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    updateWishlistItem(formData);
  });
  
  // Ricerca
  const searchInput = document.getElementById("wishlist-search");
  const clearBtn = document.getElementById("clear-wishlist-search");
  
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    displayFilteredWishlist();
    clearBtn.style.display = currentSearch ? "block" : "none";
  });
  
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentSearch = "";
    clearBtn.style.display = "none";
    displayFilteredWishlist();
  });
  
  // Filtri
  document.getElementById("priority-filter").addEventListener("change", (e) => {
    currentPriorityFilter = e.target.value;
    displayFilteredWishlist();
  });
  
  document.getElementById("wishlist-sort").addEventListener("change", (e) => {
    currentSort = e.target.value;
    displayFilteredWishlist();
  });
}

// =========================
// DOMContentLoaded
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("💝 DOMContentLoaded - Pagina wishlist caricata!");
  
  // Verifica autenticazione
  const user = await checkAuth();
  if (!user) return;
  
  // Inizializza tabella (se necessario)
  await initializeWishlistTable();
  
  // Setup event listeners
  setupEventListeners();
  
  // Carica wishlist
  await loadWishlist();
});
