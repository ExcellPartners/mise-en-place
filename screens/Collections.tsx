import React, { useState, useMemo } from 'react';
import { Recipe } from '../types';
import { formatImageUrl } from '../utils/logic';

interface CollectionsProps {
  recipes: Recipe[];
  onBack: () => void;
  onRecipeSelect: (recipe: Recipe) => void;
  onPlannerOpen: () => void;
  recentCount: number;
}

interface CollectionItem {
  id: string;
  label: string;
  image: string;
  description: string;
  longDescription?: string;
}

// ─── Quiz Types ───────────────────────────────────────────────────────────────

interface QuizStep {
  id: string;
  question: string;
  icon: string;
  options: { value: string; label: string; icon: string }[];
  multi?: boolean; // allow multiple selections
}

interface QuizAnswers {
  mealType?: string[];
  time?: string;
  season?: string[];
  partySize?: string;
  cuisine?: string[];
}

const QUIZ_STEPS: QuizStep[] = [
  {
    id: 'mealType',
    question: "What meal is this for?",
    icon: 'restaurant',
    multi: true,
    options: [
      { value: 'breakfast', label: 'Breakfast', icon: 'coffee' },
      { value: 'lunch', label: 'Lunch', icon: 'sunny' },
      { value: 'dinner', label: 'Dinner', icon: 'dark_mode' },
      { value: 'dessert', label: 'Dessert', icon: 'icecream' },
      { value: 'snack', label: 'Snack / App', icon: 'fastfood' },
      { value: 'drink', label: 'Drinks', icon: 'local_bar' },
    ]
  },
  {
    id: 'time',
    question: "How much time do you have?",
    icon: 'timer',
    options: [
      { value: '20', label: 'Under 20 min', icon: 'bolt' },
      { value: '35', label: 'Under 35 min', icon: 'timer' },
      { value: '60', label: 'Under 1 hour', icon: 'schedule' },
      { value: '999', label: "I've got time", icon: 'hourglass_empty' },
    ]
  },
  {
    id: 'partySize',
    question: "How many people?",
    icon: 'group',
    options: [
      { value: '1', label: 'Just me', icon: 'person' },
      { value: '2', label: 'Date night (2)', icon: 'favorite' },
      { value: '4', label: 'Small group (4)', icon: 'group' },
      { value: '6', label: 'Crowd (6+)', icon: 'groups' },
    ]
  },
  {
    id: 'season',
    question: "Any seasonal vibes?",
    icon: 'eco',
    multi: true,
    options: [
      { value: 'any', label: 'Anything goes', icon: 'all_inclusive' },
      { value: 'spring', label: 'Spring', icon: 'local_florist' },
      { value: 'summer', label: 'Summer', icon: 'wb_sunny' },
      { value: 'fall', label: 'Fall', icon: 'park' },
      { value: 'winter', label: 'Winter / Holiday', icon: 'ac_unit' },
    ]
  },
  {
    id: 'cuisine',
    question: "What's the vibe?",
    icon: 'travel_explore',
    multi: true,
    options: [
      { value: 'any', label: 'Surprise me', icon: 'shuffle' },
      { value: 'american', label: 'American', icon: 'flag' },
      { value: 'italian', label: 'Italian', icon: 'local_pizza' },
      { value: 'mexican', label: 'Mexican', icon: 'emoji_food_beverage' },
      { value: 'asian', label: 'Asian', icon: 'ramen_dining' },
      { value: 'mediterranean', label: 'Mediterranean', icon: 'anchor' },
      { value: 'comfort', label: 'Comfort Food', icon: 'sentiment_satisfied' },
      { value: 'healthy', label: 'Light & Healthy', icon: 'eco' },
    ]
  }
];

// ─── Collections Data ─────────────────────────────────────────────────────────

