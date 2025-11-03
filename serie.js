// Avvia il controllo autenticazione e caricamento serie/oggetti all'avvio
window.addEventListener("DOMContentLoaded", checkAuth);
// =========================
// INIZIALIZZAZIONE SUPABASE
// ========================

const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";

const supa = supabase.createClient(supabaseUrl, supabaseKey);
window.supabase = supa;

// =========================
// FUNZIONE: ottieni id serie da URL
// =========================
function getSerieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("serie_id") || params.get("id");
}

// =========================
// VERIFICA SESSIONE
// =========================
async function checkAuth() {
  const seriesList = document.getElementById("items-list");
  if (seriesList) seriesList.innerHTML = `<p style='color:blue;'>[DEBUG] checkAuth chiamata</p>`;
  const {
    data: { session },
  } = await supa.auth.getSession();

  if (!session) {
    const seriesList = document.getElementById("items-list");
    if (seriesList) seriesList.innerHTML = `<p style='color:red;'>❌ Devi effettuare il login per vedere la serie!</p>`;
    window.location.href = "./login.html";
    return;
  }

  const serieId = getSerieIdFromUrl();
  if (!serieId) {
    const seriesList = document.getElementById("items-list");
    if (seriesList) seriesList.innerHTML = `<p style='color:red;'>❌ ID serie mancante nell'URL!</p>`;
    return;
  }

  // Carica la serie corrente
  const { data: serie, error } = await supa
    .from("series")
    .select("*")
    .eq("id", serieId)
    .single();

  if (error || !serie) {
    const seriesList = document.getElementById("items-list");
    if (seriesList) seriesList.innerHTML = `<p style='color:red;'>❌ Serie non trovata!</p>`;
    return;
  }


  // Aggiorna titolo pagina
  const serieTitle = document.getElementById("serie-title");
  if (serieTitle) serieTitle.textContent = serie.nome;

  // Mostra le note se presenti
  if (serie.note && serie.note.trim() !== '') {
    const noteDiv = document.getElementById("serie-note");
    const noteText = document.getElementById("serie-note-text");
    if (noteDiv && noteText) {
      noteText.textContent = serie.note;
      noteDiv.style.display = "block";
    }
  }

  // Mostra tasto indietro
  const backBtn = document.getElementById("back-to-series");
  if (backBtn) {
    backBtn.style.display = "block";
    backBtn.onclick = function() {
      // Se c'è una marca salvata, torna alla lista serie di quella marca
      const lastBrand = window.sessionStorage.getItem('lastBrand');
      if (lastBrand && lastBrand !== '""') {
        const brand = JSON.parse(lastBrand);
        window.sessionStorage.removeItem('lastBrand');
        window.location.href = `collection.html?brand=${encodeURIComponent(brand)}`;
      } else {
        window.history.length > 1 ? window.history.back() : window.location.href = "collection.html";
      }
    };
  }

  // Mostra controlli della serie
  const serieControls = document.getElementById("serie-controls");
  if (serieControls) serieControls.style.display = "block";

  // // Aggiorna link "Aggiungi"
  // const addLink = document.querySelector('a[href="./addItem.html"]');
  // if (addLink) {
  //   addLink.href = `./addItem.html?serie_id=${serieId}`;
  // } else {

  // }

  // Carica la collezione dopo aver caricato la serie
  loadCollection();
  return serie;
}

