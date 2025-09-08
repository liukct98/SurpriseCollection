// =============================================
// CATALOG.JS - VERSIONE PULITA E SEMPLICE
// =============================================

console.log("📖 Catalog.js caricato!");

// Configurazione Supabase
const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;

// =============================================
// FUNZIONI BASE
// =============================================

async function checkAuth() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "index.html";
      return null;
    }
    return user;
  } catch (error) {
    console.error("Errore autenticazione:", error);
    window.location.href = "index.html";
    return null;
  }
}

async function loadCatalog() {
  console.log("📖 Caricamento catalogo...");
  
  try {
    // Carica tutte le serie del catalogo
    const { data: catalogSeries, error } = await supabase
      .from("catalog_series")
      .select("*")
      .order("nome");

    if (error) throw error;

    displayCatalog(catalogSeries || []);
    
  } catch (error) {
    console.error("Errore caricamento catalogo:", error);
    document.getElementById("catalog-container").innerHTML = `
      <div class="error">
        <h3>⚠️ Errore caricamento</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function displayCatalog(series) {
  const container = document.getElementById("catalog-container");
  
  if (series.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <h3>📭 Catalogo vuoto</h3>
        <p>Nessuna serie disponibile al momento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = series.map(serie => `
    <div class="serie-card">
      <h3>${serie.nome}</h3>
      <div class="serie-info">
        ${serie.anno ? `<p><strong>Anno:</strong> ${serie.anno}</p>` : ''}
        ${serie.nazione ? `<p><strong>Nazione:</strong> ${serie.nazione}</p>` : ''}
        ${serie.n_pezzi ? `<p><strong>Pezzi:</strong> ${serie.n_pezzi}</p>` : ''}
      </div>
      <div class="serie-actions">
        <button onclick="addToCollection('${serie.id}')" class="btn-primary">
          ➕ Aggiungi alla Collezione
        </button>
        <button onclick="viewDetails('${serie.id}')" class="btn-secondary">
          👁️ Dettagli
        </button>
      </div>
    </div>
  `).join('');
}

async function addToCollection(catalogSeriesId) {
  try {
    console.log("➕ Aggiunta serie alla collezione...");

    // 1. Prendi i dettagli della serie dal catalogo
    const { data: catalogSerie, error: catalogError } = await supabase
      .from("catalog_series")
      .select("*")
      .eq("id", catalogSeriesId)
      .single();

    if (catalogError) throw catalogError;

    // 2. Aggiungi la serie alla collezione personale
    const { data: newSerie, error: serieError } = await supabase
      .from("series")
      .insert({
        nome: catalogSerie.nome,
        anno: catalogSerie.anno,
        nazione: catalogSerie.nazione,
        n_pezzi: catalogSerie.n_pezzi,
        user_id: currentUser.id
        // Rimosso catalog_series_id - non dovrebbe esistere nella tabella series
      })
      .select()
      .single();

    if (serieError) {
      if (serieError.code === '23505') {
        alert("⚠️ Serie già presente nella tua collezione!");
        return;
      }
      throw serieError;
    }

    // 3. Copia gli oggetti dal catalogo alla collezione personale
    const { data: catalogItems, error: itemsError } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("catalog_series_id", catalogSeriesId);

    if (itemsError) throw itemsError;

    if (catalogItems && catalogItems.length > 0) {
      const userItems = catalogItems.map(item => ({
        numero: item.numero,
        nome: item.nome,
        accessori: item.accessori,
        serie_id: newSerie.id,
        user_id: currentUser.id,
        // Rimosso catalog_series_id - non dovrebbe esistere nella tabella item
        mancante: true,
        wishlist: false
      }));

      const { error: insertError } = await supabase
        .from("item")
        .insert(userItems);

      if (insertError) throw insertError;
    }

    alert(`✅ Serie "${catalogSerie.nome}" aggiunta alla collezione!`);

  } catch (error) {
    console.error("Errore aggiunta serie:", error);
    alert(`❌ Errore: ${error.message}`);
  }
}

function viewDetails(catalogSeriesId) {
  window.location.href = `catalogSerie.html?id=${catalogSeriesId}`;
}

// =============================================
// INIZIALIZZAZIONE
// =============================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Inizializzazione catalog.js...");
  
  // Verifica autenticazione
  currentUser = await checkAuth();
  if (!currentUser) return;

  console.log("✅ Utente autenticato:", currentUser.email);

  // Carica il catalogo
  await loadCatalog();
});
