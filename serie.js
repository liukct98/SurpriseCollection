// Avvia il controllo autenticazione e caricamento serie/oggetti all'avvio
window.addEventListener("DOMContentLoaded", checkAuth);
// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================
console.log("🚀 Script serie.js caricato!");

const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";

const supa = supabase.createClient(supabaseUrl, supabaseKey);

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
  console.log("[DEBUG] checkAuth chiamata");
  const {
    data: { session },
  } = await supa.auth.getSession();

  if (!session) {
    console.warn("⚠️ Nessuna sessione attiva, redirect al login");
    const seriesList = document.getElementById("items-list");
    if (seriesList) seriesList.innerHTML = `<p style='color:red;'>❌ Devi effettuare il login per vedere la serie!</p>`;
    window.location.href = "./login.html";
    return;
  }

  const serieId = getSerieIdFromUrl();
  if (!serieId) {
    console.error("❌ Nessun serieId nell'URL");
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
    console.error("❌ Errore caricamento serie:", error);
    const seriesList = document.getElementById("items-list");
    if (seriesList) seriesList.innerHTML = `<p style='color:red;'>❌ Serie non trovata!</p>`;
    return;
  }

  // Aggiorna titolo pagina
  const serieTitle = document.getElementById("serie-title");
  if (serieTitle) serieTitle.textContent = serie.nome;

  // Mostra controlli della serie
  const serieControls = document.getElementById("serie-controls");
  if (serieControls) serieControls.style.display = "block";

  // Aggiorna link "Aggiungi"
  const addLink = document.querySelector('a[href="./addItem.html"]');
  if (addLink) {
    addLink.href = `./addItem.html?serie_id=${serieId}`;
    console.log("🔗 Link Aggiungi aggiornato:", addLink.href);
  } else {
    console.error("❌ Link ./addItem.html non trovato!");
  }

  console.log("✅ Serie caricata:", serie);
  // Carica la collezione dopo aver caricato la serie
  loadCollection();
  return serie;
}

