// --- CONFIG: GANTI DENGAN SUPABASE KAMU ---
const SUPABASE_URL = 'https://klyomaozvtfqsjxsuvwx.supabase.co'; // ← paste Project URL
const SUPABASE_ANON_KEY = 'sb_publishable_G0pnYrSg78upUR2-gUNtJw_NuSCpQ6j'; // ← paste Publishable API Key
// Import Supabase client (via CDN di masa depan, tapi untuk sekarang kita pakai script inline)
let supabase;

// Initialize Supabase
async function initSupabase() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// --- ROUTING (Hash-based) ---
function renderPage() {
  const route = window.location.hash.slice(2) || 'login';
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user && route !== 'login' && route !== 'register') {
    window.location.hash = '#/login';
    return;
  }

  let html = '';
  switch(route) {
    case 'login': html = renderLoginPage(); break;
    case 'register': html = renderRegisterPage(); break;
    case 'dashboard': html = renderDashboard(); break;
    case 'history': html = renderHistory(); break;
    case 'analytics': html = renderAnalytics(); break;
    case 'profile': html = renderProfile(); break;
    default: html = renderLoginPage();
  }

  document.getElementById('app').innerHTML = html;
  setupEventListeners();
}

// --- AUTH PAGES ---
function renderLoginPage() {
  return `
    <h2>Login</h2>
    <form id="loginForm">
      <input type="email" id="email" placeholder="Email" required />
      <input type="password" id="password" placeholder="Password (min 8 chars)" minlength="8" required />
      <button type="submit">Login</button>
    </form>
    <p>Don't have an account? <a href="#/register">Register</a></p>
  `;
}

function renderRegisterPage() {
  return `
    <h2>Register</h2>
    <form id="registerForm">
      <input type="email" id="regEmail" placeholder="Email" required />
      <input type="password" id="regPassword" placeholder="Password (min 8 chars)" minlength="8" required />
      <button type="submit">Register</button>
    </form>
    <p>Already have an account? <a href="#/login">Login</a></p>
  `;
}

// --- DASHBOARD ---
function renderDashboard() {
  return `
    <nav>
      <div><h1>Trading Journal</h1></div>
      <div>
        <a href="#/dashboard">Dashboard</a>
        <a href="#/history">History</a>
        <a href="#/analytics">Analytics</a>
        <a href="#/profile">Profile</a>
        <button onclick="logout()">Logout</button>
        <button id="themeToggle">☀️ Light</button>
      </div>
    </nav>
    <h2>Add New Trade</h2>
    <form id="tradeForm">
      <input type="date" id="date" required />
      <input type="text" id="asset" placeholder="Asset (e.g., AUDUSD)" required />
      <textarea id="reason" placeholder="Entry reason"></textarea>
      <input type="number" step="0.01" id="tp" placeholder="Take Profit" />
      <input type="number" step="0.01" id="sl" placeholder="Stop Loss" />
      <input type="number" step="0.01" id="pnl" placeholder="PnL" required />
      <textarea id="notes" placeholder="Notes"></textarea>
      <input type="file" id="beforeImage" accept="image/jpeg,image/png" />
      <input type="file" id="afterImage" accept="image/jpeg,image/png" />
      <button type="submit">Save Trade</button>
    </form>
    <div id="stats"></div>
  `;
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Theme toggle
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    const isDark = document.body.classList.contains('dark');
    toggle.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    toggle.onclick = () => {
      document.body.classList.toggle('dark');
      document.body.classList.toggle('light');
      localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
      toggle.textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark';
    };
  }

  // Auth forms
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('tradeForm')?.addEventListener('submit', handleAddTrade);
}

// --- AUTH LOGIC ---
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login failed: ' + error.message);
  } else {
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.hash = '#/dashboard';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert('Register failed: ' + error.message);
  } else {
    alert('Registered! Check email for confirmation.');
    window.location.hash = '#/login';
  }
}

function logout() {
  supabase.auth.signOut();
  localStorage.removeItem('user');
  window.location.hash = '#/login';
}

// --- MAIN INIT ---
window.addEventListener('load', async () => {
  await initSupabase();
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.add(savedTheme);
  renderPage();
});


window.addEventListener('hashchange', renderPage);
