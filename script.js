// app.js
// Assumes Chart.js is loaded and your HTML has:
// - <canvas id="pricesChart"></canvas>
// - <canvas id="trendsChart"></canvas>
// - <input id="tickerInput" />
// - <button id="fetchButton">Fetch</button>

window.onload = function () {
    'use strict';
  
    // ===== Backend base URL =====
    const backendUrl = "https://stockchart-ubee.onrender.com";
  
    // ===== Inject a tiny top banner (no HTML changes needed) =====
    (function injectBanner() {
      const style = document.createElement('style');
      style.textContent = `
  #statusBanner{position:fixed;top:0;left:0;right:0;padding:8px 12px;background:#fff3cd;border-bottom:1px solid #ffeeba;font:14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;color:#7a5b00;z-index:9999}
  #statusBanner.hidden{display:none}
  #statusBanner .spinner{display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;margin-right:8px;vertical-align:-2px;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  body{padding-top:36px}
  `;
      document.head.appendChild(style);
      if (!document.getElementById('statusBanner')) {
        const el = document.createElement('div');
        el.id = 'statusBanner';
        el.className = 'hidden';
        document.body.prepend(el);
      }
    })();
  
    function setBanner(msg) {
      const el = document.getElementById('statusBanner');
      if (!el) return;
      el.innerHTML = `<span class="spinner"></span>${msg}`;
      el.classList.remove('hidden');
    }
    function setBannerQuiet(msg) {
      const el = document.getElementById('statusBanner');
      if (!el) return;
      el.textContent = msg;
      el.classList.remove('hidden');
    }
    function hideBanner() {
      const el = document.getElementById('statusBanner');
      if (el) el.classList.add('hidden');
    }
  
    // ===== Utility: retry with exponential backoff =====
    async function fetchWithRetry(url, { retries = 4, delay = 1000, label = "request", options = {} } = {}) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          setBanner(`Warming backend (${label})… attempt ${attempt + 1}/${retries + 1}`);
          const res = await fetch(url, { cache: 'no-store', ...options });
          if (res.ok) return res;
          // Non-2xx
          if (attempt === retries) throw new Error(`${res.status} ${res.statusText}`);
        } catch (err) {
          if (attempt === retries) {
            setBannerQuiet(`Still waking (${label}). Please try again shortly.`);
            throw err;
          }
        }
        await new Promise(r => setTimeout(r, delay * (2 ** attempt)));
      }
    }

    // Format a UTC ms timestamp as an ET calendar date (MM/DD/YYYY) robustly.
