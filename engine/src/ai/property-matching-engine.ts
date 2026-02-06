// @ts-nocheck - Supabase SDK/Type migration pending (Phase 2)
/**
 * Advanced Property Matching Engine for Phase 6
 * AI-powered recommendation engine for real estate properties
 */

import { Logger } from '../utils/logger';
import { UnifiedDatabaseManager } from '../database/unified-database-manager';

export interface PropertyMatchingConfig {
  ai: {
    enabled: boolean;
    provider: 'openai' | 'claude' | 'vertex';
    apiKey: string;
    model: string;
    temperature: number;
  };
  preferences: {
    weights: {
      location: number;
      price: number;
      propertyType: number;
      features: number;
      amenities: number;
      schools: number;
      transportation: number;
      lifestyle: number;
    };
    boostFactors: {
      recentlyListed: number;
      priceReduced: number;
      hotMarket: number;
      agentMatch: number;
    };
  };
  learning: {
    enabled: boolean;
    feedbackWeight: number;
    adaptationRate: number;
  };
}

export interface LeadPreferences {
  id: string;
  leadId: string;
  location: {
    cities: string[];
    neighborhoods: string[];
    maxCommute: number; // minutes
    locationPriority: 'high' | 'medium' | 'low';
  };
  price: {
    min: number;
    max: number;
    flexibility: number; // 0-1, how flexible they are
    financing: 'cash' | 'mortgage' | 'pre-approved';
  };
  property: {
    types: string[];
    beds: { min: number; max: number; preferred: number };
    baths: { min: number; max: number; preferred: number };
    sqft: { min: number; max: number; preferred: number };
    lotSize: { min?: number; max?: number };
    yearBuilt: { min?: number; preferred?: 'new' | 'modern' | 'established' | 'any' };
    condition: 'move-in-ready' | 'needs-work' | 'fixer-upper' | 'any';
  };
  features: {
    mustHave: string[];
    niceToHave: string[];
    dealBreakers: string[];
  };
  lifestyle: {
    familySize: number;
    pets: boolean;
    workFromHome: boolean;
    entertainment: boolean;
    outdoorActivities: boolean;
    schools: {
      important: boolean;
      level: 'elementary' | 'middle' | 'high' | 'any';
      rating: number; // minimum rating
    };
    transportation: {
      publicTransit: boolean;
      highway: boolean;
      walkability: number; // 0-100
    };
  };
  timeline: {
    urgency: 'immediate' | 'within-month' | 'flexible';
    season: 'spring' | 'summer' | 'fall' | 'winter' | 'any';
  };
}

export interface PropertyFeatures {
  basic: {
    id: string;
    address: string;
    city: string;
    neighborhood: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    lotSize: number;
    yearBuilt: number;
    propertyType: string;
    listingStatus: string;
    daysOnMarket: number;
  };
  location: {
    coordinates: { lat: number; lng: number };
    walkScore: number;
    transitScore: number;
    bikeScore: number;
    schoolRating: number;
    crimeRate: number;
    nearbyAmenities: string[];
    commuteTimes: Record<string, number>; // to key locations
  };
  features: {
    interior: string[];
    exterior: string[];
    appliances: string[];
    hvac: string;
    flooring: string[];
    parking: string[];
    storage: string[];
  };
  amenities: {
    pool: boolean;
    hotTub: boolean;
    gym: boolean;
    theater: boolean;
    office: boolean;
    guestHouse: boolean;
    smartHome: boolean;
    security: boolean;
  };
  lifestyle: {
    familyFriendly: boolean;
    petFriendly: boolean;
    entertainmentReady: boolean;
    outdoorSpace: boolean;
    quiet: boolean;
    community: string;
  };
  market: {
    priceHistory: Array<{ date: string; price: number }>;
    comparableSales: Array<{ address: string; price: number; sqft: number; date: string }>;
    marketTrend: 'rising' | 'stable' | 'declining';
    neighborhoodTrend: 'up-and-coming' | 'established' | 'declining';
    investment: {
      rentalYield: number;
      appreciation: number;
      risk: 'low' | 'medium' | 'high';
    };
  };
  media: {
    photos: string[];
    virtualTour: string;
    floorPlan: string;
    video: string;
  };
}

