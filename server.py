from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import datetime
from pytrends.request import TrendReq 

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

pytrends = TrendReq(hl="en-US", tz=360)

POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")

if not POLYGON_API_KEY:
    raise ValueError("POLYGON_API_KEY is missing.")

@app.route("/api/stock_prices", methods=["GET"])
def get_stock_prices():
    ticker = request.args.get("ticker", "").upper()
    if not ticker:
        return jsonify({"error": "Ticker symbol is required"}), 400

    today = datetime.date.today()
    six_months_ago = today - datetime.timedelta(days=180)

    end_date = today.strftime("%Y-%m-%d") 
    start_date = six_months_ago.strftime("%Y-%m-%d")

    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{start_date}/{end_date}?apiKey={POLYGON_API_KEY}"

    try:
        response = requests.get(url)
        data = response.json()

        if "results" not in data or not data["results"]:
            return jsonify({"error": "No stock data found"}), 404

        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/google_trends", methods=["GET"])
def get_google_trends():
    ticker = request.args.get("ticker", "").upper()
    search_term = f"{ticker} stock"

    try:
        end_date = datetime.datetime.utcnow().strftime('%Y-%m-%d')
        start_date = (datetime.datetime.utcnow() - datetime.timedelta(days=180)).strftime('%Y-%m-%d')
        timeframe = f"{start_date} {end_date}"

        print(f"Fetching Google Trends for {ticker} from {start_date} to {end_date}")

        pytrends.build_payload([search_term], timeframe=timeframe, geo='', gprop='')
        data = pytrends.interest_over_time()

        if data.empty:
            return jsonify({"error": "No data found for Google Trends."})

        trends = {date.strftime('%Y-%m-%d'): int(value) for date, value in data[search_term].items()}
        
        return jsonify({"ticker": ticker, "trends": trends})
    
    except Exception as e:
        return jsonify({"error": f"Google Trends request failed: {str(e)}"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
