/**
 * AlphaVantage MCP Client - Financial data via Model Context Protocol
 *
 * Provides access to real-time and historical financial data through
 * the AlphaVantage MCP server for due diligence research.
 *
 * Available data categories:
 * - Core Stock APIs (quotes, time series)
 * - Fundamental Data (financials, company overview)
 * - Alpha Intelligence (news, sentiment, insider transactions)
 * - Economic Indicators (GDP, CPI, rates)
 * - Technical Indicators (SMA, RSI, MACD, etc.)
 */

// AlphaVantage MCP Client - Types and Implementation

/**
 * AlphaVantage MCP configuration
 */
export interface AlphaVantageMCPConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * MCP JSON-RPC request format
 */
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP JSON-RPC response format
 */
interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Stock quote data
 */
export interface StockQuote {
  symbol: string;
  open: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  latestTradingDay: string;
  previousClose: number;
  change: number;
  changePercent: string;
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number | undefined;
  dividendAmount?: number | undefined;
  splitCoefficient?: number | undefined;
}

/**
 * Company overview/fundamentals
 */
export interface CompanyOverview {
  symbol: string;
  name: string;
  description: string;
  exchange: string;
  currency: string;
  country: string;
  sector: string;
  industry: string;
  marketCapitalization: number;
  peRatio: number;
  pegRatio: number;
  bookValue: number;
  dividendPerShare: number;
  dividendYield: number;
  eps: number;
  revenuePerShareTTM: number;
  profitMargin: number;
  operatingMarginTTM: number;
  returnOnAssetsTTM: number;
  returnOnEquityTTM: number;
  revenueTTM: number;
  grossProfitTTM: number;
  dilutedEPSTTM: number;
  quarterlyEarningsGrowthYOY: number;
  quarterlyRevenueGrowthYOY: number;
  analystTargetPrice: number;
  trailingPE: number;
  forwardPE: number;
  priceToSalesRatioTTM: number;
  priceToBookRatio: number;
  evToRevenue: number;
  evToEBITDA: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyDayMovingAverage: number;
  twoHundredDayMovingAverage: number;
  sharesOutstanding: number;
  dividendDate: string;
  exDividendDate: string;
}

/**
 * Income statement data
 */
export interface IncomeStatement {
  fiscalDateEnding: string;
  reportedCurrency: string;
  grossProfit: number;
  totalRevenue: number;
  costOfRevenue: number;
  costofGoodsAndServicesSold: number;
  operatingIncome: number;
  sellingGeneralAndAdministrative: number;
  researchAndDevelopment: number;
  operatingExpenses: number;
  investmentIncomeNet: number;
  netInterestIncome: number;
  interestIncome: number;
  interestExpense: number;
  nonInterestIncome: number;
  otherNonOperatingIncome: number;
  depreciation: number;
  depreciationAndAmortization: number;
  incomeBeforeTax: number;
  incomeTaxExpense: number;
  interestAndDebtExpense: number;
  netIncomeFromContinuingOperations: number;
  comprehensiveIncomeNetOfTax: number;
  ebit: number;
  ebitda: number;
  netIncome: number;
}

/**
 * Balance sheet data
 */
export interface BalanceSheet {
  fiscalDateEnding: string;
  reportedCurrency: string;
  totalAssets: number;
  totalCurrentAssets: number;
  cashAndCashEquivalentsAtCarryingValue: number;
  cashAndShortTermInvestments: number;
  inventory: number;
  currentNetReceivables: number;
  totalNonCurrentAssets: number;
  propertyPlantEquipment: number;
  accumulatedDepreciationAmortizationPPE: number;
  intangibleAssets: number;
  intangibleAssetsExcludingGoodwill: number;
  goodwill: number;
  investments: number;
  longTermInvestments: number;
  shortTermInvestments: number;
  otherCurrentAssets: number;
  otherNonCurrentAssets: number;
  totalLiabilities: number;
  totalCurrentLiabilities: number;
  currentAccountsPayable: number;
  deferredRevenue: number;
  currentDebt: number;
  shortTermDebt: number;
  totalNonCurrentLiabilities: number;
  capitalLeaseObligations: number;
  longTermDebt: number;
  currentLongTermDebt: number;
  longTermDebtNoncurrent: number;
  shortLongTermDebtTotal: number;
  otherCurrentLiabilities: number;
  otherNonCurrentLiabilities: number;
  totalShareholderEquity: number;
  treasuryStock: number;
  retainedEarnings: number;
  commonStock: number;
  commonStockSharesOutstanding: number;
}

/**
 * Cash flow statement data
 */
export interface CashFlowStatement {
  fiscalDateEnding: string;
  reportedCurrency: string;
  operatingCashflow: number;
  paymentsForOperatingActivities: number;
  proceedsFromOperatingActivities: number;
  changeInOperatingLiabilities: number;
  changeInOperatingAssets: number;
  depreciationDepletionAndAmortization: number;
  capitalExpenditures: number;
  changeInReceivables: number;
  changeInInventory: number;
  profitLoss: number;
  cashflowFromInvestment: number;
  cashflowFromFinancing: number;
  proceedsFromRepaymentsOfShortTermDebt: number;
  paymentsForRepurchaseOfCommonStock: number;
  paymentsForRepurchaseOfEquity: number;
  paymentsForRepurchaseOfPreferredStock: number;
  dividendPayout: number;
  dividendPayoutCommonStock: number;
  dividendPayoutPreferredStock: number;
  proceedsFromIssuanceOfCommonStock: number;
  proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet: number;
  proceedsFromIssuanceOfPreferredStock: number;
  proceedsFromRepurchaseOfEquity: number;
  proceedsFromSaleOfTreasuryStock: number;
  changeInCashAndCashEquivalents: number;
  changeInExchangeRate: number;
  netIncome: number;
}

