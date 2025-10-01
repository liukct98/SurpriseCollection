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
    const adminEmails = ['liukct@gmail.com', 'marcellink892@gmail.com'];
    
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
  // Se c'è una marca salvata, torna alla lista serie di quella marca
  const lastBrand = window.sessionStorage.getItem('lastBrandCatalog');
  if (lastBrand && lastBrand !== '""') {
    const brand = JSON.parse(lastBrand);
    window.sessionStorage.removeItem('lastBrandCatalog');
    window.location.href = `catalog.html?brand=${encodeURIComponent(brand)}`;
    return;
  }
  // Altrimenti torna indietro normalmente
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = 'catalog.html';
  }
}

// Mostra la freccia indietro se serve
document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('back-to-catalog-series');
  if (backBtn) {
    const lastBrand = window.sessionStorage.getItem('lastBrandCatalog');
    if (lastBrand && lastBrand !== '""') {
      backBtn.style.display = 'inline-flex';
      backBtn.onclick = goBack;
    }
  }
});

function showAddItemForm() {
  document.getElementById('add-item-form').classList.remove('hidden');
}

function hideAddItemForm() {
  document.getElementById('add-item-form').classList.add('hidden');
  document.getElementById('item-form').reset();
}

function showEditItemForm() {
  document.getElementById('edit-item-form').classList.remove('hidden');
}

