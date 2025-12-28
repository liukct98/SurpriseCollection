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
// CARICAMENTO STATISTICHE
// =========================
async function loadStats() {
  try {
    // Carica tutte le serie
    const { data: series, error: seriesError } = await supa
      .from("series")
      .select("*");
    
    if (seriesError) throw seriesError;
    
    // Carica tutti gli oggetti
    const { data: items, error: itemsError } = await supa
      .from("item")
      .select("*");
    
    if (itemsError) throw itemsError;
    
    // Calcola statistiche
    const stats = calculateStats(series, items);
    
    // Aggiorna l'UI
    updateStatsUI(stats);
    
    // Genera grafici
    generateCharts(series, items);
    
  } catch (error) {
  
  }
}

function calculateStats(series, items) {
  const totalSeries = series.length;
  const totalExpectedItems = series.reduce((sum, serie) => sum + (serie.n_pezzi || serie.n_oggetti || 0), 0);
  const ownedItems = items.filter(item => !item.mancante).length;
  const missingItems = items.filter(item => item.mancante).length;
  const totalActualItems = items.length;
  
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
    totalActualItems,
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
        <div class="progress-fill-chart" style="width: ${serie.completion}%"></div>
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
