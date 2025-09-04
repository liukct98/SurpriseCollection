// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================
console.log("🚀 Script addItem.js caricato!");

const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";

const supa = supabase.createClient(supabaseUrl, supabaseKey);

// =========================
// VERIFICA SESSIONE
// =========================
async function checkAuth() {
  const {
    data: { session },
  } = await supa.auth.getSession();

  if (!session) {
    alert("Devi fare login!");
    window.location.href = "./index.html";
    return null;
  }

  console.log("✅ Utente loggato:", session.user.email);
  return session.user;
}

// =========================
// CARICAMENTO SERIE
// =========================

// Funzione per ottenere l'ID della serie dall'URL
function getSerieIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('serie_id');
}

// Funzione per impostare la serie automaticamente o mostrare il select
async function setupSerieSelection() {
  const serieIdFromUrl = getSerieIdFromUrl();
  const container = document.getElementById("serie-container");
  
  if (serieIdFromUrl) {
    // Se abbiamo un ID della serie dall'URL, mostra il nome e crea un campo nascosto
    console.log("🎯 Serie preselezionata dall'URL:", serieIdFromUrl);
    
    // Carica il nome della serie
    const { data: serie, error } = await supa.from("series").select("*").eq("id", serieIdFromUrl).single();
    if (error) {
      console.error("❌ Errore caricamento serie:", error.message);
      alert("❌ Serie non trovata!");
      window.location.href = "./home.html";
      return false;
    }
    
    // Mostra il nome della serie e crea il campo nascosto
    container.innerHTML = `
      <strong style="color: #007bff;">${serie.nome}</strong>
      <input type="hidden" id="serie_id" value="${serieIdFromUrl}">
    `;
    
    // Aggiorna il titolo della pagina
    document.querySelector('header').textContent = `Aggiungi Oggetto a: ${serie.nome}`;
    
    console.log("✅ Serie automaticamente impostata:", serie.nome);
    return true;
  } else {
    // Se non abbiamo un ID, crea il select per scegliere la serie
    console.log("🔄 Creazione select per selezione serie...");
    container.innerHTML = `
      <select id="serie_id" required>
        <option value="">Caricamento serie...</option>
      </select>
    `;
    
    // Carica le opzioni
    await loadSeriesOptions();
    return true;
  }
}

async function loadSeriesOptions() {
  const select = document.getElementById("serie_id");
  if (!select) {
    console.error("❌ Elemento select serie_id non trovato!");
    return;
  }

  console.log("🔄 Caricamento serie...");
  const { data: series, error } = await supa.from("series").select("*");
  if (error) {
    console.error("❌ Errore caricamento serie:", error.message);
    select.innerHTML = '<option value="">Errore caricamento serie</option>';
    return;
  }

  if (!series || series.length === 0) {
    select.innerHTML = '<option value="">Nessuna serie disponibile</option>';
    console.log("⚠️ Nessuna serie trovata nel database");
    return;
  }

  select.innerHTML = '<option value="">Seleziona una serie...</option>' + 
    series.map(s => `<option value="${s.id}">${s.nome}</option>`).join("");
  console.log(`✅ Caricate ${series.length} serie nel select`);
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

  const user_id = user.id;
  console.log("👤 User ID:", user_id);

  // Imposta la selezione della serie (automatica o manuale)
  const serieSetupOk = await setupSerieSelection();
  if (!serieSetupOk) {
    return;
  }

  // Listener form aggiunta oggetto
  const itemForm = document.getElementById("item-form");
  if (itemForm) {
    itemForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const numero = document.getElementById("numero").value;
      const nome = document.getElementById("nome_oggetto").value;
      const accessori = document.getElementById("accessori").value;
      const valore = document.getElementById("valore").value;
      const serie_id = document.getElementById("serie_id").value;

      // Validazione
      if (!serie_id || serie_id === "") {
        alert("⚠️ Errore: Serie non identificata!");
        return;
      }

      if (!numero) {
        alert("⚠️ Il numero dell'oggetto è obbligatorio!");
        return;
      }

      console.log("📦 Dati da inserire:", { numero, nome, accessori, valore, serie_id, user_id });

      let fotoUrl = null;
      const fotoInput = document.getElementById("foto");
      if (fotoInput.files.length > 0) {
        const file = fotoInput.files[0];
        
        // Controllo dimensione file (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert("❌ File troppo grande! Massimo 10MB");
          return;
        }
        
        console.log("📤 Tentativo upload file:", file.name, "Dimensione:", (file.size / 1024 / 1024).toFixed(2) + " MB");
        
        const filePath = `${user_id}/${Date.now()}_${file.name}`;
        console.log("📂 Path upload:", filePath);
        
        const { error: uploadError, data: uploadData } = await supa.storage
          .from("Foto")
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) { 
          console.error("❌ Dettagli errore upload:", uploadError);
          alert(`❌ Errore upload: ${uploadError.message}\n\nPuoi comunque salvare l'oggetto senza foto.`); 
          return; 
        }

        console.log("✅ Upload completato:", uploadData);
        const { data } = supa.storage.from("Foto").getPublicUrl(filePath);
        fotoUrl = data.publicUrl;
        console.log("🔗 URL foto:", fotoUrl);
      }

      const { error } = await supa.from("item").insert([
        { numero, nome, accessori, valore, foto: fotoUrl, serie_id, user_id }
      ]);

      if (error) {
        alert("❌ Errore inserimento oggetto: " + error.message);
      } else {
        alert("✅ Oggetto aggiunto correttamente!");
        
        // Se siamo venuti da una serie specifica, torniamo lì
        const serieIdFromUrl = getSerieIdFromUrl();
        if (serieIdFromUrl) {
          window.location.href = `./serie.html?id=${serieIdFromUrl}`;
        } else {
          itemForm.reset();
          await setupSerieSelection(); // Ricarica le serie nel select
        }
      }
    });
  }
});