function hideEditItemForm() {
  document.getElementById('edit-item-form').classList.add('hidden');
  document.getElementById('edit-item-form-element').reset();
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
            <button onclick="editItem('${item.id}')" class="btn-edit" title="Modifica">✏️</button>
            <button onclick="deleteItem('${item.id}', '${item.nome}')" class="btn-delete" title="Elimina">🗑️</button>
          </div>
          ` : ''}
        </div>
        ${item.accessori ? `<p class="item-accessori">🎁 ${item.accessori}</p>` : ''}
        ${item.immagine_riferimento ? `
          <div class="item-image-container" onclick="showImageModal('${item.immagine_riferimento}', '${item.nome}', '${item.accessori || ''}')">
            <img src="${item.immagine_riferimento}" alt="${item.nome}" class="item-image clickable">
            <div class="image-overlay">
              <span class="zoom-icon">🔍</span>
            </div>
          </div>
        ` : `
          <div class="no-image-placeholder">
            📷 Nessuna immagine disponibile
          </div>
        `}
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

async function editItem(itemId) {
  if (!isAdmin) {
    alert('❌ Accesso non autorizzato');
    return;
  }
  
  try {
    // Carica i dati dell'oggetto
    const { data: item, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) throw error;

    if (!item) {
      alert('❌ Oggetto non trovato');
      return;
    }

    // Popola il form con i dati esistenti
    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-item-numero').value = item.numero || '';
    document.getElementById('edit-item-nome').value = item.nome || '';
    document.getElementById('edit-item-accessori').value = item.accessori || '';
    
    // Mostra info sull'immagine corrente
    const currentImageInfo = document.getElementById('edit-current-image-info');
    if (item.immagine_riferimento) {
      currentImageInfo.textContent = '📸 Immagine corrente presente. Scegli un nuovo file per sostituirla.';
    } else {
      currentImageInfo.textContent = '📷 Nessuna immagine corrente. Scegli un file per aggiungerne una.';
    }

    // Mostra il form
    showEditItemForm();

  } catch (error) {
    console.error('Errore caricamento oggetto per modifica:', error);
    alert(`❌ Errore nel caricamento: ${error.message}`);
  }
}

async function addItem(formData) {
  if (!isAdmin) {
    alert('❌ Accesso non autorizzato');
    return;
  }
  
  try {
    let immagineUrl = null;
    
    // Se c'è un file immagine, caricalo su Supabase Storage
    if (formData.immagineFile) {
      const fileName = `catalog_items/${currentSerieId}_${formData.numero}_${Date.now()}.${formData.immagineFile.name.split('.').pop()}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Foto')
        .upload(fileName, formData.immagineFile);
        
      if (uploadError) {
        console.error('Errore upload immagine:', uploadError);
        alert('⚠️ Errore nel caricamento dell\'immagine, procedo senza immagine');
      } else {
        // Ottieni l'URL pubblico dell'immagine
        const { data: { publicUrl } } = supabase.storage
          .from('Foto')
          .getPublicUrl(fileName);
        immagineUrl = publicUrl;
      }
    }
    
    const { error } = await supabase
      .from('catalog_items')
      .insert([{
        catalog_series_id: currentSerieId,
        numero: formData.numero,
        nome: formData.nome,
        accessori: formData.accessori || null,
        immagine_riferimento: immagineUrl
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
  
  const fileInput = document.getElementById('item-immagine');
  const formData = {
    numero: document.getElementById('item-numero').value.trim(),
    nome: document.getElementById('item-nome').value.trim(),
    accessori: document.getElementById('item-accessori').value.trim(),
  valore: document.getElementById('item-valore').value.trim(),
    immagineFile: fileInput.files[0] || null // File invece di URL
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
  
  // Gestore del form di modifica oggetto
  const editForm = document.getElementById('edit-item-form-element');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!isAdmin) {
        alert('❌ Accesso non autorizzato');
        return;
      }
      
      const itemId = document.getElementById('edit-item-id').value;
      const fileInput = document.getElementById('edit-item-immagine');
      const formData = {
        numero: document.getElementById('edit-item-numero').value.trim(),
        nome: document.getElementById('edit-item-nome').value.trim(),
        accessori: document.getElementById('edit-item-accessori').value.trim(),
        immagineFile: fileInput.files[0] || null
      };
      
      if (!formData.numero || !formData.nome) {
        alert('⚠️ Numero e nome sono obbligatori');
        return;
      }
      
      try {
        let updateData = {
          numero: formData.numero,
          nome: formData.nome,
          accessori: formData.accessori || null,
          valore: document.getElementById('edit-item-valore').value.trim() || null
        };
        
        // Se c'è un nuovo file immagine, caricalo
        if (formData.immagineFile) {
          const fileName = `catalog_items/${currentSerieId}_${formData.numero}_${Date.now()}.${formData.immagineFile.name.split('.').pop()}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('Foto')
            .upload(fileName, formData.immagineFile);
            
          if (uploadError) {
            console.error('Errore upload immagine:', uploadError);
            alert('⚠️ Errore nel caricamento dell\'immagine, procedo senza modificare l\'immagine');
          } else {
            // Ottieni l'URL pubblico dell'immagine
            const { data: { publicUrl } } = supabase.storage
              .from('Foto')
              .getPublicUrl(fileName);
  updateData.immagine_riferimento = publicUrl;
          }
        }
        
        const { error } = await supabase
          .from('catalog_items')
          .update(updateData)
          .eq('id', itemId);
          
        if (error) throw error;
        
        alert(`✅ Oggetto "${formData.nome}" modificato con successo!`);
        hideEditItemForm();
        await loadItems();
        
      } catch (error) {
        console.error('Errore modifica oggetto:', error);
        alert(`❌ Errore nella modifica: ${error.message}`);
      }
    });
  }
});

// =================================
// IMAGE MODAL FUNCTIONS
// =================================

function showImageModal(imageUrl, itemName, itemAccessories) {
  const modal = document.getElementById('image-modal');
  const modalImage = document.getElementById('modal-image');
  const modalTitle = document.getElementById('modal-title');
  const modalItemName = document.getElementById('modal-item-name');
  const modalItemAccessories = document.getElementById('modal-item-accessories');
  
  // Imposta il contenuto del modal
  modalImage.src = imageUrl;
  modalTitle.textContent = `Immagine: ${itemName}`;
  modalItemName.textContent = `📦 ${itemName}`;
  
  if (itemAccessories && itemAccessories !== 'null' && itemAccessories !== '') {
    modalItemAccessories.textContent = `🎁 Accessori: ${itemAccessories}`;
    modalItemAccessories.style.display = 'block';
  } else {
    modalItemAccessories.style.display = 'none';
  }
  
  // Mostra il modal
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Previene lo scroll della pagina
}

function closeImageModal() {
  const modal = document.getElementById('image-modal');
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto'; // Ripristina lo scroll della pagina
}

// Chiudi il modal con il tasto ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeImageModal();
  }
});