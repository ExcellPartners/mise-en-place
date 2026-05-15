import React, { useState, useMemo, useRef } from 'react';
import { Recipe, PantryItem, RecipeIngredient } from '../types';
import { formatImageUrl } from '../utils/logic';

interface CollectionsProps {
  recipes: Recipe[];
  onBack: () => void;
  onRecipeSelect: (recipe: Recipe) => void;
  onPlannerOpen: () => void;
  recentCount: number;
  pantry?: PantryItem[];
  cookedHistory?: { date: string; recipeId: string; recipeName?: string }[];
  collectionImages?: Record<string, string>;
  // For Add to Catalog
  spreadsheetId?: string | null;
  accessToken?: string | null;
  masterIngredients?: any[];
  onRecipeSaved?: (recipe: Recipe) => void;
}

interface CollectionItem {
  id: string;
  label: string;
  image: string;
  description: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const n = (v: unknown): number => Number(v) || 0;
const recipeTime = (r: Recipe) => n(r.prepTime) + n(r.cookTime);
const recipeText = (r: Recipe) => `${r.title} ${r.category} ${r.description}`.toLowerCase();

// ─── Category Filter ───────────────────────────────────────────────────────────
const CATEGORIES = ['Main', 'Side', 'Appetizer', 'Dessert', 'Beverage', 'Breakfast'] as const;
type Category = typeof CATEGORIES[number];
const CATEGORY_EMOJI: Record<Category, string> = {
  Main: '🍽️', Side: '🥗', Appetizer: '🧆', Dessert: '🍮', Beverage: '🥤', Breakfast: '🥞',
};

const CategoryBar: React.FC<{ active: Set<Category>; onToggle: (c: Category) => void }> = ({ active, onToggle }) => (
  <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2">
    {CATEGORIES.map(cat => (
      <button key={cat} onClick={() => onToggle(cat)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
          active.has(cat) ? 'bg-[#636b2f] text-white border border-[#636b2f]' : 'bg-white/5 text-white/40 border border-white/10'
        }`}>
        <span className="text-sm leading-none">{CATEGORY_EMOJI[cat]}</span>{cat}
      </button>
    ))}
  </div>
);

const applyCategories = (list: Recipe[], active: Set<Category>) =>
  active.size === 0 ? list : list.filter(r => active.has(r.category as Category));

// ─── Quiz Config ───────────────────────────────────────────────────────────────
interface QuizStep {
  id: string;
  question: string;
  emoji: string;
  options: { label: string; value: string }[];
}

const QUIZ_STEPS: QuizStep[] = [
  {
    id: 'time',
    question: 'How much time do you have?',
    emoji: '⏱️',
    options: [
      { label: 'Under 20 min', value: 'under20' },
      { label: '20–40 min',    value: '20to40'  },
      { label: '40–60 min',    value: '40to60'  },
      { label: '60+ min',      value: 'over60'  },
    ],
  },
  {
    id: 'protein',
    question: 'Any protein preference?',
    emoji: '🥩',
    options: [
      { label: 'Chicken',    value: 'chicken'    },
      { label: 'Beef',       value: 'beef'       },
      { label: 'Pork',       value: 'pork'       },
      { label: 'Seafood',    value: 'seafood'    },
      { label: 'Vegetarian', value: 'vegetarian' },
    ],
  },
  {
    id: 'cuisine',
    question: 'What cuisine are you feeling?',
    emoji: '🌍',
    options: [
      { label: 'American',      value: 'american'      },
      { label: 'Italian',       value: 'italian'       },
      { label: 'Mexican',       value: 'mexican'       },
      { label: 'Asian',         value: 'asian'         },
      { label: 'Mediterranean', value: 'mediterranean' },
      { label: 'French',        value: 'french'        },
      { label: 'Indian',        value: 'indian'        },
    ],
  },
  {
    id: 'vibe',
    question: 'What\'s the vibe?',
    emoji: '✨',
    options: [
      { label: 'Comfort food',    value: 'comfort'   },
      { label: 'Light & fresh',   value: 'light'     },
      { label: 'Fancy / impress', value: 'fancy'     },
      { label: 'One pot',         value: 'onepot'    },
      { label: 'Quick weeknight', value: 'weeknight' },
    ],
  },
  {
    id: 'season',
    question: 'Any seasonal preference?',
    emoji: '🌿',
    options: [
      { label: '🌸 Spring', value: 'spring' },
      { label: '☀️ Summer', value: 'summer' },
      { label: '🍂 Fall',   value: 'fall'   },
      { label: '❄️ Winter', value: 'winter' },
    ],
  },
];

type QuizAnswers = Record<string, string | null>; // null = Don't Care

// Score a recipe against quiz answers (AND logic — must pass every answered step)
const scoreRecipeForQuiz = (r: Recipe, answers: QuizAnswers): boolean => {
  const text = recipeText(r);
  const t = recipeTime(r);
  const servings = n(r.baseServings);

  for (const [stepId, answer] of Object.entries(answers)) {
    if (answer === null) continue; // Don't Care — skip

    let passes = false;
    switch (stepId) {
      case 'time':
        passes =
          (answer === 'under20' && t > 0 && t < 20) ||
          (answer === '20to40'  && t >= 20 && t <= 40) ||
          (answer === '40to60'  && t > 40  && t <= 60) ||
          (answer === 'over60'  && t > 60);
        break;
      case 'protein': {
        const proteinText = [
          r.title, r.description, r.category,
          ...(r.ingredients || []).map((i: RecipeIngredient) => i.name)
        ].join(' ').toLowerCase();
        passes = proteinText.includes(answer);
        break;
      }
      case 'cuisine': {
        const expansions: Record<string, string[]> = {
          asian:         ['asian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'soy', 'stir', 'ramen', 'teriyaki', 'miso'],
          italian:       ['italian', 'pasta', 'pizza', 'risotto', 'lasagna', 'parmesan', 'marinara', 'pesto'],
          mexican:       ['mexican', 'taco', 'salsa', 'fajita', 'enchilada', 'guacamole', 'burrito'],
          mediterranean: ['mediterranean', 'greek', 'hummus', 'falafel', 'olive', 'tzatziki'],
          french:        ['french', 'bistro', 'coq au vin', 'ratatouille', 'beurre', 'gratin'],
          indian:        ['indian', 'curry', 'masala', 'tikka', 'naan', 'tandoori', 'dal'],
          american:      ['american', 'burger', 'bbq', 'diner', 'mac and cheese', 'fried chicken'],
        };
        passes = (expansions[answer] || [answer]).some(kw => text.includes(kw));
        break;
      }
      case 'vibe':
        passes =
          (answer === 'comfort'   && (text.includes('comfort') || text.includes('hearty') || text.includes('creamy'))) ||
          (answer === 'light'     && (text.includes('light') || text.includes('fresh') || text.includes('salad'))) ||
          (answer === 'fancy'     && (text.includes('steak') || text.includes('risotto') || text.includes('roast') || text.includes('filet'))) ||
          (answer === 'onepot'    && (text.includes('pot') || text.includes('pan') || text.includes('skillet') || text.includes('sheet'))) ||
          (answer === 'weeknight' && t > 0 && t <= 35);
        break;
      case 'season': {
        const seasonExp: Record<string, string[]> = {
          spring: ['spring', 'asparagus', 'pea', 'radish', 'artichoke', 'fresh herb'],
          summer: ['summer', 'grill', 'bbq', 'corn', 'tomato', 'zucchini', 'cold', 'salad'],
          fall:   ['fall', 'autumn', 'pumpkin', 'squash', 'apple', 'cider', 'harvest'],
          winter: ['winter', 'soup', 'stew', 'braise', 'roast', 'comfort', 'holiday', 'chili'],
        };
        passes = (seasonExp[answer] || [answer]).some(kw => text.includes(kw));
        break;
      }
    }
    if (!passes) return false;
  }
  return true;
};

// Build a human-readable search query from quiz answers for the AI web search
const buildSearchQuery = (answers: QuizAnswers): string => {
  const parts: string[] = [];
  const timeMap: Record<string, string> = { under20: 'under 20 minutes', '20to40': '20-40 minutes', '40to60': '40-60 minutes', over60: 'over an hour' };
  if (answers.time && answers.time !== null) parts.push(`ready in ${timeMap[answers.time] || answers.time}`);
  if (answers.protein && answers.protein !== null) parts.push(answers.protein);
  if (answers.cuisine && answers.cuisine !== null) parts.push(answers.cuisine);
  if (answers.vibe && answers.vibe !== null) {
    const vibeMap: Record<string, string> = { comfort: 'comfort food', light: 'light and fresh', fancy: 'impressive dinner', onepot: 'one pot', weeknight: 'weeknight' };
    parts.push(vibeMap[answers.vibe] || answers.vibe);
  }
  if (answers.season && answers.season !== null) parts.push(answers.season);
  return parts.join(' ') + ' recipe';
};

// ─── AI web search for recipes ─────────────────────────────────────────────────
interface AIRecipeResult {
  title: string;
  description: string;
  url: string;
  sourceName: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  category: string;
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string[];
  imageUrl: string;
}

async function searchRecipesWithAI(query: string): Promise<AIRecipeResult[]> {
  const prompt = `You are a recipe discovery assistant. Search the web for "${query}" and find 4 real, specific recipes.

For each recipe return complete details including all ingredients and full instructions.

Return ONLY valid JSON, no other text:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "One enticing sentence about the dish",
      "url": "https://actual-source-url.com/recipe",
      "sourceName": "Site or Book Name",
      "prepTime": 15,
      "cookTime": 30,
      "servings": 4,
      "difficulty": "Easy",
      "category": "Main",
      "ingredients": [{"name": "ingredient", "amount": 1, "unit": "cup"}],
      "instructions": ["Step 1...", "Step 2..."],
      "imageUrl": ""
    }
  ]
}

Rules:
- category must be one of: Main, Side, Appetizer, Dessert, Beverage, Breakfast
- difficulty must be one of: Easy, Medium, Hard
- unit must be one of: tsp, tbsp, cup, oz, lb, g, kg, ml, l, pinch, clove, unit, slice, can, bag
- Include at least 4 ingredients and 3 instruction steps per recipe
- Use real URLs from cooking sites like seriouseats.com, nytcooking.com, bonappetit.com, allrecipes.com, food52.com`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();

  const textBlock = (data.content as any[])?.find(b => b.type === 'text');
  if (!textBlock?.text) throw new Error('No text response');

  const clean = textBlock.text.replace(/```json|```/g, '').trim();
  const jsonStart = clean.indexOf('{');
  const jsonEnd = clean.lastIndexOf('}');
  if (jsonStart === -1) throw new Error('No JSON found');
  const parsed = JSON.parse(clean.slice(jsonStart, jsonEnd + 1));
  return parsed.recipes || [];
}

// ─── Collections Data ──────────────────────────────────────────────────────────
const COLLECTIONS_DATA: Record<string, CollectionItem[]> = {
  lifestyle: [
    { id: 'one-pot',     label: 'One-Pot Wonders',      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80', description: 'Big flavor with only one dish to wash' },
    { id: 'sunday-prep', label: 'Sunday Prep & Set',    image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&q=80', description: 'Cook once, eat well all week long' },
    { id: 'table-two',   label: 'Table for Two',        image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=400&q=80', description: 'Fancy-ish meals for an intimate night in' },
    { id: 'pantry',      label: 'Pantry Foraging',      image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&w=400&q=80', description: 'Turn your staples into last-minute meals' },
    { id: 'social',      label: 'The Social Hour',      image: 'https://images.unsplash.com/photo-1563206767-5b1d97512715?auto=format&fit=crop&w=400&q=80', description: 'Appetizers and snacks for a hungry crowd' },
    { id: '30-min',      label: 'The 30-Minute Hustle', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80', description: 'Real food for your busiest weeknights' },
  ],
  global: [
    { id: 'taco',          label: 'Taco Tuesday & Beyond',  image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80', description: 'Bold Mexican flavors and easy fiestas' },
    { id: 'mediterranean', label: 'Mediterranean Escape',   image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80', description: 'Bright, healthy, and olive-oil-powered' },
    { id: 'nostalgic',     label: 'Nostalgic Comforts',     image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=400&q=80', description: 'Family favorites that taste like home' },
    { id: 'street',        label: 'Global Street Food',     image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80', description: 'Bold bites and handheld world flavors' },
    { id: 'silk',          label: 'The Silk Road',          image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80', description: 'Stir-frys, curries, and umami-rich eats' },
    { id: 'trattoria',     label: 'The Trattoria',          image: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=400&q=80', description: 'Rustic pastas and classic red sauces' },
    { id: 'americana',     label: 'Classic Americana',      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80', description: 'Diner staples and backyard favorites' },
    { id: 'bistro',        label: 'Old World Bistro',       image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=400&q=80', description: 'Hearty classics from across the continent' },
  ],
  seasonal: [
    { id: 'holiday', label: 'Holiday Winter',         image: 'https://images.unsplash.com/photo-1576867756503-da85b47f8930?auto=format&fit=crop&w=400&q=80', description: 'Big feasts and festive crowd-pleasers' },
    { id: 'bbq',     label: 'Summer BBQ & Grilling',  image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80', description: 'Smoky mains and fresh outdoor sides' },
    { id: 'harvest', label: 'Cozy Fall Harvest',      image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?auto=format&fit=crop&w=400&q=80', description: 'Comforting bakes and earthy autumn flavors' },
    { id: 'spring',  label: 'The Fresh Spring Table', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80', description: 'Light, vibrant, and herb-forward dishes' },
  ],
};

const matchesTheme = (r: Recipe, themeId: string): boolean => {
  const text = recipeText(r);
  const t = recipeTime(r);
  const servings = n(r.baseServings);
  switch (themeId) {
    case 'one-pot':       return text.includes('sheet') || text.includes('one pot') || text.includes('one-pot') || text.includes('skillet') || text.includes('dutch oven');
    case 'sunday-prep':   return servings >= 6 || text.includes('batch') || text.includes('prep') || text.includes('freeze');
    case 'table-two':     return servings === 2 || text.includes('for two') || text.includes('date night');
    case 'pantry':        return text.includes('pasta') || text.includes('bean') || text.includes('canned') || text.includes('rice') || text.includes('lentil');
    case 'social':        return r.category === 'Appetizer' || r.category === 'Beverage' || text.includes('dip') || text.includes('bite') || text.includes('cocktail');
    case '30-min':        return t > 0 && t <= 35;
    case 'taco':          return text.includes('taco') || text.includes('mexican') || text.includes('salsa') || text.includes('fajita') || text.includes('enchilada');
    case 'mediterranean': return text.includes('greek') || text.includes('lemon') || text.includes('olive') || text.includes('hummus') || text.includes('mediterranean');
    case 'nostalgic':     return text.includes('mac') || text.includes('cheese') || text.includes('pie') || text.includes('roast') || text.includes('soup') || text.includes('casserole');
    case 'street':        return text.includes('skewer') || text.includes('bao') || text.includes('sandwich') || text.includes('fried') || text.includes('wrap');
    case 'silk':          return text.includes('asian') || text.includes('curry') || text.includes('stir') || text.includes('soy') || text.includes('ramen') || text.includes('teriyaki');
    case 'trattoria':     return text.includes('pasta') || text.includes('italian') || text.includes('tomato') || text.includes('lasagna') || text.includes('risotto');
    case 'americana':     return text.includes('burger') || text.includes('bbq') || text.includes('fried chicken') || text.includes('diner');
    case 'bistro':        return text.includes('french') || text.includes('steak') || text.includes('onion soup') || text.includes('wine') || text.includes('coq');
    case 'holiday':       return text.includes('roast') || text.includes('turkey') || text.includes('ham') || text.includes('feast') || text.includes('stuffing');
    case 'bbq':           return text.includes('grill') || text.includes('bbq') || text.includes('barbecue') || text.includes('ribs') || text.includes('smoked');
    case 'harvest':       return text.includes('pumpkin') || text.includes('squash') || text.includes('apple') || text.includes('cider') || text.includes('sweet potato');
    case 'spring':        return text.includes('asparagus') || text.includes('pea') || text.includes('lemon') || text.includes('fresh herb') || text.includes('spring');
    default:              return false;
  }
};

// ─── Component ─────────────────────────────────────────────────────────────────
type TabId = 'collections' | 'quiz' | 'sources' | 'almostThere' | 'history';

const Collections: React.FC<CollectionsProps> = ({
  recipes, onBack, onRecipeSelect, onPlannerOpen, recentCount,
  pantry = [], cookedHistory = [], collectionImages = {},
  spreadsheetId, accessToken, masterIngredients = [], onRecipeSaved,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<CollectionItem | null>(null);
  const [activeSection, setActiveSection] = useState<TabId>('collections');
  const moneySaved = recentCount * 8;
  const mainRef = useRef<HTMLDivElement>(null);

  // ── Category filter ─────────────────────────────────────────────────────────
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set());
  const toggleCategory = (cat: Category) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // ── Quiz state ──────────────────────────────────────────────────────────────
  type QuizPhase = 'steps' | 'results' | 'searching' | 'aiResults' | 'error';
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('steps');
  const [currentStep, setCurrentStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>({});
  const [aiResults, setAiResults] = useState<AIRecipeResult[]>([]);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [quizError, setQuizError] = useState('');

  const resetQuiz = () => {
    setQuizPhase('steps');
    setCurrentStep(0);
    setQuizAnswers({});
    setAiResults([]);
    setQuizError('');
    setSavedRecipeIds(new Set());
    setTimeout(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const localQuizResults = useMemo(() => {
    if (Object.keys(quizAnswers).length === 0) return [];
    return recipes.filter(r => scoreRecipeForQuiz(r, quizAnswers));
  }, [recipes, quizAnswers]);

  const handleAnswer = (stepId: string, value: string | null) => {
    const newAnswers = { ...quizAnswers, [stepId]: value };
    setQuizAnswers(newAnswers);

    if (currentStep < QUIZ_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      setTimeout(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    } else {
      // Last step answered — show results
      setQuizPhase('results');
      setTimeout(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    }
  };

  const handleAISearch = async () => {
    setQuizPhase('searching');
    try {
      const query = buildSearchQuery(quizAnswers);
      const results = await searchRecipesWithAI(query);
      setAiResults(results);
      setQuizPhase('aiResults');
    } catch (err) {
      console.error('AI search failed:', err);
      setQuizError('Search ran into an issue. Check your connection and try again.');
      setQuizPhase('error');
    }
    setTimeout(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handleAddToCatalog = async (result: AIRecipeResult) => {
    const tempId = result.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    setSavingRecipeId(tempId);

    const newRecipe: Recipe = {
      id: tempId,
      title: result.title,
      description: result.description,
      category: result.category || 'Main',
      difficulty: result.difficulty || 'Medium',
      prepTime: result.prepTime || 0,
      cookTime: result.cookTime || 0,
      baseServings: result.servings || 4,
      chefTip: `Recipe discovered via Mise en Place. Source: ${result.sourceName}`,
      ingredients: result.ingredients || [],
      instructions: result.instructions || [],
      imageUrl: result.imageUrl || '',
      sourceName: result.sourceName || '',
      sourceUrl: result.url || '',
      isFavorite: false,
    };

    try {
      if (spreadsheetId && accessToken) {
        const { saveRecipeToSheet } = await import('../services/googleSheets');
        await saveRecipeToSheet(spreadsheetId, newRecipe, accessToken, masterIngredients);
      }
      onRecipeSaved?.(newRecipe);
      setSavedRecipeIds(prev => new Set([...prev, tempId]));
    } catch (err) {
      console.error('Add to catalog failed:', err);
    } finally {
      setSavingRecipeId(null);
    }
  };

  // ── Sources grouping ────────────────────────────────────────────────────────
  const sourceGroups = useMemo(() => {
    const groups: Record<string, Recipe[]> = {};
    recipes.forEach(r => {
      const source = r.sourceName?.trim();
      if (!source) return;
      if (!groups[source]) groups[source] = [];
      groups[source].push(r);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [recipes]);

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const sourceRecipes = useMemo(() => {
    if (!selectedSource) return [];
    return applyCategories(
      recipes.filter(r => r.sourceName?.trim() === selectedSource),
      activeCategories
    );
  }, [selectedSource, recipes, activeCategories]);

  // ── Collection theme ────────────────────────────────────────────────────────
  const themeRecipesBase = useMemo(() => {
    if (!selectedTheme) return [];
    return recipes.filter(r => matchesTheme(r, selectedTheme.id));
  }, [selectedTheme, recipes]);

  const filteredThemeRecipes = useMemo(
    () => applyCategories(themeRecipesBase, activeCategories),
    [themeRecipesBase, activeCategories]
  );

  // ── Almost There ────────────────────────────────────────────────────────────
  const almostThereBase = useMemo(() => {
    const inStockNames = new Set(
      pantry.filter(p => p.inStock || n(p.quantity) > 0).map(p => p.name.toLowerCase().trim())
    );
    return recipes
      .map(recipe => {
        const missing = (recipe.ingredients || []).filter(
          (ing: RecipeIngredient) => !inStockNames.has(ing.name.toLowerCase().trim())
        );
        return { recipe, missingCount: missing.length, missingNames: missing.map(i => i.name) };
      })
      .filter(r => r.missingCount > 0 && r.missingCount <= 3)
      .sort((a, b) => a.missingCount - b.missingCount);
  }, [recipes, pantry]);

  const almostThereRecipes = useMemo(() => {
    const filtered = activeCategories.size === 0
      ? almostThereBase
      : almostThereBase.filter(({ recipe }) => activeCategories.has(recipe.category as Category));
    return filtered.slice(0, 30);
  }, [almostThereBase, activeCategories]);

  // ── Cooked History ──────────────────────────────────────────────────────────
  const sortedHistory = useMemo(() =>
    [...cookedHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50),
    [cookedHistory]
  );

  // ── Shared empty state ──────────────────────────────────────────────────────
  const renderEmpty = (icon: string, title: string, body: string) => (
    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 px-8">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="font-bold text-base mb-1">{title}</p>
      <p className="text-sm leading-relaxed">{body}</p>
    </div>
  );

  const renderCards = (items: CollectionItem[]) => (
    <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
      {items.map(item => (
        <button key={item.id} onClick={() => setSelectedTheme(item)}
          className="relative w-[155px] h-[240px] shrink-0 rounded-[1.25rem] overflow-hidden group active:scale-95 transition-transform bg-[#1c1d15] border border-white/5">
          <img src={collectionImages[item.label] || item.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70" alt={item.label} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
            <h3 className="text-white font-black text-sm leading-tight mb-1">{item.label}</h3>
            <p className="text-[#b6baa1] text-[9px] font-medium leading-relaxed line-clamp-2 opacity-90">{item.description}</p>
          </div>
        </button>
      ))}
    </div>
  );

  // ─── Source drill-down ──────────────────────────────────────────────────────
  if (selectedSource) {
    return (
      <div className="bg-[#000000] min-h-screen text-white flex flex-col w-full">
        <header className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5 header-safe-pt">
          <button onClick={() => setSelectedSource(null)} className="size-10 flex items-center justify-center active:scale-90">
            <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-black tracking-tight uppercase line-clamp-1">{selectedSource}</h1>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">{sourceRecipes.length} Recipes</p>
          </div>
          <div className="w-10" />
        </header>
        <div className="sticky top-[60px] z-10 bg-[#000000]/95 backdrop-blur-md border-b border-white/5 py-1">
          <CategoryBar active={activeCategories} onToggle={toggleCategory} />
        </div>
        <main className="flex-1 pb-32 px-4 pt-4">
          {sourceRecipes.length === 0
            ? renderEmpty('📖', 'No matches', 'No recipes from this source match your dish type filter.')
            : (
              <div className="grid grid-cols-2 gap-4">
                {sourceRecipes.map(recipe => (
                  <div key={recipe.id} onClick={() => onRecipeSelect(recipe)} className="flex flex-col gap-2 cursor-pointer group">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#1a1d14]">
                      <img src={formatImageUrl(recipe.imageUrl)} alt={recipe.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
                        <span className="text-white/70 text-[8px] font-black uppercase tracking-widest">{recipe.category}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-white text-sm font-black line-clamp-1 group-hover:text-[#636b2f] transition-colors">{recipe.title}</p>
                      {recipeTime(recipe) > 0 && <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{recipeTime(recipe)} MIN</p>}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </main>
      </div>
    );
  }

  // ─── Collection theme drill-down ────────────────────────────────────────────
  if (selectedTheme) {
    return (
      <div className="bg-[#000000] min-h-screen text-white flex flex-col w-full">
        <header className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5 header-safe-pt">
          <button onClick={() => setSelectedTheme(null)} className="size-10 flex items-center justify-center active:scale-90">
            <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-black tracking-tight uppercase">{selectedTheme.label}</h1>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">
              {filteredThemeRecipes.length} Recipe{filteredThemeRecipes.length !== 1 ? 's' : ''}
              {activeCategories.size > 0 ? ' · filtered' : ''}
            </p>
          </div>
          <div className="w-10" />
        </header>
        <div className="sticky top-[60px] z-10 bg-[#000000]/95 backdrop-blur-md border-b border-white/5 py-1">
          <CategoryBar active={activeCategories} onToggle={toggleCategory} />
        </div>
        <main className="flex-1 pb-32 px-4 pt-4">
          {filteredThemeRecipes.length === 0
            ? renderEmpty('📭', 'No matches', activeCategories.size > 0 ? 'Try clearing the dish type filter.' : 'Add more recipes to populate this collection.')
            : (
              <div className="grid grid-cols-2 gap-4">
                {filteredThemeRecipes.map(recipe => (
                  <div key={recipe.id} onClick={() => onRecipeSelect(recipe)} className="flex flex-col gap-2 cursor-pointer group">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#1a1d14]">
                      <img src={formatImageUrl(recipe.imageUrl)} alt={recipe.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
                        <span className="text-white/70 text-[8px] font-black uppercase tracking-widest">{recipe.category}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-white text-sm font-black line-clamp-1 group-hover:text-[#636b2f] transition-colors">{recipe.title}</p>
                      {recipeTime(recipe) > 0 && <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{recipeTime(recipe)} MIN</p>}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </main>
      </div>
    );
  }

  // ─── Main view ──────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'collections' as TabId, label: 'Browse',   icon: 'collections_bookmark' },
    { id: 'quiz'        as TabId, label: 'Quiz',     icon: 'auto_awesome'         },
    { id: 'sources'     as TabId, label: 'Sources',  icon: 'menu_book'            },
    { id: 'almostThere' as TabId, label: 'Almost',   icon: 'kitchen'              },
    { id: 'history'     as TabId, label: 'History',  icon: 'history'              },
  ];

  return (
    <div className="bg-[#000000] min-h-screen text-white flex flex-col w-full">
      <header className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5 header-safe-pt">
        <button onClick={onBack} className="size-10 flex items-center justify-center active:scale-90">
          <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-black tracking-tight uppercase">Collections</h1>
          <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Curated Suites</p>
        </div>
        <div className="w-10" />
      </header>

      {/* 5-tab bar */}
      <div className="sticky top-[60px] z-10 bg-[#000000]/95 backdrop-blur-md border-b border-white/5">
        <div className="flex gap-1 p-1 mx-3 mt-3 mb-2 bg-white/5 rounded-2xl">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all gap-0.5 ${
                activeSection === tab.id ? 'bg-[#636b2f] text-white' : 'text-white/40'
              }`}>
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span className="text-[7px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
        {(activeSection === 'almostThere' || activeSection === 'sources') && (
          <div className="border-t border-white/5 py-1">
            <CategoryBar active={activeCategories} onToggle={toggleCategory} />
          </div>
        )}
      </div>