// =========================
// CARICA COLLEZIONE
// =========================
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
    const currentUser = await getCurrentUserAsync();
    if (!currentUser) {
      seriesList.innerHTML = `<p style='color:red;'>❌ Utente non autenticato!</p>`;
      return;
    }

    // Recupera la serie per ottenere il catalog_series_id
    const { data: serie, error: serieError } = await supa
      .from("series")
      .select("*")
      .eq("id", serieId)
      .single();

    if (serieError || !serie) {
      seriesList.innerHTML = `<p style='color:red;'>❌ Errore nel caricamento dati serie!</p>`;
      return;
    }

    const catalogSeriesId = serie.catalog_series_id;
    if (!catalogSeriesId) {
      seriesList.innerHTML = `<p style='color:red;'>❌ Questa serie non è collegata a nessuna serie del catalogo!</p>`;
      return;
    }

    // 1. Recupera tutti gli oggetti del catalogo per la serie
    const { data: catalogItems, error: catError } = await supa
      .from("catalog_items")
      .select("*")
      .eq("catalog_series_id", catalogSeriesId)
      .order("numero", { ascending: true });

    if (catError) {
      seriesList.innerHTML = `<p style='color:red;'>❌ Errore nel caricamento oggetti catalogo: ${catError.message}</p>`;
      return;
    }

    // 2. Recupera l'id reale dalla tabella users tramite email
    const { data: { user: authUser } } = await supa.auth.getUser();
    if (!authUser) {
      seriesList.innerHTML = `<p style='color:red;'>❌ Utente non autenticato!`;
      return;
    }
    const { data: userRow, error: userError } = await supa
      .from('users')
      .select('id, mail')
      .eq('mail', authUser.email)
      .single();
    if (userError || !userRow) {
      seriesList.innerHTML = `<p style='color:red;'>❌ Errore nel recupero utente: ${userError?.message || 'Utente non trovato'}`;
      return;
    }
    const realUserId = userRow.id;

    // 3. Recupera tutti gli item posseduti dall'utente per questa serie
    const { data: userItems, error: itemsError } = await supa
      .from("item")
      .select("*")
      .eq("serie_id", serieId)
      .eq("user_id", realUserId);
    if (itemsError) {
      seriesList.innerHTML = `<p style='color:red;'>❌ Errore nel caricamento oggetti utente: ${itemsError.message}</p>`;
      return;
    }

    // 3. Merge: per ogni oggetto catalogo, cerca se l'utente lo possiede
    const userItemsByCatalogId = {};
    userItems.forEach(u => {
      if (u.catalog_item_id) userItemsByCatalogId[u.catalog_item_id] = u;
    });

    seriesList.innerHTML = catalogItems
      .map((cat, index) => {
        const userItem = userItemsByCatalogId[cat.id];
        const isPresent = userItem && !userItem.mancante;
        const isInWishlist = userItem && userItem.wishlist;
        // Campo doppione: valore attuale o 0 se non presente
        const doppioneValue = userItem && typeof userItem.doppione === 'number' ? userItem.doppione : 0;
        return `
          <div class="item fade-in ${isPresent ? "item-present" : "item-missing"}" style="animation-delay:${0.1 * index}s;">
            <div class="item-header">
              <h3>${cat.nome || ""} (#${cat.numero || ""})</h3>
            </div>
            <div class="item-status" style="margin-bottom:8px;">
              <label class="checkbox-container">
                <input type="checkbox" class="item-checkbox" data-item-id="${userItem ? userItem.id : ''}" data-catalog-item-id="${cat.id}" ${isPresent ? "checked" : ""}>
                <span class="checkmark"></span>
                <span class="status-text">Presente</span>
              </label>
              ${
                !isPresent
                  ? `<label class="wishlist-checkbox-container">
                      <input type="checkbox" class="wishlist-checkbox" data-item-id="${userItem ? userItem.id : ''}" data-catalog-item-id="${cat.id}" data-item-name="${cat.nome || ""}" data-item-number="${cat.numero || ""}" ${isInWishlist ? "checked" : ""}>
                      <span class="wishlist-checkmark">&#x1F49D;</span>
                      <span class="wishlist-text">${isInWishlist ? "In Wishlist" : "Wishlist"}</span>
                    </label>`
                  : ""
              }
            </div>
            <p>${cat.accessori || ""}</p>
            ${(cat.valore && cat.valore !== "") ? `<p>Valore: ${cat.valore}</p>` : ""}
            ${cat.immagine_riferimento ? `
              <img src="${cat.immagine_riferimento}" 
                   alt="${cat.nome || ""}" 
                   class="item-foto" 
                   onclick="openLightbox('${cat.immagine_riferimento}')"
                   style="cursor: zoom-in;">
            ` : ""}
            <div class="item-doppione-field" style="margin:8px 0;">
              <label for="doppione-${cat.id}" style="font-size:0.95em;">Doppione:</label>
              <input type="number" min="0" class="doppione-input" id="doppione-${cat.id}" data-item-id="${userItem ? userItem.id : ''}" data-catalog-item-id="${cat.id}" value="${doppioneValue}" style="width:60px; margin-left:8px;">
            </div>
            <div class="item-actions">
              <button class="btn-item-action btn-item-edit" data-action="edit-item" data-id="${userItem ? userItem.id : ''}">Modifica</button>
              <button class="btn-item-action btn-item-delete" data-action="delete-item" data-id="${userItem ? userItem.id : ''}" data-name="${cat.nome || ""}">Elimina</button>
            </div>
          </div>
        `;
      })
      .join("");

  // Dopo il rendering, attiva i checkbox
  setupItemCheckboxes();
  // Dopo il rendering, attiva i checkbox wishlist
  setupWishlistCheckboxes();
  // Dopo il rendering, attiva i doppione input
  setupDoppioneInputs();
