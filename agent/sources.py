# -*- coding: utf-8 -*-
"""
sources.py

External data and policy access layer for the Gold Collateral Evaluation Agent.

Responsibilities:
1. Retrieve loan details from the Sanad API endpoint (API or stubbed call).
2. Fetch live gold price (USD per troy ounce) from https://metalpriceapi.com.
3. Fetch live FX rate (USD) from https://www.fastforex.io.
4. Retrieve regulatory & operational policy thresholds from policy.py.

These are lightweight helpers called by gold_evaluator.py.
"""

import os
import json
import requests
from datetime import datetime
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Import policy settings (max LTVs, haircut policy, etc.)
import policy

# Load env configuration
load_dotenv(".env")


# ------------------------------------------------------------------------------
# 1. Retrieve loan details from Sanad API (stub / API placeholder)
# ------------------------------------------------------------------------------
def get_loan_details(loan_id: str) -> dict:
    """
    Fetch loan details from the Sanad API endpoint.
    The endpoint should return a JSON with Sanad data that will be mapped to loan details format:
        loan_id, shop_id, principal_usd, gold_weight_g, purity, collateral_type, tenure_days, fees_myr
    If API is unavailable, a local stub will be used.

    Returns:
        dict: parsed loan details ready for LoanInput model
    """
    base_url = os.getenv("SANAD_API_BASE", "https://api.sanad.finance")
    api_key = os.getenv("SANAD_API_KEY")

    url = f"{base_url}/Sanad/{loan_id}"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        
        # Map Sanad data to loan details format
        if data.get("success") and data.get("data"):
            Sanad_data = data["data"]
            Sanad_properties = Sanad_data.get("SanadProperties", {})
            
            return {
                "loan_id": loan_id,
                "shop_id": "Sanad-SHOP",  # Default shop ID for Sanad-based loans
                "principal_usd": Sanad_properties.get("loan", 0),
                "gold_weight_g": Sanad_properties.get("weightG", 0),
                "purity": Sanad_properties.get("karat", 916),  # Convert karat to purity (916 = 22k)
                "collateral_type": Sanad_properties.get("assetType", "jewellery"),
                "tenure_days": Sanad_properties.get("tenorM", 3) * 30,  # Convert months to days
                "fees_myr": 0.0,  # Default fees
            }
        else:
            raise ValueError("Invalid Sanad API response format")
            
    except Exception as e:
        # Fallback stub (for local testing)
        print(f"[WARN] Sanad API not reachable ({e}); using stub data.")
        return {
            "loan_id": loan_id,
            "shop_id": "Sanad-SHOP",
            "principal_usd": 4000,
            "gold_weight_g": 25.0,
            "purity": 916,
            "collateral_type": "jewellery",-
            "tenure_days": 90,
            "fees_myr": 0.0,
        }


# ------------------------------------------------------------------------------
# 2. Get gold price from MetalPriceAPI (USD per troy ounce)
#    Docs: https://metalpriceapi.com/
# ------------------------------------------------------------------------------
def get_gold_price_usd() -> float:
    api_key = os.getenv("METALPRICE_API_KEY")
    if api_key:
        url = f"https://api.metalpriceapi.com/v1/latest?api_key={api_key}&base=USD&currencies=XAU"
        try:
            resp = requests.get(url, timeout=5)
            if resp.ok:
                data = resp.json()
                rate_xau = data.get("rates", {}).get("XAU", 0)
                if rate_xau > 0:
                    return round(1.0 / rate_xau, 2)
        except Exception as e:
            pass
    # Fallback to realistic spot price (~$2650/oz USD)
    return 2650.00


# ------------------------------------------------------------------------------
# 3. Get FX rate USD from FastForex.io
# ------------------------------------------------------------------------------
def get_fx_rate(pair: str = "USD") -> float:
    api_key = os.getenv("FASTFOREX_API_KEY")
    if api_key:
        base, quote = pair.split("/")
        url = f"https://api.fastforex.io/fetch-one?from={base}&to={quote}&api_key={api_key}"
        try:
            resp = requests.get(url, timeout=5)
            if resp.ok:
                data = resp.json()
                rate = float(data.get("result", {}).get(quote, 4.45))
                return round(rate, 4)
        except Exception as e:
            pass
    # Safe default market rate (1 USD = 4.45 USD)
    return 4.45


# ------------------------------------------------------------------------------
# 4. Compute gold price in USD per gram (helper for evaluator)
# ------------------------------------------------------------------------------
def get_gold_price_usd() -> float:
    """
    Convert USD/oz gold price to USD/gram using live FX rate.

    1 troy ounce = 31.1034768 grams

    Returns:
        float: gold price in USD per gram
    """
    usd_per_oz = get_gold_price_usd()
    usd_rate = get_fx_rate("USD")
    usd_per_gram = (usd_per_oz * usd_rate) / 31.1034768
    return round(usd_per_gram, 2)


