/**
 * Token price proxy — fetches current price, 24h/7d change, and 7-day sparkline
 * from CoinGecko for a list of token symbols supplied as ?symbols=ETH,USDC,...
 *
 * Acts as a proxy so the CoinGecko API key never reaches the browser and so we
 * can set Cache-Control headers on the response (5-minute revalidation window).
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Hardcoded symbol → CoinGecko ID mapping for common DeFi tokens
const SYMBOL_TO_ID = {
  // Blue chips
  ETH:    'ethereum',
  WETH:   'weth',
  BTC:    'bitcoin',
  WBTC:   'wrapped-bitcoin',
  CBBTC:  'coinbase-wrapped-btc',
  SOL:    'solana',
  BNB:    'binancecoin',

  // Stablecoins
  USDC:   'usd-coin',
  USDT:   'tether',
  DAI:    'dai',
  FRAX:   'frax',
  CRVUSD: 'crvusd',
  USDE:   'ethena-usde',
  SUSDE:  'ethena-staked-usde',
  PYUSD:  'paypal-usd',
  GHO:    'gho',
  EURC:   'euro-coin',

  // Liquid staking / restaking
  WSTETH: 'wrapped-steth',
  RETH:   'rocket-pool-eth',
  WEETH:  'wrapped-eeth',
  OSETH:  'stakewise-v3-oseth',
  EZETH:  'renzo-restaked-eth',
  RSETH:  'kelp-dao-restaked-eth',

  // L2 / chains
  ARB:    'arbitrum',
  OP:     'optimism',
  MATIC:  'matic-network',
  POL:    'matic-network',
  AVAX:   'avalanche-2',
  FTM:    'fantom',
  METIS:  'metis-token',
  STRK:   'starknet',
  MANTA:  'manta-network',

  // Solana ecosystem
  JTO:    'jito-governance-token',
  JUP:    'jupiter-exchange-solana',
  ORCA:   'orca',
  RAY:    'raydium',
  BONK:   'bonk',
  WIF:    'dogwifcoin',

  // DeFi protocols
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
  BLUR:   'blur',

  // Other
  WTAO:   'bittensor',
  INJ:    'injective-protocol',
  TIA:    'celestia',
  REI:    'rei-network',
};

function cgHeaders() {
  // Only attach the key header when one is actually configured — sending a
  // literal "undefined" string causes CoinGecko to silently fall back to the
  // (much more rate-limited) anonymous tier instead of rejecting outright.
  const key = process.env.COINGECKO_API_KEY;
  return key ? { 'x-cg-demo-api-key': key } : {};
}

export default async function handler(req, res) {
  const rawSymbols = req.query?.symbols ?? '';
  const symbols = rawSymbols
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => s && SYMBOL_TO_ID[s]);

  if (!symbols.length) {
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

  try {
    // Price, 24h/7d change, and the 7-day sparkline all come back in this one
    // call. Previously sparklines were fetched with a separate request per
    // token, fired concurrently — that fan-out routinely tripped CoinGecko's
    // rate limit, and a rate-limited sparkline request was silently turned
    // into an empty array (`r.ok ? r.json() : null` → `[]`), which is what
    // produced the intermittent "—" sparklines. Folding everything into a
    // single /coins/markets call removes the fan-out entirely.
    const marketsUrl =
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(',')}` +
      `&sparkline=true&price_change_percentage=24h,7d`;
    const marketsRes = await fetch(marketsUrl, { headers: cgHeaders() });
    if (!marketsRes.ok) throw new Error(`CoinGecko markets fetch failed: ${marketsRes.status}`);
    const marketsData = await marketsRes.json();

    const output = {};
    for (const entry of marketsData) {
      const sym = idToSymbol[entry.id];
      if (!sym) continue;
      const sparkline = Array.isArray(entry.sparkline_in_7d?.price)
        ? entry.sparkline_in_7d.price
        : [];
      output[sym] = {
        price:     entry.current_price ?? null,
        change24h: entry.price_change_percentage_24h_in_currency ?? null,
        change7d:  entry.price_change_percentage_7d_in_currency  ?? null,
        sparkline,
      };
    }

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json(output);
  } catch (err) {
    console.error('[token-prices]', err);
    res.status(500).json({ error: err.message });
  }
}