// =========================
// SETUP DOPPIONE INPUTS
// =========================
function setupDoppioneInputs() {
  document.querySelectorAll('.doppione-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const itemId = input.dataset.itemId;
      const catalogItemId = input.dataset.catalogItemId;
      const value = parseInt(input.value, 10) || 0;
      if (!itemId) {
        alert('Devi prima marcare come "Presente" l\'oggetto per poter salvare i doppioni!');
        input.value = 0;
        return;
      }
      try {
        const { error } = await supa.from('item').update({ doppione: value }).eq('id', itemId);
        if (error) throw error;
        // Feedback visivo
        input.style.background = '#d4ffd4';
        setTimeout(() => { input.style.background = ''; }, 600);
      } catch (err) {
        alert('Errore salvataggio doppioni: ' + err.message);
      }
    });
  });
}
  } catch (error) {
  }
}

// =========================
// LIGHTBOX PER IMMAGINI
// =========================
function openLightbox(imageUrl) {
  let lightbox = document.getElementById('serie-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'serie-lightbox';
    lightbox.className = 'lightbox';
    lightbox.innerHTML = '<img id="serie-lightbox-img" src="" alt="Immagine oggetto">';
    lightbox.onclick = () => lightbox.classList.remove('active');
    document.body.appendChild(lightbox);
  }
  document.getElementById('serie-lightbox-img').src = imageUrl;
  lightbox.classList.add('active');
}

window.openLightbox = openLightbox;

// =========================
// MODIFICA / ELIMINAZIONE SERIE
// =========================
async function editSerie() {
  const serieId = getSerieIdFromUrl();
  if (serieId) window.location.href = "./editSerie.html?id=" + serieId;
}

async function deleteSerie() {
  const serieId = getSerieIdFromUrl();
  if (!serieId) return;

  const confirmDelete = confirm("[ATTENZIONE] Sei sicuro di voler eliminare questa serie?\n\nATTENZIONE: Verranno eliminati anche tutti gli oggetti al suo interno!");
  if (!confirmDelete) return;


  try {
    // elimina item
    const { error: itemsError } = await supa.from("item").delete().eq("serie_id", serieId);
    if (itemsError) throw itemsError;

    // elimina serie
  const { error: serieError } = await supa.from("series").delete().eq("id", serieId);
    if (serieError) throw serieError;

    alert("Serie eliminata correttamente!");
    window.location.href = "./series.html"; // pagina elenco
  } catch (error) {
    alert("❌ Errore durante l'eliminazione: " + error.message);
  }
}

// =========================
// SETUP ITEM ACTION BUTTONS
// =========================
function setupItemActionButtons() {
  document.querySelectorAll('[data-action="edit-item"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      editItem(btn.dataset.id);
    });
  });

  document.querySelectorAll('[data-action="delete-item"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteItem(btn.dataset.id, btn.dataset.name);
    });
  });
}

