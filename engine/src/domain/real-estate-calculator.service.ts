/**
 * Real Estate Calculator Service
 * Implements real estate domain calculations and analysis
 */

export interface Property {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  propertyType: string;
  url: string;
  images: string[];
  description: string;
  scrapedAt: string;
}

export interface MarketData {
  medianPrice: number;
  pricePerSqft: number;
  daysOnMarket: number;
  inventory: number;
  priceTrend: Record<string, number>;
  inventoryTrend: Record<string, number>;
  scrapedAt: string;
}

export interface ROIAnalysis {
  purchasePrice: number;
  rentalIncome: number;
  monthlyExpenses: number;
  annualExpenses: number;
  cashFlow: number;
  capRate: number;
  cashOnCash: number;
  totalReturn: number;
  appreciationRate: number;
  paybackPeriod: number;
}

export interface MarketScore {
  demandScore: number; // 0-100
  priceScore: number; // 0-100
  growthScore: number; // 0-100
  overallScore: number; // 0-100
  marketPhase: 'Buyers Market' | 'Sellers Market' | 'Balanced';
  confidence: number; // 0-100
}

export interface InvestmentRecommendation {
  action: 'Strong Buy' | 'Buy' | 'Hold' | 'Skip' | 'Strong Skip';
  confidence: number; // 0-100
  reasoning: string[];
  riskFactors: string[];
  opportunities: string[];
  targetROI: number;
  expectedHoldPeriod: number;
}

export class RealEstateCalculatorService {
  
  /**
   * Calculate Return on Investment (ROI) for a property
   */
  calculateROI(property: Property, marketData: MarketData): ROIAnalysis {
    const purchasePrice = property.price;
    
    // Estimate rental income based on market data and property characteristics
    const rentalIncome = this.estimateRentalIncome(property, marketData);
    
    // Calculate expenses (property tax, insurance, maintenance, etc.)
    const monthlyExpenses = this.calculateExpenses(property, marketData);
    const annualExpenses = monthlyExpenses * 12;
    
    // Calculate cash flow
    const cashFlow = rentalIncome - annualExpenses;
    
    // Calculate capitalization rate
    const capRate = (cashFlow / purchasePrice) * 100;
    
    // Calculate cash-on-cash return (assuming 20% down payment)
    const downPayment = purchasePrice * 0.2;
    const cashOnCash = (cashFlow / downPayment) * 100;
    
    // Estimate appreciation based on market trends
    const appreciationRate = marketData.priceTrend['6-months'] || 5.0;
    const annualAppreciation = purchasePrice * (appreciationRate / 100);
    
    // Calculate total return (cash flow + appreciation)
    const totalReturn = ((cashFlow + annualAppreciation) / downPayment) * 100;
    
    // Calculate payback period (years to recover down payment)
    const paybackPeriod = downPayment / cashFlow;
    
    return {
      purchasePrice,
      rentalIncome,
      monthlyExpenses,
      annualExpenses,
      cashFlow,
      capRate,
      cashOnCash,
      totalReturn,
      appreciationRate,
      paybackPeriod
    };
  }
  
  /**
   * Estimate monthly rental income for a property
   */
  private estimateRentalIncome(property: Property, marketData: MarketData): number {
    // Base rental rate from market data
    const baseRatePerSqft = marketData.pricePerSqft * 0.008; // 0.8% of property value per sqft monthly
    
    // Adjust for property characteristics
    let multiplier = 1.0;
    
    // Bedroom adjustment
    if (property.beds >= 4) multiplier *= 1.2;
    else if (property.beds === 3) multiplier *= 1.1;
    else if (property.beds <= 1) multiplier *= 0.8;
    
    // Bathroom adjustment
    if (property.baths >= property.beds) multiplier *= 1.1;
    else if (property.baths < property.beds) multiplier *= 0.9;
    
    // Age adjustment
    const propertyAge = new Date().getFullYear() - property.yearBuilt;
    if (propertyAge <= 5) multiplier *= 1.1;
    else if (propertyAge <= 15) multiplier *= 1.0;
    else if (propertyAge <= 30) multiplier *= 0.95;
    else multiplier *= 0.9;
    
    // Property type adjustment
    if (property.propertyType === 'condo') multiplier *= 0.9;
    else if (property.propertyType === 'townhouse') multiplier *= 1.05;
    
    const monthlyRent = property.sqft * baseRatePerSqft * multiplier;
    return Math.round(monthlyRent);
  }
  
