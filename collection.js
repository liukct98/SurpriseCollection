// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================
console.log("🚀 Script collection.js caricato!");

const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";

console.log("🔧 Tentativo di creare client Supabase...");
console.log("Supabase global object:", typeof supabase !== 'undefined' ? supabase : "NON DEFINITO!");

if (typeof supabase === 'undefined') {
  console.error("❌ ERRORE: La libreria Supabase non è caricata!");
} else {
  console.log("✅ Libreria Supabase caricata correttamente");
}

const supa = supabase.createClient(supabaseUrl, supabaseKey);
window.supabase = supa;

// =========================
// VARIABILI GLOBALI
// =========================
let allSeries = []; // Memorizza tutte le serie per il filtraggio
let currentSearch = "";
let currentYearFilter = "";
let currentNationFilter = "";
let currentCompletionFilter = "";
let currentSort = "nome";

// =========================
// CARICAMENTO COLLEZIONI (SOLO SERIE)
// =========================
async function loadCollectionSeries() {
  const seriesList = document.getElementById("series-list");
  if (!seriesList) return;
  // Non mostrare nulla qui, la vetrina marche verrà gestita dopo

  console.log("📦 Caricamento serie dal database...");
  const { data: series, error } = await supa
    .from("series")
    .select("*, catalog_series_id")
    .order("anno", { ascending: false });

  console.log("Risultato query series:", { data: series, error });

  if (error) {
    console.error("Errore caricamento serie:", error);
    seriesList.innerHTML = `<p>❌ Errore: ${error.message}</p>`;
    return;
  }

  if (series.length === 0) {
    seriesList.innerHTML = `<p>Nessuna collezione presente. <a href="add.html">Aggiungi la prima collezione!</a></p>`;
    return;
  }

  // Carichiamo il conteggio degli oggetti per ogni serie
  const seriesWithCounts = await Promise.all(
    series.map(async (serie) => {
      // Conta solo gli oggetti presenti (non mancanti)
      const { count } = await supa
        .from("item")
        .select("*", { count: "exact", head: true })
        .eq("serie_id", serie.id)
        .eq("mancante", false); // Solo oggetti presenti
      
      return { ...serie, itemCount: count || 0 };
    })
  );

  // Memorizza tutte le serie per il filtraggio
  allSeries = seriesWithCounts;
  
  // Popola i filtri
  populateFilters();
  // Mostra solo la vetrina marche all'avvio
  const brandShowcase = document.getElementById('brand-showcase');
  if (brandShowcase && seriesList) {
    const brands = [...new Set(allSeries.map(s => s.marca).filter(Boolean))].sort();
    brandShowcase.style.display = '';
    seriesList.innerHTML = '';
    brandShowcase.innerHTML = brands.map((brand, idx) => {
      const count = allSeries.filter(s => s.marca === brand).length;
      return `
        <div class="serie fade-in" onclick="filterByBrand('${brand}')" style="animation-delay: ${0.1 * idx}s; cursor:pointer;">
          <div>
            <h2>${brand}</h2>
            <div class="serie-info">
              <p><strong>🎯 Serie nella tua collezione:</strong> ${count}</p>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
  // Nascondi le serie all'avvio
  window.currentBrandFilter = null;
// fine loadCollectionSeries
// Filtro per marca e sottocategoria
window.currentBrandFilter = null;
window.currentSubcategoryFilter = null;

window.filterByBrand = function(brand) {
  window.currentBrandFilter = brand;
  window.currentSubcategoryFilter = null;
  
  // Nascondi la vetrina marche
  const brandShowcase = document.getElementById('brand-showcase');
  if (brandShowcase) brandShowcase.style.display = 'none';
  
  // Mostra le sottocategorie della marca
  window.showSubcategoriesForBrand(brand);
}

window.showSubcategoriesForBrand = function(brand) {
  const seriesList = document.getElementById('series-list');
  const seriesForBrand = allSeries.filter(s => s.marca === brand);
  const subcategories = [...new Set(seriesForBrand.map(s => s.sottocategoria || 'Senza Categoria').filter(Boolean))].sort();
  
  let backBtnHtml = `<div><button id="back-to-brands" class="back-btn static-back-btn" onclick="window.showBrandShowcase()"><span class="back-arrow">&#8592;</span> Marche</button></div>`;
  
  seriesList.innerHTML = backBtnHtml + `
    <h2 style="margin: 20px 0; color: #3498db;">📦 ${brand} - Sottocategorie</h2>
    <div class="subcategory-grid">
      ${subcategories.map(subcategory => {
        const serieCount = seriesForBrand.filter(s => (s.sottocategoria || 'Senza Categoria') === subcategory).length;
        return `
          <div class="serie fade-in" onclick="window.filterBySubcategory('${brand}', '${subcategory}')" style="cursor:pointer;">
            <div>
              <h2>${subcategory}</h2>
              <div class="serie-info">
                <p><strong>🎯 Serie:</strong> ${serieCount}</p>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

window.filterBySubcategory = function(brand, subcategory) {
  window.currentBrandFilter = brand;
  window.currentSubcategoryFilter = subcategory;
  displayFilteredSeries();
}

window.showBrandShowcase = function() {
  window.currentBrandFilter = null;
  window.currentSubcategoryFilter = null;
  const brandShowcase = document.getElementById('brand-showcase');
  if (brandShowcase) brandShowcase.style.display = '';
  const seriesList = document.getElementById('series-list');
  if (seriesList) seriesList.innerHTML = '';
}

  console.log(`✅ Caricate ${series.length} collezioni`);
}

// =========================
// POPOLAMENTO FILTRI
// =========================
function populateFilters() {
  const yearFilter = document.getElementById("filter-year");
  const nationFilter = document.getElementById("filter-nation");
  
  if (!yearFilter || !nationFilter) return;
  
  // Anni unici
  const years = [...new Set(allSeries.map(s => s.anno))].sort((a, b) => b - a);
  yearFilter.innerHTML = '<option value="">Tutti gli anni</option>' + 
    years.map(year => `<option value="${year}">${year}</option>`).join("");
  
  // Nazioni uniche
  const nations = [...new Set(allSeries.map(s => s.nazione).filter(n => n))].sort();
  nationFilter.innerHTML = '<option value="">Tutte le nazioni</option>' + 
    nations.map(nation => `<option value="${nation}">${nation}</option>`).join("");
}

// =========================
// FILTRAGGIO E VISUALIZZAZIONE
// =========================
function displayFilteredSeries() {
  let filteredSeries = [...allSeries];
  
  // Filtro per marca
  if (window.currentBrandFilter) {
    filteredSeries = filteredSeries.filter(serie => serie.marca === window.currentBrandFilter);
  }
  
  // Filtro per sottocategoria
  if (window.currentSubcategoryFilter) {
    filteredSeries = filteredSeries.filter(serie => 
      (serie.sottocategoria || 'Senza Categoria') === window.currentSubcategoryFilter
    );
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
  
  // Filtro per completamento
  if (currentCompletionFilter) {
    filteredSeries = filteredSeries.filter(serie => {
      const totalItems = serie.n_pezzi || serie.n_oggetti || 0;
      const isComplete = serie.itemCount >= totalItems && totalItems > 0;
      
      if (currentCompletionFilter === "complete") {
        return isComplete;
      } else if (currentCompletionFilter === "incomplete") {
        return !isComplete;
      }
      return true;
    });
  }
  
  // Ordinamento
  filteredSeries.sort((a, b) => {
    switch (currentSort) {
      case "anno-cres":
        return (a.anno || 0) - (b.anno || 0);
      case "anno-desc":
        return (b.anno || 0) - (a.anno || 0);
      case "anno":
        return b.anno - a.anno;
      case "nazione":
        return (a.nazione || "").localeCompare(b.nazione || "");
      case "completion":
        const aCompletion = ((a.itemCount / (a.n_pezzi || a.n_oggetti || 1)) * 100);
        const bCompletion = ((b.itemCount / (b.n_pezzi || b.n_oggetti || 1)) * 100);
        return bCompletion - aCompletion; // Ordina dal più completo al meno completo
      case "nome":
      default:
        return a.nome.localeCompare(b.nome);
    }
  });
  
  const seriesList = document.getElementById("series-list");
  if (!seriesList) return;
  
  if (filteredSeries.length === 0) {
    seriesList.innerHTML = `<p>🔍 Nessuna collezione trovata con i filtri attuali.</p>`;
    return;
  }
  
  // Breadcrumb per navigazione
  let backBtnHtml = '';
  let breadcrumbHtml = '';
  
  if (window.currentSubcategoryFilter && window.currentBrandFilter) {
    // Siamo al livello delle serie, mostra breadcrumb completo
    backBtnHtml = `<div><button class="back-btn static-back-btn" onclick="window.showSubcategoriesForBrand('${window.currentBrandFilter}')"><span class="back-arrow">&#8592;</span> ${window.currentBrandFilter}</button></div>`;
    breadcrumbHtml = `<h2 style="margin: 20px 0; color: #3498db;">📦 ${window.currentBrandFilter} → ${window.currentSubcategoryFilter}</h2>`;
  } else if (window.currentBrandFilter) {
    // Siamo al livello delle sottocategorie (questo non dovrebbe mai essere raggiunto qui, ma per sicurezza)
    backBtnHtml = `<div><button class="back-btn static-back-btn" onclick="window.showBrandShowcase()"><span class="back-arrow">&#8592;</span> Marche</button></div>`;
  }
  seriesList.innerHTML = backBtnHtml + breadcrumbHtml + filteredSeries.map((serie, index) => `
    <div class="serie fade-in" style="animation-delay: ${0.1 * index}s;">
  <div onclick="window.sessionStorage.setItem('lastBrand', JSON.stringify('${window.currentBrandFilter || ''}')); window.location.href='./serie.html?id=${serie.id}'" style="cursor: pointer;">
        <h2>${serie.nome} (${serie.anno})</h2>
        <div class="serie-info">
          <p><strong>📍 Nazione:</strong> ${serie.nazione || 'Non specificata'}</p>
            <p><strong>🏭 Marca:</strong> ${getSerieMarca(serie)}</p>
            ${serie.sottocategoria ? `<p><strong>📂 Sottocategoria:</strong> ${serie.sottocategoria}</p>` : ''}
          <p><strong>🎯 Numero pezzi:</strong> ${serie.n_pezzi || serie.n_oggetti || 0}</p>
          <p><strong>📦 Oggetti posseduti:</strong> ${serie.itemCount}</p>
          ${serie.catalog_series_id ? `
            <div class="sync-indicator">
              <span class="sync-badge">🔄 Sincronizzata con catalogo</span>
              <small class="sync-info">Questa serie si aggiorna automaticamente quando cambia il catalogo generale</small>
            </div>
          ` : `
            <div class="sync-indicator">
              <span class="manual-badge">✏️ Serie personale</span>
              <small class="sync-info">Serie creata manualmente, non sincronizzata con il catalogo</small>
            </div>
          `}
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${((serie.itemCount / (serie.n_pezzi || serie.n_oggetti || 1)) * 100).toFixed(1)}%"></div>
          </div>
          <p class="completion-text">${((serie.itemCount / (serie.n_pezzi || serie.n_oggetti || 1)) * 100).toFixed(1)}% completata</p>
        </div>
      </div>
      <div class="serie-actions" onclick="event.stopPropagation();">
  <button class="btn-action btn-delete" data-action="delete" data-id="${serie.id}" data-name="${serie.nome}" style="color:#111;">🗑️ Elimina</button>
      </div>
    </div>
  `).join("");
  
  // Aggiungi event listeners per i pulsanti modifica/elimina
  setupActionButtons();
  
  // Aggiorna il contatore
  updateSeriesCount();
}

// =========================
// EVENT LISTENERS PER FILTRI
// =========================
function setupFilterListeners() {
  const searchInput = document.getElementById("search-input");
  const clearBtn = document.getElementById("clear-search");
  const yearFilter = document.getElementById("filter-year");
  const nationFilter = document.getElementById("filter-nation");
  const completionFilter = document.getElementById("filter-completion");
  const sortSelect = document.getElementById("sort-by");
  const toggleBtn = document.getElementById("toggle-filters");
  const filtersContainer = document.getElementById("filters-container");
  
  // Toggle filtri
  if (toggleBtn && filtersContainer) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = filtersContainer.style.display === "none";
      
      if (isHidden) {
        filtersContainer.style.display = "grid";
        toggleBtn.textContent = "🔧 Nascondi Filtri";
        toggleBtn.classList.add("active");
      } else {
        filtersContainer.style.display = "none";
        toggleBtn.textContent = "🔧 Mostra Filtri";
        toggleBtn.classList.remove("active");
      }
    });
  }
  
  // Ricerca in tempo reale
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      displayFilteredSeries();
      
      // Mostra/nascondi bottone clear
      if (clearBtn) {
        clearBtn.style.display = currentSearch ? "block" : "none";
      }
    });
  }
  
  // Bottone clear
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        currentSearch = "";
        clearBtn.style.display = "none";
        displayFilteredSeries();
      }
    });
  }
  
  // Filtro anno
  if (yearFilter) {
    yearFilter.addEventListener("change", (e) => {
      currentYearFilter = e.target.value;
      displayFilteredSeries();
    });
  }
  
  // Filtro nazione
  if (nationFilter) {
    nationFilter.addEventListener("change", (e) => {
      currentNationFilter = e.target.value;
      displayFilteredSeries();
    });
  }
  
  // Filtro completamento
  if (completionFilter) {
    completionFilter.addEventListener("change", (e) => {
      currentCompletionFilter = e.target.value;
      displayFilteredSeries();
    });
  }
  
  // Ordinamento
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      displayFilteredSeries();
    });
  }
}

