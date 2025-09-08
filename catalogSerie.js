// =================================
// GESTIONE SERIE CATALOGO - JS
// =================================

// Inizializzazione Supabase
const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentSerieId = null;
let isAdmin = false;

// =================================
// ADMIN ACCESS CHECK
// =================================

async function checkAdminAccess() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Errore verifica utente:', error);
      return false;
    }
    
    if (!user) {
      console.log('Utente non autenticato - modalità sola lettura');
      return false;
    }
    
    // Lista degli admin autorizzati
    const adminEmails = ['liukct@gmail.com', 'NUOVA_EMAIL_ADMIN@example.com'];
    
    if (adminEmails.includes(user.email) || adminEmails.includes(user.email.trim())) {
      console.log('✅ Admin riconosciuto:', user.email);
      isAdmin = true;
      showAdminSection();
      return true;
    } else {
      console.log('👤 Utente normale:', user.email, '- modalità sola lettura');
      isAdmin = false;
      hideAdminSection();
      return true; // Ritorna true perché può comunque vedere gli oggetti
    }
  } catch (error) {
    console.error('Errore controllo admin:', error);
    return false;
  }
}

function showAdminSection() {
  const adminSection = document.querySelector('.admin-section');
  if (adminSection) {
    adminSection.style.display = 'block';
    adminSection.style.border = '3px solid green'; // Indicatore visivo
    console.log('✅ Sezione admin mostrata');
  }
}

function hideAdminSection() {
  const adminSection = document.querySelector('.admin-section');
  if (adminSection) {
    adminSection.style.display = 'none';
    console.log('❌ Sezione admin nascosta');
  }
}

function redirectToLogin() {
  alert('🔐 Devi effettuare il login per accedere a questa pagina');
  window.location.href = 'index.html';
}

// =================================
// UTILITY FUNCTIONS
// =================================

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get('id'),
    mode: params.get('mode')
  };
}

function goBack() {
  // Prova prima a tornare indietro nella cronologia
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // Se non c'è cronologia, vai alla home
    window.location.href = 'home.html';
  }
}

function showAddItemForm() {
  document.getElementById('add-item-form').classList.remove('hidden');
}

function hideAddItemForm() {
  document.getElementById('add-item-form').classList.add('hidden');
  document.getElementById('item-form').reset();
}

// =================================
// DATA FUNCTIONS
// =================================

async function loadSerieInfo() {
  try {
    const { data: serie, error } = await supabase
      .from('catalog_series')
      .select('nome')
      .eq('id', currentSerieId)
      .single();
      
    if (error) throw error;
    
    if (serie) {
      const title = isAdmin ? `Gestione Oggetti: ${serie.nome}` : `Oggetti: ${serie.nome}`;
      document.getElementById('serie-title').textContent = title;
      document.title = `${serie.nome} - Catalogo`;
    }
  } catch (error) {
    console.error('Errore caricamento serie:', error);
    alert('❌ Errore nel caricamento delle informazioni della serie');
  }
}

async function loadItems() {
  const container = document.getElementById('items-list');
  
  try {
    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Caricamento oggetti...</p>
      </div>
    `;
    
    const { data: items, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('catalog_series_id', currentSerieId)
      .order('numero');
      
    if (error) throw error;
    
    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h4>📭 Nessun oggetto</h4>
          <p>Aggiungi il primo oggetto a questa serie!</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = items.map(item => `
      <div class="item-admin-card" data-id="${item.id}">
        <div class="item-header">
          <h4>#${item.numero} - ${item.nome}</h4>
          ${isAdmin ? `
          <div class="item-actions">
            <button onclick="deleteItem('${item.id}', '${item.nome}')" class="btn-delete" title="Elimina">🗑️</button>
          </div>
          ` : ''}
        </div>
        ${item.accessori ? `<p class="item-accessori">🎁 ${item.accessori}</p>` : ''}
        ${item.immagine_riferimento ? `<img src="${item.immagine_riferimento}" alt="${item.nome}" class="item-image">` : ''}
      </div>
    `).join('');  } catch (error) {
    console.error('Errore caricamento oggetti:', error);
    container.innerHTML = `
      <div class="error-state">
        <h4>⚠️ Errore</h4>
        <p>${error.message}</p>
        <button onclick="loadItems()" class="btn-retry">🔄 Riprova</button>
      </div>
    `;
  }
}

async function deleteItem(itemId, itemName) {
  if (!isAdmin) {
    alert('❌ Accesso non autorizzato');
    return;
  }
  
  if (!confirm(`⚠️ Sei sicuro di voler eliminare "${itemName}"?`)) return;
  
  try {
    const { error } = await supabase
      .from('catalog_items')
      .delete()
      .eq('id', itemId);
      
    if (error) throw error;
    
    alert(`✅ Oggetto "${itemName}" eliminato!`);
    await loadItems();
    
  } catch (error) {
    console.error('Errore eliminazione oggetto:', error);
    alert(`❌ Errore nell'eliminazione: ${error.message}`);
  }
}

async function addItem(formData) {
  if (!isAdmin) {
    alert('❌ Accesso non autorizzato');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('catalog_items')
      .insert([{
        catalog_series_id: currentSerieId,
        numero: formData.numero,
        nome: formData.nome,
        accessori: formData.accessori || null,
        immagine_riferimento: formData.immagine || null
      }]);
      
    if (error) throw error;
    
    alert(`✅ Oggetto "${formData.nome}" aggiunto!`);
    hideAddItemForm();
    await loadItems();
    
  } catch (error) {
    console.error('Errore aggiunta oggetto:', error);
    alert(`❌ Errore nell'aggiunta: ${error.message}`);
  }
}

// =================================
// EVENT HANDLERS
// =================================

function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = {
    numero: document.getElementById('item-numero').value.trim(),
    nome: document.getElementById('item-nome').value.trim(),
    accessori: document.getElementById('item-accessori').value.trim(),
    immagine: document.getElementById('item-immagine').value.trim()
  };
  
  if (!formData.numero || !formData.nome) {
    alert('⚠️ Numero e nome sono obbligatori');
    return;
  }
  
  addItem(formData);
}

// =================================
// INITIALIZATION
// =================================

window.addEventListener('load', async () => {
  console.log('🚀 Pagina catalogSerie caricata, inizializzazione...');
  
  const params = getUrlParams();
  currentSerieId = params.id;
  console.log('📋 Serie ID dal parametro URL:', currentSerieId);
  
  if (!currentSerieId) {
    alert('❌ ID serie non trovato nell\'URL');
    window.location.href = 'catalog.html';
    return;
  }
  
  // Controlla l'accesso (admin o utente normale)
  await checkAdminAccess();
  
  console.log('📚 Caricamento informazioni serie...');
  await loadSerieInfo();
  console.log('📦 Caricamento oggetti...');
  await loadItems();
  console.log('✅ Inizializzazione completata!');
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('item-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
});