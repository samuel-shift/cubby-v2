// ─── Cubby V2 — Grocery Data ───────────────────────────────────────────────
// Ported from V1 constants.ts — 800+ UK grocery suggestions, aisle categories,
// fridge keywords, quick-stock starter items, and starter recipes.
// Used by: Typeahead, Quick Stock onboarding, shopping aisle sorting, manual entry.

// ─── Quick Stock — 35 most common UK household items ─────────────────────────
// Tappable during onboarding to pre-populate the user's pantry.

export interface QuickStockItem {
  name: string;
  category: string;
  location: "FRIDGE" | "FREEZER" | "PANTRY" | "COUNTER" | "CUPBOARD";
  emoji: string;
}

export const QUICK_STOCK_ITEMS: QuickStockItem[] = [
  // Fridge staples
  { name: "Semi-Skimmed Milk",    category: "Dairy & Eggs",         location: "FRIDGE",   emoji: "🥛" },
  { name: "Butter",               category: "Dairy & Eggs",         location: "FRIDGE",   emoji: "🧈" },
  { name: "Eggs",                 category: "Dairy & Eggs",         location: "FRIDGE",   emoji: "🥚" },
  { name: "Cheddar Cheese",       category: "Dairy & Eggs",         location: "FRIDGE",   emoji: "🧀" },
  { name: "Chicken Breast",       category: "Meat & Fish",          location: "FRIDGE",   emoji: "🍗" },
  { name: "Bacon",                category: "Meat & Fish",          location: "FRIDGE",   emoji: "🥓" },
  { name: "Yoghurt",              category: "Dairy & Eggs",         location: "FRIDGE",   emoji: "🍶" },
  { name: "Carrots",              category: "Fresh Produce",        location: "FRIDGE",   emoji: "🥕" },
  { name: "Cucumber",             category: "Fresh Produce",        location: "FRIDGE",   emoji: "🥒" },
  { name: "Lettuce",              category: "Fresh Produce",        location: "FRIDGE",   emoji: "🥬" },
  { name: "Tomatoes",             category: "Fresh Produce",        location: "FRIDGE",   emoji: "🍅" },
  { name: "Peppers",              category: "Fresh Produce",        location: "FRIDGE",   emoji: "🫑" },
  // Counter / fruit bowl
  { name: "Bananas",              category: "Fresh Produce",        location: "COUNTER",  emoji: "🍌" },
  { name: "Apples",               category: "Fresh Produce",        location: "COUNTER",  emoji: "🍎" },
  { name: "Onions",               category: "Fresh Produce",        location: "COUNTER",  emoji: "🧅" },
  { name: "Garlic",               category: "Fresh Produce",        location: "COUNTER",  emoji: "🧄" },
  { name: "Potatoes",             category: "Fresh Produce",        location: "COUNTER",  emoji: "🥔" },
  // Cupboard / pantry staples
  { name: "Bread",                category: "Bakery",               location: "CUPBOARD", emoji: "🍞" },
  { name: "Pasta",                category: "Pasta, Rice & Grains", location: "CUPBOARD", emoji: "🍝" },
  { name: "Rice",                 category: "Pasta, Rice & Grains", location: "CUPBOARD", emoji: "🍚" },
  { name: "Tinned Tomatoes",      category: "Tins & Cans",          location: "CUPBOARD", emoji: "🥫" },
  { name: "Baked Beans",          category: "Tins & Cans",          location: "CUPBOARD", emoji: "🫘" },
  { name: "Olive Oil",            category: "Condiments & Sauces",  location: "CUPBOARD", emoji: "🫒" },
  { name: "Salt",                 category: "Condiments & Sauces",  location: "CUPBOARD", emoji: "🧂" },
  { name: "Black Pepper",         category: "Condiments & Sauces",  location: "CUPBOARD", emoji: "🌶️" },
  { name: "Tea Bags",             category: "Drinks",               location: "CUPBOARD", emoji: "🍵" },
  { name: "Coffee",               category: "Drinks",               location: "CUPBOARD", emoji: "☕" },
  { name: "Sugar",                category: "Condiments & Sauces",  location: "CUPBOARD", emoji: "🍬" },
  { name: "Plain Flour",          category: "Pasta, Rice & Grains", location: "CUPBOARD", emoji: "🌾" },
  { name: "Ketchup",              category: "Condiments & Sauces",  location: "CUPBOARD", emoji: "🍅" },
  { name: "Cereal",               category: "Pasta, Rice & Grains", location: "CUPBOARD", emoji: "🥣" },
  // Freezer
  { name: "Frozen Peas",          category: "Frozen",               location: "FREEZER",  emoji: "🧊" },
  { name: "Frozen Chips",         category: "Frozen",               location: "FREEZER",  emoji: "🍟" },
  { name: "Ice Cream",            category: "Frozen",               location: "FREEZER",  emoji: "🍦" },
  { name: "Fish Fingers",         category: "Frozen",               location: "FREEZER",  emoji: "🐟" },
];