// =========================
// EVENT LISTENER DOMContentLoaded
// Funzione per mostrare la marca corretta
function getSerieMarca(serie) {
  // Se la serie ha la marca, mostra quella
  if (serie.marca) return serie.marca;
  // Se è sincronizzata con catalogo, cerca la marca dal catalogo
  if (serie.catalog_series_id && window.catalogSeriesCache) {
    const catalogSerie = window.catalogSeriesCache.find(s => s.id === serie.catalog_series_id);
    if (catalogSerie && catalogSerie.marca) return catalogSerie.marca;
  }
  return 'Non specificata';
}

// Carica cache catalogo all'avvio
window.catalogSeriesCache = [];
async function loadCatalogSeriesCache() {
  const { data, error } = await supa.from('catalog_series').select('id, marca');
  if (!error && data) window.catalogSeriesCache = data;
}
document.addEventListener('DOMContentLoaded', async () => {
  await loadCatalogSeriesCache();
});
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🎯 DOMContentLoaded - Pagina collection caricata!");
  
  // Setup event listeners per filtri
  setupFilterListeners();
  
  // Carica le collezioni
  loadCollectionSeries();
});

// =========================
// FUNZIONI MODIFICA/ELIMINAZIONE DA COLLECTION
// =========================
async function editSerieFromCollection(serieId) {
  window.location.href = `./editSerie.html?id=${serieId}`;
}

