/**
 * Token price proxy — fetches current price, 24h/7d change, and 7-day sparkline
 * from CoinGecko for a list of token symbols supplied as ?symbols=ETH,USDC,...
 *
 * Acts as a proxy so the CoinGecko API key never reaches the browser and so we
 * can set Cache-Control headers on the response (5-minute revalidation window).
 */

const COINGECKO_BASE = 'https://pro-api.coingecko.com/api/v3';

// Hardcoded symbol → CoinGecko ID mapping for common DeFi tokens
const SYMBOL_TO_ID = {
  ETH:    'ethereum',
  WETH:   'weth',
  USDC:   'usd-coin',
  USDT:   'tether',
  DAI:    'dai',
  WBTC:   'wrapped-bitcoin',
  BTC:    'bitcoin',
  SOL:    'solana',
  ARB:    'arbitrum',
  OP:     'optimism',
  MATIC:  'matic-network',
  AVAX:   'avalanche-2',
  BNB:    'binancecoin',
  LINK:   'chainlink',
  UNI:    'uniswap',
  AAVE:   'aave',
  CRV:    'curve-dao-token',
  CVX:    'convex-finance',
  LDO:    'lido-dao',
  GMX:    'gmx',
  PENDLE: 'pendle',
  SNX:    'havven',
  MKR:    'maker',
  COMP:   'compound-governance-token',
  BAL:    'balancer',
  FXS:    'frax-share',
  RPL:    'rocket-pool',
  GNO:    'gnosis',
  SUSHI:  'sushi',
  '1INCH':'1inch',
};

function cgHeaders() {
  return { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY };
}

export default async function handler(req, res) {
  const rawSymbols = req.query?.symbols ?? '';
  const symbols = rawSymbols
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => s && SYMBOL_TO_ID[s]);

  console.log('[token-prices] incoming symbols raw:', rawSymbols);
  console.log('[token-prices] recognised symbols:', symbols);

  if (!symbols.length) {
    console.log('[token-prices] no recognised symbols — returning empty');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({});
  }

  const idToSymbol = {};
  const ids = [];
  for (const sym of symbols) {
    const id = SYMBOL_TO_ID[sym];
    idToSymbol[id] = sym;
    ids.push(id);
  }

  console.log('[token-prices] CoinGecko IDs to fetch:', ids);

  try {
    // Batch price + change data
    const priceUrl = `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true`;
    const priceRes = await fetch(priceUrl, { headers: cgHeaders() });
    if (!priceRes.ok) throw new Error(`CoinGecko price fetch failed: ${priceRes.status}`);
    const priceData = await priceRes.json();

    console.log('[token-prices] CoinGecko price response:', JSON.stringify(priceData));

    // Sparkline data — one request per token, run concurrently
    const sparklineResults = await Promise.allSettled(
      ids.map(id =>
        fetch(
          `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=7&interval=daily`,
          { headers: cgHeaders() }
        )
          .then(r => r.ok ? r.json() : null)
          .then(data => ({
            id,
            sparkline: data?.prices
              ? data.prices.slice(-7).map(([, price]) => price)
              : [],
          }))
          .catch(() => ({ id, sparkline: [] }))
      )
    );

    const sparklineMap = {};
    for (const result of sparklineResults) {
      if (result.status === 'fulfilled') {
        sparklineMap[result.value.id] = result.value.sparkline;
      }
    }

    const output = {};
    for (const id of ids) {
      const sym  = idToSymbol[id];
      const data = priceData[id];
      if (!data) continue;
      output[sym] = {
        price:     data.usd ?? null,
        change24h: data.usd_24h_change ?? null,
        change7d:  data.usd_7d_change  ?? null,
        sparkline: sparklineMap[id] ?? [],
      };
    }

    console.log('[token-prices] final output keys:', Object.keys(output));
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json(output);
  } catch (err) {
    console.error('[token-prices]', err);
    res.status(500).json({ error: err.message });
  }
}