const etDate = (() => {
    let fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    } catch { /* very old browser fallback */ }
    return (ms) => {
      if (fmt) return fmt.format(ms);
      // Fallback: format as UTC to avoid local TZ shifting (still better than PT)
      const d = new Date(ms);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${m}/${day}/${y}`;
    };
  })();
  
  
    // ===== Simple localStorage cache =====
    function saveCache(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
      } catch {}
    }
    function loadCache(key, ttlMs) {
      try {
        const j = JSON.parse(localStorage.getItem(key));
        if (j && Date.now() - j.t < ttlMs) return j.v;
      } catch {}
      return null;
    }
  
    // ===== DOM elements =====
    const pricesCtx = document.getElementById('pricesChart').getContext('2d');
    const trendsCtx = document.getElementById('trendsChart').getContext('2d');
    const tickerInput = document.getElementById('tickerInput');
    const fetchButton = document.getElementById('fetchButton');
  
    // ===== Charts =====
    const pricesChart = new Chart(pricesCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Stock Price (USD)',
          data: [],
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: false } },
        plugins: { legend: { display: true } }
      }
    });
  
    const trendsChart = new Chart(trendsCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Google Search Interest',
          data: [],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: false } },
        plugins: { legend: { display: true } }
      }
    });
  
    function updatePricesChart(times, prices) {
      pricesChart.data.labels = times;
      pricesChart.data.datasets[0].data = prices;
      pricesChart.update();
    }
  
    function updateTrendsChart(dates, interest) {
      trendsChart.data.labels = dates;
      trendsChart.data.datasets[0].data = interest;
      trendsChart.update();
    }
  
    // ===== Data fetchers with retry + cache =====
    async function fetchStockPrices(ticker) {
        const cacheKey = `prices:${ticker}`;
        try {
          const url = `${backendUrl}/api/stock_prices?ticker=${ticker}`;
          const res = await fetchWithRetry(url, { retries: 3, delay: 1000, label: "prices" });
          const data = await res.json();
      
          if (!data.results || !data.results.length) {
            const cached = loadCache(cacheKey, 15 * 60 * 1000);
            if (cached) updatePricesChart(cached.times, cached.prices);
            setBannerQuiet("No stock data found.");
            return false;
          }
      
          const sorted = data.results.slice().sort((a, b) => a.t - b.t);
      
          // IMPORTANT: label each bar by its ET trading day
          const times = sorted.map(it => etDate(it.t));   // <- FIX
          const prices = sorted.map(it => it.c);
      
          saveCache(cacheKey, { times, prices });
          updatePricesChart(times, prices);
          return true;
        } catch (err) {
          console.error('Error fetching stock prices:', err);
          const cached = loadCache(cacheKey, 15 * 60 * 1000);
          if (cached) {
            updatePricesChart(cached.times, cached.prices);
            setBannerQuiet("Showing cached prices while reconnecting…");
            return true;
          } else {
            setBannerQuiet("Trouble loading prices. Will retry automatically.");
            return false;
          }
        }
      }
      
  
    async function fetchGoogleTrends(ticker) {
      const cacheKey = `trends:${ticker}`;
      try {
        const url = `${backendUrl}/api/google_trends?ticker=${ticker}`;
        const res = await fetchWithRetry(url, { retries: 3, delay: 1000, label: "trends" });
        const data = await res.json();
  
        if (data.error) {
          const cached = loadCache(cacheKey, 15 * 60 * 1000);
          if (cached) updateTrendsChart(cached.dates, cached.interest);
          setBannerQuiet("No Google Trends data found.");
          return false;
        }
  
        const dateKeys = Object.keys(data.trends);
        const sorted = dateKeys.sort((a, b) => new Date(a) - new Date(b));
        const dates = sorted.map(ds =>
          new Date(ds).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
        );
        const interest = sorted.map(ds => data.trends[ds]);
  
        saveCache(cacheKey, { dates, interest });
        updateTrendsChart(dates, interest);
        return true;
      } catch (err) {
        console.error('Error fetching Google Trends:', err);
        const cached = loadCache(cacheKey, 15 * 60 * 1000);
        if (cached) {
          updateTrendsChart(cached.dates, cached.interest);
          setBannerQuiet("Showing cached trends while reconnecting…");
          return true; // we showed something
        } else {
          setBannerQuiet("Trouble loading trends. Will retry automatically.");
          return false;
        }
      }
    }
  
    // ===== Button click handler with health warm-up, retries, and proper states =====
    fetchButton.addEventListener('click', async () => {
      const ticker = tickerInput.value.trim().toUpperCase();
      if (!ticker) {
        alert('Please enter a valid stock ticker.');
        return;
      }
  
      fetchButton.disabled = true;
      setBanner("Loading data… free-tier server may take a few seconds to wake.");
  
      try {
        // Warm the backend first (avoids Render cold-start flakiness)
        try {
          await fetchWithRetry(`${backendUrl}/health`, { retries: 4, delay: 1000, label: "health" });
        } catch {
          // proceed anyway; banner already informs user
        }
  
        const [pRes, tRes] = await Promise.allSettled([
          fetchStockPrices(ticker),
          fetchGoogleTrends(ticker)
        ]);
  
        const anySuccess =
          (pRes.status === 'fulfilled' && pRes.value) ||
          (tRes.status === 'fulfilled' && tRes.value);
  
        if (anySuccess) {
          hideBanner();
        } else {
          setBannerQuiet("Having trouble connecting. If this persists, try again in a moment.");
        }
      } finally {
        fetchButton.disabled = false;
      }
    });
  
    // ===== Optional: warm backend on page load =====
    (async () => {
      try {
        setBanner("Heads-up: backend may take a few seconds to wake (free tier). Auto-retrying…");
        await fetchWithRetry(`${backendUrl}/health`, { retries: 4, delay: 1000, label: "health" });
        hideBanner();
      } catch {
        // keep banner visible; next click will retry
      }
    })();
  };
  