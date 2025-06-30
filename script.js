window.onload = function () {
    const pricesCtx = document.getElementById('pricesChart').getContext('2d');
    const trendsCtx = document.getElementById('trendsChart').getContext('2d');
    const tickerInput = document.getElementById('tickerInput');
    const fetchButton = document.getElementById('fetchButton');

    const backendUrl = "https://stockchart-ubee.onrender.com";


    const pricesChart = new Chart(pricesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Stock Price (USD)',
                data: []
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
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
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });

    fetchButton.addEventListener('click', () => {
        const ticker = tickerInput.value.trim().toUpperCase();
        if (ticker) {
            fetchStockPrices(ticker);
            fetchGoogleTrends(ticker);
        } else {
            alert('Please enter a valid stock ticker.');
        }
    });

    async function fetchStockPrices(ticker) {
        try {
            const url = `${backendUrl}/api/stock_prices?ticker=${ticker}`;
            console.log(`Fetching stock data for ${ticker} from ${url}...`);

            const response = await fetch(url);
            console.log("Response status:", response.status);

            if (!response.ok) {
                console.error("Error fetching stock prices:", response.statusText);
                alert(`Error fetching stock prices: ${response.statusText}`);
                return;
            }

            const data = await response.json();
            console.log("Stock Data Response:", data);

            if (!data.results || data.results.length === 0) {
                alert('No stock data found.');
                return;
            }

            const sortedResults = data.results.sort((a, b) => a.t - b.t);

            const times = sortedResults.map(item =>
                new Date(item.t).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric'
                })
            );

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

    async function fetchGoogleTrends(ticker) {
        try {
            const url = `${backendUrl}/api/google_trends?ticker=${ticker}`;
            console.log(`Fetching Google Trends for ${ticker} from ${url}...`);

            const response = await fetch(url);
            console.log("Response status:", response.status);

            if (!response.ok) {
                console.error("Error fetching Google Trends:", response.statusText);
                alert(`Error fetching Google Trends: ${response.statusText}`);
                return;
            }

            const data = await response.json();
            console.log("Google Trends Data:", data);

            if (data.error) {
                alert("No Google Trends data found.");
                return;
            }


            const dateKeys = Object.keys(data.trends);
            const sortedDateStrings = dateKeys.sort((a, b) => new Date(a) - new Date(b));

            const formattedDates = sortedDateStrings.map(dateString =>
                new Date(dateString).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric'
                })
            );

            const interest = sortedDateStrings.map(dateString => data.trends[dateString]);

            updateTrendsChart(formattedDates, interest);
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
