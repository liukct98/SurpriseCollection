// ============================================================
// SCRIPT DI MIGRAZIONE: Supabase Storage → Cloudinary
// ============================================================
// Esegui con: node migrate-to-cloudinary.js
// Richiede Node 18+ (fetch built-in)
//
// ⚠️  ATTENZIONE: inserisci qui la service_role key di Supabase
//     (NON la anon key). Trovala su:
//     Supabase Dashboard → Settings → API → service_role
// ============================================================

const SUPABASE_URL = "https://ksypexyadycktzbfllfd.supabase.co";
const SUPABASE_SERVICE_KEY = "INSERISCI_QUI_LA_SERVICE_ROLE_KEY"; // ← sostituisci questo

const CLOUDINARY_CLOUD_NAME = "dq1io8iet";
const CLOUDINARY_UPLOAD_PRESET = "Catalogo";

// ============================================================

const headers = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function uploadToCloudinary(imageUrl) {
  const body = new URLSearchParams();
  body.append("file", imageUrl);
  body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary error: ${err}`);
  }
  const json = await res.json();
  return json.secure_url;
}

async function migrateTable({ table, urlColumn, filter }) {
  console.log(`\n--- Migrazione tabella: ${table} (colonna: ${urlColumn}) ---`);

  // Prendi tutti i record con URL Supabase
  const queryUrl = `${SUPABASE_URL}/rest/v1/${table}?select=id,${urlColumn}&${urlColumn}=like.*supabase*`;
  const res = await fetch(queryUrl, { headers });
  if (!res.ok) {
    console.error(`❌ Errore lettura ${table}: ${res.status} ${res.statusText}`);
    return;
  }
  const records = await res.json();
  console.log(`Trovati ${records.length} record con immagini Supabase`);

  let ok = 0, fail = 0;

  for (const record of records) {
    const oldUrl = record[urlColumn];
    if (!oldUrl) continue;

    try {
      process.stdout.write(`  [${record.id}] upload... `);
      const newUrl = await uploadToCloudinary(oldUrl);

      // Aggiorna il record nel DB
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?id=eq.${record.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ [urlColumn]: newUrl }),
        }
      );
      if (!updateRes.ok) {
        const err = await updateRes.text();
        throw new Error(`DB update error: ${err}`);
      }
      console.log(`✅ OK`);
      ok++;
    } catch (e) {
      console.log(`❌ FAIL: ${e.message}`);
      fail++;
    }
  }

  console.log(`Completato: ${ok} migrati, ${fail} falliti`);
}

async function main() {
  if (SUPABASE_SERVICE_KEY === "INSERISCI_QUI_LA_SERVICE_ROLE_KEY") {
    console.error("❌ Inserisci la service_role key di Supabase nello script prima di eseguirlo.");
    process.exit(1);
  }

  console.log("🚀 Avvio migrazione immagini Supabase → Cloudinary\n");

  await migrateTable({ table: "item", urlColumn: "immagine_riferimento" });
  await migrateTable({ table: "catalog_series", urlColumn: "immagine_copertina" });

  console.log("\n✅ Migrazione completata!");
  console.log("Puoi ora eliminare tutti i file dai bucket Supabase Storage (Foto, item-photos).");
}

main().catch((e) => {
  console.error("Errore fatale:", e);
  process.exit(1);
});
