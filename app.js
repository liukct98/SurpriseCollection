// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================
console.log("🚀 Script app.js caricato!");

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

// =========================
// VERIFICA SESSIONE
// =========================
async function checkAuth() {
  const {
    data: { session },
  } = await supa.auth.getSession();

  if (!session) {
    alert("Devi fare login!");
    window.location.href = "index.html";
    return null;
  }

  console.log("✅ Utente loggato:", session.user.email);
  return session.user;
}

// =========================
// CARICAMENTO SERIE
// =========================
async function loadCollection() {
  const seriesList = document.getElementById("series-list");
  if (!seriesList) return;

  seriesList.innerHTML = `
    <div class="spinner"></div>
    <p style="text-align:center;">Caricamento collezione...</p>
  `;

  const { data: series, error } = await supa
    .from("series")
    .select("*")
    .order("anno", { ascending: false });

  if (error) {
    console.error("Errore caricamento serie:", error);
    seriesList.innerHTML = `<p>❌ Errore: ${error.message}</p>`;
    return;
  }

  seriesList.innerHTML = "";

  for (let serieIndex = 0; serieIndex < series.length; serieIndex++) {
    const serie = series[serieIndex];
    const serieDiv = document.createElement("div");
    serieDiv.classList.add("serie", "fade-in");
    serieDiv.style.animationDelay = `${0.1 * serieIndex}s`;

    serieDiv.innerHTML = `
      <h2>${serie.nome} (${serie.anno})</h2>
      <p><b>Nazione:</b> ${serie.nazione}</p>
      <p><b>Oggetti previsti:</b> ${serie.n_pezzi}</p>
      <div class="items" id="items-${serie.id}">
        <div class="spinner"></div>
      </div>
    `;

    // cliccando su una serie -> vai alla pagina serie.html?id=...
    serieDiv.addEventListener("click", () => {
      window.location.href = `serie.html?id=${serie.id}`;
    });

    seriesList.appendChild(serieDiv);

    // carica items della serie
    const { data: items, error: itemError } = await supa
      .from("item")
      .select("*")
      .eq("serie_id", serie.id);

    const itemsDiv = document.getElementById(`items-${serie.id}`);
    if (itemError) {
      itemsDiv.innerHTML = `<p>❌ Errore: ${itemError.message}</p>`;
    } else if (!items || items.length === 0) {
      itemsDiv.innerHTML = `<p>Nessun oggetto in questa serie.</p>`;
    } else {
      itemsDiv.innerHTML = items
        .map(
          (i, index) => `
        <div class="item fade-in" style="animation-delay: ${0.1 * index}s;">
          <h3>${i.nome} (#${i.numero})</h3>
          <p>${i.accessori || ""}</p>
          <p>Valore: ${i.valore || "?"}</p>
          ${
            i.foto
              ? `<img src="${i.foto}" alt="${i.nome}" class="item-foto">`
              : ""
          }
        </div>
      `
        )
        .join("");
    }
  }
}

// =========================
// EVENT LISTENERS
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAuth();
  if (!user) return;

  // --- FORM AGGIUNTA SERIE ---
  const seriesForm = document.getElementById("series-form");
  if (seriesForm) {
    seriesForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("nome").value;
      const anno = document.getElementById("anno").value;
      const n_pezzi = document.getElementById("n_pezzi").value;
      const nazione = document.getElementById("nazione").value;

      const { error } = await supa
        .from("series")
        .insert([{ nome, anno, n_pezzi, nazione }]);

      if (error) alert("❌ Errore inserimento serie: " + error.message);
      else {
        alert("✅ Serie aggiunta correttamente!");
        seriesForm.reset();
        loadCollection();
      }
    });
  }

  // --- FORM AGGIUNTA OGGETTO ---
  const itemForm = document.getElementById("item-form");
  if (itemForm) {
    itemForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const numero = document.getElementById("numero").value;
      const nome = document.getElementById("nome_oggetto").value;
      const accessori = document.getElementById("accessori").value;
      const valore = document.getElementById("valore").value;
      const serie_id = document.getElementById("serie_id").value;

      let fotoUrl = null;
      const fotoInput = document.getElementById("foto");
      if (fotoInput.files.length > 0) {
        const file = fotoInput.files[0];
        const filePath = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supa.storage
          .from("Foto")
          .upload(filePath, file);
        if (uploadError) {
          alert("❌ Errore upload: " + uploadError.message);
          return;
        }
        const { data } = supa.storage.from("Foto").getPublicUrl(filePath);
        fotoUrl = data.publicUrl;
      }

      const { error } = await supa
        .from("item")
        .insert([{ numero, nome, accessori, valore, foto: fotoUrl, serie_id }]);

      if (error) alert("❌ Errore inserimento oggetto: " + error.message);
      else {
        alert("✅ Oggetto aggiunto correttamente!");
        itemForm.reset();
        loadCollection();
      }
    });
  }

  // Carica collezione
  loadCollection();
});