/**
 * News and sentiment data
 */
export interface NewsArticle {
  title: string;
  url: string;
  timePublished: string;
  authors: string[];
  summary: string;
  bannerImage?: string;
  source: string;
  categoryWithinSource: string;
  sourceDomain: string;
  topics: Array<{
    topic: string;
    relevanceScore: string;
  }>;
  overallSentimentScore: number;
  overallSentimentLabel: string;
  tickerSentiment: Array<{
    ticker: string;
    relevanceScore: string;
    tickerSentimentScore: string;
    tickerSentimentLabel: string;
  }>;
}

/**
 * Insider transaction data
 */
export interface InsiderTransaction {
  symbol: string;
  filingDate: string;
  transactionDate: string;
  reportingName: string;
  transactionType: string;
  sharesTraded: number;
  price: number;
  sharesOwned: number;
}

/**
 * Economic indicator data point
 */
export interface EconomicDataPoint {
  date: string;
  value: number;
}

/**
 * Technical indicator result
 */
export interface TechnicalIndicatorResult {
  symbol: string;
  indicator: string;
  interval: string;
  data: Array<{
    date: string;
    value: number;
    [key: string]: string | number;
  }>;
}

/**
 * Earnings data
 */
export interface EarningsData {
  symbol: string;
  annualEarnings: Array<{
    fiscalDateEnding: string;
    reportedEPS: number;
  }>;
  quarterlyEarnings: Array<{
    fiscalDateEnding: string;
    reportedDate: string;
    reportedEPS: number;
    estimatedEPS: number;
    surprise: number;
    surprisePercentage: number;
  }>;
}

/**
 * Top gainers/losers data
 */
export interface MarketMovers {
  topGainers: Array<{
    ticker: string;
    price: string;
    changeAmount: string;
    changePercentage: string;
    volume: string;
  }>;
  topLosers: Array<{
    ticker: string;
    price: string;
    changeAmount: string;
    changePercentage: string;
    volume: string;
  }>;
  mostActivelyTraded: Array<{
    ticker: string;
    price: string;
    changeAmount: string;
    changePercentage: string;
    volume: string;
  }>;
}

/**
 * AlphaVantage MCP Client
 */
export class AlphaVantageMCPClient {
  private config: Required<AlphaVantageMCPConfig>;
  private requestId = 0;

  constructor(config: AlphaVantageMCPConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? 'https://mcp.alphavantage.co',
      timeout: config.timeout ?? 30000,
    };