// =========================
// SETUP ITEM CHECKBOXES
// =========================
function setupItemCheckboxes() {
  document.querySelectorAll(".item-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {

      let itemId = checkbox.dataset.itemId;
      const catalogItemId = checkbox.dataset.catalogItemId;
      const isPresent = checkbox.checked;
  // Cerca .status-text all'interno della .item
  const itemDivCheckbox = checkbox.closest('.item');
  const statusText = itemDivCheckbox ? itemDivCheckbox.querySelector('.status-text') : null;

      try {
        // Recupera il valore doppione dal relativo input
        const itemDivCheckbox = checkbox.closest('.item');
        const doppioneInput = itemDivCheckbox.querySelector('.doppione-input');
        const doppioneValue = doppioneInput ? parseInt(doppioneInput.value, 10) || 0 : 0;

        // Se non esiste ancora l'item, crealo
        if (!itemId || itemId === "") {
          const serieId = getSerieIdFromUrl();
          // Recupera l'id reale dalla tabella users tramite email
          const { data: { user: authUser } } = await supa.auth.getUser();
          if (!authUser) throw new Error("Utente non autenticato");
          const { data: userRow, error: userError } = await supa
            .from('users')
            .select('id, mail')
            .eq('mail', authUser.email)
            .single();
          if (userError || !userRow) throw new Error("Utente non trovato nella tabella users!");
          const realUserId = userRow.id;

          // Recupera i dati dal DOM (nome, numero, accessori, immagine)
          const nome = itemDivCheckbox.querySelector('h3')?.textContent?.split(' (#')[0] || '';
          const numero = nome && itemDivCheckbox.querySelector('h3')?.textContent?.match(/#(\d+)/)?.[1] || '';
          const accessori = itemDivCheckbox.querySelector('p')?.textContent || '';
          const img = itemDivCheckbox.querySelector('img')?.getAttribute('src') || '';

          const { data: newItem, error: insertError } = await supa.from("item").insert({
            user_id: realUserId,
            serie_id: serieId,
            catalog_item_id: catalogItemId,
            mancante: !isPresent,
            wishlist: false,
            nome: nome,
            numero: numero,
            accessori: accessori,
            immagine_riferimento: img,
            doppione: doppioneValue
          }).select().single();
          if (insertError) throw insertError;
          itemId = newItem.id;
          checkbox.dataset.itemId = itemId;
          if (doppioneInput) doppioneInput.dataset.itemId = itemId;
        } else {
          // DEBUG: mostra itemId prima di ogni update
          const { data: itemRow, error: itemFetchError } = await supa.from("item").select("*").eq("id", itemId).single();
          if (!itemRow) {
          } else {
            const { data: { user: authUser } } = await supa.auth.getUser();
            const { data: userRow, error: userError } = await supa
              .from('users')
              .select('id, mail')
              .eq('mail', authUser.email)
              .single();
            const realUserId = userRow?.id;
          }
          const { error } = await supa.from("item").update({ mancante: !isPresent, doppione: doppioneValue }).eq("id", itemId);
          if (error) throw error;
        }

        // se presente -> togli da wishlist
        if (isPresent) {
          await supa.from("item").update({ wishlist: false }).eq("id", itemId);

          const currentUser = await getCurrentUserAsync();
          if (currentUser) {
            await supa.from("wishlist").delete().eq("user_id", currentUser.id).eq("item_id", itemId);
          }

          const wishlistLabel = checkbox.closest(".item").querySelector(".wishlist-checkbox-container");
          if (wishlistLabel) wishlistLabel.style.display = "none";
        } else {
          const wishlistLabel = checkbox.closest(".item").querySelector(".wishlist-checkbox-container");
          if (wishlistLabel) wishlistLabel.style.display = "";
        }

        if (statusText) statusText.textContent = "Presente";
        // Cambia colore in verde subito
        const itemDiv = checkbox.closest('.item');
        if (itemDiv) {
          if (isPresent) {
            itemDiv.classList.add('item-present');
            itemDiv.classList.remove('item-missing');
          } else {
            itemDiv.classList.add('item-missing');
            itemDiv.classList.remove('item-present');
          }
        }
      } catch (err) {
        checkbox.checked = !checkbox.checked; // rollback
        alert("❌ Errore nell'aggiornamento: " + err.message);
      }
    });
  });
}

// =========================
// SETUP WISHLIST CHECKBOXES
// =========================
function setupWishlistCheckboxes() {
  document.querySelectorAll(".wishlist-checkbox").forEach((cb) => setupSingleWishlistCheckbox(cb));
}

function setupSingleWishlistCheckbox(checkbox) {
  const wishlistText = checkbox.parentElement.querySelector(".wishlist-text");
  if (checkbox.checked && wishlistText) {
    wishlistText.textContent = "In Wishlist";
    wishlistText.style.color = "#e74c3c";
  }

  checkbox.addEventListener("change", async () => {
    const itemId = checkbox.dataset.itemId;
    const itemName = checkbox.dataset.itemName;
    const isInWishlist = checkbox.checked;

    try {
      // Recupera l'id reale dalla tabella users tramite email
      const { data: { user: authUser } } = await supa.auth.getUser();
      if (!authUser) throw new Error("Utente non autenticato");
      const { data: userRow, error: userError } = await supa
        .from('users')
        .select('id, mail')
        .eq('mail', authUser.email)
        .single();
      if (userError || !userRow) throw new Error("Utente non trovato nella tabella users!");
      const realUserId = userRow.id;

      if (isInWishlist) {
        await supa.from("item").update({ wishlist: true }).eq("id", itemId);
        const { error: wishlistInsertError } = await supa.from("wishlist").insert({
          user_id: realUserId,
          item_id: itemId,
          priority: "media",
          notes: null,
          estimated_price: null,
          purchase_url: null,
        });
      
      } else {
        await supa.from("item").update({ wishlist: false }).eq("id", itemId);
        const { error: wishlistDeleteError } = await supa.from("wishlist").delete().eq("user_id", realUserId).eq("item_id", itemId);
      
      }

      if (wishlistText) {
        wishlistText.textContent = isInWishlist ? "In Wishlist" : "Wishlist";
        wishlistText.style.color = isInWishlist ? "#e74c3c" : "";
      }

    } catch (err) {
      checkbox.checked = !checkbox.checked; // rollback
      alert("❌ Errore aggiornamento wishlist: " + err.message);
    }
  });
}

// =========================
// FUNZIONE: ottieni utente corrente
// =========================
async function getCurrentUserAsync() {
  const { data: { user } } = await supa.auth.getUser();
  return user;
}