const COLLECTIONS_DATA: Record<string, CollectionItem[]> = {
  lifestyle: [
    { id: 'one-pot', label: 'One-Pot Wonders', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80', description: 'Big flavor with only one dish to wash', longDescription: 'Maximum flavor, minimum cleanup—your Dutch oven and sheet pan\'s time to shine.' },
    { id: 'sunday-prep', label: 'Sunday Prep & Set', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&q=80', description: 'Cook once, eat well all week long', longDescription: 'Cook once, eat better all week. Recipes designed for the ultimate meal-prep routine.' },
    { id: 'table-two', label: 'Table for Two', image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=400&q=80', description: 'Fancy-ish meals for an intimate night in', longDescription: 'Elevated, intimate recipes for when you want to skip the restaurant and stay in.' },
    { id: 'pantry', label: 'Pantry Foraging', image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&w=400&q=80', description: 'Turn your staples into last-minute meals', longDescription: 'The "Use It or Lose It" collection—turn your staples into spectacular last-minute meals.' },
    { id: 'social', label: 'The Social Hour', image: 'https://images.unsplash.com/photo-1563206767-5b1d97512715?auto=format&fit=crop&w=400&q=80', description: 'Appetizers and snacks for a hungry crowd', longDescription: 'Big-batch snacks and crowd-pleasing apps designed for easy entertaining.' },
    { id: '30-min', label: 'The 30-Minute Hustle', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80', description: 'Real food for your busiest weeknights', longDescription: 'For the nights when time is short but you refuse to compromise on a real meal.' }
  ],
  global: [
    { id: 'taco', label: 'Taco Tuesday & Beyond', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80', description: 'Bold Mexican flavors and easy fiestas', longDescription: 'Vibrant salsas, street-style meats, and everything you need for a Mexican-inspired fiesta.' },
    { id: 'mediterranean', label: 'Mediterranean Escape', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80', description: 'Bright, healthy, and olive-oil-powered', longDescription: 'Sun-drenched flavors powered by fresh lemon, golden olive oil, and coastal inspiration.' },
    { id: 'nostalgic', label: 'Nostalgic Comforts', image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=400&q=80', description: 'Family favorites that taste like home', longDescription: 'The "tastes like childhood" collection—classic recipes that feel like a warm hug.' },
    { id: 'street', label: 'Global Street Food', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80', description: 'Bold bites and handheld world flavors', longDescription: 'Bold, handheld, and high-energy bites inspired by the world\'s busiest night markets.' },
    { id: 'silk', label: 'The Silk Road', image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80', description: 'Stir-frys, curries, and Umami-rich eats', longDescription: 'From wok-fired favorites to delicate dumplings—a journey through East and Southeast Asia.' },
    { id: 'trattoria', label: 'The Trattoria', image: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=400&q=80', description: 'Rustic pastas and classic red sauces', longDescription: 'Rustic pastas, handmade sauces, and the timeless art of simple, high-quality ingredients.' },
    { id: 'americana', label: 'Classic Americana', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80', description: 'Diner staples and backyard favorites', longDescription: 'Diner-style staples, backyard burgers, and the legendary dishes of the American kitchen.' },
    { id: 'bistro', label: 'Old World Bistro', image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=400&q=80', description: 'Hearty classics from across the continent', longDescription: 'Refined continental classics, from French bistros to hearty Central European fare.' }
  ],
  seasonal: [
    { id: 'holiday', label: 'Holiday Winter Showstoppers', image: 'https://images.unsplash.com/photo-1576867756503-da85b47f8930?auto=format&fit=crop&w=400&q=80', description: 'Big feasts and festive crowd-pleasers', longDescription: 'Make it a December to remember with impressive, festive feasts designed for your holiday table.' },
    { id: 'bbq', label: 'Summer BBQ & Grilling', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80', description: 'Smoky mains and fresh outdoor sides', longDescription: 'Smoky flavors and backyard favorites—from the perfect char to the freshest outdoor sides.' },
    { id: 'harvest', label: 'Cozy Fall Harvest', image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?auto=format&fit=crop&w=400&q=80', description: 'Comforting bakes and earthy autumn flavors', longDescription: 'Embrace the crisp air with earthy root vegetables, warm spices, and slow-roasted comforts.' },
    { id: 'spring', label: 'The Fresh Spring Table', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80', description: 'Light, vibrant, and herb-forward dishes', longDescription: 'Celebrate the renewal with light, herb-forward dishes and the very first greens of the season.' }
  ]
};

// ─── Recipe Scoring ───────────────────────────────────────────────────────────

function scoreRecipe(recipe: Recipe, answers: QuizAnswers): number {
  let score = 0;
  const text = (recipe.title + ' ' + recipe.category + ' ' + recipe.description + ' ' + recipe.chefTip).toLowerCase();
  const totalTime = recipe.prepTime + recipe.cookTime;

  // Meal type match
  if (answers.mealType && answers.mealType.length > 0) {
    const cat = recipe.category.toLowerCase();
    const mealMatches = answers.mealType.some(m => {
      if (m === 'breakfast') return cat.includes('breakfast') || text.includes('breakfast') || text.includes('egg') || text.includes('pancake');
      if (m === 'lunch') return cat.includes('salad') || cat.includes('side') || cat.includes('appetizer') || text.includes('sandwich') || text.includes('wrap');
      if (m === 'dinner') return cat.includes('main') || cat.includes('whole meal') || cat.includes('dinner') || text.includes('dinner');
      if (m === 'dessert') return cat.includes('dessert') || text.includes('cake') || text.includes('cookie') || text.includes('sweet') || text.includes('chocolate');
      if (m === 'snack') return cat.includes('appetizer') || cat.includes('snack') || text.includes('dip') || text.includes('bite');
      if (m === 'drink') return cat.includes('cocktail') || cat.includes('drink') || text.includes('cocktail') || text.includes('drink');
      return false;
    });
    if (mealMatches) score += 3;
    else score -= 2; // Penalize mismatches
  }

  // Time constraint
  if (answers.time) {
    const limit = parseInt(answers.time);
    if (totalTime <= limit) score += 2;
    else if (totalTime > limit * 1.5) score -= 2;
  }

  // Party size
  if (answers.partySize) {
    const size = parseInt(answers.partySize);
    if (size === 1 && recipe.baseServings <= 2) score += 1;
    else if (size === 2 && recipe.baseServings <= 3) score += 2;
    else if (size === 4 && recipe.baseServings >= 3 && recipe.baseServings <= 6) score += 2;
    else if (size === 6 && recipe.baseServings >= 5) score += 2;
  }

  // Season match
  if (answers.season && !answers.season.includes('any')) {
    const seasonMatches = answers.season.some(s => {
      if (s === 'spring') return text.includes('salad') || text.includes('green') || text.includes('lemon') || text.includes('herb') || text.includes('asparagus') || text.includes('fresh');
      if (s === 'summer') return text.includes('grill') || text.includes('bbq') || text.includes('corn') || text.includes('tomato') || text.includes('cold') || text.includes('light');
      if (s === 'fall') return text.includes('pumpkin') || text.includes('squash') || text.includes('soup') || text.includes('stew') || text.includes('spice') || text.includes('apple') || text.includes('roast');
      if (s === 'winter') return text.includes('roast') || text.includes('hearty') || text.includes('stew') || text.includes('braise') || text.includes('warm') || text.includes('holiday') || text.includes('comfort');
      return false;
    });
    if (seasonMatches) score += 2;
  }

  // Cuisine/vibe match
  if (answers.cuisine && !answers.cuisine.includes('any')) {
    const cuisineMatches = answers.cuisine.some(c => {
      if (c === 'american') return text.includes('burger') || text.includes('bbq') || text.includes('mac') || text.includes('diner') || text.includes('american');
      if (c === 'italian') return text.includes('pasta') || text.includes('italian') || text.includes('tomato') || text.includes('lasagna') || text.includes('pizza') || text.includes('risotto');
      if (c === 'mexican') return text.includes('taco') || text.includes('mexican') || text.includes('salsa') || text.includes('fajita') || text.includes('enchilada') || text.includes('guacamole');
      if (c === 'asian') return text.includes('asian') || text.includes('curry') || text.includes('stir') || text.includes('soy') || text.includes('rice') || text.includes('noodle') || text.includes('thai') || text.includes('chinese') || text.includes('japanese');
      if (c === 'mediterranean') return text.includes('greek') || text.includes('lemon') || text.includes('olive') || text.includes('feta') || text.includes('hummus') || text.includes('mediterranean');
      if (c === 'comfort') return text.includes('mac') || text.includes('soup') || text.includes('stew') || text.includes('casserole') || text.includes('pot pie') || recipe.difficulty === 'Low';
      if (c === 'healthy') return text.includes('salad') || text.includes('fresh') || text.includes('light') || text.includes('lean') || text.includes('vegetable') || text.includes('veggie');
      return false;
    });
    if (cuisineMatches) score += 2;
  }

  return score;
}

// ─── Quiz Component ───────────────────────────────────────────────────────────

interface MealQuizProps {
  recipes: Recipe[];
  onClose: () => void;
  onRecipeSelect: (recipe: Recipe) => void;
}

const MealQuiz: React.FC<MealQuizProps> = ({ recipes, onClose, onRecipeSelect }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [showResults, setShowResults] = useState(false);

  const currentStep = QUIZ_STEPS[step];
  const totalSteps = QUIZ_STEPS.length;
  const progress = ((step) / totalSteps) * 100;

  const getCurrentValues = (): string[] => {
    const val = answers[currentStep.id as keyof QuizAnswers];
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  };

  const toggleOption = (value: string) => {
    const key = currentStep.id as keyof QuizAnswers;
    if (currentStep.multi) {
      const current = (answers[key] as string[] | undefined) || [];
      // "any/surprise" clears other selections
      if (value === 'any') {
        setAnswers(prev => ({ ...prev, [key]: ['any'] }));
        return;
      }
      const withoutAny = current.filter(v => v !== 'any');
      const next = withoutAny.includes(value)
        ? withoutAny.filter(v => v !== value)
        : [...withoutAny, value];
      setAnswers(prev => ({ ...prev, [key]: next.length ? next : [] }));
    } else {
      setAnswers(prev => ({ ...prev, [key]: [value] }));
    }
  };

  const canAdvance = getCurrentValues().length > 0;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleSkip = () => {
    if (step < totalSteps - 1) setStep(s => s + 1);
    else setShowResults(true);
  };

  const results = useMemo(() => {
    if (!showResults) return [];
    return recipes
      .map(r => ({ recipe: r, score: scoreRecipe(r, answers) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [showResults, recipes, answers]);

  if (showResults) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#000000] text-white flex flex-col font-sans max-w-[480px] mx-auto">
        <header className="sticky top-0 z-20 bg-[#000000]/95 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-b border-white/5 header-safe-pt">
          <button onClick={onClose} className="flex size-10 items-center justify-center active:scale-90">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-black uppercase tracking-tight">Your Matches</h2>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">{results.length} recipes found</p>
          </div>
          <button
            onClick={() => { setShowResults(false); setStep(0); setAnswers({}); }}
            className="flex size-10 items-center justify-center text-[#636b2f] active:scale-90"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 no-scrollbar px-4 pt-4">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center opacity-40 px-8">
              <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
              <p className="font-bold text-xl mb-2">No exact matches</p>
              <p className="text-sm">Try relaxing some filters — your library may not have recipes in that category yet.</p>
              <button onClick={() => { setShowResults(false); setStep(0); setAnswers({}); }} className="mt-8 px-6 py-3 bg-[#636b2f] rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95">
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {results.map(({ recipe, score }, idx) => (
                <div
                  key={recipe.id}
                  onClick={() => onRecipeSelect(recipe)}
                  className="flex gap-4 p-3 bg-[#1c1d15] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform relative overflow-hidden"
                >
                  {idx === 0 && (
                    <div className="absolute top-3 right-3 bg-[#636b2f] px-2 py-0.5 rounded-full">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white">Best Match</span>
                    </div>
                  )}
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                    <img src={formatImageUrl(recipe.imageUrl)} className="w-full h-full object-cover" alt={recipe.title} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className="flex flex-col justify-center flex-1 py-1 min-w-0">
                    <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-1">{recipe.category}</span>
                    <h3 className="text-white font-bold text-base leading-tight mb-1.5 line-clamp-2 pr-16">{recipe.title}</h3>
                    <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                      <span className="material-symbols-outlined text-sm">timer</span>
                      <span>{recipe.prepTime + recipe.cookTime} min</span>
                      <span>•</span>
                      <span>{recipe.difficulty}</span>
                      <span>•</span>
                      <span>{recipe.baseServings} servings</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  const selected = getCurrentValues();

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f110c] text-white flex flex-col font-sans max-w-[480px] mx-auto">
      {/* Progress bar */}
      <div className="w-full h-1 bg-white/5">
        <div
          className="h-full bg-[#636b2f] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header className="px-4 pt-4 pb-2 flex items-center justify-between header-safe-pt">
        <button
          onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
          className="flex size-10 items-center justify-center active:scale-90 text-white/60"
        >
          <span className="material-symbols-outlined">{step === 0 ? 'close' : 'arrow_back'}</span>
        </button>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{step + 1} of {totalSteps}</p>
        <button onClick={handleSkip} className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2 py-1 active:text-white/60">
          Skip
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-6 pb-8 overflow-y-auto no-scrollbar">
        <div className="mb-8">
          <div className="size-14 rounded-2xl bg-[#636b2f]/20 border border-[#636b2f]/30 flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-[#636b2f] text-2xl">{currentStep.icon}</span>
          </div>
          <h2 className="text-3xl font-black leading-tight tracking-tight mb-1">{currentStep.question}</h2>
          {currentStep.multi && (
            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-2">Select all that apply</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1">
          {currentStep.options.map(opt => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleOption(opt.value)}
                className={`flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all active:scale-[0.97] text-left ${
                  isSelected
                    ? 'bg-[#636b2f] border-[#636b2f] shadow-lg shadow-[#636b2f]/20'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-white' : 'text-white/40'}`}>
                  {opt.icon}
                </span>
                <span className={`font-bold text-sm leading-tight ${isSelected ? 'text-white' : 'text-white/70'}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="px-6 pb-10 pt-4 border-t border-white/5 bg-[#0f110c]">
        <button
          onClick={handleNext}
          disabled={!canAdvance}
          className="w-full bg-[#636b2f] disabled:opacity-25 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-base uppercase tracking-widest active:scale-[0.98] transition-all shadow-lg shadow-[#636b2f]/20"
        >
          {step === totalSteps - 1 ? (
            <>
              <span className="material-symbols-outlined">search</span>
              Find My Recipes
            </>
          ) : (
            <>
              Next
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
};

// ─── Main Collections Component ───────────────────────────────────────────────

const Collections: React.FC<CollectionsProps> = ({
  recipes,
  onBack,
  onRecipeSelect,
  onPlannerOpen,
  recentCount
}) => {
  const [selectedTheme, setSelectedTheme] = useState<CollectionItem | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  const moneySaved = recentCount * 8;

  const filteredRecipes = useMemo(() => {
    if (!selectedTheme) return [];
    return recipes.filter(r => {
      const text = (r.title + r.category + r.description).toLowerCase();
      switch (selectedTheme.id) {
        case 'one-pot': return text.includes('sheet') || text.includes('pot') || text.includes('pan') || text.includes('skillet');
        case 'sunday-prep': return r.baseServings >= 6 || text.includes('batch') || text.includes('prep');
        case 'table-two': return r.baseServings === 2 || text.includes('steak') || text.includes('risotto') || text.includes('date');
        case 'pantry': return text.includes('pasta') || text.includes('bean') || text.includes('canned') || text.includes('rice');
        case 'social': return r.category === 'Appetizer' || r.category === 'Cocktail' || r.category === 'Snack' || text.includes('dip');
        case '30-min': return (r.prepTime + r.cookTime) <= 35;
        case 'taco': return text.includes('taco') || text.includes('mexican') || text.includes('salsa') || text.includes('fajita');
        case 'mediterranean': return text.includes('greek') || text.includes('lemon') || text.includes('olive') || text.includes('fish');
        case 'nostalgic': return text.includes('mac') || text.includes('cheese') || text.includes('pie') || text.includes('roast') || text.includes('soup');
        case 'street': return text.includes('skewer') || text.includes('bao') || text.includes('sandwich') || text.includes('fried');
        case 'silk': return text.includes('asian') || text.includes('curry') || text.includes('rice') || text.includes('stir') || text.includes('soy');
        case 'trattoria': return text.includes('pasta') || text.includes('italian') || text.includes('tomato') || text.includes('lasagna');
        case 'americana': return text.includes('burger') || text.includes('bbq') || text.includes('fry') || text.includes('diner');
        case 'bistro': return text.includes('french') || text.includes('steak') || text.includes('onion') || text.includes('wine');
        case 'holiday': return r.category === 'Whole Meal' || text.includes('roast') || text.includes('turkey') || text.includes('ham') || text.includes('feast');
        case 'bbq': return text.includes('grill') || text.includes('bbq') || text.includes('burger') || text.includes('corn') || text.includes('summer');
        case 'harvest': return text.includes('pumpkin') || text.includes('squash') || text.includes('soup') || text.includes('stew') || text.includes('spice') || text.includes('apple');
        case 'spring': return text.includes('salad') || text.includes('green') || text.includes('lemon') || text.includes('herb') || text.includes('asparagus') || text.includes('fresh');
        default: return true;
      }
    });
  }, [selectedTheme, recipes]);

  const renderCollectionCards = (items: CollectionItem[]) => (
    <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setSelectedTheme(item)}
          className="relative w-[160px] h-[220px] shrink-0 rounded-[1.25rem] overflow-hidden group active:scale-95 transition-transform bg-[#1c1d15] border border-white/5"
        >
          <img src={item.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70" alt={item.label} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
            <h3 className="text-white font-black text-lg leading-none mb-2 line-clamp-2">{item.label}</h3>
            <p className="text-[#b6baa1] text-[9px] font-medium leading-relaxed line-clamp-3 opacity-90">{item.description}</p>
          </div>
        </button>
      ))}
    </div>
  );

  // ── Theme detail view ──
  if (selectedTheme) {
    return (
      <div className="bg-[#000000] min-h-screen text-white flex flex-col font-sans max-w-[480px] mx-auto">
        <header className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5 header-safe-pt">
          <button onClick={() => setSelectedTheme(null)} className="flex items-center justify-center size-10 active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-2xl text-white font-bold">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-black tracking-tight uppercase">{selectedTheme.label}</h1>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">{filteredRecipes.length} Recipes</p>
          </div>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 p-4 pb-32 overflow-y-auto no-scrollbar">
          {selectedTheme.longDescription && (
            <div className="mb-6 px-2">
              <p className="text-[#b6baa1] text-sm font-medium leading-relaxed text-center italic opacity-80">"{selectedTheme.longDescription}"</p>
            </div>
          )}

          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  onClick={() => onRecipeSelect(recipe)}
                  className="flex gap-4 p-2 bg-[#1c1d15] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform"
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                    <img src={formatImageUrl(recipe.imageUrl)} className="w-full h-full object-cover" alt={recipe.title} />
                  </div>
                  <div className="flex flex-col justify-center flex-1 py-1">
                    <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-1">{recipe.category}</span>
                    <h3 className="text-white font-bold text-base leading-tight mb-2 line-clamp-2">{recipe.title}</h3>
                    <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                      <span>{recipe.prepTime + recipe.cookTime} Min</span>
                      <span>•</span>
                      <span>{recipe.difficulty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <span className="material-symbols-outlined text-5xl mb-4">search_off</span>
              <p className="text-sm font-bold">No matching recipes found.</p>
              <p className="text-xs">Try adding more recipes to your library.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Main dashboard ──
  return (
    <>
      <div className="bg-[#000000] min-h-screen text-white flex flex-col font-sans max-w-[480px] mx-auto">
        <header className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5 header-safe-pt">
          <button onClick={onBack} className="flex items-center justify-center size-10 active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-2xl text-white font-bold">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-black tracking-tight uppercase">Collections</h1>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Curated Suites</p>
          </div>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 pb-40 overflow-y-auto no-scrollbar">

          {/* Meal Finder CTA */}
          <section className="px-4 pt-6 pb-2">
            <button
              onClick={() => setShowQuiz(true)}
              className="w-full relative overflow-hidden rounded-3xl bg-[#1c1d15] border border-[#636b2f]/30 p-5 flex items-center gap-4 active:scale-[0.98] transition-all group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#636b2f]/10 via-transparent to-transparent"></div>
              <div className="size-14 rounded-2xl bg-[#636b2f] flex items-center justify-center shrink-0 shadow-lg shadow-[#636b2f]/30 relative z-10">
                <span className="material-symbols-outlined text-white text-2xl">quiz</span>
              </div>
              <div className="flex-1 text-left relative z-10">
                <p className="text-white font-black text-lg leading-tight">Find My Recipe</p>
                <p className="text-[#b6baa1] text-xs font-medium mt-0.5 leading-snug">Answer 5 quick questions and get matched to the perfect dish.</p>
              </div>
              <span className="material-symbols-outlined text-[#636b2f] relative z-10 group-active:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </section>

          {/* Recap Block */}
          <section className="px-4 pt-4 pb-8">
            <h2 className="text-sm font-black text-white tracking-widest uppercase mb-4 px-1 text-[#636b2f] opacity-80">Insight</h2>
            <div className="flex flex-col gap-4 rounded-3xl bg-[#1c1d15] p-6 shadow-2xl border border-white/5 relative overflow-hidden">
              <div className="flex flex-col gap-1.5 relative z-10">
                <p className="text-white text-lg font-black leading-tight">Last 30 Days Recap</p>
                <p className="text-[#b6baa1] text-sm font-medium leading-relaxed">
                  You cooked <span className="text-white font-bold">{recentCount} meals</span> this month, potentially saving <span className="text-[#636b2f] font-bold">${moneySaved}</span> vs. dining out.
                </p>
              </div>
              <button
                onClick={onPlannerOpen}
                className="flex min-w-[120px] cursor-pointer items-center justify-center rounded-full h-11 px-8 bg-[#3b3e2e] text-white gap-2 text-xs font-black uppercase tracking-widest active:scale-95 w-fit relative z-10"
              >
                <span>View Planner</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#636b2f]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#636b2f]/5 rounded-full blur-2xl -ml-12 -mb-12"></div>
            </div>
          </section>

          <section className="mb-8">
            <div className="px-4 mb-3">
              <h2 className="text-xl font-black text-white tracking-tight">The Lifestyle Lab</h2>
              <p className="text-[10px] font-bold uppercase text-[#636b2f] tracking-widest mt-1 opacity-80">Solving your "Right Now" reality</p>
            </div>
            {renderCollectionCards(COLLECTIONS_DATA.lifestyle)}
          </section>

          <section className="mb-8">
            <div className="px-4 mb-3">
              <h2 className="text-xl font-black text-white tracking-tight">The Global Gallery</h2>
              <p className="text-[10px] font-bold uppercase text-[#636b2f] tracking-widest mt-1 opacity-80">Enjoy a taste around the world</p>
            </div>
            {renderCollectionCards(COLLECTIONS_DATA.global)}
          </section>

          <section className="mb-8">
            <div className="px-4 mb-3">
              <h2 className="text-xl font-black text-white tracking-tight">The Seasonal Suite</h2>
              <p className="text-[10px] font-bold uppercase text-[#636b2f] tracking-widest mt-1 opacity-80">A recipe perfect for anytime of the year</p>
            </div>
            {renderCollectionCards(COLLECTIONS_DATA.seasonal)}
          </section>
        </main>
      </div>

      {showQuiz && (
        <MealQuiz
          recipes={recipes}
          onClose={() => setShowQuiz(false)}
          onRecipeSelect={(r) => { setShowQuiz(false); onRecipeSelect(r); }}
        />
      )}
    </>
  );
};

export default Collections;