// =========================
// CARICA COLLEZIONE
// =========================
async function loadCollection() {
  const seriesList = document.getElementById("items-list");
  if (seriesList) seriesList.innerHTML = `<p style='color:blue;'>[DEBUG] loadCollection chiamata</p>`;
  console.log("[DEBUG] loadCollection chiamata");
  if (!seriesList) {
    console.error("Elemento #items-list non trovato nel DOM");
    return;
  }

  const serieId = getSerieIdFromUrl();
  if (!serieId) {
    seriesList.innerHTML = `<p>❌ ID serie mancante!</p>`;
    console.error("ID serie mancante nell'URL");
    return;
  }

  seriesList.innerHTML = `<div class="spinner"></div><p>Caricamento oggetti della serie...</p>`;
  console.log("Inizio caricamento oggetti per serieId:", serieId);

  try {
    const currentUser = await getCurrentUserAsync();
    console.log("Utente corrente:", currentUser);
    if (!currentUser) {
      seriesList.innerHTML = `<p style='color:red;'>❌ Utente non autenticato!</p>`;
      throw new Error("Utente non autenticato");
    }

    const { data: items, error } = await supa
      .from("item")
      .select("*")
      .eq("serie_id", serieId)
      .order("numero", { ascending: true });
    console.log("Risposta Supabase items:", items, error);

    if (error) {
      seriesList.innerHTML = `<p style='color:red;'>❌ Errore nella query Supabase: ${error.message}</p>`;
      throw error;
    }

    if (!items || items.length === 0) {
      seriesList.innerHTML = `<p style='color:orange;'>Nessun oggetto presente in questa serie.<br><a href='./addItem.html?serie_id=${serieId}'>Aggiungi il primo oggetto!</a></p>`;
      console.warn("Nessun oggetto trovato per questa serie.");
      return;
    }

    seriesList.innerHTML = items
      .map((i, index) => {
        const isInWishlist = !!i.wishlist;
        return `
          <div class="item fade-in ${!i.mancante ? "item-present" : "item-missing"}" style="animation-delay:${0.1 * index}s;">
            <div class="item-header">
              <h3>${i.nome} (#${i.numero})</h3>
              <div class="item-status">
                <label class="checkbox-container">
                  <input type="checkbox" class="item-checkbox" data-item-id="${i.id}" ${!i.mancante ? "checked" : ""}>
                  <span class="checkmark"></span>
                  <span class="status-text">Presente</span>
                </label>
                ${
                  i.mancante
                    ? `<label class="wishlist-checkbox-container">
                        <input type="checkbox" class="wishlist-checkbox" data-item-id="${i.id}" data-item-name="${i.nome}" data-item-number="${i.numero}" ${isInWishlist ? "checked" : ""}>
                        <span class="wishlist-checkmark">&#x1F49D;</span>
                        <span class="wishlist-text">${isInWishlist ? "In Wishlist" : "Wishlist"}</span>
                      </label>`
                    : ""
                }
              </div>
            </div>
            <p>${i.accessori || ""}</p>
            ${i.valore && i.valore !== "" ? `<p>Valore: ${i.valore}</p>` : ""}
            ${i.immagine_riferimento ? `<img src="${i.immagine_riferimento}" alt="${i.nome}" class="item-foto" style="cursor:pointer;" data-img="${i.immagine_riferimento}">` : ""}
            <div class="item-actions">
              <button class="btn-item-action btn-item-edit" data-action="edit-item" data-id="${i.id}">Modifica</button>
              <button class="btn-item-action btn-item-delete" data-action="delete-item" data-id="${i.id}" data-name="${i.nome}">Elimina</button>
            </div>
          </div>
        `;
      })
      .join("");

    // Lightbox: click sulla foto per ingrandire
    document.querySelectorAll('.item-foto').forEach(img => {
      img.addEventListener('click', function() {
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        if (lightbox && lightboxImg) {
          lightboxImg.src = img.getAttribute('data-img');
          lightbox.style.display = 'flex';
        }
      });
    });

    // Chiudi lightbox al click
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.addEventListener('click', function() {
        lightbox.style.display = 'none';
      });
    }

    setupItemActionButtons();
    setupItemCheckboxes();
    setupWishlistCheckboxes();
    console.log("Oggetti caricati e DOM aggiornato.");
  } catch (error) {
    console.error("Errore durante il caricamento della collezione:", error);
    // seriesList.innerHTML già aggiornato sopra
  }
}

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

  console.log("Eliminazione serie:", serieId);

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
    console.error("❌ Errore eliminazione:", error);
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
      const itemId = checkbox.dataset.itemId;
      const isPresent = checkbox.checked;
      const statusText = checkbox.closest(".item-header").querySelector(".status-text");

      try {
        const { error } = await supa.from("item").update({ mancante: !isPresent }).eq("id", itemId);
        if (error) throw error;

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
        console.error("Errore aggiornamento stato:", err);
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
      const currentUser = await getCurrentUserAsync();
      if (!currentUser) throw new Error("Utente non autenticato");

      if (isInWishlist) {
        await supa.from("item").update({ wishlist: true }).eq("id", itemId);
        await supa.from("wishlist").insert({
          user_id: currentUser.id,
          item_id: itemId,
          priority: "media",
          notes: null,
          estimated_price: null,
          purchase_url: null,
        });
      } else {
        await supa.from("item").update({ wishlist: false }).eq("id", itemId);
        await supa.from("wishlist").delete().eq("user_id", currentUser.id).eq("item_id", itemId);
      }

      if (wishlistText) {
        wishlistText.textContent = isInWishlist ? "In Wishlist" : "Wishlist";
        wishlistText.style.color = isInWishlist ? "#e74c3c" : "";
      }

      console.log(`${isInWishlist ? "Aggiunto" : "Rimosso"} "${itemName}" ${isInWishlist ? "alla" : "dalla"} wishlist`);
    } catch (err) {
      console.error("Errore gestione wishlist:", err);
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
