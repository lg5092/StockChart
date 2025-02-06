window.onload = function () {
    const pricesCtx = document.getElementById('pricesChart').getContext('2d');
    const trendsCtx = document.getElementById('trendsChart').getContext('2d');  
    const tickerInput = document.getElementById('tickerInput');
    const fetchButton = document.getElementById('fetchButton');

    //Stock Prices Chart
    const pricesChart = new Chart(pricesCtx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Stock Price (USD)', data: [] }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } } }
    });

    // Google Trends Chart
    const trendsChart = new Chart(trendsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Google Search Interest',
                data: [],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } } }
    });

    //  Fetch Data
    fetchButton.addEventListener('click', () => {
        const ticker = tickerInput.value.trim().toUpperCase();
        if (ticker) {
            fetchStockPrices(ticker);
            fetchGoogleTrends(ticker);
        } else {
            alert('Please enter a valid stock ticker.');
        }
    });

    // Fetch Stock Prices
    async function fetchStockPrices(ticker) {
        try {
            const url = `http://127.0.0.1:5000/api/stock_prices?ticker=${ticker}`;
            console.log(`Fetching stock data for ${ticker}...`);
    
            const response = await fetch(url);
            const data = await response.json();
    
            console.log("Full API Response:", data);
    
            if (!data.results || data.results.length === 0) {
                alert('No stock data found.');
                return;
            }
    
            const sortedResults = data.results.sort((a, b) => a.t - b.t);
            const times = sortedResults.map(item => new Date(item.t).toLocaleDateString());
            const prices = sortedResults.map(item => item.c);
    
            updatePricesChart(times, prices);
        } catch (error) {
            console.error('Error fetching stock prices:', error);
            alert("Failed to fetch stock prices.");
        }
    }
    

    function updatePricesChart(times, prices) {
        pricesChart.data.labels = times;
        pricesChart.data.datasets[0].data = prices;
        pricesChart.update();
    }

    // Fetch Google Trends
    async function fetchGoogleTrends(ticker) {
        try {
            console.log(`Fetching Google Trends for ${ticker}...`);

            const response = await fetch(`http://127.0.0.1:5000/api/google_trends?ticker=${ticker}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            console.log(`Google Trends Data for ${ticker}:`, data);

            if (data.error) {
                alert("No Google Trends data found.");
                return;
            }

            const dates = Object.keys(data.trends);
            const interest = Object.values(data.trends);

            updateTrendsChart(dates, interest);
        } catch (error) {
            console.error('Error fetching Google Trends:', error);
            alert("Failed to fetch Google Trends.");
        }
    }

    function updateTrendsChart(dates, interest) {
        trendsChart.data.labels = dates;
        trendsChart.data.datasets[0].data = interest;
        trendsChart.update();
    }
};