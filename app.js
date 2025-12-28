// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================

// Usa il client globale creato in supabaseClient.js
const supabase = window.supabaseClient;

// =========================
// VERIFICA SESSIONE
// =========================
async function checkAuth() {

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (!session) {
    alert("Devi fare login!");
    window.location.href = "index.html";
    return null;
  }


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

  const { data: series, error } = await supabase
    .from("series")
    .select("*")
    .order("anno", { ascending: false });

  if (error) {

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
      <p><b>Numero pezzi:</b> ${serie.n_pezzi}</p>
      <div class="items" id="items-${serie.id}">
        <div class="spinner"></div>
      </div>
    `;

    // cliccando su una serie -> vai alla pagina serie.html?id=...
    serieDiv.addEventListener("click", () => {
      window.location.href = `./serie.html?id=${serie.id}`;
    });

    seriesList.appendChild(serieDiv);

    // carica items della serie
    const { data: items, error: itemError } = await supabase
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
            i.immagine_riferimento
              ? `<img src="${i.immagine_riferimento}" alt="${i.nome}" class="item-foto">`
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
      const marca = document.getElementById("marca").value;
      const sottocategoria = document.getElementById("sottocategoria").value;

      const { error } = await supabase
        .from("series")
        .insert([{ nome, anno, n_pezzi, nazione, marca, sottocategoria }]);

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

  let immagineRiferimentoUrl = null;
  const fotoInput = document.getElementById("foto");
      if (fotoInput.files.length > 0) {
        const file = fotoInput.files[0];
        const filePath = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("Foto")
          .upload(filePath, file);
        if (uploadError) {
          alert("❌ Errore upload: " + uploadError.message);
          return;
        }
        const { data } = supabase.storage.from("Foto").getPublicUrl(filePath);
  immagineRiferimentoUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("item")
  .insert([{ numero: String(numero), nome, accessori, valore, immagine_riferimento: immagineRiferimentoUrl, serie_id }]);

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
