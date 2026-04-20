// Basic emoji metadata used for improved search.
// This list is intentionally small and focused on common emoji
// but can be extended freely; entries should have:
// { emoji: "😄", name: "grinning face with smiling eyes", keywords: ["smile","happy","joy"] }

export const EMOJI_METADATA = [
  // Smileys & Emotion
  { emoji: "😀", name: "grinning face", keywords: ["smile", "happy", "joy", "face"] },
  { emoji: "😃", name: "grinning face with big eyes", keywords: ["smile", "happy", "joy", "face"] },
  { emoji: "😄", name: "grinning face with smiling eyes", keywords: ["smile", "happy", "laugh", "joy", "face"] },
  { emoji: "😁", name: "beaming face with smiling eyes", keywords: ["smile", "grin", "happy", "joy", "face"] },
  { emoji: "😆", name: "grinning squinting face", keywords: ["laugh", "lol", "haha", "face"] },
  { emoji: "😅", name: "grinning face with sweat", keywords: ["nervous", "relief", "sweat", "face"] },
  { emoji: "😂", name: "face with tears of joy", keywords: ["lol", "laugh", "cry", "happy", "funny"] },
  { emoji: "🤣", name: "rolling on the floor laughing", keywords: ["rofl", "laugh", "lol", "funny"] },
  { emoji: "😊", name: "smiling face with smiling eyes", keywords: ["smile", "happy", "warm", "blush"] },
  { emoji: "😇", name: "smiling face with halo", keywords: ["angel", "innocent", "good"] },
  { emoji: "🙂", name: "slightly smiling face", keywords: ["smile", "happy", "face"] },
  { emoji: "🙃", name: "upside-down face", keywords: ["sarcasm", "joking", "playful"] },
  { emoji: "😉", name: "winking face", keywords: ["wink", "flirt", "playful"] },
  { emoji: "😍", name: "smiling face with heart-eyes", keywords: ["love", "heart", "in love", "crush"] },
  { emoji: "😘", name: "face blowing a kiss", keywords: ["kiss", "love"] },
  { emoji: "😗", name: "kissing face", keywords: ["kiss", "love"] },
  { emoji: "😙", name: "kissing face with smiling eyes", keywords: ["kiss", "smile", "love"] },
  { emoji: "😚", name: "kissing face with closed eyes", keywords: ["kiss", "love", "shy"] },
  { emoji: "😋", name: "face savoring food", keywords: ["yummy", "delicious", "food"] },
  { emoji: "😜", name: "winking face with tongue", keywords: ["playful", "joke", "silly"] },
  { emoji: "🤪", name: "zany face", keywords: ["crazy", "goofy", "silly"] },
  { emoji: "😎", name: "smiling face with sunglasses", keywords: ["cool", "swag", "sunglasses"] },
  { emoji: "🤩", name: "star-struck", keywords: ["star", "amazed", "excited"] },
  { emoji: "🥰", name: "smiling face with hearts", keywords: ["love", "hearts", "in love"] },
  { emoji: "😡", name: "pouting face", keywords: ["angry", "mad", "furious"] },
  { emoji: "😢", name: "crying face", keywords: ["sad", "cry", "tears"] },
  { emoji: "😭", name: "loudly crying face", keywords: ["sad", "cry", "sob", "tears"] },
  { emoji: "😱", name: "face screaming in fear", keywords: ["scared", "shock", "horror"] },
  { emoji: "😴", name: "sleeping face", keywords: ["sleep", "tired", "zzz"] },
  { emoji: "🤔", name: "thinking face", keywords: ["think", "hmm", "question"] },
  { emoji: "🤨", name: "face with raised eyebrow", keywords: ["skeptical", "suspicious"] },
  { emoji: "🤯", name: "exploding head", keywords: ["mind blown", "mindblown", "shock", "wow"] },
  { emoji: "🤮", name: "face vomiting", keywords: ["barf", "puke", "sick", "vomit"] },

  // Hearts / symbols
  { emoji: "❤️", name: "red heart", keywords: ["heart", "love", "like", "favorite"] },
  { emoji: "🧡", name: "orange heart", keywords: ["heart", "love", "orange"] },
  { emoji: "💛", name: "yellow heart", keywords: ["heart", "love", "friend"] },
  { emoji: "💚", name: "green heart", keywords: ["heart", "eco", "environment"] },
  { emoji: "💙", name: "blue heart", keywords: ["heart", "trust", "loyal"] },
  { emoji: "💜", name: "purple heart", keywords: ["heart", "love", "purple"] },
  { emoji: "🖤", name: "black heart", keywords: ["heart", "goth", "dark"] },
  { emoji: "💖", name: "sparkling heart", keywords: ["heart", "love", "sparkle"] },
  { emoji: "💕", name: "two hearts", keywords: ["heart", "love", "affection"] },
  { emoji: "💘", name: "heart with arrow", keywords: ["heart", "cupid", "love"] },

  // Hands / gestures
  { emoji: "👍", name: "thumbs up", keywords: ["like", "approve", "ok", "yes"] },
  { emoji: "👎", name: "thumbs down", keywords: ["dislike", "no", "bad"] },
  { emoji: "👌", name: "OK hand", keywords: ["ok", "fine", "perfect"] },
  { emoji: "✌️", name: "victory hand", keywords: ["peace", "victory", "v sign"] },
  { emoji: "🙏", name: "folded hands", keywords: ["thanks", "thank you", "please", "pray"] },
  { emoji: "👏", name: "clapping hands", keywords: ["clap", "applause", "bravo", "congrats"] },

  // People
  { emoji: "👋", name: "waving hand", keywords: ["wave", "hello", "hi", "bye"] },
  { emoji: "🙌", name: "raising hands", keywords: ["hooray", "celebrate", "praise"] },
  { emoji: "💁‍♀️", name: "woman tipping hand", keywords: ["sassy", "information", "help"] },
  { emoji: "🙆‍♂️", name: "man gesturing OK", keywords: ["ok", "gesture", "yes"] },

  // Animals & Nature
  { emoji: "🐶", name: "dog face", keywords: ["dog", "puppy", "pet", "animal"] },
  { emoji: "🐱", name: "cat face", keywords: ["cat", "kitty", "pet", "animal"] },
  { emoji: "🐭", name: "mouse face", keywords: ["mouse", "rodent", "animal"] },
  { emoji: "🐹", name: "hamster face", keywords: ["hamster", "pet", "animal"] },
  { emoji: "🐰", name: "rabbit face", keywords: ["rabbit", "bunny", "animal"] },
  { emoji: "🦊", name: "fox face", keywords: ["fox", "animal"] },
  { emoji: "🐻", name: "bear face", keywords: ["bear", "animal"] },
  { emoji: "🐼", name: "panda face", keywords: ["panda", "bear", "animal"] },
  { emoji: "🐨", name: "koala", keywords: ["koala", "bear", "animal"] },
  { emoji: "🐯", name: "tiger face", keywords: ["tiger", "animal", "cat"] },
  { emoji: "🦁", name: "lion face", keywords: ["lion", "animal", "cat"] },
  { emoji: "🐸", name: "frog", keywords: ["frog", "animal"] },
  { emoji: "🐵", name: "monkey face", keywords: ["monkey", "animal"] },

  // Food & Drink
  { emoji: "🍎", name: "red apple", keywords: ["apple", "fruit", "food"] },
  { emoji: "🍌", name: "banana", keywords: ["banana", "fruit", "food"] },
  { emoji: "🍇", name: "grapes", keywords: ["grapes", "fruit", "food"] },
  { emoji: "🍕", name: "pizza", keywords: ["pizza", "food", "slice"] },
  { emoji: "🍔", name: "hamburger", keywords: ["burger", "hamburger", "food"] },
  { emoji: "🍟", name: "french fries", keywords: ["fries", "food"] },
  { emoji: "🌭", name: "hot dog", keywords: ["hotdog", "sausage", "food"] },
  { emoji: "🍣", name: "sushi", keywords: ["sushi", "japanese", "food"] },
  { emoji: "🍩", name: "doughnut", keywords: ["donut", "doughnut", "dessert"] },
  { emoji: "🎂", name: "birthday cake", keywords: ["cake", "birthday", "dessert"] },

  // Travel & Places
  { emoji: "✈️", name: "airplane", keywords: ["airplane", "flight", "travel", "plane"] },
  { emoji: "🚗", name: "automobile", keywords: ["car", "auto", "vehicle"] },
  { emoji: "🚕", name: "taxi", keywords: ["taxi", "cab", "car"] },
  { emoji: "🚙", name: "sport utility vehicle", keywords: ["suv", "car", "vehicle"] },
  { emoji: "🚀", name: "rocket", keywords: ["rocket", "space", "ship", "launch"] },
  { emoji: "🛳️", name: "passenger ship", keywords: ["ship", "boat", "cruise"] },

  // Objects / misc symbols
  { emoji: "⭐", name: "star", keywords: ["star", "favorite", "favorite"] },
  { emoji: "🌟", name: "glowing star", keywords: ["star", "glow", "bright"] },
  { emoji: "✨", name: "sparkles", keywords: ["sparkle", "magic", "stars"] },
  { emoji: "⚡", name: "high voltage", keywords: ["lightning", "electric", "zap"] },
  { emoji: "🔥", name: "fire", keywords: ["fire", "lit", "hot", "flame"] },
  { emoji: "💧", name: "droplet", keywords: ["water", "drop"] },
  { emoji: "❄️", name: "snowflake", keywords: ["snow", "winter", "cold"] },
  { emoji: "🎉", name: "party popper", keywords: ["party", "celebration", "congrats"] },
  { emoji: "🎁", name: "wrapped gift", keywords: ["gift", "present", "birthday", "christmas"] },
  { emoji: "✅", name: "check mark button", keywords: ["check", "done", "complete", "yes"] },
  { emoji: "❌", name: "cross mark", keywords: ["x", "no", "wrong", "error"] }
];