      <main ref={mainRef} className="flex-1 pb-32 overflow-y-auto">

        {/* ── BROWSE tab ── */}
        {activeSection === 'collections' && (
          <>
            <section className="px-4 pt-6 pb-4">
              <div className="flex flex-col gap-4 rounded-3xl bg-[#1c1d15] p-6 border border-white/5 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-white text-lg font-black leading-tight">Last 30 Days Recap</p>
                  <p className="text-[#b6baa1] text-sm font-medium leading-relaxed mt-1">
                    You cooked <span className="text-white font-bold">{recentCount} meals</span> this month, saving approx <span className="text-[#636b2f] font-bold">${moneySaved}</span> vs. dining out.
                  </p>
                </div>
                <button onClick={onPlannerOpen}
                  className="flex items-center justify-center rounded-full h-11 px-8 bg-[#3b3e2e] text-white gap-2 text-xs font-black uppercase tracking-widest active:scale-95 w-fit relative z-10">
                  <span>View Planner</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#636b2f]/10 rounded-full blur-3xl -mr-16 -mt-16" />
              </div>
            </section>
            <section className="mb-8">
              <div className="px-4 mb-3">
                <h2 className="text-xl font-black text-white tracking-tight">The Lifestyle Lab</h2>
                <p className="text-[10px] font-bold uppercase text-[#636b2f] tracking-widest mt-1 opacity-80">Solving your "Right Now" reality</p>
              </div>
              {renderCards(COLLECTIONS_DATA.lifestyle)}
            </section>
            <section className="mb-8">
              <div className="px-4 mb-3">
                <h2 className="text-xl font-black text-white tracking-tight">The Global Gallery</h2>
                <p className="text-[10px] font-bold uppercase text-[#636b2f] tracking-widest mt-1 opacity-80">A taste around the world</p>
              </div>
              {renderCards(COLLECTIONS_DATA.global)}
            </section>
            <section className="mb-8">
              <div className="px-4 mb-3">
                <h2 className="text-xl font-black text-white tracking-tight">The Seasonal Suite</h2>
                <p className="text-[10px] font-bold uppercase text-[#636b2f] tracking-widest mt-1 opacity-80">A recipe perfect for any time of year</p>
              </div>
              {renderCards(COLLECTIONS_DATA.seasonal)}
            </section>
          </>
        )}