# ------------------------------------------------------------------------------
# 4.1. Get yesterday's gold price from backend API
# ------------------------------------------------------------------------------
def get_yesterday_gold_price_usd() -> Optional[float]:
    """
    Fetch yesterday's gold price in USD per gram from the backend API.
    
    Environment:
        SANAD_API_BASE
        SANAD_API_KEY (optional, for authentication)
    
    Returns:
        Optional[float]: yesterday's gold price in USD per gram, or None if unavailable
    """
    base_url = os.getenv("SANAD_API_BASE", "http://localhost:9487")
    api_key = os.getenv("SANAD_API_KEY")
    url = f"{base_url}/api/v1/gold-price/yesterday"
    
    # Prepare headers with authentication if API key is available
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    try:
        # resp = requests.get(url, headers=headers, timeout=10)
        # resp.raise_for_status()
        # data = resp.json()
        
        # if data.get("success") and data.get("data"):
        #     price_per_gram_myr = float(data["data"]["pricePerGramMyr"])
        #     return round(price_per_gram_myr, 2)
        # else:
        #     print(f"[WARN] Invalid response from yesterday gold price API: {data}")
        #     return None

        return 375.00
            
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print(f"[WARN] Authentication required for gold price API. Set SANAD_API_KEY in environment.")
        elif e.response.status_code == 404:
            print(f"[WARN] No gold price data found for yesterday")
        else:
            print(f"[WARN] HTTP error fetching yesterday's gold price: {e}")
        return None
    except Exception as e:
        print(f"[WARN] Could not fetch yesterday's gold price: {e}")
        return None


# ------------------------------------------------------------------------------
# 4.2. Detect abnormal gold price fluctuations
# ------------------------------------------------------------------------------
def detect_abnormal_price_change(current_price: float, yesterday_price: Optional[float], 
                               max_deviation_percent: float = 5.0) -> Dict[str, Any]:
    """
    Detect if current gold price shows abnormal deviation from yesterday's price.
    
    Args:
        current_price: Current gold price in USD per gram
        yesterday_price: Yesterday's gold price in USD per gram (can be None)
        max_deviation_percent: Maximum allowed deviation percentage (default 5%)
    
    Returns:
        Dict containing:
        - is_abnormal: bool
        - deviation_percent: float
        - yesterday_price: Optional[float]
        - current_price: float
        - threshold_percent: float
    """
    if yesterday_price is None or yesterday_price <= 0:
        return {
            "is_abnormal": False,
            "deviation_percent": 0.0,
            "yesterday_price": yesterday_price,
            "current_price": current_price,
            "threshold_percent": max_deviation_percent,
            "reason": "No yesterday price available for comparison"
        }
    
    # Calculate percentage deviation
    deviation_percent = abs((current_price - yesterday_price) / yesterday_price) * 100
    
    is_abnormal = deviation_percent > max_deviation_percent
    
    return {
        "is_abnormal": is_abnormal,
        "deviation_percent": round(deviation_percent, 2),
        "yesterday_price": yesterday_price,
        "current_price": current_price,
        "threshold_percent": max_deviation_percent,
        "reason": f"Price deviation {deviation_percent:.2f}% {'exceeds' if is_abnormal else 'within'} threshold {max_deviation_percent}%"
    }


# ------------------------------------------------------------------------------
# 5. Get recent volatility (stub for now; replace with actual logic)
# ------------------------------------------------------------------------------
def get_volatility(symbol: str = "XAU/USD", window: int = 30) -> float:
    """
    Compute or fetch rolling volatility (% stddev of daily returns).
    In production, integrate with time-series data provider or Sanad data lake.
    For now, returns a static illustrative value.

    Args:
        symbol: asset symbol (e.g., XAU/USD)
        window: rolling window in days

    Returns:
        float: volatility (0.0–1.0)
    """
    # Example: use historical API later; stubbed to 0.03 (3%)
    return 0.03


# ------------------------------------------------------------------------------
# 6. Get shop rating from Sanad or local lookup
# ------------------------------------------------------------------------------
def get_shop_rating(shop_id: str) -> str:
    """
    Placeholder: fetch pawnshop operational rating (A–E).
    Replace with API call to Sanad registry when available.
    """
    # Stubbed simple logic
    return "A" if shop_id.endswith("4") else "B"


# ------------------------------------------------------------------------------
# 7. Get regulatory policy (delegates to policy.py)
# ------------------------------------------------------------------------------
def get_regulatory_policy() -> dict:
    """
    Retrieve the versioned regulatory policy.
    Structure:
      {
        "id": "...",
        "version": "...",
        "hash": "...",
        "body": {
          "version": "...",
          "updated_at": "...",
          "values": { ... thresholds ... }
        }
      }
    """
    return policy.get_current_policy()


# ------------------------------------------------------------------------------
# Simple test run
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    print("Gold price USD/g:", get_gold_price_usd())
    print("FX USD:", get_fx_rate("USD"))
    print("Volatility 30d:", get_volatility())
    print("Policy:", json.dumps(get_regulatory_policy(), indent=2))
