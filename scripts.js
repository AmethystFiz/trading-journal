// === SUPABASE CONFIGURATION ===
// GANTI DENGAN NILAI KAMU DARI SUPABASE → Project Settings → API
const SUPABASE_URL = 'https://klyomaozvtfqsjxsuvwx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G0pnYrSg78upUR2-gUNtJw_NuSCpQ6j';

// Inisialisasi Supabase
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === UTILS ===
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB');
}

function isWin(pnl) {
  return parseFloat(pnl) >= 0;
}

// === AUTH ===
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login failed: ' + error.message);
  } else {
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
    alert('Registered! You can now login.');
    window.location.hash = '#/login';
  }
}

async function logout() {
  await supabase.auth.signOut();
  window.location.hash = '#/login';
}

// === TRADES ===
async function getTrades(filters = {}) {
  let query = supabase.from('trades').select('*');
  if (filters.date) {
    query = query.eq('date', filters.date);
  }
  if (filters.month) {
    // Supabase doesn't support date_part in RLS-enabled tables easily, so fetch all and filter in JS
  }
  const { data, error } = await query.order('date', { ascending: false });
  return error ? [] : data;
}

async function saveTrade(tradeData, beforeFile, afterFile) {
  // Dapatkan user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  // Upload gambar jika ada
  let beforeUrl = '', afterUrl = '';

  if (beforeFile) {
    const fileName = `before_${Date.now()}_${beforeFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('trade-images')
      .upload(`trades/${user.id}/${fileName}`, beforeFile, {
        upsert: true,
        cacheControl: '3600',
        contentType: beforeFile.type,
      });
    if (uploadError) throw uploadError;
    beforeUrl = `trades/${user.id}/${fileName}`;
  }

  if (afterFile) {
    const fileName = `after_${Date.now()}_${afterFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('trade-images')
      .upload(`trades/${user.id}/${fileName}`, afterFile, {
        upsert: true,
        cacheControl: '3600',
        contentType: afterFile.type,
      });
    if (uploadError) throw uploadError;
    afterUrl = `trades/${user.id}/${fileName}`;
  }

  // Simpan ke database
  const { data, error } = await supabase.from('trades').insert({
    date: tradeData.date,
    asset: tradeData.asset,
    reason: tradeData.reason,
    tp: tradeData.tp || null,
    sl: tradeData.sl || null,
    pnl: tradeData.pnl,
    notes: tradeData.notes,
    before_image: beforeUrl,
    after_image: afterUrl,
  }).select();

  if (error) throw error;
  return data[0];
}

async function deleteTrade(id) {
  const { error } = await supabase.from('trades').delete().eq('id', id);
  if (error) throw error;
}

// === UI RENDERING ===
function renderLoginPage() {
  return `
    <div class="auth-container">
      <h2>Login</h2>
      <form id="loginForm">
        <input type="email" id="email" placeholder="Email" required />
        <input type="password" id="password" placeholder="Password" minlength="8" required />
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <a href="#/register">Register</a></p>
    </div>
  `;
}

function renderRegisterPage() {
  return `
    <div class="auth-container">
      <h2>Register</h2>
      <form id="registerForm">
        <input type="email" id="regEmail" placeholder="Email" required />
        <input type="password" id="regPassword" placeholder="Password (min 8 chars)" minlength="8" required />
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <a href="#/login">Login</a></p>
    </div>
  `;
}

function renderDashboard() {
  return `
    <nav>
      <h1>Trading Journal</h1>
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

async function renderHistory() {
  const trades = await getTrades();
  let html = `
    <nav>
      <h1>Trading Journal</h1>
      <div>
        <a href="#/dashboard">Dashboard</a>
        <a href="#/history">History</a>
        <a href="#/analytics">Analytics</a>
        <a href="#/profile">Profile</a>
        <button onclick="logout()">Logout</button>
        <button id="themeToggle">☀️ Light</button>
      </div>
    </nav>
    <h2>Trade History</h2>
    <div>
      <input type="month" id="filterMonth" />
      <input type="date" id="filterDate" />
    </div>
    <table id="tradesTable">
      <thead>
        <tr>
          <th>Date</th>
          <th>Asset</th>
          <th>PnL</th>
          <th>Win/Loss</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  trades.forEach(trade => {
    const pnlClass = isWin(trade.pnl) ? 'profit' : 'loss';
    const winLoss = isWin(trade.pnl) ? 'Win' : 'Loss';
    html += `
      <tr>
        <td>${formatDate(trade.date)}</td>
        <td>${trade.asset}</td>
        <td class="${pnlClass}">${trade.pnl}</td>
        <td>${winLoss}</td>
        <td>
          <button onclick="viewTrade('${trade.id}')">View</button>
          <button onclick="deleteTradeUI('${trade.id}')">Delete</button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;
  return html;
}

function renderAnalytics() {
  return `
    <nav>
      <h1>Trading Journal</h1>
      <div>
        <a href="#/dashboard">Dashboard</a>
        <a href="#/history">History</a>
        <a href="#/analytics">Analytics</a>
        <a href="#/profile">Profile</a>
        <button onclick="logout()">Logout</button>
        <button id="themeToggle">☀️ Light</button>
      </div>
    </nav>
    <h2>Analytics</h2>
    <canvas id="pnlChart" width="400" height="200"></canvas>
    <canvas id="winLossChart" width="400" height="200"></canvas>
  `;
}

function renderProfile() {
  return `
    <nav>
      <h1>Trading Journal</h1>
      <div>
        <a href="#/dashboard">Dashboard</a>
        <a href="#/history">History</a>
        <a href="#/analytics">Analytics</a>
        <a href="#/profile">Profile</a>
        <button onclick="logout()">Logout</button>
        <button id="themeToggle">☀️ Light</button>
      </div>
    </nav>
    <h2>Profile & Export</h2>
    <button onclick="exportCSV()">Export as CSV</button>
    <button onclick="exportJSON()">Export as JSON</button>
  `;
}

// === EVENT HANDLERS ===
async function handleAddTrade(e) {
  e.preventDefault();
  try {
    const formData = new FormData(e.target);
    const tradeData = {
      date: formData.get('date'),
      asset: formData.get('asset'),
      reason: formData.get('reason'),
      tp: formData.get('tp') || null,
      sl: formData.get('sl') || null,
      pnl: formData.get('pnl'),
      notes: formData.get('notes'),
    };
    const beforeFile = document.getElementById('beforeImage').files[0];
    const afterFile = document.getElementById('afterImage').files[0];

    await saveTrade(tradeData, beforeFile, afterFile);
    alert('Trade saved!');
    e.target.reset();
    document.getElementById('beforeImage').value = '';
    document.getElementById('afterImage').value = '';
    // Refresh stats
    loadStats();
  } catch (err) {
    console.error(err);
    alert('Error saving trade: ' + (err.message || err));
  }
}

async function deleteTradeUI(id) {
  if (!confirm('Delete this trade?')) return;
  try {
    await deleteTrade(id);
    window.location.hash = '#/history';
  } catch (err) {
    alert('Error deleting trade: ' + err.message);
  }
}

async function viewTrade(id) {
  const { data, error } = await supabase.from('trades').select('*').eq('id', id).single();
  if (error) return alert('Error: ' + error.message);

  let imgHTML = '';
  if (data.before_image) {
    const { data: { publicUrl } } = supabase.storage.from('trade-images').getPublicUrl(data.before_image);
    imgHTML += `<img src="${publicUrl}" style="max-width:100%; margin:10px 0;" alt="Before">`;
  }
  if (data.after_image) {
    const { data: { publicUrl } } = supabase.storage.from('trade-images').getPublicUrl(data.after_image);
    imgHTML += `<img src="${publicUrl}" style="max-width:100%; margin:10px 0;" alt="After">`;
  }

  alert(`
    Date: ${formatDate(data.date)}
    Asset: ${data.asset}
    PnL: ${data.pnl}
    Notes: ${data.notes || '-'}
    ${imgHTML ? '\n\nImages loaded in modal' : ''}
  `);
  // Untuk modal lengkap, butuh HTML tambahan — ini versi sederhana
}

async function loadStats() {
  const trades = await getTrades();
  const totalTrades = trades.length;
  const totalPnL = trades.reduce((sum, t) => sum + parseFloat(t.pnl || 0), 0);
  const wins = trades.filter(t => isWin(t.pnl)).length;
  const winRate = totalTrades ? (wins / totalTrades * 100).toFixed(1) : 0;

  document.getElementById('stats').innerHTML = `
    <div class="stats-grid">
      <div>Total Trades: ${totalTrades}</div>
      <div>Total PnL: ${totalPnL.toFixed(2)}</div>
      <div>Win Rate: ${winRate}%</div>
    </div>
  `;
}

// === EXPORT ===
async function exportCSV() {
  const trades = await getTrades();
  const headers = ['Date', 'Asset', 'Reason', 'TP', 'SL', 'PnL', 'Notes'];
  const rows = trades.map(t => [
    t.date,
    `"${t.asset}"`,
    `"${t.reason}"`,
    t.tp || '',
    t.sl || '',
    t.pnl,
    `"${t.notes}"`
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trading-journal.csv';
  a.click();
}

async function exportJSON() {
  const trades = await getTrades();
  const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trading-journal.json';
  a.click();
}

// === CHARTS (sederhana) ===
async function renderCharts() {
  const trades = await getTrades();
  const ctx1 = document.getElementById('pnlChart');
  if (ctx1) {
    const labels = trades.map(t => t.date);
    const data = trades.map(t => t.pnl);
    new Chart(ctx1, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'PnL',
          data: data,
          borderColor: 'purple',
          tension: 0.1
        }]
      }
    });
  }

  const ctx2 = document.getElementById('winLossChart');
  if (ctx2) {
    const wins = trades.filter(t => isWin(t.pnl)).length;
    const losses = trades.length - wins;
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Wins', 'Losses'],
        datasets: [{
          label: 'Trades',
          data: [wins, losses],
          backgroundColor: ['#4caf50', '#f44336']
        }]
      }
    });
  }
}

// === MAIN APP ===
function setupEventListeners() {
  // Theme
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

  // Forms
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('tradeForm')?.addEventListener('submit', handleAddTrade);

  // Filter
  document.getElementById('filterMonth')?.addEventListener('change', async (e) => {
    const month = e.target.value; // YYYY-MM
    // Filter di JS
  });
}

async function renderPage() {
  const { data: { user } } = await supabase.auth.getUser();
  const route = window.location.hash.slice(2) || (user ? 'dashboard' : 'login');

  if (!user && route !== 'login' && route !== 'register') {
    window.location.hash = '#/login';
    return;
  }

  let html = '';
  switch (route) {
    case 'login': html = renderLoginPage(); break;
    case 'register': html = renderRegisterPage(); break;
    case 'dashboard': html = renderDashboard(); break;
    case 'history': html = await renderHistory(); break;
    case 'analytics': html = renderAnalytics(); break;
    case 'profile': html = renderProfile(); break;
    default: html = renderLoginPage();
  }

  document.getElementById('app').innerHTML = html;
  setupEventListeners();

  // Load data tambahan
  if (route === 'dashboard') loadStats();
  if (route === 'analytics') renderCharts();
}

// === INIT ===
window.addEventListener('load', () => {
  // Load theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.add(savedTheme);

  // Load page
  renderPage();
});

window.addEventListener('hashchange', renderPage);

// Expose functions to global scope for onclick
window.logout = logout;
window.deleteTradeUI = deleteTradeUI;
window.viewTrade = viewTrade;
window.exportCSV = exportCSV;
window.exportJSON = exportJSON;
