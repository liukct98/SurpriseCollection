// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================
console.log("🚀 Script app.js caricato!");

const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";

console.log("🔧 Tentativo di creare client Supabase...");
console.log("Supabase global object:", typeof window.supabase !== 'undefined' ? window.supabase : "NON DEFINITO!");

if (typeof window.supabase === 'undefined') {
  console.error("❌ ERRORE: La libreria Supabase non è caricata!");
} else {
  console.log("✅ Libreria Supabase caricata correttamente");
}

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");

  if (!form) {
    console.error("❌ Nessun form trovato con id 'login-form'");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const messageDiv = document.getElementById("login-message");

    if (!usernameInput || !passwordInput) {
      console.error("❌ Campi username o password non trovati!");
      return;
    }

    const usernameOrEmail = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!usernameOrEmail || !password) {
      if (messageDiv) {
        messageDiv.innerHTML = "❌ Inserisci username/email e password!";
        messageDiv.className = "error";
      }
      return;
    }

    try {
      if (messageDiv) {
        messageDiv.innerHTML = "⏳ Accesso in corso...";
        messageDiv.className = "loading";
      }

      // Se contiene @, è un'email, altrimenti cerchiamo l'email dalla tabella users
      let loginEmail = usernameOrEmail;
      if (!usernameOrEmail.includes('@')) {
        try {
          // Cerca l'email associata allo username nella tabella users
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('mail')
            .eq('username', usernameOrEmail)
            .single();
          
          if (profileError || !userProfile) {
            throw new Error("Username non trovato");
          }
          
          loginEmail = userProfile.mail;
        } catch (err) {
          throw new Error("Username non trovato");
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) {
        throw error;
      }

      if (messageDiv) {
        messageDiv.innerHTML = "✅ Login effettuato! Reindirizzamento...";
        messageDiv.className = "success";
      }
      
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1000);

    } catch (error) {
      console.error('Errore login:', error);
      if (messageDiv) {
        let errorMessage = "❌ Errore login: ";
        
        switch (error.message) {
          case "Invalid login credentials":
            errorMessage += "Username/email o password non corretti";
            break;
          default:
            errorMessage += error.message;
        }
        
        messageDiv.innerHTML = errorMessage;
        messageDiv.className = "error";
      }
    }
  });
});
