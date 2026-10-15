# StockChart

Compare how much people are **searching** for a stock on Google with what its **price** is doing, side by side, over the last 6 months.

Enter a ticker (e.g. `AAPL`, `TSLA`, `NVDA`) and the app draws two charts:

- **Google Search Trends**: relative search interest for `"<TICKER> stock"` (0–100, from Google Trends)
- **Stock Price**: daily closing price in USD (from the Polygon.io API)

## Features

- Side-by-side line charts built with [Chart.js](https://www.chartjs.org/)
- **Zoom and pan** on both charts ([chartjs-plugin-zoom](https://www.chartjs.org/chartjs-plugin-zoom/)):
  - Drag across a chart to zoom into that date range
  - Ctrl + scroll wheel (or pinch on touch devices) to zoom
  - Shift + drag to pan
  - **Reset zoom** button above each chart
- Hover anywhere on a chart to see the value for that date
- Status banner and automatic retries while the backend wakes up
- Results cached in `localStorage` for 15 minutes, so a recent chart still shows if the backend is unreachable

## How it works

```
Browser (index.html + script.js)
        │
        ▼
Flask backend (server.py, hosted on Render)
   ├── /api/stock_prices  ──► Polygon.io daily aggregates
   ├── /api/google_trends ──► Google Trends (via pytrends)
   └── /health            ──► wake-up / health check
```

| File | Purpose |
| --- | --- |
| `index.html` | Page layout |
| `script.js` | Fetches data, draws the charts, handles retries and caching |
| `style.css` | Styling |
| `server.py` | Flask API that talks to Polygon.io and Google Trends |
| `requirements.txt` | Python dependencies |

## Running locally

### 1. Backend

You need a free API key from [Polygon.io](https://polygon.io/).

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

export POLYGON_API_KEY=your_key_here
python server.py
```

The API runs at `http://localhost:5000`.

### 2. Frontend

In `script.js`, set `backendUrl` to point at your local server:

```js
const backendUrl = "http://localhost:5000";
```

Then open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## API

| Endpoint | Query | Returns |
| --- | --- | --- |
| `GET /api/stock_prices` | `ticker` | Polygon.io daily bars for the last 180 days (`results[].t` = timestamp, `results[].c` = close) |
| `GET /api/google_trends` | `ticker` | `{ "ticker": "...", "trends": { "YYYY-MM-DD": 0-100, ... } }` |
| `GET /health` | none | `{ "status": "ok" }` |

## Deployment

The backend is deployed on [Render](https://render.com/) (free tier) using gunicorn:

```bash
gunicorn server:app
```

Set `POLYGON_API_KEY` as an environment variable in the Render dashboard.

> **Note on slow first loads:** Render's free tier puts the server to sleep after about 15 minutes without traffic. The first request after that can take up to a minute while it wakes up. The page shows a banner and retries automatically during that time.

## Limitations

- Google Trends has no official API. `pytrends` can be rate-limited (HTTP 429), especially on shared hosting IPs, so the trends chart may sometimes fail to load.
- Google Trends values are relative (0–100 within the selected window), not absolute search counts.
- Trends data includes every calendar day, but price data only has trading days. The two charts have different x-axis points and are zoomed separately.