    if (!this.config.apiKey) {
      console.warn('[AlphaVantageMCP] No API key configured');
    }
  }

  /**
   * Get the MCP endpoint URL
   */
  private getMCPUrl(): string {
    return `${this.config.baseUrl}/mcp?apikey=${this.config.apiKey}`;
  }

  /**
   * Make an MCP tool call
   */
  private async callTool<T>(toolName: string, args: Record<string, unknown> = {}): Promise<T> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(this.getMCPUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AlphaVantage MCP error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as MCPResponse<T>;

      if (data.error) {
        throw new Error(`MCP error: ${data.error.message} (code: ${data.error.code})`);
      }

      return data.result as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AlphaVantage MCP request timed out');
      }
      throw error;
    }
  }

  /**
   * Parse numeric values from AlphaVantage response
   */
  private parseNumber(value: string | number | undefined): number {
    if (value === undefined || value === 'None' || value === '-') return 0;
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  // ==================== CORE STOCK APIs ====================

  /**
   * Get real-time stock quote
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    const result = await this.callTool<Record<string, unknown>>('get_quote', { symbol });

    const quote = result['Global Quote'] as Record<string, string> ?? result;
    return {
      symbol: quote['01. symbol'] ?? symbol,
      open: this.parseNumber(quote['02. open']),
      high: this.parseNumber(quote['03. high']),
      low: this.parseNumber(quote['04. low']),
      price: this.parseNumber(quote['05. price']),
      volume: this.parseNumber(quote['06. volume']),
      latestTradingDay: quote['07. latest trading day'] ?? '',
      previousClose: this.parseNumber(quote['08. previous close']),
      change: this.parseNumber(quote['09. change']),
      changePercent: quote['10. change percent'] ?? '0%',
    };
  }

  /**
   * Get daily time series data
   */
  async getDailyTimeSeries(
    symbol: string,
    options?: { outputSize?: 'compact' | 'full'; adjusted?: boolean }
  ): Promise<TimeSeriesDataPoint[]> {
    const toolName = options?.adjusted ? 'get_time_series_daily_adjusted' : 'get_time_series_daily';
    const result = await this.callTool<Record<string, unknown>>(toolName, {
      symbol,
      outputsize: options?.outputSize ?? 'compact',
    });

    const timeSeriesKey = options?.adjusted
      ? 'Time Series (Daily)'
      : 'Time Series (Daily)';
    const timeSeries = result[timeSeriesKey] as Record<string, Record<string, string>> ?? {};

    return Object.entries(timeSeries).map(([date, values]) => ({
      date,
      open: this.parseNumber(values['1. open']),
      high: this.parseNumber(values['2. high']),
      low: this.parseNumber(values['3. low']),
      close: this.parseNumber(values['4. close']),
      volume: this.parseNumber(values['5. volume'] ?? values['6. volume']),
      adjustedClose: options?.adjusted ? this.parseNumber(values['5. adjusted close']) : undefined,
      dividendAmount: options?.adjusted ? this.parseNumber(values['7. dividend amount']) : undefined,
      splitCoefficient: options?.adjusted ? this.parseNumber(values['8. split coefficient']) : undefined,
    }));
  }

  /**
   * Get weekly time series data
   */
  async getWeeklyTimeSeries(
    symbol: string,
    options?: { adjusted?: boolean }
  ): Promise<TimeSeriesDataPoint[]> {
    const toolName = options?.adjusted ? 'get_time_series_weekly_adjusted' : 'get_time_series_weekly';
    const result = await this.callTool<Record<string, unknown>>(toolName, { symbol });

    const timeSeriesKey = options?.adjusted
      ? 'Weekly Adjusted Time Series'
      : 'Weekly Time Series';
    const timeSeries = result[timeSeriesKey] as Record<string, Record<string, string>> ?? {};

    return Object.entries(timeSeries).map(([date, values]) => ({
      date,
      open: this.parseNumber(values['1. open']),
      high: this.parseNumber(values['2. high']),
      low: this.parseNumber(values['3. low']),
      close: this.parseNumber(values['4. close']),
      volume: this.parseNumber(values['5. volume'] ?? values['6. volume']),
      adjustedClose: options?.adjusted ? this.parseNumber(values['5. adjusted close']) : undefined,
      dividendAmount: options?.adjusted ? this.parseNumber(values['7. dividend amount']) : undefined,
    }));
  }

  /**
   * Search for stock symbols
   */
  async searchSymbol(keywords: string): Promise<Array<{
    symbol: string;
    name: string;
    type: string;
    region: string;
    marketOpen: string;
    marketClose: string;
    timezone: string;
    currency: string;
    matchScore: string;
  }>> {
    const result = await this.callTool<Record<string, unknown>>('search_symbols', { keywords });
    const matches = result['bestMatches'] as Array<Record<string, string>> ?? [];

    return matches.map((match) => ({
      symbol: match['1. symbol'] ?? '',
      name: match['2. name'] ?? '',
      type: match['3. type'] ?? '',
      region: match['4. region'] ?? '',
      marketOpen: match['5. marketOpen'] ?? '',
      marketClose: match['6. marketClose'] ?? '',
      timezone: match['7. timezone'] ?? '',
      currency: match['8. currency'] ?? '',
      matchScore: match['9. matchScore'] ?? '',
    }));
  }

  // ==================== FUNDAMENTAL DATA ====================

  /**
   * Get company overview with key fundamentals
   */
  async getCompanyOverview(symbol: string): Promise<CompanyOverview> {
    const result = await this.callTool<Record<string, string>>('get_company_overview', { symbol });

    return {
      symbol: result['Symbol'] ?? symbol,
      name: result['Name'] ?? '',
      description: result['Description'] ?? '',
      exchange: result['Exchange'] ?? '',
      currency: result['Currency'] ?? '',
      country: result['Country'] ?? '',
      sector: result['Sector'] ?? '',
      industry: result['Industry'] ?? '',
      marketCapitalization: this.parseNumber(result['MarketCapitalization']),
      peRatio: this.parseNumber(result['PERatio']),
      pegRatio: this.parseNumber(result['PEGRatio']),
      bookValue: this.parseNumber(result['BookValue']),
      dividendPerShare: this.parseNumber(result['DividendPerShare']),
      dividendYield: this.parseNumber(result['DividendYield']),
      eps: this.parseNumber(result['EPS']),
      revenuePerShareTTM: this.parseNumber(result['RevenuePerShareTTM']),
      profitMargin: this.parseNumber(result['ProfitMargin']),
      operatingMarginTTM: this.parseNumber(result['OperatingMarginTTM']),
      returnOnAssetsTTM: this.parseNumber(result['ReturnOnAssetsTTM']),
      returnOnEquityTTM: this.parseNumber(result['ReturnOnEquityTTM']),
      revenueTTM: this.parseNumber(result['RevenueTTM']),
      grossProfitTTM: this.parseNumber(result['GrossProfitTTM']),
      dilutedEPSTTM: this.parseNumber(result['DilutedEPSTTM']),
      quarterlyEarningsGrowthYOY: this.parseNumber(result['QuarterlyEarningsGrowthYOY']),
      quarterlyRevenueGrowthYOY: this.parseNumber(result['QuarterlyRevenueGrowthYOY']),
      analystTargetPrice: this.parseNumber(result['AnalystTargetPrice']),
      trailingPE: this.parseNumber(result['TrailingPE']),
      forwardPE: this.parseNumber(result['ForwardPE']),
      priceToSalesRatioTTM: this.parseNumber(result['PriceToSalesRatioTTM']),
      priceToBookRatio: this.parseNumber(result['PriceToBookRatio']),
      evToRevenue: this.parseNumber(result['EVToRevenue']),
      evToEBITDA: this.parseNumber(result['EVToEBITDA']),
      beta: this.parseNumber(result['Beta']),
      fiftyTwoWeekHigh: this.parseNumber(result['52WeekHigh']),
      fiftyTwoWeekLow: this.parseNumber(result['52WeekLow']),
      fiftyDayMovingAverage: this.parseNumber(result['50DayMovingAverage']),
      twoHundredDayMovingAverage: this.parseNumber(result['200DayMovingAverage']),
      sharesOutstanding: this.parseNumber(result['SharesOutstanding']),
      dividendDate: result['DividendDate'] ?? '',
      exDividendDate: result['ExDividendDate'] ?? '',
    };
  }

  /**
   * Get income statements
   */
  async getIncomeStatement(symbol: string): Promise<{
    annual: IncomeStatement[];
    quarterly: IncomeStatement[];
  }> {
    const result = await this.callTool<Record<string, unknown>>('get_income_statement', { symbol });

    const parseStatement = (data: Record<string, string>): IncomeStatement => ({
      fiscalDateEnding: data['fiscalDateEnding'] ?? '',
      reportedCurrency: data['reportedCurrency'] ?? '',
      grossProfit: this.parseNumber(data['grossProfit']),
      totalRevenue: this.parseNumber(data['totalRevenue']),
      costOfRevenue: this.parseNumber(data['costOfRevenue']),
      costofGoodsAndServicesSold: this.parseNumber(data['costofGoodsAndServicesSold']),
      operatingIncome: this.parseNumber(data['operatingIncome']),
      sellingGeneralAndAdministrative: this.parseNumber(data['sellingGeneralAndAdministrative']),
      researchAndDevelopment: this.parseNumber(data['researchAndDevelopment']),
      operatingExpenses: this.parseNumber(data['operatingExpenses']),
      investmentIncomeNet: this.parseNumber(data['investmentIncomeNet']),
      netInterestIncome: this.parseNumber(data['netInterestIncome']),
      interestIncome: this.parseNumber(data['interestIncome']),
      interestExpense: this.parseNumber(data['interestExpense']),
      nonInterestIncome: this.parseNumber(data['nonInterestIncome']),
      otherNonOperatingIncome: this.parseNumber(data['otherNonOperatingIncome']),
      depreciation: this.parseNumber(data['depreciation']),
      depreciationAndAmortization: this.parseNumber(data['depreciationAndAmortization']),
      incomeBeforeTax: this.parseNumber(data['incomeBeforeTax']),
      incomeTaxExpense: this.parseNumber(data['incomeTaxExpense']),
      interestAndDebtExpense: this.parseNumber(data['interestAndDebtExpense']),
      netIncomeFromContinuingOperations: this.parseNumber(data['netIncomeFromContinuingOperations']),
      comprehensiveIncomeNetOfTax: this.parseNumber(data['comprehensiveIncomeNetOfTax']),
      ebit: this.parseNumber(data['ebit']),
      ebitda: this.parseNumber(data['ebitda']),
      netIncome: this.parseNumber(data['netIncome']),
    });

    return {
      annual: ((result['annualReports'] ?? []) as Record<string, string>[]).map(parseStatement),
      quarterly: ((result['quarterlyReports'] ?? []) as Record<string, string>[]).map(parseStatement),
    };
  }

  /**
   * Get balance sheets
   */
  async getBalanceSheet(symbol: string): Promise<{
    annual: BalanceSheet[];
    quarterly: BalanceSheet[];
  }> {
    const result = await this.callTool<Record<string, unknown>>('get_balance_sheet', { symbol });

    const parseSheet = (data: Record<string, string>): BalanceSheet => ({
      fiscalDateEnding: data['fiscalDateEnding'] ?? '',
      reportedCurrency: data['reportedCurrency'] ?? '',
      totalAssets: this.parseNumber(data['totalAssets']),
      totalCurrentAssets: this.parseNumber(data['totalCurrentAssets']),
      cashAndCashEquivalentsAtCarryingValue: this.parseNumber(data['cashAndCashEquivalentsAtCarryingValue']),
      cashAndShortTermInvestments: this.parseNumber(data['cashAndShortTermInvestments']),
      inventory: this.parseNumber(data['inventory']),
      currentNetReceivables: this.parseNumber(data['currentNetReceivables']),
      totalNonCurrentAssets: this.parseNumber(data['totalNonCurrentAssets']),
      propertyPlantEquipment: this.parseNumber(data['propertyPlantEquipment']),
      accumulatedDepreciationAmortizationPPE: this.parseNumber(data['accumulatedDepreciationAmortizationPPE']),
      intangibleAssets: this.parseNumber(data['intangibleAssets']),
      intangibleAssetsExcludingGoodwill: this.parseNumber(data['intangibleAssetsExcludingGoodwill']),
      goodwill: this.parseNumber(data['goodwill']),
      investments: this.parseNumber(data['investments']),
      longTermInvestments: this.parseNumber(data['longTermInvestments']),
      shortTermInvestments: this.parseNumber(data['shortTermInvestments']),
      otherCurrentAssets: this.parseNumber(data['otherCurrentAssets']),
      otherNonCurrentAssets: this.parseNumber(data['otherNonCurrentAssets']),
      totalLiabilities: this.parseNumber(data['totalLiabilities']),
      totalCurrentLiabilities: this.parseNumber(data['totalCurrentLiabilities']),
      currentAccountsPayable: this.parseNumber(data['currentAccountsPayable']),
      deferredRevenue: this.parseNumber(data['deferredRevenue']),
      currentDebt: this.parseNumber(data['currentDebt']),
      shortTermDebt: this.parseNumber(data['shortTermDebt']),
      totalNonCurrentLiabilities: this.parseNumber(data['totalNonCurrentLiabilities']),
      capitalLeaseObligations: this.parseNumber(data['capitalLeaseObligations']),
      longTermDebt: this.parseNumber(data['longTermDebt']),
      currentLongTermDebt: this.parseNumber(data['currentLongTermDebt']),
      longTermDebtNoncurrent: this.parseNumber(data['longTermDebtNoncurrent']),
      shortLongTermDebtTotal: this.parseNumber(data['shortLongTermDebtTotal']),
      otherCurrentLiabilities: this.parseNumber(data['otherCurrentLiabilities']),
      otherNonCurrentLiabilities: this.parseNumber(data['otherNonCurrentLiabilities']),
      totalShareholderEquity: this.parseNumber(data['totalShareholderEquity']),
      treasuryStock: this.parseNumber(data['treasuryStock']),
      retainedEarnings: this.parseNumber(data['retainedEarnings']),
      commonStock: this.parseNumber(data['commonStock']),
      commonStockSharesOutstanding: this.parseNumber(data['commonStockSharesOutstanding']),
    });

    return {
      annual: ((result['annualReports'] ?? []) as Record<string, string>[]).map(parseSheet),
      quarterly: ((result['quarterlyReports'] ?? []) as Record<string, string>[]).map(parseSheet),
    };
  }

  /**
   * Get cash flow statements
   */
  async getCashFlow(symbol: string): Promise<{
    annual: CashFlowStatement[];
    quarterly: CashFlowStatement[];
  }> {
    const result = await this.callTool<Record<string, unknown>>('get_cash_flow', { symbol });

    const parseStatement = (data: Record<string, string>): CashFlowStatement => ({
      fiscalDateEnding: data['fiscalDateEnding'] ?? '',
      reportedCurrency: data['reportedCurrency'] ?? '',
      operatingCashflow: this.parseNumber(data['operatingCashflow']),
      paymentsForOperatingActivities: this.parseNumber(data['paymentsForOperatingActivities']),
      proceedsFromOperatingActivities: this.parseNumber(data['proceedsFromOperatingActivities']),
      changeInOperatingLiabilities: this.parseNumber(data['changeInOperatingLiabilities']),
      changeInOperatingAssets: this.parseNumber(data['changeInOperatingAssets']),
      depreciationDepletionAndAmortization: this.parseNumber(data['depreciationDepletionAndAmortization']),
      capitalExpenditures: this.parseNumber(data['capitalExpenditures']),
      changeInReceivables: this.parseNumber(data['changeInReceivables']),
      changeInInventory: this.parseNumber(data['changeInInventory']),
      profitLoss: this.parseNumber(data['profitLoss']),
      cashflowFromInvestment: this.parseNumber(data['cashflowFromInvestment']),
      cashflowFromFinancing: this.parseNumber(data['cashflowFromFinancing']),
      proceedsFromRepaymentsOfShortTermDebt: this.parseNumber(data['proceedsFromRepaymentsOfShortTermDebt']),
      paymentsForRepurchaseOfCommonStock: this.parseNumber(data['paymentsForRepurchaseOfCommonStock']),
      paymentsForRepurchaseOfEquity: this.parseNumber(data['paymentsForRepurchaseOfEquity']),
      paymentsForRepurchaseOfPreferredStock: this.parseNumber(data['paymentsForRepurchaseOfPreferredStock']),
      dividendPayout: this.parseNumber(data['dividendPayout']),
      dividendPayoutCommonStock: this.parseNumber(data['dividendPayoutCommonStock']),
      dividendPayoutPreferredStock: this.parseNumber(data['dividendPayoutPreferredStock']),
      proceedsFromIssuanceOfCommonStock: this.parseNumber(data['proceedsFromIssuanceOfCommonStock']),
      proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet: this.parseNumber(data['proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet']),
      proceedsFromIssuanceOfPreferredStock: this.parseNumber(data['proceedsFromIssuanceOfPreferredStock']),
      proceedsFromRepurchaseOfEquity: this.parseNumber(data['proceedsFromRepurchaseOfEquity']),
      proceedsFromSaleOfTreasuryStock: this.parseNumber(data['proceedsFromSaleOfTreasuryStock']),
      changeInCashAndCashEquivalents: this.parseNumber(data['changeInCashAndCashEquivalents']),
      changeInExchangeRate: this.parseNumber(data['changeInExchangeRate']),
      netIncome: this.parseNumber(data['netIncome']),
    });

    return {
      annual: ((result['annualReports'] ?? []) as Record<string, string>[]).map(parseStatement),
      quarterly: ((result['quarterlyReports'] ?? []) as Record<string, string>[]).map(parseStatement),
    };
  }

  /**
   * Get earnings data
   */
  async getEarnings(symbol: string): Promise<EarningsData> {
    const result = await this.callTool<Record<string, unknown>>('get_earnings', { symbol });

    return {
      symbol,
      annualEarnings: ((result['annualEarnings'] ?? []) as Record<string, string>[]).map((e) => ({
        fiscalDateEnding: e['fiscalDateEnding'] ?? '',
        reportedEPS: this.parseNumber(e['reportedEPS']),
      })),
      quarterlyEarnings: ((result['quarterlyEarnings'] ?? []) as Record<string, string>[]).map((e) => ({
        fiscalDateEnding: e['fiscalDateEnding'] ?? '',
        reportedDate: e['reportedDate'] ?? '',
        reportedEPS: this.parseNumber(e['reportedEPS']),
        estimatedEPS: this.parseNumber(e['estimatedEPS']),
        surprise: this.parseNumber(e['surprise']),
        surprisePercentage: this.parseNumber(e['surprisePercentage']),
      })),
    };
  }

  // ==================== ALPHA INTELLIGENCE ====================

  /**
   * Get market news and sentiment
   */
  async getNewsSentiment(options?: {
    tickers?: string[];
    topics?: string[];
    timeFrom?: string;
    timeTo?: string;
    sort?: 'LATEST' | 'EARLIEST' | 'RELEVANCE';
    limit?: number;
  }): Promise<NewsArticle[]> {
    const result = await this.callTool<Record<string, unknown>>('get_news_sentiment', {
      tickers: options?.tickers?.join(','),
      topics: options?.topics?.join(','),
      time_from: options?.timeFrom,
      time_to: options?.timeTo,
      sort: options?.sort,
      limit: options?.limit ?? 50,
    });

    const feed = (result['feed'] ?? []) as Record<string, unknown>[];

    return feed.map((article) => ({
      title: article['title'] as string ?? '',
      url: article['url'] as string ?? '',
      timePublished: article['time_published'] as string ?? '',
      authors: (article['authors'] ?? []) as string[],
      summary: article['summary'] as string ?? '',
      bannerImage: article['banner_image'] as string,
      source: article['source'] as string ?? '',
      categoryWithinSource: article['category_within_source'] as string ?? '',
      sourceDomain: article['source_domain'] as string ?? '',
      topics: ((article['topics'] ?? []) as Record<string, string>[]).map((t) => ({
        topic: t['topic'] ?? '',
        relevanceScore: t['relevance_score'] ?? '',
      })),
      overallSentimentScore: this.parseNumber(article['overall_sentiment_score'] as string),
      overallSentimentLabel: article['overall_sentiment_label'] as string ?? '',
      tickerSentiment: ((article['ticker_sentiment'] ?? []) as Record<string, string>[]).map((t) => ({
        ticker: t['ticker'] ?? '',
        relevanceScore: t['relevance_score'] ?? '',
        tickerSentimentScore: t['ticker_sentiment_score'] ?? '',
        tickerSentimentLabel: t['ticker_sentiment_label'] ?? '',
      })),
    }));
  }

  /**
   * Get top gainers, losers, and most actively traded
   */
  async getTopGainersLosers(): Promise<MarketMovers> {
    const result = await this.callTool<Record<string, unknown>>('get_top_gainers_losers', {});

    const parseMovers = (data: Record<string, string>[]) =>
      data.map((item) => ({
        ticker: item['ticker'] ?? '',
        price: item['price'] ?? '',
        changeAmount: item['change_amount'] ?? '',
        changePercentage: item['change_percentage'] ?? '',
        volume: item['volume'] ?? '',
      }));

    return {
      topGainers: parseMovers((result['top_gainers'] ?? []) as Record<string, string>[]),
      topLosers: parseMovers((result['top_losers'] ?? []) as Record<string, string>[]),
      mostActivelyTraded: parseMovers((result['most_actively_traded'] ?? []) as Record<string, string>[]),
    };
  }

  /**
   * Get insider transactions
   */
  async getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
    const result = await this.callTool<Record<string, unknown>>('get_insider_transactions', { symbol });

    const data = (result['data'] ?? []) as Record<string, string>[];

    return data.map((tx) => ({
      symbol: tx['symbol'] ?? symbol,
      filingDate: tx['filing_date'] ?? '',
      transactionDate: tx['transaction_date'] ?? '',
      reportingName: tx['reporting_name'] ?? '',
      transactionType: tx['transaction_type'] ?? '',
      sharesTraded: this.parseNumber(tx['shares_traded']),
      price: this.parseNumber(tx['price']),
      sharesOwned: this.parseNumber(tx['shares_owned']),
    }));
  }

  // ==================== ECONOMIC INDICATORS ====================

  /**
   * Get real GDP data
   */
  async getRealGDP(interval?: 'annual' | 'quarterly'): Promise<EconomicDataPoint[]> {
    const result = await this.callTool<Record<string, unknown>>('get_real_gdp', {
      interval: interval ?? 'annual',
    });

    return ((result['data'] ?? []) as Record<string, string>[]).map((d) => ({
      date: d['date'] ?? '',
      value: this.parseNumber(d['value']),
    }));
  }

  /**
   * Get CPI (Consumer Price Index) data
   */
  async getCPI(interval?: 'monthly' | 'semiannual'): Promise<EconomicDataPoint[]> {
    const result = await this.callTool<Record<string, unknown>>('get_cpi', {
      interval: interval ?? 'monthly',
    });

    return ((result['data'] ?? []) as Record<string, string>[]).map((d) => ({
      date: d['date'] ?? '',
      value: this.parseNumber(d['value']),
    }));
  }

  /**
   * Get inflation rate data
   */
  async getInflation(): Promise<EconomicDataPoint[]> {
    const result = await this.callTool<Record<string, unknown>>('get_inflation', {});

    return ((result['data'] ?? []) as Record<string, string>[]).map((d) => ({
      date: d['date'] ?? '',
      value: this.parseNumber(d['value']),
    }));
  }

  /**
   * Get Federal Funds Rate
   */
  async getFederalFundsRate(interval?: 'daily' | 'weekly' | 'monthly'): Promise<EconomicDataPoint[]> {
    const result = await this.callTool<Record<string, unknown>>('get_federal_funds_rate', {
      interval: interval ?? 'monthly',
    });

    return ((result['data'] ?? []) as Record<string, string>[]).map((d) => ({
      date: d['date'] ?? '',
      value: this.parseNumber(d['value']),
    }));
  }

  /**
   * Get Treasury Yield data
   */
  async getTreasuryYield(
    interval?: 'daily' | 'weekly' | 'monthly',
    maturity?: '3month' | '2year' | '5year' | '7year' | '10year' | '30year'
  ): Promise<EconomicDataPoint[]> {
    const result = await this.callTool<Record<string, unknown>>('get_treasury_yield', {
      interval: interval ?? 'monthly',
      maturity: maturity ?? '10year',
    });

    return ((result['data'] ?? []) as Record<string, string>[]).map((d) => ({
      date: d['date'] ?? '',
      value: this.parseNumber(d['value']),
    }));
  }

  /**
   * Get unemployment rate
   */
  async getUnemployment(): Promise<EconomicDataPoint[]> {
    const result = await this.callTool<Record<string, unknown>>('get_unemployment', {});

    return ((result['data'] ?? []) as Record<string, string>[]).map((d) => ({
      date: d['date'] ?? '',
      value: this.parseNumber(d['value']),
    }));
  }

  // ==================== TECHNICAL INDICATORS ====================

  /**
   * Get Simple Moving Average (SMA)
   */
  async getSMA(
    symbol: string,
    options?: {
      interval?: string;
      timePeriod?: number;
      seriesType?: 'close' | 'open' | 'high' | 'low';
    }
  ): Promise<TechnicalIndicatorResult> {
    const result = await this.callTool<Record<string, unknown>>('get_sma', {
      symbol,
      interval: options?.interval ?? 'daily',
      time_period: options?.timePeriod ?? 20,
      series_type: options?.seriesType ?? 'close',
    });

    const analysis = result['Technical Analysis: SMA'] as Record<string, Record<string, string>> ?? {};

    return {
      symbol,
      indicator: 'SMA',
      interval: options?.interval ?? 'daily',
      data: Object.entries(analysis).map(([date, values]) => ({
        date,
        value: this.parseNumber(values['SMA']),
      })),
    };
  }

  /**
   * Get Exponential Moving Average (EMA)
   */
  async getEMA(
    symbol: string,
    options?: {
      interval?: string;
      timePeriod?: number;
      seriesType?: 'close' | 'open' | 'high' | 'low';
    }
  ): Promise<TechnicalIndicatorResult> {
    const result = await this.callTool<Record<string, unknown>>('get_ema', {
      symbol,
      interval: options?.interval ?? 'daily',
      time_period: options?.timePeriod ?? 20,
      series_type: options?.seriesType ?? 'close',
    });

    const analysis = result['Technical Analysis: EMA'] as Record<string, Record<string, string>> ?? {};

    return {
      symbol,
      indicator: 'EMA',
      interval: options?.interval ?? 'daily',
      data: Object.entries(analysis).map(([date, values]) => ({
        date,
        value: this.parseNumber(values['EMA']),
      })),
    };
  }

  /**
   * Get Relative Strength Index (RSI)
   */
  async getRSI(
    symbol: string,
    options?: {
      interval?: string;
      timePeriod?: number;
      seriesType?: 'close' | 'open' | 'high' | 'low';
    }
  ): Promise<TechnicalIndicatorResult> {
    const result = await this.callTool<Record<string, unknown>>('get_rsi', {
      symbol,
      interval: options?.interval ?? 'daily',
      time_period: options?.timePeriod ?? 14,
      series_type: options?.seriesType ?? 'close',
    });

    const analysis = result['Technical Analysis: RSI'] as Record<string, Record<string, string>> ?? {};

    return {
      symbol,
      indicator: 'RSI',
      interval: options?.interval ?? 'daily',
      data: Object.entries(analysis).map(([date, values]) => ({
        date,
        value: this.parseNumber(values['RSI']),
      })),
    };
  }

  /**
   * Get MACD (Moving Average Convergence Divergence)
   */
  async getMACD(
    symbol: string,
    options?: {
      interval?: string;
      seriesType?: 'close' | 'open' | 'high' | 'low';
      fastPeriod?: number;
      slowPeriod?: number;
      signalPeriod?: number;
    }
  ): Promise<TechnicalIndicatorResult> {
    const result = await this.callTool<Record<string, unknown>>('get_macd', {
      symbol,
      interval: options?.interval ?? 'daily',
      series_type: options?.seriesType ?? 'close',
      fastperiod: options?.fastPeriod ?? 12,
      slowperiod: options?.slowPeriod ?? 26,
      signalperiod: options?.signalPeriod ?? 9,
    });

    const analysis = result['Technical Analysis: MACD'] as Record<string, Record<string, string>> ?? {};

    return {
      symbol,
      indicator: 'MACD',
      interval: options?.interval ?? 'daily',
      data: Object.entries(analysis).map(([date, values]) => ({
        date,
        value: this.parseNumber(values['MACD']),
        MACD_Signal: this.parseNumber(values['MACD_Signal']),
        MACD_Hist: this.parseNumber(values['MACD_Hist']),
      })),
    };
  }

  /**
   * Get Bollinger Bands
   */
  async getBollingerBands(
    symbol: string,
    options?: {
      interval?: string;
      timePeriod?: number;
      seriesType?: 'close' | 'open' | 'high' | 'low';
      nbdevup?: number;
      nbdevdn?: number;
    }
  ): Promise<TechnicalIndicatorResult> {
    const result = await this.callTool<Record<string, unknown>>('get_bbands', {
      symbol,
      interval: options?.interval ?? 'daily',
      time_period: options?.timePeriod ?? 20,
      series_type: options?.seriesType ?? 'close',
      nbdevup: options?.nbdevup ?? 2,
      nbdevdn: options?.nbdevdn ?? 2,
    });

    const analysis = result['Technical Analysis: BBANDS'] as Record<string, Record<string, string>> ?? {};

    return {
      symbol,
      indicator: 'BBANDS',
      interval: options?.interval ?? 'daily',
      data: Object.entries(analysis).map(([date, values]) => ({
        date,
        value: this.parseNumber(values['Real Middle Band']),
        upperBand: this.parseNumber(values['Real Upper Band']),
        lowerBand: this.parseNumber(values['Real Lower Band']),
      })),
    };
  }
}

