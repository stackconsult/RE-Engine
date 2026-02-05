import { MessageClassifier, IngestMessage } from "../ingest/types.ts";
import { logger } from "../observability/logger.ts";

export interface ClassificationResult {
  isHotReply: boolean;
  leadId?: string;
  category: "inquiry" | "reply" | "spam" | "unknown";
  confidence: number;
  keywords: string[];
}

export class ClassifierService implements MessageClassifier {
  private hotKeywords = [
    "urgent", "asap", "immediately", "now", "today", "call me", "phone",
    "interested", "ready", "buy", "purchase", "offer", "sign", "contract",
    "viewing", "showing", "visit", "see", "tour", "appointment", "meet"
  ];

  private inquiryKeywords = [
    "information", "details", "price", "cost", "available", "listing",
    "property", "home", "house", "real estate", "rent", "sale", "buy",
    "square feet", "bedrooms", "bathrooms", "location", "address"
  ];

  private spamKeywords = [
    "click here", "buy now", "free", "winner", "congratulations",
    "limited time", "act now", "special promotion", "make money",
    "work from home", "viagra", "casino", "lottery", "prize"
  ];

  async classify(message: IngestMessage): Promise<ClassificationResult> {
    const text = message.body.toLowerCase();
    const subject = (message.subject || "").toLowerCase();
    const fullText = `${subject} ${text}`;

    // Extract keywords
    const keywords = this.extractKeywords(fullText);
    
    // Calculate confidence scores
    const hotScore = this.calculateScore(keywords, this.hotKeywords);
    const inquiryScore = this.calculateScore(keywords, this.inquiryKeywords);
    const spamScore = this.calculateScore(keywords, this.spamKeywords);

    // Determine category
    let category: "inquiry" | "reply" | "spam" | "unknown";
    let confidence: number;

    if (spamScore > 0.3) {
      category = "spam";
      confidence = spamScore;
    } else if (hotScore > 0.4) {
      category = "inquiry";
      confidence = hotScore;
    } else if (inquiryScore > 0.2) {
      category = "inquiry";
      confidence = inquiryScore;
    } else {
      category = "unknown";
      confidence = 0.1;
    }

    // Determine if it's a hot reply
    const isHotReply = hotScore > 0.5 || this.hasUrgentIndicators(fullText);

    const result = {
      isHotReply,
      category,
      confidence,
      keywords
    };

    logger.debug({
      messageId: message.id,
      category,
      confidence,
      isHotReply,
      keywords
    }, "Message classified");

    return result;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Remove common stop words
    const stopWords = new Set([
      "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
      "by", "from", "up", "about", "into", "through", "during", "before",
      "after", "above", "below", "between", "among", "under", "over", "above",
      "again", "further", "then", "once", "here", "there", "when", "where",
      "why", "how", "all", "any", "both", "each", "few", "more", "most",
      "other", "some", "such", "no", "nor", "not", "only", "own", "same",
      "so", "than", "too", "very", "can", "will", "just", "don", "should",
      "now", "i", "me", "my", "we", "us", "our", "you", "your", "he", "him",
      "his", "she", "her", "it", "its", "they", "them", "their", "what",
      "which", "who", "whom", "this", "that", "these", "those", "am", "is",
      "are", "was", "were", "be", "been", "being", "have", "has", "had",
      "having", "do", "does", "did", "doing", "would", "should", "could",
      "ought", "a", "an", "i'm", "you're", "we're", "they're", "it's",
      "that's", "there's", "here's", "what's", "who's", "where's", "when's"
    ]);

    return words.filter(word => !stopWords.has(word));
  }

  private calculateScore(keywords: string[], targetKeywords: string[]): number {
    if (keywords.length === 0) return 0;

    const matches = keywords.filter(keyword => 
      targetKeywords.some(target => target.includes(keyword) || keyword.includes(target))
    );

    return matches.length / keywords.length;
  }

  private hasUrgentIndicators(text: string): boolean {
    const urgentPatterns = [
      /\b(urgent|asap|immediately|now|today|call me)\b/i,
      /\b(phone|cell|mobile)\s*\d+/i,
      /\d{1,2}[:]\d{2}\s*(am|pm)/i, // Time references
      /\b(this week|this weekend|tomorrow|tonight)\b/i
    ];

    return urgentPatterns.some(pattern => pattern.test(text));
  }

  // Advanced classification methods (can be enhanced with ML)
  async classifyBatch(messages: IngestMessage[]): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];
    
    for (const message of messages) {
      const result = await this.classify(message);
      results.push(result);
    }

    return results;
  }

  // Lead identification from message content
  async identifyLead(message: IngestMessage): Promise<string | null> {
    // Extract potential identifiers like phone numbers, emails, names
    const text = message.body.toLowerCase();
    
    // Phone number pattern
    const phoneMatch = text.match(/\b(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/);
    if (phoneMatch) {
      return phoneMatch[0];
    }

    // Email pattern
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      return emailMatch[0];
    }

    return null;
  }
}
