export const topStockKeywords = [
  "nobody", "no people", "copy space", "horizontal", "vertical", "outdoors", "indoors",
  "day", "night", "light", "shadow", "color", "colorful", "bright", "background",
  "texture", "pattern", "abstract", "nature", "business", "technology", "people",
  "lifestyle", "concept", "conceptual", "illustration", "vector", "design", "art",
  "modern", "vintage", "retro", "style", "fashion", "beauty", "health", "medical",
  "science", "education", "travel", "vacation", "summer", "winter", "autumn", "spring",
  "food", "drink", "healthy", "fresh", "organic", "natural", "green", "blue", "red",
  "yellow", "white", "black", "dark", "happy", "success", "team", "work", "office",
  "computer", "internet", "communication", "global", "network", "security", "data",
  "finance", "money", "growth", "future", "innovation", "creative", "idea", "solution",
  "problem", "challenge", "goal", "target", "strategy", "plan", "project", "management",
  "leadership", "teamwork", "partnership", "collaboration", "meeting", "conference",
  "presentation", "training", "learning", "teaching", "school", "university", "student",
  "teacher", "book", "library", "reading", "writing", "paper", "document", "contract",
  "agreement", "law", "justice", "court", "judge", "lawyer", "police", "crime",
  "security", "safety", "protection", "insurance", "risk", "danger", "emergency",
  "hospital", "doctor", "nurse", "patient", "medicine", "pill", "drug", "virus",
  "bacteria", "infection", "disease", "illness", "pain", "injury", "accident", "help",
  "support", "care", "love", "family", "friend", "relationship", "couple", "man",
  "woman", "child", "baby", "boy", "girl", "senior", "adult", "young", "old"
];

export function getFallbackKeywords(needed: number, existing: string[], singleWord?: boolean): string[] {
  if (needed <= 0) return [];
  
  // Filter out existing keywords from the top list
  let available = topStockKeywords.filter(k => !existing.includes(k.toLowerCase()));
  
  if (singleWord) {
    // Exclude any fallback keyword with spaces if singleWord is true
    available = available.filter(k => !k.includes(' '));
  }
  
  // Return the needed amount (randomized or top? let's take top for relevance/popularity)
  // Actually, randomizing slightly is better to avoid identical keywords for every image
  const shuffled = available.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, needed);
}
