// =============================================
// CATALOG.JS - VERSIONE PULITA E SEMPLICE
// =============================================

console.log("📖 Catalog.js caricato!");

// Configurazione Supabase
const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let allCatalogSeries = []; // Memorizza tutte le serie per il filtraggio
let currentSearch = "";
let currentYearFilter = "";
let currentNationFilter = "";
let currentSort = "nome";

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

    // Memorizza tutte le serie per il filtraggio
    allCatalogSeries = catalogSeries || [];
    
    // Popola i filtri
    populateFilters();
    // Mostra vetrina marche come blocchi
    const brandShowcase = document.getElementById('brand-showcase');
    const catalogContainer = document.getElementById('catalog-container');
    if (brandShowcase && catalogContainer) {
      const brands = [...new Set(allCatalogSeries.map(s => s.marca).filter(Boolean))].sort();
      brandShowcase.innerHTML = brands.map(brand => {
        const serieCount = allCatalogSeries.filter(s => s.marca === brand).length;
        return `
          <div class="serie fade-in" onclick="filterByBrand('${brand}')" style="cursor:pointer;">
            <div>
              <h2>${brand}</h2>
              <div class="serie-info">
                <p><strong>🎯 Serie disponibili:</strong> ${serieCount}</p>
              </div>
            </div>
          </div>
        `;
      }).join("");
      // Nascondi le serie finché non si seleziona una marca
      catalogContainer.style.display = 'none';
    }
