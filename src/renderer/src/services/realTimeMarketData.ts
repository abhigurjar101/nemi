/**
 * NEMI Real-Time Market Data Service
 *
 * Fetches LIVE prices from:
 *   - CoinGecko public API (crypto: BTC, ETH, SOL) — no API key required
 *   - Yahoo Finance via yfinance-compatible JSON endpoint (stocks: NVDA, SPY, QQQ, TSLA)
 *
 * Features:
 *   - 15-second cache TTL to avoid rate-limiting
 *   - Subscriber pattern for reactive UI updates
 *   - Falls back to last known price if fetch fails
 */

export interface LiveTickerData {
  symbol: string
  price: number
  change24h: number         // percent change in last 24h
  high24h: number
  low24h: number
  volume24hUsd: number
  bid: number
  ask: number
  sparkline?: number[]
  lastUpdated: number       // UTC timestamp ms
  isLive: boolean           // false = fallback/cached data
}

// ─── Fallback / seed prices (updated periodically — used only when APIs fail) ───
const FALLBACK_SEEDS: Record<string, Omit<LiveTickerData, 'lastUpdated' | 'isLive'>> = {
  'BTC/USDT': { symbol: 'BTC/USDT', price: 60000,  change24h: 0, high24h: 61000,  low24h: 59000,  volume24hUsd: 25000000000, bid: 59999, ask: 60001, sparkline: [59200, 59500, 59800, 60100, 59900, 60000] },
  'ETH/USDT': { symbol: 'ETH/USDT', price: 3200,   change24h: 0, high24h: 3250,   low24h: 3150,   volume24hUsd: 12000000000, bid: 3199,  ask: 3201,  sparkline: [3160, 3180, 3210, 3230, 3190, 3200]  },
  'SOL/USDT': { symbol: 'SOL/USDT', price: 140,    change24h: 0, high24h: 145,    low24h: 135,    volume24hUsd: 4000000000,  bid: 139.9, ask: 140.1, sparkline: [136, 138, 141, 142, 139, 140] },
  'NVDA':     { symbol: 'NVDA',     price: 115,    change24h: 0, high24h: 118,    low24h: 112,    volume24hUsd: 30000000000, bid: 114.9, ask: 115.1, sparkline: [113, 114, 115, 116, 114.5, 115] },
  'SPY':      { symbol: 'SPY',      price: 540,    change24h: 0, high24h: 542,    low24h: 538,    volume24hUsd: 50000000000, bid: 539.9, ask: 540.1, sparkline: [538, 539, 540, 541, 539.5, 540] },
  'QQQ':      { symbol: 'QQQ',      price: 460,    change24h: 0, high24h: 462,    low24h: 458,    volume24hUsd: 25000000000, bid: 459.9, ask: 460.1, sparkline: [458, 459, 460, 461, 459.5, 460] },
  'TSLA':     { symbol: 'TSLA',     price: 230,    change24h: 0, high24h: 235,    low24h: 225,    volume24hUsd: 15000000000, bid: 229.9, ask: 230.1, sparkline: [226, 228, 231, 232, 229, 230] },
  'AAPL':     { symbol: 'AAPL',     price: 215,    change24h: 0, high24h: 218,    low24h: 212,    volume24hUsd: 18000000000, bid: 214.9, ask: 215.1, sparkline: [213, 214, 215, 216, 214.5, 215] },
  'MSFT':     { symbol: 'MSFT',     price: 420,    change24h: 0, high24h: 424,    low24h: 416,    volume24hUsd: 22000000000, bid: 419.9, ask: 420.1, sparkline: [417, 418, 420, 422, 419, 420] },
  'AMZN':     { symbol: 'AMZN',     price: 190,    change24h: 0, high24h: 193,    low24h: 187,    volume24hUsd: 12000000000, bid: 189.9, ask: 190.1, sparkline: [188, 189, 190, 191, 189.5, 190] },
}