async function deleteSerieFromCollection(serieId, serieName) {
  const confirmDelete = confirm(`⚠️ Sei sicuro di voler eliminare la serie "${serieName}"?\n\nATTENZIONE: Verranno eliminati anche tutti gli oggetti al suo interno!`);
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
  
  // Ricarica la collezione
  loadCollectionSeries();
}

// =========================
// SETUP ACTION BUTTONS
// =========================
function setupActionButtons() {
  const editButtons = document.querySelectorAll('[data-action="edit"]');
  const deleteButtons = document.querySelectorAll('[data-action="delete"]');
  
  // Event listeners per pulsanti modifica
  editButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const serieId = button.getAttribute('data-id');
      editSerieFromCollection(serieId);
    });
  });
  
  // Event listeners per pulsanti elimina
  deleteButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const serieId = button.getAttribute('data-id');
      const serieName = button.getAttribute('data-name');
      deleteSerieFromCollection(serieId, serieName);
    });
  });
}

// Funzione per contare e aggiornare il numero di serie
function updateSeriesCount() {
  const visibleSeries = document.querySelectorAll('.serie:not([style*="display: none"])');
  const totalSeries = document.querySelectorAll('.serie').length;
  
  console.log(`📊 Serie visibili: ${visibleSeries.length} di ${totalSeries}`);
}