  /**
   * Calculate monthly expenses for a property
   */
  private calculateExpenses(property: Property, marketData: MarketData): number {
    const purchasePrice = property.price;
    
    // Property tax (1.25% annually)
    const propertyTax = (purchasePrice * 0.0125) / 12;
    
    // Insurance (0.5% annually)
    const insurance = (purchasePrice * 0.005) / 12;
    
    // Maintenance (1% of property value annually)
    const maintenance = (purchasePrice * 0.01) / 12;
    
    // HOA fees (if applicable)
    const hoaFees = property.propertyType === 'condo' ? 300 : 0;
    
    // Vacancy allowance (5% of expected rent)
    const expectedRent = this.estimateRentalIncome(property, marketData);
    const vacancy = expectedRent * 0.05;
    
    // Property management (8% of rent)
    const management = expectedRent * 0.08;
    
    const totalExpenses = propertyTax + insurance + maintenance + hoaFees + vacancy + management;
    return Math.round(totalExpenses);
  }
  
  /**
   * Calculate market score for a property
   */
  calculateMarketScore(property: Property, marketData: MarketData): MarketScore {
    // Demand score based on days on market and inventory
    const demandScore = this.calculateDemandScore(marketData);
    
    // Price score based on comparison to median
    const priceScore = this.calculatePriceScore(property, marketData);
    
    // Growth score based on price trends
    const growthScore = this.calculateGrowthScore(marketData);
    
    // Overall weighted score
    const overallScore = (demandScore * 0.3) + (priceScore * 0.4) + (growthScore * 0.3);
    
    // Determine market phase
    const marketPhase = this.determineMarketPhase(marketData);
    
    // Confidence based on data quality and recency
    const confidence = this.calculateConfidence(marketData);
    
    return {
      demandScore,
      priceScore,
      growthScore,
      overallScore,
      marketPhase,
      confidence
    };
  }
  