// CoinGecko IDs for crypto symbols
const COINGECKO_IDS: Record<string, string> = {
  'BTC/USDT': 'bitcoin',
  'ETH/USDT': 'ethereum',
  'SOL/USDT': 'solana',
}

// Yahoo Finance ticker map (strips /USDT)
const YAHOO_TICKERS: Record<string, string> = {
  'NVDA': 'NVDA',
  'SPY':  'SPY',
  'QQQ':  'QQQ',
  'TSLA': 'TSLA',
  'AAPL': 'AAPL',
  'MSFT': 'MSFT',
  'AMZN': 'AMZN',
}

const CACHE_TTL_MS = 15_000 // 15 seconds
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

class RealTimeMarketDataService {
  private cache = new Map<string, LiveTickerData>()
  private lastFetchAttempt = 0
  private fetchInFlight = false
  private subscribers = new Set<(data: Map<string, LiveTickerData>) => void>()
  private pollTimer: ReturnType<typeof setInterval> | null = null

  /** Returns cached or freshly fetched data for a single ticker */
  async getLivePrice(symbol: string): Promise<LiveTickerData> {
    const cached = this.cache.get(symbol)
    if (cached && Date.now() - cached.lastUpdated < CACHE_TTL_MS) {
      return cached
    }
    await this.fetchAllPrices()
    return this.cache.get(symbol) || this.seedFallback(symbol)
  }

  /** Force bypass cache and get fresh live market data */
  async forceRefresh(): Promise<Map<string, LiveTickerData>> {
    this.lastFetchAttempt = 0
    return this.fetchAllPrices(true)
  }

  /**
   * Fetches latest prices for all tracked symbols.
   * Runs every 15 seconds. Fills this.cache.
   */
  async fetchAllPrices(force = false): Promise<Map<string, LiveTickerData>> {
    if (this.fetchInFlight) return this.cache
    if (!force && Date.now() - this.lastFetchAttempt < CACHE_TTL_MS) return this.cache

    this.fetchInFlight = true
    this.lastFetchAttempt = Date.now()

    try {
      // 1. Primary & most reliable: Serverless /api/trade endpoint (same-origin on web, no CORS/mixed content issues)
      const tradeApiSuccess = await this._fetchFromTradeApi()
      if (tradeApiSuccess) {
        this._notifySubscribers()
        return this.cache
      }

      // 2. Direct client-side fallbacks (Binance/CoinGecko public API + Yahoo query2)
      await Promise.allSettled([
        this._fetchCryptoFromBinance().catch(() => this._fetchCryptoFromCoinGecko()),
        this._fetchStocksFromYahoo(),
      ])
      this._notifySubscribers()
    } catch (err) {
      console.warn('[NEMI MarketData] Fetch failed, using fallback:', err)
    } finally {
      this.fetchInFlight = false
    }

    return this.cache
  }