        {/* ── QUIZ tab ── */}
        {activeSection === 'quiz' && (
          <div className="pt-4 px-4">

            {/* Step-by-step questions */}
            {quizPhase === 'steps' && (() => {
              const step = QUIZ_STEPS[currentStep];
              const progress = (currentStep / QUIZ_STEPS.length) * 100;
              const answeredCount = Object.values(quizAnswers).filter(v => v !== undefined).length;
              return (
                <div>
                  {/* Progress */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#636b2f] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest shrink-0">
                      {currentStep + 1} / {QUIZ_STEPS.length}
                    </span>
                  </div>

                  {/* Question */}
                  <div className="mb-6">
                    <span className="text-4xl block mb-3">{step.emoji}</span>
                    <h2 className="text-xl font-black text-white tracking-tight leading-tight">{step.question}</h2>
                  </div>

                  {/* Options */}
                  <div className="flex flex-col gap-2.5 mb-4">
                    {step.options.map(opt => (
                      <button key={opt.value} onClick={() => handleAnswer(step.id, opt.value)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border text-left active:scale-[0.98] transition-all ${
                          quizAnswers[step.id] === opt.value
                            ? 'bg-[#636b2f]/20 border-[#636b2f]/60'
                            : 'bg-[#1c1d15] border-white/5'
                        }`}>
                        <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          quizAnswers[step.id] === opt.value ? 'border-[#636b2f] bg-[#636b2f]' : 'border-white/20'
                        }`}>
                          {quizAnswers[step.id] === opt.value && <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                        </div>
                        <span className="text-white font-bold text-sm leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Don't Care */}
                  <button onClick={() => handleAnswer(step.id, null)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform mb-6">
                    <span className="material-symbols-outlined text-sm">not_interested</span>
                    Don't Care — Skip
                  </button>

                  {/* Back */}
                  {currentStep > 0 && (
                    <button onClick={() => setCurrentStep(prev => prev - 1)}
                      className="flex items-center gap-2 text-white/30 text-xs font-black uppercase tracking-widest active:opacity-60">
                      <span className="material-symbols-outlined text-sm">arrow_back</span>Back
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Results from your library */}
            {quizPhase === 'results' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-black text-white">
                    {localQuizResults.length > 0 ? `${localQuizResults.length} matches` : 'No matches in your library'}
                  </h2>
                  <button onClick={resetQuiz} className="flex items-center gap-1 text-white/30 text-[9px] font-black uppercase tracking-widest active:opacity-60">
                    <span className="material-symbols-outlined text-sm">refresh</span>Restart
                  </button>
                </div>
                <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-5">From your catalog</p>

                {localQuizResults.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {localQuizResults.map(recipe => {
                      const t = recipeTime(recipe);
                      return (
                        <div key={recipe.id} onClick={() => onRecipeSelect(recipe)}
                          className="flex gap-4 p-3 bg-[#1c1d15] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
                          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                            <img src={formatImageUrl(recipe.imageUrl)} className="w-full h-full object-cover" alt={recipe.title}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
                            <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-1">{recipe.category}</span>
                            <h3 className="text-white font-bold text-sm leading-tight mb-1 line-clamp-2">{recipe.title}</h3>
                            {t > 0 && <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest">{t}m</span>}
                          </div>
                          <span className="material-symbols-outlined text-white/20 text-xl self-center shrink-0">chevron_right</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* AI search CTA */}
                <div className="rounded-3xl bg-[#1c1d15] border border-white/5 p-6 text-center">
                  <span className="text-4xl block mb-3">🌐</span>
                  <h3 className="text-white font-black text-base mb-1">
                    {localQuizResults.length > 0 ? 'Want more ideas?' : 'Search the web instead?'}
                  </h3>
                  <p className="text-[#b6baa1] text-xs font-medium leading-relaxed mb-5">
                    Claude will search the web for recipes matching your picks. Any you like can be added directly to your catalog.
                  </p>
                  <button onClick={handleAISearch}
                    className="flex items-center justify-center gap-3 w-full rounded-full h-14 bg-[#636b2f] text-white text-sm font-black uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-[#636b2f]/30">
                    <span className="material-symbols-outlined text-xl">travel_explore</span>
                    Search the Web
                  </button>
                </div>
              </div>
            )}

            {/* Searching state */}
            {quizPhase === 'searching' && (
              <div className="flex flex-col items-center justify-center pt-16 text-center">
                <div className="relative w-20 h-20 mb-8">
                  <div className="absolute inset-0 rounded-full border-2 border-[#636b2f]/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#636b2f] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">🌐</div>
                </div>
                <h2 className="text-xl font-black text-white mb-2">Searching the web…</h2>
                <p className="text-[#b6baa1] text-sm font-medium leading-relaxed max-w-xs">
                  Claude is looking for recipes that match your vibe across the best cooking sites.
                </p>
              </div>
            )}

            {/* AI Results */}
            {quizPhase === 'aiResults' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-black text-white">{aiResults.length} found online</h2>
                  <button onClick={resetQuiz} className="flex items-center gap-1 text-white/30 text-[9px] font-black uppercase tracking-widest active:opacity-60">
                    <span className="material-symbols-outlined text-sm">refresh</span>Restart
                  </button>
                </div>
                <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-5">From the web · tap to add to your catalog</p>

                <div className="space-y-4">
                  {aiResults.map((result, idx) => {
                    const tempId = result.title.toLowerCase().replace(/\s+/g, '-') + '-' + idx;
                    const isSaved = savedRecipeIds.has(tempId) || [...savedRecipeIds].some(id => id.startsWith(result.title.toLowerCase().replace(/\s+/g, '-')));
                    const isSaving = savingRecipeId?.startsWith(result.title.toLowerCase().replace(/\s+/g, '-'));
                    const t = (result.prepTime || 0) + (result.cookTime || 0);

                    return (
                      <div key={idx} className="bg-[#1c1d15] rounded-2xl border border-white/5 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest">{result.category} · {result.sourceName}</span>
                              <h3 className="text-white font-black text-base leading-tight mt-0.5">{result.title}</h3>
                            </div>
                          </div>
                          <p className="text-[#b6baa1] text-xs font-medium leading-relaxed mb-3 line-clamp-2">{result.description}</p>

                          {/* Meta */}
                          <div className="flex gap-3 mb-4">
                            {t > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[#636b2f] text-sm">schedule</span>
                                <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{t}m</span>
                              </div>
                            )}
                            {result.difficulty && (
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[#636b2f] text-sm">signal_cellular_alt</span>
                                <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{result.difficulty}</span>
                              </div>
                            )}
                            {result.servings > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[#636b2f] text-sm">group</span>
                                <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Serves {result.servings}</span>
                              </div>
                            )}
                          </div>

                          {/* Ingredients preview */}
                          {result.ingredients?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {result.ingredients.slice(0, 6).map((ing, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-[9px] font-bold">
                                  {ing.name}
                                </span>
                              ))}
                              {result.ingredients.length > 6 && (
                                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30 text-[9px] font-bold">
                                  +{result.ingredients.length - 6} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddToCatalog({ ...result })}
                              disabled={isSaved || !!isSaving}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-full h-11 text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                                isSaved
                                  ? 'bg-white/5 border border-white/10 text-white/30'
                                  : 'bg-[#636b2f] text-white shadow-lg shadow-[#636b2f]/20'
                              }`}>
                              {isSaving
                                ? <><span className="material-symbols-outlined text-sm animate-spin">sync</span>Saving…</>
                                : isSaved
                                  ? <><span className="material-symbols-outlined text-sm">check</span>Added</>
                                  : <><span className="material-symbols-outlined text-sm">add</span>Add to Catalog</>
                              }
                            </button>
                            {result.url && (
                              <a href={result.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center w-11 h-11 rounded-full bg-white/5 border border-white/10 text-white/40 active:scale-95 transition-transform shrink-0">
                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {aiResults.length === 0 && renderEmpty('🤷', 'Nothing found', 'Try adjusting your quiz answers and searching again.')}

                <button onClick={resetQuiz}
                  className="w-full mt-6 flex items-center justify-center gap-2 rounded-full h-11 bg-white/5 border border-white/10 text-white/40 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-sm">refresh</span>Start Over
                </button>
              </div>
            )}

            {/* Error */}
            {quizPhase === 'error' && (
              <div className="flex flex-col items-center text-center pt-12">
                <span className="text-5xl mb-4">😕</span>
                <h2 className="text-xl font-black text-white mb-2">Search failed</h2>
                <p className="text-[#b6baa1] text-sm mb-8 max-w-xs leading-relaxed">{quizError}</p>
                <button onClick={() => setQuizPhase('results')}
                  className="flex items-center gap-2 rounded-full h-12 px-8 bg-[#1c1d15] border border-white/10 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>Back to results
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SOURCES tab ── */}
        {activeSection === 'sources' && (
          <div className="px-4 pt-6">
            <h2 className="text-xl font-black text-white tracking-tight mb-1">Your Bookshelf</h2>
            <p className="text-[#b6baa1] text-sm font-medium leading-relaxed mb-6">
              Browse by cookbook or website. {sourceGroups.length} source{sourceGroups.length !== 1 ? 's' : ''} in your library.
            </p>
            {sourceGroups.length === 0
              ? renderEmpty('📚', 'No sources yet', 'Add recipes with a Source Name to build your bookshelf.')
              : (
                <div className="space-y-3">
                  {sourceGroups.map(([sourceName, sourceRecipeList]) => {
                    // Try to get a URL from any recipe in this source
                    const sampleRecipe = sourceRecipeList[0];
                    const hasUrl = sampleRecipe?.sourceUrl;
                    return (
                      <button key={sourceName} onClick={() => setSelectedSource(sourceName)}
                        className="w-full flex items-center gap-4 p-4 bg-[#1c1d15] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform text-left">
                        <div className="w-12 h-12 rounded-xl bg-[#636b2f]/15 border border-[#636b2f]/20 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[#636b2f] text-2xl">
                            {hasUrl ? 'language' : 'menu_book'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-black text-sm leading-tight line-clamp-1">{sourceName}</p>
                          {sampleRecipe?.sourceAuthor && (
                            <p className="text-[#b6baa1] text-[10px] font-medium mt-0.5">{sampleRecipe.sourceAuthor}</p>
                          )}
                          <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mt-1">
                            {sourceRecipeList.length} recipe{sourceRecipeList.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-white/20 text-xl shrink-0">chevron_right</span>
                      </button>
                    );
                  })}
                </div>
              )
            }
          </div>
        )}

        {/* ── ALMOST THERE tab ── */}
        {activeSection === 'almostThere' && (
          <div className="px-4 pt-4">
            <div className="mb-5">
              <h2 className="text-xl font-black text-white tracking-tight mb-1">Almost There</h2>
              <p className="text-[#b6baa1] text-sm font-medium leading-relaxed">
                Missing 3 or fewer ingredients.{activeCategories.size > 0 && <span className="text-[#636b2f]"> Dish type filtered.</span>}
              </p>
            </div>
            {pantry.length === 0
              ? renderEmpty('🧺', 'Pantry not loaded', 'Sync your Google Sheet to see recommendations.')
              : almostThereRecipes.length === 0
                ? activeCategories.size > 0
                  ? renderEmpty('🔍', 'No matches', 'No almost-ready recipes match that dish type.')
                  : renderEmpty('✅', "You're well stocked!", 'No recipes are within 3 ingredients of being cookable.')
                : (
                  <div className="space-y-3">
                    {almostThereRecipes.map(({ recipe, missingCount, missingNames }) => (
                      <div key={recipe.id} onClick={() => onRecipeSelect(recipe)}
                        className="flex gap-4 p-3 bg-[#1c1d15] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                          <img src={formatImageUrl(recipe.imageUrl)} className="w-full h-full object-cover" alt={recipe.title}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
                          <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-1">{recipe.category}</span>
                          <h3 className="text-white font-bold text-sm leading-tight mb-1.5 line-clamp-1">{recipe.title}</h3>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit ${
                            missingCount === 1 ? 'bg-emerald-500/20 border border-emerald-500/30'
                            : missingCount === 2 ? 'bg-amber-500/20 border border-amber-500/30'
                            : 'bg-orange-500/20 border border-orange-500/30'
                          }`}>
                            <span className={`material-symbols-outlined text-sm ${
                              missingCount === 1 ? 'text-emerald-400' : missingCount === 2 ? 'text-amber-400' : 'text-orange-400'
                            }`}>shopping_cart</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              missingCount === 1 ? 'text-emerald-400' : missingCount === 2 ? 'text-amber-400' : 'text-orange-400'
                            }`}>
                              Need {missingCount}: {missingNames.slice(0, 2).join(', ')}{missingNames.length > 2 ? '…' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
            }
          </div>
        )}

        {/* ── HISTORY tab ── */}
        {activeSection === 'history' && (
          <div className="px-4 pt-6">
            <h2 className="text-xl font-black text-white tracking-tight mb-1">Cooked History</h2>
            <p className="text-[#b6baa1] text-sm font-medium mb-6">Every recipe you've made, in order.</p>
            {sortedHistory.length === 0
              ? renderEmpty('📅', 'No history yet', "Mark meals as Cooked in the Planner and they'll appear here.")
              : (
                <div className="space-y-3">
                  {sortedHistory.map((entry, idx) => {
                    const recipe = recipes.find(r => r.id === entry.recipeId);
                    const dateStr = entry.date
                      ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Unknown date';
                    return (
                      <div key={`${entry.recipeId}-${idx}`} onClick={() => recipe && onRecipeSelect(recipe)}
                        className={`flex gap-4 p-3 bg-[#1c1d15] rounded-2xl border border-white/5 transition-transform ${recipe ? 'active:scale-[0.98] cursor-pointer' : 'opacity-60'}`}>
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5">
                          {recipe
                            ? <img src={formatImageUrl(recipe.imageUrl)} className="w-full h-full object-cover" alt={recipe.title} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-white/20 text-2xl">restaurant</span></div>
                          }
                        </div>
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                          <p className="text-white font-bold text-base leading-tight line-clamp-1">
                            {entry.recipeName || recipe?.title || 'Unknown Recipe'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="material-symbols-outlined text-[#636b2f] text-sm">calendar_today</span>
                            <span className="text-[#636b2f] text-[10px] font-black uppercase tracking-widest">{dateStr}</span>
                          </div>
                        </div>
                        {recipe && <span className="material-symbols-outlined text-white/20 text-xl self-center">chevron_right</span>}
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        )}

      </main>
    </div>
  );
};

export default Collections;