  /**
   * Calculate demand score (0-100)
   */
  private calculateDemandScore(marketData: MarketData): number {
    let score = 50; // Base score
    
    // Days on market impact (lower is better)
    if (marketData.daysOnMarket <= 30) score += 25;
    else if (marketData.daysOnMarket <= 60) score += 15;
    else if (marketData.daysOnMarket <= 90) score += 5;
    else score -= 10;
    
    // Inventory impact (lower is better)
    if (marketData.inventory <= 500) score += 25;
    else if (marketData.inventory <= 1000) score += 10;
    else if (marketData.inventory <= 2000) score -= 5;
    else score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculate price score (0-100)
   */
  private calculatePriceScore(property: Property, marketData: MarketData): number {
    const propertyPricePerSqft = property.price / property.sqft;
    const marketPricePerSqft = marketData.pricePerSqft;
    
    // Compare to market (being below market is good for buyers)
    const priceRatio = propertyPricePerSqft / marketPricePerSqft;
    
    let score = 50; // Base score
    
    if (priceRatio <= 0.9) score += 30; // 10%+ below market
    else if (priceRatio <= 0.95) score += 20; // 5-10% below market
    else if (priceRatio <= 1.05) score += 10; // Around market
    else if (priceRatio <= 1.1) score -= 10; // 5-10% above market
    else score -= 20; // 10%+ above market
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculate growth score (0-100)
   */
  private calculateGrowthScore(marketData: MarketData): number {
    let score = 50; // Base score
    
    const priceTrend6Month = marketData.priceTrend['6-months'] || 0;
    const priceTrend1Year = marketData.priceTrend['1-year'] || 0;
    
    // Positive price trends
    if (priceTrend6Month >= 10) score += 30;
    else if (priceTrend6Month >= 5) score += 20;
    else if (priceTrend6Month >= 2) score += 10;
    else if (priceTrend6Month < 0) score -= 20;
    
    // Consistent growth
    if (priceTrend1Year >= priceTrend6Month && priceTrend1Year > 5) score += 20;
    else if (priceTrend1Year < priceTrend6Month) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Determine market phase
   */
  private determineMarketPhase(marketData: MarketData): 'Buyers Market' | 'Sellers Market' | 'Balanced' {
    const daysOnMarket = marketData.daysOnMarket;
    const inventoryTrend = marketData.inventoryTrend['6-months'] || 0;
    
    if (daysOnMarket > 90 && inventoryTrend > 0) {
      return 'Buyers Market';
    } else if (daysOnMarket < 45 && inventoryTrend < 0) {
      return 'Sellers Market';
    } else {
      return 'Balanced';
    }
  }
  
  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(marketData: MarketData): number {
    let confidence = 80; // Base confidence
    
    // Data recency
    const scrapedDate = new Date(marketData.scrapedAt);
    const daysSinceScraped = (Date.now() - scrapedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceScraped <= 1) confidence += 10;
    else if (daysSinceScraped <= 7) confidence += 5;
    else if (daysSinceScraped <= 30) confidence -= 10;
    else confidence -= 20;
    
    return Math.max(0, Math.min(100, confidence));
  }
  
  /**
   * Generate investment recommendation
   */
  generateRecommendation(property: Property, marketData: MarketData, roi: ROIAnalysis, marketScore: MarketScore): InvestmentRecommendation {
    const reasoning: string[] = [];
    const riskFactors: string[] = [];
    const opportunities: string[] = [];
    
    let action: 'Strong Buy' | 'Buy' | 'Hold' | 'Skip' | 'Strong Skip' = 'Hold';
    let confidence = 50;
    
    // ROI-based decision
    if (roi.totalReturn >= 15) {
      action = 'Strong Buy';
      confidence += 20;
      reasoning.push(`Excellent total return of ${roi.totalReturn.toFixed(1)}%`);
      opportunities.push('Strong cash flow and appreciation potential');
    } else if (roi.totalReturn >= 10) {
      action = 'Buy';
      confidence += 10;
      reasoning.push(`Good total return of ${roi.totalReturn.toFixed(1)}%`);
      opportunities.push('Solid investment fundamentals');
    } else if (roi.totalReturn >= 5) {
      reasoning.push(`Moderate total return of ${roi.totalReturn.toFixed(1)}%`);
    } else {
      action = 'Skip';
      confidence -= 10;
      reasoning.push(`Low total return of ${roi.totalReturn.toFixed(1)}%`);
      riskFactors.push('Poor investment returns');
    }
    
    // Cash flow analysis
    if (roi.cashFlow < 0) {
      action = 'Skip';
      confidence -= 15;
      reasoning.push('Negative monthly cash flow');
      riskFactors.push('Requires additional capital investment');
    } else if (roi.cashFlow > 500) {
      reasoning.push(`Strong positive cash flow of $${roi.cashFlow.toLocaleString()}/year`);
      opportunities.push('Excellent rental income potential');
    }
    
    // Market score consideration
    if (marketScore.overallScore >= 75) {
      confidence += 10;
      reasoning.push(`Strong market conditions (${marketScore.overallScore}/100)`);
      opportunities.push('Favorable market timing');
    } else if (marketScore.overallScore <= 25) {
      confidence -= 10;
      reasoning.push(`Weak market conditions (${marketScore.overallScore}/100)`);
      riskFactors.push('Challenging market environment');
    }
    
    // Property-specific factors
    const propertyAge = new Date().getFullYear() - property.yearBuilt;
    if (propertyAge > 30) {
      reasoning.push('Older property may require maintenance');
      riskFactors.push('Potential renovation costs');
    } else if (propertyAge < 10) {
      reasoning.push('Modern property with lower maintenance risk');
      opportunities.push('Newer construction benefits');
    }
    
    // Price per sqft analysis
    const pricePerSqft = property.price / property.sqft;
    if (pricePerSqft > marketData.pricePerSqft * 1.2) {
      reasoning.push('Property priced above market average');
      riskFactors.push('Premium pricing may limit appreciation');
    } else if (pricePerSqft < marketData.pricePerSqft * 0.8) {
      reasoning.push('Property priced below market average');
      opportunities.push('Potential for value appreciation');
    }
    
    // Adjust confidence bounds
    confidence = Math.max(0, Math.min(100, confidence));
    
    // Determine target ROI and hold period
    const targetROI = Math.max(roi.totalReturn, 8); // Minimum 8% target
    const expectedHoldPeriod = roi.paybackPeriod > 0 ? Math.max(roi.paybackPeriod, 5) : 10;
    
    return {
      action,
      confidence,
      reasoning,
      riskFactors,
      opportunities,
      targetROI,
      expectedHoldPeriod
    };
  }
}

// Export singleton instance
export const realEstateCalculator = new RealEstateCalculatorService();