export interface PropertyMatch {
  propertyId: string;
  score: number;
  confidence: number;
  reasons: Array<{
    category: string;
    factor: string;
    impact: 'positive' | 'negative';
    weight: number;
    explanation: string;
  }>;
  recommendations: string[];
  warnings: string[];
  alternatives: Array<{
    propertyId: string;
    reason: string;
    score: number;
  }>;
  aiInsights: {
    summary: string;
    highlights: string[];
    concerns: string[];
    marketAdvice: string;
  };
}

export interface MatchingResult {
  leadId: string;
  totalMatches: number;
  matches: PropertyMatch[];
  analytics: {
    averageScore: number;
    scoreDistribution: Record<string, number>;
    topCategories: Array<{ category: string; avgScore: number }>;
    recommendations: string[];
  };
  learning: {
    feedbackIncorporated: boolean;
    adaptations: string[];
  };
}

export class AdvancedPropertyMatchingEngine {
  private logger: Logger;
  private config: PropertyMatchingConfig;
  private dbManager: UnifiedDatabaseManager;
  private learningData: Map<string, any> = new Map();

  constructor(config: PropertyMatchingConfig, dbManager: UnifiedDatabaseManager) {
    this.config = config;
    this.dbManager = dbManager;
    this.logger = new Logger('PropertyMatching', true);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing advanced property matching engine...');
    
    try {
      // Load learning data
      if (this.config.learning.enabled) {
        await this.loadLearningData();
      }

      this.logger.info('Property matching engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize property matching engine', error);
      throw error;
    }
  }