// ─── Aisle Categories (keyword-based auto-sort) ─────────────────────────────

export interface AisleCategory {
  key: string;
  label: string;
  emoji: string;
  keywords: string[];
}

export const AISLE_CATEGORIES: AisleCategory[] = [
  {
    key: "produce",
    label: "Fresh Produce",
    emoji: "🥬",
    keywords: [
      "apple", "banana", "berry", "berries", "broccoli", "carrot", "celery",
      "courgette", "cucumber", "garlic", "ginger", "grape", "herb", "kale",
      "leek", "lemon", "lettuce", "lime", "mango", "mushroom", "onion",
      "orange", "parsley", "pea", "pepper", "potato", "salad", "spinach",
      "spring onion", "strawberry", "tomato", "asparagus", "avocado", "basil",
      "chilli", "coriander", "fruit", "vegetable", "veg", "leaf", "fresh",
      "aubergine", "beetroot", "cabbage", "cauliflower", "corn", "fennel",
      "parsnip", "radish", "rocket", "sweetcorn", "turnip", "watercress",
    ],
  },
  {
    key: "meat",
    label: "Meat & Fish",
    emoji: "🥩",
    keywords: [
      "bacon", "beef", "chicken", "cod", "duck", "fish", "haddock", "ham",
      "lamb", "mince", "pork", "prawn", "salmon", "sausage", "steak",
      "tuna", "turkey", "anchovy", "mackerel", "sardine", "scallop",
      "shrimp", "trout", "seafood", "meat", "gammon", "venison", "rabbit",
      "lobster", "crab", "mussel", "squid", "octopus",
    ],
  },
  {
    key: "dairy",
    label: "Dairy & Eggs",
    emoji: "🧀",
    keywords: [
      "butter", "cheese", "cream", "creme", "egg", "milk", "parmesan",
      "yoghurt", "yogurt", "mozzarella", "cheddar", "feta", "brie",
      "ricotta", "mascarpone", "crème fraîche", "double cream", "single cream",
      "sour cream", "dairy", "halloumi", "paneer", "quark",
    ],
  },
  {
    key: "bakery",
    label: "Bakery",
    emoji: "🍞",
    keywords: [
      "bagel", "baguette", "bread", "brioche", "bun", "cake", "croissant",
      "flour", "loaf", "muffin", "naan", "pitta", "roll", "toast",
      "tortilla", "wrap", "sourdough", "crumpet", "scone",
    ],
  },
  {
    key: "frozen",
    label: "Frozen",
    emoji: "❄️",
    keywords: ["frozen", "ice cream", "sorbet", "gelato", "fish finger", "potato waffle"],
  },
  {
    key: "pasta",
    label: "Pasta, Rice & Grains",
    emoji: "🍝",
    keywords: [
      "barley", "bulgur", "couscous", "noodle", "oat", "pasta", "polenta",
      "quinoa", "rice", "rye", "spaghetti", "tagliatelle", "penne", "fusilli",
      "grain", "cereal", "porridge", "weetabix", "granola", "muesli",
    ],
  },
  {
    key: "tins",
    label: "Cupboard & Tins",
    emoji: "🥫",
    keywords: [
      "bean", "chickpea", "coconut milk", "lentil", "tinned", "canned",
      "chopped tomato", "passata", "stock", "broth", "soup", "baked bean",
      "kidney bean", "black bean", "tin",
    ],
  },
  {
    key: "condiments",
    label: "Condiments & Sauces",
    emoji: "🫙",
    keywords: [
      "chutney", "curry paste", "honey", "jam", "ketchup", "marmite",
      "mayo", "mayonnaise", "mustard", "oil", "olive oil", "pesto",
      "pickle", "sauce", "soy sauce", "sriracha", "tahini", "vinegar",
      "worcestershire", "salt", "pepper", "spice", "seasoning", "paprika",
      "cumin", "turmeric", "cinnamon", "sugar",
    ],
  },
  {
    key: "drinks",
    label: "Drinks",
    emoji: "🥤",
    keywords: [
      "beer", "coffee", "cordial", "gin", "juice", "lemonade", "tea",
      "water", "wine", "sparkling", "squash", "smoothie", "kombucha",
      "cola", "tonic", "rum", "vodka", "whisky",
    ],
  },
  {
    key: "household",
    label: "Household",
    emoji: "🧹",
    keywords: [
      "bag", "bin", "bleach", "cling film", "detergent", "foil",
      "kitchen roll", "paper towel", "soap", "sponge", "tissue",
      "toilet", "washing", "shampoo", "toothpaste",
    ],
  },
];