// Singleton instance
let _alphavantageClient: AlphaVantageMCPClient | null = null;

/**
 * Get the singleton AlphaVantage MCP Client
 */
export function getAlphaVantageMCPClient(): AlphaVantageMCPClient {
  if (!_alphavantageClient) {
    _alphavantageClient = new AlphaVantageMCPClient({
      apiKey: process.env['ALPHAVANTAGE_API_KEY'] ?? '',
    });
  }
  return _alphavantageClient;
}

/**
 * Set a custom AlphaVantage MCP Client (for testing)
 */
export function setAlphaVantageMCPClient(client: AlphaVantageMCPClient): void {
  _alphavantageClient = client;
}

/**
 * Financial data result for evidence gathering
 */
export interface FinancialDataResult {
  type: 'quote' | 'fundamentals' | 'news' | 'earnings' | 'technical' | 'economic';
  symbol?: string;
  data: unknown;
  summary: string;
  credibilityScore: number;
  retrievedAt: number;
}

/**
 * Gather financial evidence for a symbol
 */
export async function gatherFinancialEvidence(
  symbol: string,
  options?: {
    includeQuote?: boolean;
    includeFundamentals?: boolean;
    includeNews?: boolean;
    includeEarnings?: boolean;
    includeTechnicals?: boolean;
  }
): Promise<FinancialDataResult[]> {
  const client = getAlphaVantageMCPClient();
  const results: FinancialDataResult[] = [];
  const now = Date.now();

  const opts = {
    includeQuote: true,
    includeFundamentals: true,
    includeNews: true,
    includeEarnings: true,
    includeTechnicals: true,
    ...options,
  };

  // Gather data in parallel where possible
  const promises: Promise<void>[] = [];

  if (opts.includeQuote) {
    promises.push(
      client.getQuote(symbol).then((quote) => {
        results.push({
          type: 'quote',
          symbol,
          data: quote,
          summary: `${symbol}: $${quote.price.toFixed(2)} (${quote.changePercent}) - Volume: ${quote.volume.toLocaleString()}`,
          credibilityScore: 0.95, // Direct market data is highly credible
          retrievedAt: now,
        });
      }).catch((err) => {
        console.error(`[AlphaVantage] Failed to get quote for ${symbol}:`, err);
      })
    );
  }

  if (opts.includeFundamentals) {
    promises.push(
      client.getCompanyOverview(symbol).then((overview) => {
        const summary = [
          `${overview.name} (${overview.symbol})`,
          `Sector: ${overview.sector}, Industry: ${overview.industry}`,
          `Market Cap: $${(overview.marketCapitalization / 1e9).toFixed(2)}B`,
          `P/E: ${overview.peRatio.toFixed(2)}, EPS: $${overview.eps.toFixed(2)}`,
          `52W Range: $${overview.fiftyTwoWeekLow.toFixed(2)} - $${overview.fiftyTwoWeekHigh.toFixed(2)}`,
        ].join('\n');

        results.push({
          type: 'fundamentals',
          symbol,
          data: overview,
          summary,
          credibilityScore: 0.95,
          retrievedAt: now,
        });
      }).catch((err) => {
        console.error(`[AlphaVantage] Failed to get fundamentals for ${symbol}:`, err);
      })
    );
  }

  if (opts.includeNews) {
    promises.push(
      client.getNewsSentiment({ tickers: [symbol], limit: 10 }).then((articles) => {
        const avgSentiment = articles.length > 0
          ? articles.reduce((sum, a) => sum + a.overallSentimentScore, 0) / articles.length
          : 0;

        const summary = [
          `${articles.length} recent news articles for ${symbol}`,
          `Average Sentiment: ${avgSentiment.toFixed(2)} (${avgSentiment > 0.15 ? 'Bullish' : avgSentiment < -0.15 ? 'Bearish' : 'Neutral'})`,
          ...articles.slice(0, 3).map((a) => `- ${a.title} (${a.source})`),
        ].join('\n');

        results.push({
          type: 'news',
          symbol,
          data: articles,
          summary,
          credibilityScore: 0.75, // News credibility varies
          retrievedAt: now,
        });
      }).catch((err) => {
        console.error(`[AlphaVantage] Failed to get news for ${symbol}:`, err);
      })
    );
  }

  if (opts.includeEarnings) {
    promises.push(
      client.getEarnings(symbol).then((earnings) => {
        const latestQuarter = earnings.quarterlyEarnings[0];
        const summary = latestQuarter
          ? [
              `Latest Earnings for ${symbol}:`,
              `Reported EPS: $${latestQuarter.reportedEPS.toFixed(2)} vs Est: $${latestQuarter.estimatedEPS.toFixed(2)}`,
              `Surprise: ${latestQuarter.surprisePercentage.toFixed(2)}%`,
            ].join('\n')
          : `No recent earnings data for ${symbol}`;

        results.push({
          type: 'earnings',
          symbol,
          data: earnings,
          summary,
          credibilityScore: 0.95,
          retrievedAt: now,
        });
      }).catch((err) => {
        console.error(`[AlphaVantage] Failed to get earnings for ${symbol}:`, err);
      })
    );
  }

  if (opts.includeTechnicals) {
    promises.push(
      Promise.all([
        client.getRSI(symbol),
        client.getMACD(symbol),
      ]).then(([rsi, macd]) => {
        const latestRSI = rsi.data[0];
        const latestMACD = macd.data[0];

        const summary = [
          `Technical Indicators for ${symbol}:`,
          latestRSI ? `RSI(14): ${latestRSI.value.toFixed(2)} (${latestRSI.value > 70 ? 'Overbought' : latestRSI.value < 30 ? 'Oversold' : 'Neutral'})` : '',
          latestMACD ? `MACD: ${latestMACD.value.toFixed(4)}` : '',
        ].filter(Boolean).join('\n');

        results.push({
          type: 'technical',
          symbol,
          data: { rsi, macd },
          summary,
          credibilityScore: 0.90,
          retrievedAt: now,
        });
      }).catch((err) => {
        console.error(`[AlphaVantage] Failed to get technicals for ${symbol}:`, err);
      })
    );
  }

  await Promise.all(promises);
  return results;
}
