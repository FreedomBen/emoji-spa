// Storage keys, limits, and category definitions for Emoji Spa.

// Storage keys (versioned)
const String usageStorageKey = 'emojiUsage.v1';
const String themeStorageKey = 'emojiThemePreference.v1';

// Theme values
const String themeSystem = 'system';
const String themeLight = 'light';
const String themeDark = 'dark';

// Usage section limits
const int recentLimit = 50;
const int frequentLimit = 50;
const int frequentMinCount = 2;

// Keyboard tooltip delay
const int keyboardTooltipDelayMs = 1000;

// Throttled save delay
const int saveThrottleMs = 1000;

// Category keywords for search matching
const Map<String, List<String>> categoryKeywords = {
  'Smileys & Emotion': ['smile', 'smiley', 'emoji', 'happy', 'sad', 'angry', 'cry', 'laugh', 'emotion', 'face'],
  'People & Body': ['person', 'people', 'body', 'gesture', 'hand', 'human'],
  'Animals & Nature': ['animal', 'nature', 'pet', 'wildlife', 'plant', 'tree'],
  'Food & Drink': ['food', 'drink', 'snack', 'meal', 'fruit', 'dessert'],
  'Travel & Places': ['travel', 'place', 'building', 'city', 'landmark'],
  'Transport & Map': ['transport', 'vehicle', 'car', 'bike', 'train', 'bus', 'map'],
  'Alchemical Symbols': ['symbol', 'alchemy'],
  'Geometric Symbols': ['shape', 'symbol', 'geometric'],
  'Supplemental Arrows': ['arrow', 'direction'],
  'Supplemental Symbols & Pictographs': ['symbol', 'icon', 'pictograph'],
  'Symbols & Pictographs Extended-A': ['symbol', 'icon', 'pictograph'],
  'Misc Symbols': ['symbol', 'misc', 'various'],
  'Dingbats': ['dingbat', 'symbol', 'decorative'],
  'Regional Indicators': ['flag', 'country', 'region'],
  'Other Emoji': ['emoji', 'symbol'],
};

// Category code point ranges (order matches getCategory evaluation order)
const List<CategoryRange> categoryRanges = [
  CategoryRange('Smileys & Emotion', 0x1F600, 0x1F64F),
  CategoryRange('People & Body', 0x1F466, 0x1F487),
  CategoryRange('Animals & Nature', 0x1F400, 0x1F4D3),
  CategoryRange('Food & Drink', 0x1F347, 0x1F37F),
  CategoryRange('Travel & Places', 0x1F3E0, 0x1F3FF),
  CategoryRange('Transport & Map', 0x1F680, 0x1F6FF),
  CategoryRange('Alchemical Symbols', 0x1F700, 0x1F77F),
  CategoryRange('Geometric Symbols', 0x1F780, 0x1F7FF),
  CategoryRange('Supplemental Arrows', 0x1F800, 0x1F8FF),
  CategoryRange('Supplemental Symbols & Pictographs', 0x1F900, 0x1F9FF),
  CategoryRange('Symbols & Pictographs Extended-A', 0x1FA00, 0x1FAFF),
  CategoryRange('Misc Symbols', 0x2600, 0x26FF),
  CategoryRange('Dingbats', 0x2700, 0x27BF),
  CategoryRange('Regional Indicators', 0x1F1E6, 0x1F1FF),
];

class CategoryRange {
  final String name;
  final int start;
  final int end;

  const CategoryRange(this.name, this.start, this.end);
}
