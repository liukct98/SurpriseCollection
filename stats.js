// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================

// Usa il client globale creato in supabaseClient.js
const supa = window.supabaseClient;
window.supabase = supa;

// =========================
// FUNZIONI AUTENTICAZIONE
// =========================
async function checkAuth() {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

// =========================
// UTILITY: fetch all rows bypassing Supabase 1000 row limit
// =========================
async function fetchAllRows(query) {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    allData = allData.concat(data || []);
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { data: allData, error: null };
}

// =========================
// CARICAMENTO STATISTICHE
// =========================
async function loadStats() {
  try {
    // Recupera l'utente autenticato
    const { data: { user: authUser } } = await supa.auth.getUser();
    if (!authUser) return;

    // Recupera anche l'id interno dalla tabella users (usato da serie.js)
    const { data: userRow } = await supa
      .from('users')
      .select('id')
      .eq('mail', authUser.email)
      .single();
    const internalUserId = userRow?.id;

    // Carica le serie (RLS filtra per auth UUID)
    const { data: series, error: seriesError } = await supa
      .from("series")
      .select("*");
    if (seriesError) throw seriesError;

    const seriesIds = series.map(s => s.id);

    // Carica items via serie_id in batch da 100 (evita limiti URL di Supabase)
    let itemsBySerie = [];
    const BATCH = 100;
    for (let i = 0; i < seriesIds.length; i += BATCH) {
      const batchIds = seriesIds.slice(i, i + BATCH);
      const { data: batchData, error: batchErr } = await fetchAllRows(
        supa.from("item").select("*").in("serie_id", batchIds)
      );
      if (batchErr) throw batchErr;
      itemsBySerie = itemsBySerie.concat(batchData || []);
    }

    // Carica items via user_id = auth UUID (addItem.js salva con auth UUID)
    const { data: itemsByAuthId, error: err2 } = await fetchAllRows(
      supa.from("item").select("*").eq("user_id", authUser.id)
    );
    if (err2) throw err2;

    // Carica items via user_id = id interno (serie.js salva con id interno)
    let itemsByInternalId = [];
    if (internalUserId) {
      const { data, error: err3 } = await fetchAllRows(
        supa.from("item").select("*").eq("user_id", internalUserId)
      );
      if (err3) throw err3;
      itemsByInternalId = data || [];
    }

    // Unisci e deduplica per id
    const allItemsMap = new Map();
    [...(itemsBySerie || []), ...(itemsByAuthId || []), ...itemsByInternalId]
      .forEach(item => allItemsMap.set(item.id, item));
    const items = Array.from(allItemsMap.values());
    
    // Calcola statistiche
    const stats = calculateStats(series, items);
    
    // Aggiorna l'UI
    updateStatsUI(stats);
    
    // Genera grafici
    generateCharts(series, items);
    
  } catch (error) {
    console.error('Errore caricamento statistiche:', error);
  }
}

function calculateStats(series, items) {
  const totalSeries = series.length;
  const totalExpectedItems = series.reduce((sum, serie) => sum + (serie.n_pezzi || serie.n_oggetti || 0), 0);
  const ownedItems = items.filter(item => !item.mancante).length;

  // Calcola i mancanti come differenza tra attesi e posseduti per serie (non conta duplicati o over-100%)
  const missingItems = series.reduce((sum, serie) => {
    const serieOwned = items.filter(item => item.serie_id === serie.id && !item.mancante).length;
    const expected = serie.n_pezzi || serie.n_oggetti || 0;
    return sum + Math.max(0, expected - serieOwned);
  }, 0);
  
  // Calcola valore totale (solo oggetti posseduti con valore)
  const totalValue = items
    .filter(item => !item.mancante && item.valore)
    .reduce((sum, item) => {
      const value = parseFloat(item.valore.toString().replace(/[€$,]/g, '')) || 0;
      return sum + value;
    }, 0);
  
  // Calcola percentuale di completamento
  const completionRate = totalExpectedItems > 0 ? (ownedItems / totalExpectedItems * 100) : 0;
  
  return {
    totalSeries,
    totalExpectedItems,
    ownedItems,
    missingItems,
    totalValue,
    completionRate
  };
}

function updateStatsUI(stats) {
  document.getElementById('total-series').textContent = stats.totalSeries;
  document.getElementById('total-items').textContent = stats.totalExpectedItems;
  document.getElementById('owned-items').textContent = stats.ownedItems;
  document.getElementById('missing-items').textContent = stats.missingItems;
  document.getElementById('total-value').textContent = `€${stats.totalValue.toFixed(2)}`;
  document.getElementById('completion-rate').textContent = `${stats.completionRate.toFixed(1)}%`;
}

// =========================
// GENERAZIONE GRAFICI
// =========================
function generateCharts(series, items) {
  generateCompletionChart(series, items);
  generateNationsChart(series);
  generateYearsChart(series);
}

function generateCompletionChart(series, items) {
  const chartContainer = document.getElementById('completion-chart');
  
  const seriesWithCompletion = series.map(serie => {
    const serieItems = items.filter(item => item.serie_id === serie.id);
    const ownedCount = serieItems.filter(item => !item.mancante).length;
    const expectedCount = serie.n_pezzi || serie.n_oggetti || 0;
    const completion = expectedCount > 0 ? (ownedCount / expectedCount * 100) : 0;
    
    return {
      nome: serie.nome,
      completion: completion,
      owned: ownedCount,
      expected: expectedCount
    };
  });
  
  // Ordina per completamento
  seriesWithCompletion.sort((a, b) => b.completion - a.completion);
  
  chartContainer.innerHTML = seriesWithCompletion.map(serie => `
    <div class="chart-bar">
      <div class="chart-label">
        <span class="serie-name">${serie.nome}</span>
        <span class="completion-text">${serie.completion.toFixed(1)}% (${serie.owned}/${serie.expected})</span>
      </div>
      <div class="progress-bar-chart">
        <div class="progress-fill-chart" style="width: ${Math.min(serie.completion, 100)}%"></div>
      </div>
    </div>
  `).join('');
}

function generateNationsChart(series) {
  const chartContainer = document.getElementById('nations-chart');
  
  // Raggruppa per nazione
  const nationsCounts = {};
  series.forEach(serie => {
    const nation = serie.nazione || 'Non specificata';
    nationsCounts[nation] = (nationsCounts[nation] || 0) + 1;
  });
  
  // Converti in array e ordina
  const nationsData = Object.entries(nationsCounts)
    .map(([nation, count]) => ({ nation, count }))
    .sort((a, b) => b.count - a.count);
  
  if (nationsData.length === 0) { chartContainer.innerHTML = '<p>Nessun dato.</p>'; return; }
  const maxCount = Math.max(...nationsData.map(d => d.count));
  
  chartContainer.innerHTML = nationsData.map(data => `
    <div class="chart-bar">
      <div class="chart-label">
        <span class="nation-name">${data.nation}</span>
        <span class="count-text">${data.count} serie</span>
      </div>
      <div class="progress-bar-chart nations">
        <div class="progress-fill-chart" style="width: ${(data.count / maxCount * 100)}%"></div>
      </div>
    </div>
  `).join('');
}

function generateYearsChart(series) {
  const chartContainer = document.getElementById('years-chart');
  
  // Raggruppa per anno
  const yearsCounts = {};
  series.forEach(serie => {
    const year = serie.anno || 'Sconosciuto';
    yearsCounts[year] = (yearsCounts[year] || 0) + 1;
  });
  
  // Converti in array e ordina per anno
  const yearsData = Object.entries(yearsCounts)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => {
      if (a.year === 'Sconosciuto') return 1;
      if (b.year === 'Sconosciuto') return -1;
      return parseInt(b.year) - parseInt(a.year);
    });
  
  if (yearsData.length === 0) { chartContainer.innerHTML = '<p>Nessun dato.</p>'; return; }
  const maxCount = Math.max(...yearsData.map(d => d.count));
  
  chartContainer.innerHTML = yearsData.map(data => `
    <div class="chart-bar">
      <div class="chart-label">
        <span class="year-name">${data.year}</span>
        <span class="count-text">${data.count} serie</span>
      </div>
      <div class="progress-bar-chart years">
        <div class="progress-fill-chart" style="width: ${(data.count / maxCount * 100)}%"></div>
      </div>
    </div>
  `).join('');
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
  
  // Carica le statistiche
  loadStats();
});