  async findPropertyMatches(leadId: string, preferences: LeadPreferences, limit: number = 10): Promise<MatchingResult> {
    try {
      this.logger.info('Finding property matches', { leadId, limit });

      // Get available properties
      const properties = await this.getAvailableProperties(preferences);
      
      // Score each property
      const matches: PropertyMatch[] = [];
      
      for (const property of properties) {
        const match = await this.scoreProperty(property, preferences);
        if (match.score > 0.3) { // Minimum threshold
          matches.push(match);
        }
      }

      // Sort by score and apply learning adjustments
      matches.sort((a, b) => b.score - a.score);
      
      if (this.config.learning.enabled) {
        await this.applyLearningAdjustments(matches, leadId);
      }

      // Limit results
      const limitedMatches = matches.slice(0, limit);

      // Generate analytics
      const analytics = this.generateMatchAnalytics(limitedMatches);

      const result: MatchingResult = {
        leadId,
        totalMatches: matches.length,
        matches: limitedMatches,
        analytics,
        learning: {
          feedbackIncorporated: this.config.learning.enabled,
          adaptations: [],
        },
      };

      // Store result for learning
      await this.storeMatchingResult(result);

      this.logger.info(`Found ${limitedMatches.length} property matches for lead ${leadId}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to find property matches', error);
      throw error;
    }
  }

  private async getAvailableProperties(preferences: LeadPreferences): Promise<PropertyFeatures[]> {
    // Get properties from database and external sources
    // This would integrate with CRM integrations
    
    const properties: PropertyFeatures[] = [
      {
        basic: {
          id: 'prop_1',
          address: '123 Maple Avenue',
          city: 'Toronto',
          neighborhood: 'Rosedale',
          price: 875000,
          beds: 3,
          baths: 2,
          sqft: 1800,
          lotSize: 4000,
          yearBuilt: 2015,
          propertyType: 'House',
          listingStatus: 'active',
          daysOnMarket: 12,
        },
        location: {
          coordinates: { lat: 43.6829, lng: -79.3884 },
          walkScore: 85,
          transitScore: 78,
          bikeScore: 72,
          schoolRating: 9,
          crimeRate: 2,
          nearbyAmenities: ['Parks', 'Schools', 'Shopping', 'Restaurants'],
          commuteTimes: {
            downtown: 15,
            airport: 45,
            nearestHighway: 5,
          },
        },
        features: {
          interior: ['Hardwood floors', 'High ceilings', 'Open concept'],
          exterior: ['Brick', 'Detached garage', 'Landscaped yard'],
          appliances: ['Stainless steel', 'Smart fridge', 'Wine cooler'],
          hvac: 'Central air',
          flooring: ['Hardwood', 'Tile', 'Carpet'],
          parking: ['2-car garage', 'Driveway'],
          storage: ['Basement', 'Attic', 'Garage'],
        },
        amenities: {
          pool: false,
          hotTub: false,
          gym: true,
          theater: false,
          office: true,
          guestHouse: false,
          smartHome: true,
          security: true,
        },
        lifestyle: {
          familyFriendly: true,
          petFriendly: true,
          entertainmentReady: true,
          outdoorSpace: true,
          quiet: true,
          community: 'Family-oriented',
        },
        market: {
          priceHistory: [
            { date: '2023-01', price: 825000 },
            { date: '2023-06', price: 850000 },
            { date: '2024-01', price: 875000 },
          ],
          comparableSales: [
            { address: '125 Maple Ave', price: 890000, sqft: 1850, date: '2024-02' },
            { address: '119 Maple Ave', price: 860000, sqft: 1750, date: '2024-01' },
          ],
          marketTrend: 'rising',
          neighborhoodTrend: 'established',
          investment: {
            rentalYield: 3.2,
            appreciation: 4.5,
            risk: 'low',
          },
        },
        media: {
          photos: ['photo1.jpg', 'photo2.jpg'],
          virtualTour: 'tour.mp4',
          floorPlan: 'floorplan.png',
          video: 'property.mp4',
        },
      },
      // Add more properties...
    ];

    // Filter based on basic criteria
    return properties.filter(property => 
      this.matchesBasicCriteria(property, preferences)
    );
  }

  private matchesBasicCriteria(property: PropertyFeatures, preferences: LeadPreferences): boolean {
    const { basic } = property;
    const { price, property: propPrefs } = preferences;

    // Price range
    if (basic.price < price.min || basic.price > price.max) {
      return false;
    }

    // Property type
    if (propPrefs.types.length > 0 && !propPrefs.types.includes(basic.propertyType)) {
      return false;
    }

    // Bedrooms
    if (basic.beds < propPrefs.beds.min || basic.beds > propPrefs.beds.max) {
      return false;
    }

    // Bathrooms
    if (basic.baths < propPrefs.baths.min || basic.baths > propPrefs.baths.max) {
      return false;
    }

    // Square footage
    if (basic.sqft < propPrefs.sqft.min || basic.sqft > propPrefs.sqft.max) {
      return false;
    }

    return true;
  }

  private async scoreProperty(property: PropertyFeatures, preferences: LeadPreferences): Promise<PropertyMatch> {
    const reasons: any[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    const weights = this.config.preferences.weights;

    // Location scoring
    const locationScore = this.scoreLocation(property, preferences);
    reasons.push(...locationScore.reasons);
    totalScore += locationScore.score * weights.location;
    totalWeight += weights.location;

    // Price scoring
    const priceScore = this.scorePrice(property, preferences);
    reasons.push(...priceScore.reasons);
    totalScore += priceScore.score * weights.price;
    totalWeight += weights.price;

    // Property type scoring
    const typeScore = this.scorePropertyType(property, preferences);
    reasons.push(...typeScore.reasons);
    totalScore += typeScore.score * weights.propertyType;
    totalWeight += weights.propertyType;

    // Features scoring
    const featuresScore = this.scoreFeatures(property, preferences);
    reasons.push(...featuresScore.reasons);
    totalScore += featuresScore.score * weights.features;
    totalWeight += weights.features;

    // Amenities scoring
    const amenitiesScore = this.scoreAmenities(property, preferences);
    reasons.push(...amenitiesScore.reasons);
    totalScore += amenitiesScore.score * weights.amenities;
    totalWeight += weights.amenities;

    // Schools scoring
    const schoolsScore = this.scoreSchools(property, preferences);
    reasons.push(...schoolsScore.reasons);
    totalScore += schoolsScore.score * weights.schools;
    totalWeight += weights.schools;

    // Transportation scoring
    const transportScore = this.scoreTransportation(property, preferences);
    reasons.push(...transportScore.reasons);
    totalScore += transportScore.score * weights.transportation;
    totalWeight += weights.transportation;

    // Lifestyle scoring
    const lifestyleScore = this.scoreLifestyle(property, preferences);
    reasons.push(...lifestyleScore.reasons);
    totalScore += lifestyleScore.score * weights.lifestyle;
    totalWeight += weights.lifestyle;

    // Apply boost factors
    const boostedScore = this.applyBoostFactors(totalScore / totalWeight, property);

    // Generate AI insights
    const aiInsights = this.config.ai.enabled ? 
      await this.generateAIInsights(property, preferences, reasons) : 
      this.generateBasicInsights(property, preferences);

    return {
      propertyId: property.basic.id,
      score: boostedScore,
      confidence: this.calculateConfidence(reasons),
      reasons,
      recommendations: this.generateRecommendations(property, preferences, reasons),
      warnings: this.generateWarnings(property, preferences, reasons),
      alternatives: [], // Would find similar properties
      aiInsights,
    };
  }

  private scoreLocation(property: PropertyFeatures, preferences: LeadPreferences): { score: number; reasons: any[] } {
    const reasons: any[] = [];
    let score = 0;

    // City match
    if (preferences.location.cities.includes(property.basic.city)) {
      score += 0.8;
      reasons.push({
        category: 'location',
        factor: 'city_match',
        impact: 'positive',
        weight: 0.8,
        explanation: `Property is in preferred city: ${property.basic.city}`,
      });
    }

    // Neighborhood match
    if (preferences.location.neighborhoods.includes(property.basic.neighborhood)) {
      score += 0.9;
      reasons.push({
        category: 'location',
        factor: 'neighborhood_match',
        impact: 'positive',
        weight: 0.9,
        explanation: `Property is in preferred neighborhood: ${property.basic.neighborhood}`,
      });
    }

    // Walkability
    if (property.location.walkScore >= 80) {
      score += 0.6;
      reasons.push({
        category: 'location',
        factor: 'walkability',
        impact: 'positive',
        weight: 0.6,
        explanation: `Excellent walkability: ${property.location.walkScore}/100`,
      });
    }

    // School rating
    if (preferences.lifestyle.schools.important && property.location.schoolRating >= preferences.lifestyle.schools.rating) {
      score += 0.7;
      reasons.push({
        category: 'location',
        factor: 'schools',
        impact: 'positive',
        weight: 0.7,
        explanation: `School rating ${property.location.schoolRating} meets requirements`,
      });
    }

    return { score, reasons };
  }

  private scorePrice(property: PropertyFeatures, preferences: LeadPreferences): { score: number; reasons: any[] } {
    const reasons: any[] = [];
    let score = 0;

    const price = property.basic.price;
    const { min, max, flexibility } = preferences.price;

    // Perfect price match
    if (price >= min && price <= max) {
      score += 1.0;
      reasons.push({
        category: 'price',
        factor: 'price_range',
        impact: 'positive',
        weight: 1.0,
        explanation: `Price $${price.toLocaleString()} is within budget range`,
      });
    } else {
      // Calculate how far from range
      const distance = price < min ? (min - price) / min : (price - max) / max;
      score += Math.max(0, 1 - distance * (1 - flexibility));
      
      if (distance > 0) {
        reasons.push({
          category: 'price',
          factor: 'price_range',
          impact: 'negative',
          weight: distance,
          explanation: `Price $${price.toLocaleString()} is ${distance > 0.5 ? 'significantly' : 'slightly'} ${price < min ? 'below' : 'above'} budget`,
        });
      }
    }

    // Market value assessment
    if (property.market.comparableSales.length > 0) {
      const avgComparable = property.market.comparableSales.reduce((sum, comp) => sum + comp.price, 0) / property.market.comparableSales.length;
      const priceToComparable = price / avgComparable;

      if (priceToComparable < 0.95) {
        score += 0.3;
        reasons.push({
          category: 'price',
          factor: 'market_value',
          impact: 'positive',
          weight: 0.3,
          explanation: 'Priced below market value',
        });
      } else if (priceToComparable > 1.05) {
        score -= 0.2;
        reasons.push({
          category: 'price',
          factor: 'market_value',
          impact: 'negative',
          weight: 0.2,
          explanation: 'Priced above market value',
        });
      }
    }

    return { score, reasons };
  }

  private scorePropertyType(property: PropertyFeatures, preferences: LeadPreferences): { score: number; reasons: any[] } {
    const reasons: any[] = [];
    let score = 0;

    const propertyType = property.basic.propertyType;
    const preferredTypes = preferences.property.types;

    if (preferredTypes.includes(propertyType)) {
      score += 1.0;
      reasons.push({
        category: 'property',
        factor: 'type_match',
        impact: 'positive',
        weight: 1.0,
        explanation: `Property type ${propertyType} matches preferences`,
      });
    }

    return { score, reasons };
  }

  private scoreFeatures(property: PropertyFeatures, preferences: LeadPreferences): { score: number; reasons: any[] } {
    const reasons: any[] = [];
    let score = 0;

    const allFeatures = [
      ...property.features.interior,
      ...property.features.exterior,
      ...property.features.appliances,
    ];

    // Must-have features
    const mustHaveMatches = preferences.features.mustHave.filter(feature => 
      allFeatures.some(f => f.toLowerCase().includes(feature.toLowerCase()))
    );

    if (mustHaveMatches.length > 0) {
      score += (mustHaveMatches.length / preferences.features.mustHave.length) * 0.8;
      reasons.push({
        category: 'features',
        factor: 'must_have',
        impact: 'positive',
        weight: 0.8,
        explanation: `Has ${mustHaveMatches.length} must-have features: ${mustHaveMatches.join(', ')}`,
      });
    }

    // Nice-to-have features
    const niceToHaveMatches = preferences.features.niceToHave.filter(feature => 
      allFeatures.some(f => f.toLowerCase().includes(feature.toLowerCase()))
    );

    if (niceToHaveMatches.length > 0) {
      score += (niceToHaveMatches.length / preferences.features.niceToHave.length) * 0.4;
      reasons.push({
        category: 'features',
        factor: 'nice_to_have',
        impact: 'positive',
        weight: 0.4,
        explanation: `Has ${niceToHaveMatches.length} nice-to-have features: ${niceToHaveMatches.join(', ')}`,
      });
    }

    // Deal-breakers
    const dealBreakerMatches = preferences.features.dealBreakers.filter(feature => 
      allFeatures.some(f => f.toLowerCase().includes(feature.toLowerCase()))
    );

    if (dealBreakerMatches.length > 0) {
      score -= 0.5;
      reasons.push({
        category: 'features',
        factor: 'deal_breaker',
        impact: 'negative',
        weight: 0.5,
        explanation: `Has deal-breaker features: ${dealBreakerMatches.join(', ')}`,
      });
    }

    return { score, reasons };
  }

  private scoreAmenities(property: PropertyFeatures, preferences: LeadPreferences): { score: number; reasons: any[] } {
    const reasons: any[] = [];
    let score = 0;

    const amenities = property.amenities;
    let amenityCount = 0;

    // Check relevant amenities based on lifestyle
    if (preferences.lifestyle.familyFriendly && amenities.pool) {
      amenityCount++;
      reasons.push({
        category: 'amenities',
        factor: 'pool',
        impact: 'positive',
        weight: 0.3,
        explanation: 'Family-friendly pool available',
      });
    }

    if (preferences.lifestyle.workFromHome && amenities.office) {
      amenityCount++;
      reasons.push({
        category: 'amenities',
        factor: 'home_office',
        impact: 'positive',
        weight: 0.4,
        explanation: 'Dedicated home office space',
      });
    }

    if (preferences.lifestyle.entertainment && amenities.theater) {
      amenityCount++;
      reasons.push({
        category: 'amenities',
        factor: 'theater',
        impact: 'positive',
        weight: 0.3,
        explanation: 'Home theater for entertainment',
      });
    }

    score = Math.min(amenityCount * 0.3, 1.0);

    return { score, reasons };
  }

  private scoreSchools(property: PropertyFeatures, preferences: LeadPreferences): { score: number; reasons: any[] } {
    const reasons: any[] = [];
    let score = 0;

    if (!preferences.lifestyle.schools.important) {
      return { score: 0.5, reasons: [] }; // Neutral if schools not important
    }

    const schoolRating = property.location.schoolRating;
    const minRating = preferences.lifestyle.schools.rating;

    if (schoolRating >= minRating + 2) {
      score += 0.8;
      reasons.push({
        category: 'schools',
        factor: 'excellent_rating',
        impact: 'positive',
        weight: 0.8,
        explanation: `Excellent school rating: ${schoolRating}/10`,
      });
    } else if (schoolRating >= minRating) {
      score += 0.5;
      reasons.push({
        category: 'schools',
        factor: 'good_rating',
        impact: 'positive',
        weight: 0.5,
        explanation: `Good school rating: ${schoolRating}/10`,
      });
    } else {
      score -= 0.3;
      reasons.push({
        category: 'schools',
        factor: 'low_rating',
        impact: 'negative',
        weight: 0.3,
        explanation: `School rating below preference: ${schoolRating}/10`,
      });
    }

    return { score, reasons };
  }

  private scoreTransportation(property: PropertyFeatures, preferences: LeadPreferences): { score: number; reasons: any[] } {
    const reasons: any[] = [];
    let score = 0;

    const transport = preferences.lifestyle.transportation;

    // Public transit
    if (transport.publicTransit && property.location.transitScore >= 70) {
      score += 0.4;
      reasons.push({
        category: 'transportation',
        factor: 'public_transit',
        impact: 'positive',
        weight: 0.4,
        explanation: `Good public transit access: ${property.location.transitScore}/100`,
      });
    }

    // Highway access
    if (transport.highway && property.location.commuteTimes.nearestHighway <= 10) {
      score += 0.3;
      reasons.push({
        category: 'transportation',
        factor: 'highway_access',
        impact: 'positive',
        weight: 0.3,
        explanation: `Quick highway access: ${property.location.commuteTimes.nearestHighway} minutes`,
      });
    }

    // Walkability
    if (transport.walkability >= 80 && property.location.walkScore >= transport.walkability) {
      score += 0.3;
      reasons.push({
        category: 'transportation',
        factor: 'walkability',
        impact: 'positive',
        weight: 0.3,
        explanation: `Excellent walkability: ${property.location.walkScore}/100`,
      });
    }

    return { score, reasons };
  }

  private scoreLifestyle(property: PropertyFeatures, preferences: LeadPreferences): { score: number; reasons: any[] } {
    const reasons: any[] = [];
    let score = 0;

    const lifestyle = preferences.lifestyle;

    // Family-friendly
    if (lifestyle.familySize > 0 && property.lifestyle.familyFriendly) {
      score += 0.4;
      reasons.push({
        category: 'lifestyle',
        factor: 'family_friendly',
        impact: 'positive',
        weight: 0.4,
        explanation: 'Family-friendly neighborhood and property',
      });
    }

    // Pet-friendly
    if (lifestyle.pets && property.lifestyle.petFriendly) {
      score += 0.3;
      reasons.push({
        category: 'lifestyle',
        factor: 'pet_friendly',
        impact: 'positive',
        weight: 0.3,
        explanation: 'Pet-friendly property',
      });
    }

    // Work from home
    if (lifestyle.workFromHome && property.amenities.office) {
      score += 0.3;
      reasons.push({
        category: 'lifestyle',
        factor: 'work_from_home',
        impact: 'positive',
        weight: 0.3,
        explanation: 'Suitable for working from home',
      });
    }

    return { score, reasons };
  }

  private applyBoostFactors(baseScore: number, property: PropertyFeatures): number {
    let boostedScore = baseScore;
    const boostFactors = this.config.preferences.boostFactors;

    // Recently listed boost
    if (property.basic.daysOnMarket <= 7) {
      boostedScore += boostFactors.recentlyListed * 0.1;
    }

    // Price reduced boost
    if (property.market.priceHistory.length > 1) {
      const latestPrice = property.market.priceHistory[property.market.priceHistory.length - 1].price;
      const previousPrice = property.market.priceHistory[property.market.priceHistory.length - 2].price;
      
      if (latestPrice < previousPrice) {
        boostedScore += boostFactors.priceReduced * 0.1;
      }
    }

    // Hot market boost
    if (property.market.marketTrend === 'rising') {
      boostedScore += boostFactors.hotMarket * 0.05;
    }

    return Math.min(boostedScore, 1.0);
  }

  private calculateConfidence(reasons: any[]): number {
    if (reasons.length === 0) return 0;

    const totalWeight = reasons.reduce((sum, reason) => sum + reason.weight, 0);
    const positiveWeight = reasons
      .filter(r => r.impact === 'positive')
      .reduce((sum, reason) => sum + reason.weight, 0);

    return totalWeight > 0 ? positiveWeight / totalWeight : 0;
  }

  private generateRecommendations(property: PropertyFeatures, preferences: LeadPreferences, reasons: any[]): string[] {
    const recommendations: string[] = [];

    // Based on positive factors
    const positiveReasons = reasons.filter(r => r.impact === 'positive');
    
    if (positiveReasons.some(r => r.category === 'location')) {
      recommendations.push('Excellent location - act quickly in this competitive market');
    }

    if (positiveReasons.some(r => r.category === 'price' && r.factor === 'market_value')) {
      recommendations.push('Priced below market value - good investment opportunity');
    }

    if (property.basic.daysOnMarket < 14) {
      recommendations.push('Recently listed - schedule viewing soon');
    }

    return recommendations;
  }

  private generateWarnings(property: PropertyFeatures, preferences: LeadPreferences, reasons: any[]): string[] {
    const warnings: string[] = [];

    // Based on negative factors
    const negativeReasons = reasons.filter(r => r.impact === 'negative');
    
    if (negativeReasons.some(r => r.category === 'price')) {
      warnings.push('Price may be above market value - consider negotiation');
    }

    if (negativeReasons.some(r => r.category === 'features' && r.factor === 'deal_breaker')) {
      warnings.push('Property has deal-breaker features - review carefully');
    }

    if (property.basic.daysOnMarket > 90) {
      warnings.push('Property on market for extended time - investigate why');
    }

    return warnings;
  }

  private async generateAIInsights(property: PropertyFeatures, preferences: LeadPreferences, reasons: any[]): Promise<any> {
    // This would call an AI service to generate insights
    return {
      summary: 'This property offers excellent value in a desirable neighborhood with good schools and transportation access.',
      highlights: [
        'Great location for families',
        'Well-maintained with modern updates',
        'Strong investment potential',
      ],
      concerns: [
        'May need minor cosmetic updates',
        'Backyard smaller than comparable properties',
      ],
      marketAdvice: 'Given the rising market trend, this property represents a solid investment opportunity with good appreciation potential.',
    };
  }

  private generateBasicInsights(property: PropertyFeatures, preferences: LeadPreferences, reasons: any[]): any {
    const positiveReasons = reasons.filter(r => r.impact === 'positive');
    const negativeReasons = reasons.filter(r => r.impact === 'negative');

    return {
      summary: `Property scores ${positiveReasons.length} positive factors vs ${negativeReasons.length} concerns`,
      highlights: positiveReasons.slice(0, 3).map(r => r.explanation),
      concerns: negativeReasons.slice(0, 3).map(r => r.explanation),
      marketAdvice: property.market.marketTrend === 'rising' ? 
        'Good time to buy in rising market' : 
        'Market conditions stable - reasonable pricing expected',
    };
  }

  private generateMatchAnalytics(matches: PropertyMatch[]): any {
    if (matches.length === 0) {
      return {
        averageScore: 0,
        scoreDistribution: {},
        topCategories: [],
        recommendations: ['Consider adjusting preferences to see more matches'],
      };
    }

    const averageScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
    
    const scoreDistribution = {
      excellent: matches.filter(m => m.score >= 0.8).length,
      good: matches.filter(m => m.score >= 0.6 && m.score < 0.8).length,
      fair: matches.filter(m => m.score >= 0.4 && m.score < 0.6).length,
      poor: matches.filter(m => m.score < 0.4).length,
    };

    const categoryScores = new Map<string, number[]>();
    matches.forEach(match => {
      match.reasons.forEach(reason => {
        if (!categoryScores.has(reason.category)) {
          categoryScores.set(reason.category, []);
        }
        categoryScores.get(reason.category)!.push(reason.weight);
      });
    });

    const topCategories = Array.from(categoryScores.entries())
      .map(([category, scores]) => ({
        category,
        avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);

    return {
      averageScore,
      scoreDistribution,
      topCategories,
      recommendations: [
        'Focus on properties with scores above 0.7',
        'Consider properties with strong location scores',
        'Review deal-breaker features carefully',
      ],
    };
  }

  private async applyLearningAdjustments(matches: PropertyMatch[], leadId: string): Promise<void> {
    // Apply machine learning based on historical feedback
    const learningData = this.learningData.get(leadId);
    
    if (learningData) {
      // Adjust scores based on past interactions
      matches.forEach(match => {
        // Apply learning adjustments
        const adjustment = this.calculateLearningAdjustment(match, learningData);
        match.score = Math.min(Math.max(match.score + adjustment, 0), 1);
      });
    }
  }

  private calculateLearningAdjustment(match: PropertyMatch, learningData: any): number {
    // Calculate score adjustment based on learning data
    return 0; // Placeholder
  }

  private async loadLearningData(): Promise<void> {
    // Load machine learning data
    this.logger.info('Loading learning data for property matching');
  }

  private async storeMatchingResult(result: MatchingResult): Promise<void> {
    // Store result for future learning
    this.logger.info('Storing matching result for learning', { leadId: result.leadId });
  }

  // Feedback and learning
  async provideFeedback(leadId: string, propertyId: string, feedback: {
    liked: boolean;
    viewed: boolean;
    contacted: boolean;
    reasons?: string[];
  }): Promise<void> {
    try {
      this.logger.info('Recording property feedback', { leadId, propertyId, feedback });

      // Update learning data
      const learningData = this.learningData.get(leadId) || {};
      learningData[propertyId] = {
        ...feedback,
        timestamp: new Date(),
      };

      this.learningData.set(leadId, learningData);

      // Update models if enough data collected
      if (this.config.learning.enabled) {
        await this.updateLearningModels(leadId);
      }
    } catch (error) {
      this.logger.error('Failed to record property feedback', error);
      throw error;
    }
  }

  private async updateLearningModels(leadId: string): Promise<void> {
    // Update machine learning models with new feedback
    this.logger.info('Updating learning models', { leadId });
  }

  // Cleanup
  cleanup(): void {
    this.learningData.clear();
    this.logger.info('Property matching engine cleaned up');
  }
}