// Filtro per marca
window.currentBrandFilter = null;
function filterByBrand(brand) {
  // Mostra le serie e nascondi la vetrina marche
  document.getElementById('catalog-container').style.display = '';
  document.getElementById('brand-showcase').style.display = 'none';
  window.currentBrandFilter = brand;
  displayFilteredCatalog();
}
window.filterByBrand = filterByBrand;
    // Mostra le serie filtrate
    displayFilteredCatalog();
    
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
      <div class="empty-state">
        <h3>� Nessuna serie trovata</h3>
        <p>Nessuna serie corrisponde ai filtri attuali.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = series.map((serie, index) => `
    <div class="serie fade-in" style="animation-delay: ${0.1 * index}s;">
      <div onclick="viewDetails('${serie.id}')" style="cursor: pointer;">
        <h2>${serie.nome} (${serie.anno || 'N/A'})</h2>
        <div class="serie-info">
          <p><strong>📍 Nazione:</strong> ${serie.nazione || 'Non specificata'}</p>
          <p><strong>🎯 Numero pezzi:</strong> ${serie.n_pezzi || 0}</p>
          ${serie.immagine_copertina ? `
            <div class="serie-preview-image">
              <img src="${serie.immagine_copertina}" alt="${serie.nome}" loading="lazy">
            </div>
          ` : ''}
          <div class="sync-indicator">
            <small class="sync-info">📖 Aggiungi alla tua collezione per iniziare a collezionare</small>
          </div>
        </div>
      </div>
      <div class="serie-actions" onclick="event.stopPropagation();">
        <button onclick="addToCollection('${serie.id}')" class="btn-primary">➕ Aggiungi alla Collezione</button>
        <button onclick="viewDetails('${serie.id}')" class="btn-secondary">👁️ Dettagli</button>
      </div>
    </div>
  `).join('');
  
  // Aggiorna il contatore
  updateResultsCount(series.length);
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

    // 2. Controlla se la serie è già nella collezione dell'utente
    const { data: existingSerie, error: checkError } = await supabase
      .from("series")
      .select("id")
      .eq("catalog_series_id", catalogSeriesId)
      .eq("user_id", currentUser.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (existingSerie) {
      alert("⚠️ Serie già presente nella tua collezione!");
      return;
    }

    // 3. Aggiungi la serie alla collezione personale CON riferimento al catalogo
    const { data: newSerie, error: serieError } = await supabase
      .from("series")
      .insert({
        nome: catalogSerie.nome,
        anno: catalogSerie.anno,
        nazione: catalogSerie.nazione,
        n_pezzi: catalogSerie.n_pezzi,
        immagine_copertina: catalogSerie.immagine_copertina,
        user_id: currentUser.id,
        catalog_series_id: catalogSeriesId // 🔄 Collegamento per sincronizzazione automatica
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

    // 4. Copia gli oggetti dal catalogo alla collezione personale CON riferimenti
    const { data: catalogItems, error: itemsError } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("catalog_series_id", catalogSeriesId);

    if (itemsError) throw itemsError;

    if (catalogItems && catalogItems.length > 0) {
      const userItems = catalogItems.map(item => ({
  numero: String(item.numero),
        nome: item.nome,
        accessori: item.accessori,
  immagine_riferimento: item.immagine_riferimento,
        serie_id: newSerie.id,
        user_id: currentUser.id,
        catalog_item_id: item.id, // 🔄 Collegamento per sincronizzazione automatica
        mancante: true,
        wishlist: false
      }));

      const { error: insertError } = await supabase
        .from("item")
        .insert(userItems);

      if (insertError) throw insertError;
    }

    alert(`✅ Serie "${catalogSerie.nome}" aggiunta alla collezione! \n \n🔄 La serie si aggiornerà automaticamente quando vengono modificati i dati nel catalogo generale.`);

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
  
  // Inizializza i filtri
  setupFilterListeners();
});

// =================================
// FUNZIONI FILTRI
// =================================

function populateFilters() {
  const yearFilter = document.getElementById("filter-year");
  const nationFilter = document.getElementById("filter-nation");
  
  if (!yearFilter || !nationFilter) return;
  
  // Anni unici
  const years = [...new Set(allCatalogSeries.map(s => s.anno).filter(Boolean))].sort((a, b) => b - a);
  yearFilter.innerHTML = '<option value="">Tutti gli anni</option>' + 
    years.map(year => `<option value="${year}">${year}</option>`).join("");
  
  // Nazioni uniche
  const nations = [...new Set(allCatalogSeries.map(s => s.nazione).filter(Boolean))].sort();
  nationFilter.innerHTML = '<option value="">Tutte le nazioni</option>' + 
    nations.map(nation => `<option value="${nation}">${nation}</option>`).join("");
}

function displayFilteredCatalog() {
  let filteredSeries = [...allCatalogSeries];
  // Filtro per marca
  if (window.currentBrandFilter) {
    filteredSeries = filteredSeries.filter(serie => serie.marca === window.currentBrandFilter);
  }
  
  // Filtro per ricerca
  if (currentSearch) {
    filteredSeries = filteredSeries.filter(serie => 
      serie.nome.toLowerCase().includes(currentSearch.toLowerCase()) ||
      (serie.nazione && serie.nazione.toLowerCase().includes(currentSearch.toLowerCase()))
    );
  }
  
  // Filtro per anno
  if (currentYearFilter) {
    filteredSeries = filteredSeries.filter(serie => serie.anno == currentYearFilter);
  }
  
  // Filtro per nazione
  if (currentNationFilter) {
    filteredSeries = filteredSeries.filter(serie => serie.nazione === currentNationFilter);
  }
  
  // Ordinamento
  filteredSeries.sort((a, b) => {
    switch (currentSort) {
      case "anno":
        return (b.anno || 0) - (a.anno || 0);
      case "nazione":
        return (a.nazione || "").localeCompare(b.nazione || "");
      case "n_pezzi":
        return (b.n_pezzi || 0) - (a.n_pezzi || 0);
      case "nome":
      default:
        return a.nome.localeCompare(b.nome);
    }
  });
  
  displayCatalog(filteredSeries);
}

function updateResultsCount(count) {
  const resultsCount = document.getElementById("results-count");
  if (resultsCount) {
    const total = allCatalogSeries.length;
    resultsCount.textContent = `${count} di ${total} serie`;
  }
}

function setupFilterListeners() {
  const searchInput = document.getElementById("search-input");
  const yearFilter = document.getElementById("filter-year");
  const nationFilter = document.getElementById("filter-nation");
  const sortSelect = document.getElementById("sort-by");
  const resetBtn = document.getElementById("reset-filters");
  const toggleBtn = document.getElementById("toggle-filters");
  const filtersContainer = document.getElementById("filters-container");
  
  // Toggle filtri
  if (toggleBtn && filtersContainer) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = filtersContainer.style.display === "none";
      filtersContainer.style.display = isHidden ? "block" : "none";
      toggleBtn.textContent = isHidden ? "🔧 Nascondi Filtri" : "🔧 Mostra Filtri";
    });
  }
  
  // Ricerca
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      displayFilteredCatalog();
    });
  }
  
  // Filtro anno
  if (yearFilter) {
    yearFilter.addEventListener("change", (e) => {
      currentYearFilter = e.target.value;
      displayFilteredCatalog();
    });
  }
  
  // Filtro nazione
  if (nationFilter) {
    nationFilter.addEventListener("change", (e) => {
      currentNationFilter = e.target.value;
      displayFilteredCatalog();
    });
  }
  
  // Ordinamento
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      displayFilteredCatalog();
    });
  }
  
  // Reset filtri
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (yearFilter) yearFilter.value = "";
      if (nationFilter) nationFilter.value = "";
      if (sortSelect) sortSelect.value = "nome";
      
      currentSearch = "";
      currentYearFilter = "";
      currentNationFilter = "";
      currentSort = "nome";
      
      displayFilteredCatalog();
    });
  }
}
