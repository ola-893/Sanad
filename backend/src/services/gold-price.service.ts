/**
 * Gold Price Service
 * Fetches gold prices from external APIs and stores them in the database
 * All prices are in USD
 */

interface GoldPriceData {
  pricePerGramUsd: number;
  source: string;
}

/**
 * Fetch gold price in USD per troy ounce from MetalPriceAPI
 * @returns Promise<number> - Gold price in USD per troy ounce
 */
export async function fetchGoldPriceUsd(): Promise<number> {
  const apiKey = process.env.METALPRICE_API_KEY;
  
  if (!apiKey) {
    throw new Error('METALPRICE_API_KEY is not set in environment variables');
  }

  const url = `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=XAU`;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, { 
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Pawnshop-NFT-Backend/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // The API returns something like {"rates": {"XAU": 0.00044}, "base": "USD"}
    const rateXau = data.rates.XAU;
    if (rateXau === 0) {
      throw new Error('Invalid XAU rate (0)');
    }
    
    const goldPriceUsdPerOz = 1.0 / rateXau;
    return goldPriceUsdPerOz;
  } catch (error) {
    console.error('Error fetching gold price from MetalPriceAPI:', error);
    throw new Error(`Failed to fetch gold price: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate gold price in USD per gram
 * @param usdPerOz - Gold price in USD per troy ounce
 * @returns number - Gold price in USD per gram
 */
export function calculateGoldPriceUsdPerGram(usdPerOz: number): number {
  // 1 troy ounce = 31.1034768 grams
  const troyOzToGrams = 31.1034768;
  const usdPerGram = usdPerOz / troyOzToGrams;
  return Math.round(usdPerGram * 100) / 100; // Round to 2 decimal places
}

/**
 * Fetch complete gold price data from external APIs
 * @returns Promise<GoldPriceData> - Complete gold price data (USD only)
 */
export async function fetchGoldPriceData(): Promise<GoldPriceData> {
  try {
    console.log('Fetching gold price data from external APIs...');
    
    const usdPerOz = await fetchGoldPriceUsd();
    const usdPerGram = calculateGoldPriceUsdPerGram(usdPerOz);
    
    console.log(`Gold price data fetched - USD/oz: ${usdPerOz}, USD/gram: ${usdPerGram}`);
    
    return {
      pricePerGramUsd: usdPerGram,
      source: 'api'
    };
  } catch (error) {
    console.error('Error fetching gold price data:', error);
    throw error;
  }
}