// ─── Fridge Keywords (auto-detect fridge items) ─────────────────────────────

export const FRIDGE_KEYWORDS = [
  "milk", "egg", "butter", "cheese", "cream", "yoghurt", "yogurt", "crème",
  "chicken", "beef", "mince", "pork", "lamb", "steak", "bacon", "ham",
  "sausage", "salmon", "fish", "prawn", "tuna", "seafood", "shrimp",
  "lettuce", "salad", "spinach", "rocket", "watercress", "broccoli",
  "carrot", "celery", "courgette", "cucumber", "mushroom", "pepper",
  "fresh herb", "parsley", "coriander", "basil", "tofu", "hummus",
  "dip", "juice", "beer", "wine", "fizzy", "sparkling", "kombucha",
];

export const FREEZER_KEYWORDS = [
  "frozen", "ice cream", "sorbet", "fish finger", "potato waffle",
  "frozen pea", "frozen chip", "frozen pizza",
];

/**
 * Auto-detect the best storage location for an item name.
 */
export function detectStorageLocation(name: string): "FRIDGE" | "FREEZER" | "PANTRY" | "COUNTER" | "CUPBOARD" {
  const lower = name.toLowerCase();
  if (FREEZER_KEYWORDS.some((kw) => lower.includes(kw))) return "FREEZER";
  if (FRIDGE_KEYWORDS.some((kw) => lower.includes(kw))) return "FRIDGE";
  // Counter items (fruit, onions, potatoes, garlic, bananas)
  const counterKeywords = ["banana", "apple", "orange", "lemon", "lime", "onion", "garlic", "potato", "sweet potato"];
  if (counterKeywords.some((kw) => lower.includes(kw))) return "COUNTER";
  return "CUPBOARD";
}

/**
 * Auto-detect the best category for an item name.
 */
export function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const aisle of AISLE_CATEGORIES) {
    if (aisle.keywords.some((kw) => lower.includes(kw))) {
      return aisle.label;
    }
  }
  return "Other";
}

/**
 * Auto-detect the aisle order number for smart shopping list sorting.
 */