  /** Subscribe to price updates. Returns unsubscribe fn. */
  subscribe(callback: (data: Map<string, LiveTickerData>) => void): () => void {
    this.subscribers.add(callback)
    // Start polling if not already running
    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => {
        this.fetchAllPrices().catch(() => {})
      }, CACHE_TTL_MS)
    }
    return () => {
      this.subscribers.delete(callback)
      if (this.subscribers.size === 0 && this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    }
  }

  /** Returns snapshot of current cache (all tickers as plain object) */
  getCachedSnapshot(): Record<string, LiveTickerData> {
    const result: Record<string, LiveTickerData> = {}
    for (const [sym, data] of this.cache.entries()) {
      result[sym] = data
    }
    // Fill any missing tickers with fallback seeds
    for (const sym of Object.keys(FALLBACK_SEEDS)) {
      if (!result[sym]) {
        result[sym] = this.seedFallback(sym)
      }
    }
    return result
  }

  /** Builds a concise text block for injection into NEMI's system prompt */
  buildMarketContextBlock(): string {
    const now = new Date()
    const utcStr = now.toUTCString()
    const snapshot = this.getCachedSnapshot()

    const tickers = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'NVDA', 'SPY', 'QQQ', 'TSLA', 'AAPL', 'MSFT']
    const lines = tickers.map((sym) => {
      const d = snapshot[sym]
      if (!d) return `- ${sym}: N/A`
      const changeStr = d.change24h >= 0 ? `+${d.change24h.toFixed(2)}%` : `${d.change24h.toFixed(2)}%`
      const liveTag = d.isLive ? '🟢 LIVE' : '🟡 CACHED'
      return `- ${sym}: $${d.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (24h: ${changeStr}) [${liveTag}]`
    })

    return `\n\n=== REAL-TIME MARKET DATA (${utcStr}) ===\nThe following prices are fetched live at the time of this message. Use ONLY these prices for any market analysis. Do NOT use prices from training data.\n${lines.join('\n')}\n=== END REAL-TIME MARKET DATA ===`
  }

  // ─── Private Fetch Methods ────────────────────────────────────────────────

  /** Primary fetcher: queries serverless /api/trade endpoint (same-origin on web or https://nemio.in) */
  private async _fetchFromTradeApi(): Promise<boolean> {
    try {
      const isBrowser = typeof window !== 'undefined'
      const urls = isBrowser
        ? ['/api/trade', 'https://nemio.in/api/trade']
        : ['https://nemio.in/api/trade']

      for (const url of urls) {
        try {
          const resp = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(6000),
          })
          if (!resp.ok) continue

          const json = await resp.json()
          const tickers = json?.tickers
          if (tickers && typeof tickers === 'object' && Object.keys(tickers).length > 0) {
            for (const [sym, t] of Object.entries(tickers)) {
              const d = t as any
              if (!d?.price) continue
              this.cache.set(sym, {
                symbol: sym,
                price: Number(d.price),
                change24h: Number(d.change24h ?? 0),
                high24h: Number(d.high24h ?? d.price * 1.01),
                low24h: Number(d.low24h ?? d.price * 0.99),
                volume24hUsd: Number(d.volume24hUsd ?? 0),
                bid: Number(d.bid ?? d.price * 0.9999),
                ask: Number(d.ask ?? d.price * 1.0001),
                sparkline: Array.isArray(d.sparkline) ? d.sparkline.map(Number) : undefined,
                lastUpdated: Date.now(),
                isLive: d.isLive !== false,
              })
            }
            return true
          }
        } catch {
          // try next URL
        }
      }
    } catch {
      // ignore
    }
    return false
  }

  private async _fetchCryptoFromBinance(): Promise<void> {
    const symMap: Record<string, string> = {
      'BTCUSDT': 'BTC/USDT',
      'ETHUSDT': 'ETH/USDT',
      'SOLUSDT': 'SOL/USDT',
    }
    const symbols = encodeURIComponent(JSON.stringify(Object.keys(symMap)))
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}`

    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })

    if (!resp.ok) throw new Error(`Binance HTTP ${resp.status}`)

    const data: Array<{
      symbol: string
      lastPrice: string
      priceChangePercent: string
      highPrice: string
      lowPrice: string
      quoteVolume: string
      bidPrice: string
      askPrice: string
    }> = await resp.json()

    for (const item of data) {
      const sym = symMap[item.symbol]
      if (!sym) continue
      const price = parseFloat(item.lastPrice)
      if (isNaN(price) || price <= 0) continue

      this.cache.set(sym, {
        symbol: sym,
        price,
        change24h: parseFloat(item.priceChangePercent) || 0,
        high24h: parseFloat(item.highPrice) || price * 1.01,
        low24h: parseFloat(item.lowPrice) || price * 0.99,
        volume24hUsd: parseFloat(item.quoteVolume) || 0,
        bid: parseFloat(item.bidPrice) || price * 0.9999,
        ask: parseFloat(item.askPrice) || price * 1.0001,
        lastUpdated: Date.now(),
        isLive: true,
      })
    }
  }

  private async _fetchCryptoFromCoinGecko(): Promise<void> {
    const ids = Object.values(COINGECKO_IDS).join(',')
    const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`

    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!resp.ok) {
      throw new Error(`CoinGecko HTTP ${resp.status}`)
    }

    const data: Array<{
      id: string
      current_price: number
      price_change_percentage_24h: number
      high_24h: number
      low_24h: number
      total_volume: number
    }> = await resp.json()

    const idToSymbol = Object.fromEntries(
      Object.entries(COINGECKO_IDS).map(([sym, id]) => [id, sym])
    )

    for (const coin of data) {
      const symbol = idToSymbol[coin.id]
      if (!symbol) continue
      const price = coin.current_price
      const spread = price * 0.0001 // 0.01% spread
      this.cache.set(symbol, {
        symbol,
        price,
        change24h: coin.price_change_percentage_24h ?? 0,
        high24h: coin.high_24h ?? price * 1.01,
        low24h: coin.low_24h ?? price * 0.99,
        volume24hUsd: coin.total_volume ?? 0,
        bid: price - spread,
        ask: price + spread,
        lastUpdated: Date.now(),
        isLive: true,
      })
    }
  }

  private async _fetchStocksFromYahoo(): Promise<void> {
    // Primary: local Python trader server (yfinance, most reliable in desktop mode)
    try {
      await this._fetchStocksFromTraderServer()
      return
    } catch {
      // Fallback to public market data APIs
    }

    // Fallback 1: Twelve Data
    try {
      await this._fetchStocksTwelveData()
      return
    } catch {
      // continue to next fallback
    }

    // Fallback 2: Yahoo Finance query2 spark endpoint
    const symbols = Object.values(YAHOO_TICKERS).join(',')
    const url = `https://query2.finance.yahoo.com/v8/finance/spark?symbols=${symbols}&range=1d&interval=60m`

    try {
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(8000),
      })

      if (!resp.ok) throw new Error(`Yahoo HTTP ${resp.status}`)

      const raw = (await resp.json()) as Record<
        string,
        {
          symbol?: string
          previousClose?: number
          close?: number[]
          timestamp?: number[]
        }
      >

      for (const [sym, item] of Object.entries(raw)) {
        if (!item) continue
        const internalSym = Object.entries(YAHOO_TICKERS).find(([, v]) => v === sym)?.[0] || sym
        const closes = (item.close || []).filter((c): c is number => typeof c === 'number' && !isNaN(c))
        const prev = item.previousClose || (closes[0] ?? 100)
        const price = closes.length > 0 ? closes[closes.length - 1] : prev
        const change24h = prev ? Number((((price - prev) / prev) * 100).toFixed(2)) : 0
        const spread = price * 0.0001
        const dayHigh = closes.length > 0 ? Math.max(...closes) : price * 1.01
        const dayLow = closes.length > 0 ? Math.min(...closes) : price * 0.99
        const vol = 25_000_000

        this.cache.set(internalSym, {
          symbol: internalSym,
          price: Number(price.toFixed(2)),
          change24h,
          high24h: Number(dayHigh.toFixed(2)),
          low24h: Number(dayLow.toFixed(2)),
          volume24hUsd: vol * price,
          bid: Number((price - spread).toFixed(2)),
          ask: Number((price + spread).toFixed(2)),
          lastUpdated: Date.now(),
          isLive: true,
        })
      }
    } catch {
      // ignore
    }
  }


  private async _fetchStocksFromTraderServer(): Promise<void> {
    // Use dedicated /market/live-prices endpoint (uses yfinance, most accurate)
    const stockSymbols = Object.values(YAHOO_TICKERS).join(',')
    const resp = await fetch(`http://localhost:8000/market/live-prices?symbols=${stockSymbols}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!resp.ok) throw new Error(`Trader server HTTP ${resp.status}`)
    const data = await resp.json()
    const prices: Record<string, {
      symbol: string; price: number; change24h: number;
      high24h: number; low24h: number; volume24hUsd: number;
      bid: number; ask: number; isLive: boolean;
    }> = data?.prices || {}

    for (const [sym, info] of Object.entries(prices)) {
      if (!info.price || info.price <= 0) continue
      const internalSym = Object.entries(YAHOO_TICKERS).find(([, v]) => v === sym)?.[0] || sym
      this.cache.set(internalSym, {
        symbol: internalSym,
        price: info.price,
        change24h: info.change24h ?? 0,
        high24h: info.high24h ?? info.price * 1.01,
        low24h: info.low24h ?? info.price * 0.99,
        volume24hUsd: info.volume24hUsd ?? 0,
        bid: info.bid ?? info.price * 0.9999,
        ask: info.ask ?? info.price * 1.0001,
        lastUpdated: Date.now(),
        isLive: true,
      })
    }
  }

  private async _fetchStocksTwelveData(): Promise<void> {
    // Twelve Data free tier — no API key needed for up to 8 symbols/min (basic)
    // Note: Free tier may return delayed data (15 min delay for US stocks)
    const symbols = Object.values(YAHOO_TICKERS).slice(0, 5).join(',')  // limit to 5 to stay in free tier
    const url = `https://api.twelvedata.com/price?symbol=${symbols}&format=JSON`

    const resp = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) throw new Error(`TwelveData HTTP ${resp.status}`)

    const raw = await resp.json() as Record<string, { price?: string; status?: string }>

    for (const [sym, result] of Object.entries(raw)) {
      if (!result?.price || result.status === 'error') continue
      const price = parseFloat(result.price)
      if (isNaN(price) || price <= 0) continue

      const internalSym = Object.entries(YAHOO_TICKERS).find(([, v]) => v === sym)?.[0] || sym
      const spread = price * 0.0001
      const existing = this.cache.get(internalSym)
      this.cache.set(internalSym, {
        symbol: internalSym,
        price,
        change24h: existing?.change24h ?? 0,
        high24h: existing?.high24h ?? price * 1.01,
        low24h: existing?.low24h ?? price * 0.99,
        volume24hUsd: existing?.volume24hUsd ?? 0,
        bid: Number((price - spread).toFixed(4)),
        ask: Number((price + spread).toFixed(4)),
        lastUpdated: Date.now(),
        isLive: true,
      })
    }
  }


  private async _fetchStocksYahooQuote(): Promise<void> {
    // Yahoo Finance v7 quote endpoint (final fallback)
    for (const [internalSym, yahooSym] of Object.entries(YAHOO_TICKERS)) {
      try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSym}`
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
        })
        if (!resp.ok) continue
        const raw = await resp.json()
        const quote = raw?.quoteResponse?.result?.[0]
        if (!quote?.regularMarketPrice) continue

        const price = quote.regularMarketPrice
        const spread = price * 0.0001
        this.cache.set(internalSym, {
          symbol: internalSym,
          price,
          change24h: quote.regularMarketChangePercent ?? 0,
          high24h: quote.regularMarketDayHigh ?? price * 1.01,
          low24h: quote.regularMarketDayLow ?? price * 0.99,
          volume24hUsd: (quote.regularMarketVolume ?? 0) * price,
          bid: price - spread,
          ask: price + spread,
          lastUpdated: Date.now(),
          isLive: true,
        })
      } catch {
        // silently skip
      }
    }
  }

  private seedFallback(symbol: string): LiveTickerData {
    const seed = FALLBACK_SEEDS[symbol]
    if (seed) {
      return { ...seed, lastUpdated: 0, isLive: false }
    }
    return {
      symbol,
      price: 0,
      change24h: 0,
      high24h: 0,
      low24h: 0,
      volume24hUsd: 0,
      bid: 0,
      ask: 0,
      lastUpdated: 0,
      isLive: false,
    }
  }

  private _notifySubscribers(): void {
    for (const cb of this.subscribers) {
      try { cb(this.cache) } catch {}
    }
  }
}

// Singleton instance
export const realTimeMarketData = new RealTimeMarketDataService()

// Convenience hook-friendly function
export async function getLivePrice(symbol: string): Promise<number> {
  const data = await realTimeMarketData.getLivePrice(symbol)
  return data.price
}
