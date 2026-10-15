Live Link: https://lg5092.github.io/StockChart/ 

# Stock Charts

The purpose for this project is to easily compare how much people are **searching** for a stock on Google with what its **price** is doing, side by side, over the last 6 months. My personal interest on how the internet affects stock prices and vice versa fulfills this curiosity of mine. 

Enter a ticker (`AAPL`, `TSLA`, `NVDA`) and the app constructs two charts:

- **Google Search Trends**: relative search interest for that particular ticker (0–100, from Google Trends)
- **Stock Price**: daily closing price in USD (from the Polygon.io API)

## Features

- Side-by-side line charts built with [Chart.js]
- **Zoom and pan** on both charts 
  - Drag across a chart to zoom into that date range
  - Ctrl + scroll wheel to zoom
  - Shift + drag to pan
  - **Reset zoom** button above each chart
- Hover anywhere on a chart to see the value for that date
- Status banner and automatic retries while the backend wakes up
- Results cached for 15 minutes, so a recent chart still shows if the backend is unreachable

## Tech Stack 

- HTML, CSS and JavaScript: formatting of the charts and fetching data 
- Chart.js: construction of charts, chart accessibility
- localStorage: caching results
- Python, Flask-CORS: serves API, allows page calls
- pytrends: fetches Google Trends data
- Polygon.io: fetches daily stock prices using an API key
- Render (free plan): hosts the server
- Github, Github Pages: holds code, hosts frontend

## Project Structure

```
Browser (index.html + script.js)
        │
        ▼
Flask backend (server.py, hosted on Render)
   ├── /api/stock_prices  # Polygon.io daily aggregates
   ├── /api/google_trends # Google Trends (via pytrends)
   └── /health            # wake-up / health check
```

## File/Purpose 

`index.html`: Page layout
`script.js`: Fetches data, draws the charts, handles retries and caching 
`style.css`: Styling
`server.py`: Flask API that talks to Polygon.io and Google Trends
`requirements.txt`: Python dependencies

## Deployment

The backend is deployed on [Render] (free tier) using gunicorn.

- **Note on slow first loads:** Render's free tier puts the server to sleep after about 15 minutes without traffic. The first request after that can take up to a minute while it wakes up. The page shows a banner and retries automatically during that time.

## Limitations

- Since Google Trends has no official API, I had to use `pytrends` which can be rate-limited, especially on shared hosting IPs, so the trends chart may have a delay or sometimes fail to load.
- Google Trends values are relative (0–100 within the selected window), not absolute search counts.
- Trends data includes every calendar day, but price data only has trading days which may affect the exact alighment of the charts. This is why I decided to have two charts have different x-axis points and are zoomed separately.