export function detectAisleOrder(name: string): number {
  const lower = name.toLowerCase();
  for (let i = 0; i < AISLE_CATEGORIES.length; i++) {
    if (AISLE_CATEGORIES[i].keywords.some((kw) => lower.includes(kw))) {
      return i + 1;
    }
  }
  return 11; // "Other"
}

// ─── Grocery Autocomplete Suggestions (800+) ────────────────────────────────

export const GROCERY_SUGGESTIONS = [
  // Fresh fruit
  "Apples", "Bananas", "Oranges", "Lemons", "Limes", "Grapes",
  "Strawberries", "Raspberries", "Blueberries", "Blackberries", "Cherries",
  "Peaches", "Nectarines", "Plums", "Pears", "Mangoes", "Pineapple",
  "Watermelon", "Melon", "Kiwi fruit", "Pomegranate", "Avocado",
  "Clementines", "Satsumas", "Grapefruit", "Rhubarb",
  // Fresh vegetables
  "Potatoes", "Sweet potatoes", "Onions", "Red onions", "Spring onions",
  "Shallots", "Garlic", "Carrots", "Parsnips", "Turnips", "Swede",
  "Beetroot", "Radishes", "Broccoli", "Cauliflower", "Cabbage",
  "Red cabbage", "Brussels sprouts", "Kale", "Pak choi",
  "Courgette", "Aubergine", "Peppers", "Red peppers", "Green peppers",
  "Chilli peppers", "Jalapeños", "Tomatoes", "Cherry tomatoes",
  "Vine tomatoes", "Cucumber", "Butternut squash", "Pumpkin",
  "Mushrooms", "Chestnut mushrooms", "Portobello mushrooms",
  "Leeks", "Celery", "Fennel", "Asparagus", "Corn on the cob",
  "Sweetcorn", "Peas", "Mangetout", "Sugar snap peas", "Green beans",
  "Edamame", "Spinach", "Baby spinach", "Rocket", "Lettuce",
  "Cos lettuce", "Iceberg lettuce", "Little gem lettuce", "Watercress",
  "Tenderstem broccoli",
  // Fresh herbs
  "Basil", "Flat-leaf parsley", "Coriander", "Mint", "Rosemary",
  "Thyme", "Sage", "Chives", "Dill", "Oregano", "Bay leaves",
  "Lemongrass", "Ginger", "Turmeric root",
  // Meat & poultry
  "Chicken breast", "Chicken thighs", "Chicken drumsticks", "Whole chicken",
  "Chicken wings", "Chicken mince", "Turkey mince", "Turkey breast",
  "Duck breast", "Beef mince", "Beef steak", "Sirloin steak",
  "Ribeye steak", "Fillet steak", "Rump steak", "Beef brisket",
  "Diced beef", "Lamb mince", "Lamb chops", "Lamb leg",
  "Lamb shoulder", "Diced lamb", "Pork mince", "Pork belly",
  "Pork chops", "Pork shoulder", "Pork tenderloin",
  "Sausages", "Pork sausages", "Chipolatas", "Chorizo",
  "Bacon", "Back bacon", "Streaky bacon", "Pancetta", "Lardons",
  "Gammon", "Ham", "Cooked ham", "Prosciutto", "Salami", "Pepperoni",
  // Fish & seafood
  "Salmon fillets", "Smoked salmon", "Cod fillets", "Haddock fillets",
  "Smoked haddock", "Tuna steaks", "Sea bass", "Trout", "Mackerel",
  "Smoked mackerel", "Sardines", "Prawns", "King prawns",
  "Cooked prawns", "Mussels", "Scallops", "Squid",
  // Dairy & eggs
  "Milk", "Semi-skimmed milk", "Skimmed milk", "Whole milk",
  "Oat milk", "Almond milk", "Soya milk", "Coconut milk drink",
  "Butter", "Salted butter", "Unsalted butter", "Spreadable butter",
  "Single cream", "Double cream", "Whipping cream", "Soured cream",
  "Crème fraîche", "Clotted cream",
  "Eggs", "Free-range eggs", "Large eggs",
  "Natural yogurt", "Greek yogurt", "Skyr",
  "Cheddar cheese", "Mature cheddar", "Mild cheddar",
  "Mozzarella", "Parmesan", "Feta cheese", "Brie", "Camembert",
  "Stilton", "Halloumi", "Paneer", "Ricotta", "Mascarpone",
  "Cream cheese", "Cottage cheese", "Goat's cheese",
  // Bread & bakery
  "Bread", "White bread", "Wholemeal bread", "Seeded bread",
  "Sourdough", "Brioche", "Baguette", "Ciabatta", "Focaccia",
  "Pitta bread", "Naan bread", "Flatbreads", "Wraps",
  "Flour tortillas", "Bagels", "English muffins", "Crumpets",
  "Scones", "Croissants", "Pain au chocolat", "Rolls",
  "Burger buns", "Gluten-free bread",
  // Pasta, rice & grains
  "Pasta", "Spaghetti", "Penne", "Fusilli", "Rigatoni",
  "Tagliatelle", "Linguine", "Lasagne sheets", "Orzo",
  "Egg noodles", "Rice noodles", "Udon noodles", "Ramen noodles",
  "Rice", "Basmati rice", "Long grain rice", "Brown rice",
  "Jasmine rice", "Arborio rice", "Microwave rice",
  "Couscous", "Bulgur wheat", "Quinoa",
  "Oats", "Porridge oats", "Polenta", "Breadcrumbs",
  // Tinned & jarred goods
  "Tinned tomatoes", "Chopped tomatoes", "Passata", "Tomato purée",
  "Sun-dried tomatoes", "Tinned tuna", "Tinned salmon",
  "Baked beans", "Chickpeas", "Kidney beans", "Black beans",
  "Butter beans", "Cannellini beans", "Lentils", "Red lentils",
  "Green lentils", "Coconut milk",
  "Olives", "Capers", "Pesto", "Red pesto",
  "Hummus", "Tahini", "Harissa",
  "Curry paste", "Thai red curry paste", "Thai green curry paste",
  "Oyster sauce", "Hoisin sauce", "Soy sauce", "Fish sauce",
  "Worcestershire sauce", "Sriracha", "Sweet chilli sauce",
  "Teriyaki sauce",
  // Condiments & sauces
  "Ketchup", "Mayonnaise", "Mustard", "Dijon mustard",
  "Wholegrain mustard", "English mustard",
  "Horseradish sauce", "Mint sauce", "Cranberry sauce",
  "Gravy granules", "HP sauce", "Brown sauce",
  "Salad cream", "Barbecue sauce",
  // Oils & vinegars
  "Olive oil", "Extra virgin olive oil", "Vegetable oil",
  "Sunflower oil", "Coconut oil", "Sesame oil",
  "Balsamic vinegar", "Red wine vinegar", "White wine vinegar",
  "Apple cider vinegar",
  // Spices & seasonings
  "Salt", "Sea salt", "Black pepper", "Cayenne pepper",
  "Paprika", "Smoked paprika", "Chilli flakes", "Chilli powder",
  "Cumin", "Ground cumin", "Coriander", "Ground coriander",
  "Turmeric", "Cinnamon", "Ground cinnamon", "Ginger",
  "Ground ginger", "Cardamom", "Cloves", "Nutmeg",
  "Fennel seeds", "Mustard seeds", "Sesame seeds",
  "Garam masala", "Curry powder", "Chinese five spice",
  "Star anise", "Mixed herbs", "Italian seasoning",
  "Onion powder", "Garlic powder", "Stock cubes",
  "Chicken stock cubes", "Beef stock cubes", "Vegetable stock cubes",
  "Vanilla extract", "Saffron",
  // Baking
  "Plain flour", "Self-raising flour", "Strong bread flour",
  "Cornflour", "Baking powder", "Bicarbonate of soda",
  "Caster sugar", "Icing sugar", "Granulated sugar",
  "Demerara sugar", "Brown sugar", "Golden syrup", "Maple syrup",
  "Honey", "Treacle", "Cocoa powder", "Dark chocolate",
  "Milk chocolate", "Chocolate chips", "Ground almonds",
  "Desiccated coconut", "Raisins", "Sultanas", "Dried cranberries",
  // Frozen
  "Frozen peas", "Frozen sweetcorn", "Frozen spinach",
  "Frozen chips", "Oven chips", "Potato waffles", "Hash browns",
  "Frozen chicken nuggets", "Frozen fish fingers",
  "Frozen prawns", "Frozen pizza", "Ice cream",
  "Frozen berries",
  // Chilled & deli
  "Cooked chicken", "Coleslaw", "Potato salad",
  "Houmous", "Guacamole", "Salsa", "Sausage rolls", "Scotch eggs",
  "Quiche", "Puff pastry",
  // Drinks
  "Water", "Sparkling water", "Orange juice", "Apple juice",
  "Coffee", "Ground coffee", "Instant coffee",
  "Tea", "Green tea", "Peppermint tea", "Earl Grey",
  "Hot chocolate", "Cola", "Lemonade", "Tonic water",
  "Ginger beer", "Orange squash", "Cordial",
  "Beer", "Lager", "Cider", "Prosecco", "White wine",
  "Red wine", "Rosé wine", "Gin", "Vodka", "Rum", "Whisky",
  // Cereals & breakfast
  "Cornflakes", "Weetabix", "Muesli", "Granola",
  "Coco Pops", "Porridge", "Pancake mix",
  // Snacks
  "Crisps", "Tortilla chips", "Popcorn", "Pretzels",
  "Peanuts", "Mixed nuts", "Chocolate bars",
  "Digestive biscuits", "Hobnobs", "Rich Tea", "Shortbread",
  "Jaffa Cakes", "Flapjacks", "Cereal bars", "Rice cakes",
  // Jams & spreads
  "Strawberry jam", "Marmalade", "Peanut butter",
  "Almond butter", "Nutella", "Marmite", "Honey",
  "Lemon curd",
  // Household staples
  "Washing up liquid", "Dishwasher tablets", "Laundry detergent",
  "Toilet roll", "Kitchen roll", "Bin bags", "Cling film", "Foil",
  "Baking paper", "Sandwich bags", "Freezer bags",
  "Antibacterial spray", "Shampoo", "Toothpaste", "Hand soap",
];

// ─── Starter Recipes (cold-start for Cookbook) ───────────────────────────────

export const STARTER_RECIPES = [
  "🍝 Spaghetti Bolognese",
  "🍛 Chicken Tikka Masala",
  "🥧 Shepherd's Pie",
  "🐟 Fish and Chips",
  "🍕 Margherita Pizza",
  "👑 Sunday Roast",
  "🍛 Butter Chicken",
  "🌮 Tacos",
  "🫔 Chicken Fajitas",
  "🍝 Pasta Carbonara",
  "🥘 Thai Green Curry",
  "🥗 Caesar Salad",
  "🍲 Tomato Soup",
  "🫕 Beef Chilli",
  "🥘 Chicken Stir Fry",
  "🥔 Jacket Potatoes",
  "🍛 Korma",
  "🥞 Pancakes",
  "🐟 Baked Salmon",
  "🍝 Lasagne",
  "🥗 Greek Salad",
  "🥘 Fried Rice",
  "🍖 Roast Chicken",
  "🌯 Fajitas",
  "🥘 Paella",
  "🍲 Chicken Soup",
  "🍳 Full English Breakfast",
  "🍝 Mac and Cheese",
  "🌭 Bangers and Mash",
  "🫕 Beef Stew",
];
