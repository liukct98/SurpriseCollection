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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "INSERISCI_QUI_LA_SERVICE_ROLE_KEY";

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
    const errBody = await res.text();
    throw new Error(`Errore lettura ${table}: ${res.status} ${res.statusText} - ${errBody}`);
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
        `${SUPABASE_URL}/rest/v1/${table}?id=eq.${record.id}&select=id`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            Prefer: "return=representation",
          },
          body: JSON.stringify({ [urlColumn]: newUrl }),
        }
      );
      if (!updateRes.ok) {
        const err = await updateRes.text();
        throw new Error(`DB update error: ${err}`);
      }
      const updatedRows = await updateRes.json();
      if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
        throw new Error("DB update blocked or no rows affected (controlla key/permessi RLS)");
      }
      console.log(`✅ OK`);
      ok++;
    } catch (e) {
      console.log(`❌ FAIL: ${e.message}`);
      fail++;
    }
  }

  console.log(`Completato: ${ok} migrati, ${fail} falliti`);
  return { ok, fail, total: records.length };
}

async function main() {
  if (SUPABASE_SERVICE_KEY === "INSERISCI_QUI_LA_SERVICE_ROLE_KEY") {
    console.error("❌ Inserisci la service_role key o esporta SUPABASE_SERVICE_ROLE_KEY prima di eseguire lo script.");
    process.exit(1);
  }

  console.log("🚀 Avvio migrazione immagini Supabase → Cloudinary\n");

  const itemResult = await migrateTable({ table: "item", urlColumn: "immagine_riferimento" });
  const catalogItemsResult = await migrateTable({ table: "catalog_items", urlColumn: "immagine_riferimento" });
  const seriesResult = await migrateTable({ table: "catalog_series", urlColumn: "immagine_copertina" });

  const migrated = itemResult.ok + catalogItemsResult.ok + seriesResult.ok;
  const failed = itemResult.fail + catalogItemsResult.fail + seriesResult.fail;
  const total = itemResult.total + catalogItemsResult.total + seriesResult.total;

  if (failed > 0) {
    console.error(`\n⚠️ Migrazione terminata con errori: ${migrated}/${total} migrati, ${failed} falliti.`);
    process.exit(1);
  }

  console.log(`\n✅ Migrazione completata: ${migrated}/${total} migrati.`);
  console.log("Puoi ora eliminare i file dai bucket Supabase Storage (Foto, item-photos). Prima verifica che le immagini puntino a Cloudinary.");
}

main().catch((e) => {
  console.error("Errore fatale:", e);
  process.exit(1);
});
