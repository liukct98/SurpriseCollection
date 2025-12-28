// =========================
// INIZIALIZZAZIONE SUPABASE
// =========================
const supabaseUrl = "https://ksypexyadycktzbfllfd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXBleHlhZHlja3R6YmZsbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTYyMzEsImV4cCI6MjA3MjQ5MjIzMX0.INevNjooRZeLB--TM24JuIsq9EA47Zk3gBpIqjFyNGE";

// Inizializzazione robusta Supabase (compatibile v2)
if (!window.supabase || !window.supabase.auth || typeof window.supabase.auth.getUser !== 'function') {
  if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    window.supabase = supabase.createClient(supabaseUrl, supabaseKey);
  }
  // Usa il client globale creato in supabaseClient.js
  const supabase = window.supabaseClient;
}
var supabase = window.supabase;

// =========================
// CONTROLLO SESSIONE ESISTENTE
// =========================
window.addEventListener('load', async () => {
  if (supabase && supabase.auth && typeof supabase.auth.getUser === 'function') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        window.location.href = 'home.html';
      }
    } catch (err) {
      console.error('Errore durante il controllo sessione:', err);
    }
  } else {
    console.error('Supabase non inizializzato correttamente o auth non disponibile');
  }
});

// =========================
// GESTIONE UI SLIDING
// =========================
const card = document.getElementById('card');
const btnSwitchToSignup = document.getElementById('btnSwitchToSignup');
const btnSwitchToSignin = document.getElementById('btnSwitchToSignin');

// Inizializza lo stato: parte sempre con Sign In
card.classList.remove('register');

// Click su Registrati -> attiva modalità registrazione
btnSwitchToSignup.addEventListener('click', (e) => {
  e.stopPropagation();
  card.classList.add('register');
  
  // Reset messaggi
  document.getElementById('login-message').style.display = 'none';
  document.getElementById('register-message').style.display = 'none';
});

// Click su Accedi -> torna a modalità login
btnSwitchToSignin.addEventListener('click', (e) => {
  e.stopPropagation();
  card.classList.remove('register');
  
  // Reset messaggi
  document.getElementById('login-message').style.display = 'none';
  document.getElementById('register-message').style.display = 'none';
});

// =========================
// GESTIONE LOGIN
// =========================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const usernameOrEmail = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const messageDiv = document.getElementById('login-message');
  
  // Reset messaggi
  messageDiv.style.display = 'none';
  
  if (!usernameOrEmail || !password) {
    messageDiv.innerHTML = "❌ Inserisci username/email e password!";
    messageDiv.className = "message error";
    messageDiv.style.display = 'block';
    return;
  }

  try {
    messageDiv.innerHTML = "⏳ Accesso in corso...";
    messageDiv.className = "message loading";
    messageDiv.style.display = 'block';

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

    messageDiv.innerHTML = "✅ Login effettuato! Reindirizzamento...";
    messageDiv.className = "message success";
    
    setTimeout(() => {
      window.location.href = "home.html";
    }, 1000);

  } catch (error) {
    let errorMessage = "❌ Errore login: ";
    
  
    switch (error.message) {
      case "Invalid login credentials":
        errorMessage += "Username/email o password non corretti";
        break;
      case "Username non trovato":
        errorMessage += "Username non trovato";
        break;
      default:
        errorMessage += error.message;
    }
    
    messageDiv.innerHTML = errorMessage;
    messageDiv.className = "message error";
  }
});

// =========================
// GESTIONE REGISTRAZIONE
// =========================
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const confirmPassword = document.getElementById('register-confirm-password').value.trim();
  const messageDiv = document.getElementById('register-message');
  
  // Reset messaggi
  messageDiv.style.display = 'none';
  
  // Validazione username
  if (username.length < 3) {
    messageDiv.innerHTML = '❌ Lo username deve essere di almeno 3 caratteri';
    messageDiv.className = 'message error';
    messageDiv.style.display = 'block';
    return;
  }
  
  // Validazione password
  if (password.length < 6) {
    messageDiv.innerHTML = '❌ La password deve essere di almeno 6 caratteri';
    messageDiv.className = 'message error';
    messageDiv.style.display = 'block';
    return;
  }
  
  if (password !== confirmPassword) {
    messageDiv.innerHTML = '❌ Le password non coincidono';
    messageDiv.className = 'message error';
    messageDiv.style.display = 'block';
    return;
  }
  
  try {
    messageDiv.innerHTML = '⏳ Controllo disponibilità username...';
    messageDiv.className = 'message loading';
    messageDiv.style.display = 'block';
    
    // Controlla se lo username è già in uso
    const { data: existingUsername, error: usernameError } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();
    
    if (existingUsername) {
      messageDiv.innerHTML = '❌ Username già in uso, scegline un altro';
      messageDiv.className = 'message error';
      return;
    }
    
    // Controlla se l'email è già in uso
    const { data: existingEmail, error: emailError } = await supabase
      .from('users')
      .select('mail')
      .eq('mail', email)
      .single();
    
    if (existingEmail) {
      messageDiv.innerHTML = '❌ Email già registrata, passa al login';
      messageDiv.className = 'message error';
      return;
    }
    
    messageDiv.innerHTML = '⏳ Registrazione in corso...';
    messageDiv.className = 'message loading';
    
    // Registra l'utente in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username
        }
      }
    });
    
    if (error) {
      throw error;
    }
    
    if (data.user) {
      // Salva il profilo utente nella tabella users
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            mail: email,
            username: username
          }
        ]);
      
      if (profileError) {            
        messageDiv.innerHTML = '⚠️ Registrazione completata ma errore nel salvataggio del profilo: ' + profileError.message;
        messageDiv.className = 'message error';
        return;
      }
      
      messageDiv.innerHTML = '✅ Registrazione completata! Puoi ora accedere.';
      messageDiv.className = 'message success';
      
      // Passa automaticamente al login dopo 2 secondi
      setTimeout(() => {
        card.classList.remove('register');
        document.getElementById('login-username').value = username;
        messageDiv.style.display = 'none';
      }, 2000);
    }
    
  } catch (error) {        
    let errorMessage = '❌ Errore durante la registrazione: ';
    
    switch (error.message) {
      case 'User already registered':
        errorMessage += 'Questo indirizzo email è già registrato. Passa al login.';
        break;
      case 'Invalid email':
        errorMessage += 'Indirizzo email non valido';
        break;
      case 'Password should be at least 6 characters':
        errorMessage += 'La password deve essere di almeno 6 caratteri';
        break;
      default:
        errorMessage += error.message;
    }
    
    messageDiv.innerHTML = errorMessage;
    messageDiv.className = 'message error';
  }
});

// =========================
// TOGGLE PASSWORD VISIBILITY
// =========================
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  const svg = button.querySelector('svg');
  
  if (input.type === 'password') {
    input.type = 'text';
    // Cambia in icona "occhio sbarrato"
    svg.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    `;
  } else {
    input.type = 'password';
    // Torna all'icona "occhio aperto"
    svg.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    `;
  }
}

// Esporta la funzione per uso globale
window.togglePassword = togglePassword;
