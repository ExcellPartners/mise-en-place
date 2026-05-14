import React, { useState, useMemo, useRef } from 'react';
import { Recipe, PantryItem } from '../types';
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
}

interface CollectionItem {
  id: string;
  label: string;
  image: string;
  description: string;
}

// ─── Quiz Types ────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  question: string;
  emoji: string;
  options: { label: string; value: string }[];
}

interface QuizAnswers {
  [questionId: string]: string;
}

type QuizState = 'idle' | 'active' | 'loading' | 'result' | 'error';

// ─── Quiz Questions ────────────────────────────────────────────────────────────

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'mood',
    question: "What's your mood right now?",
    emoji: '🧠',
    options: [
      { label: 'Cozy & comforted', value: 'cozy and comforted, craving something warm and hearty' },
      { label: 'Light & energized', value: 'light and energized, wanting something fresh and healthy' },
      { label: 'Adventurous', value: 'adventurous and curious, excited to try bold or new flavors' },
      { label: 'Low effort mode', value: 'tired and in low-effort mode, needing something simple and fast' },
    ],
  },
  {
    id: 'time',
    question: 'How much time do you have?',
    emoji: '⏱️',
    options: [
      { label: 'Under 20 min', value: 'under 20 minutes' },
      { label: '20–40 min', value: '20 to 40 minutes' },
      { label: '40–60 min', value: '40 to 60 minutes' },
      { label: "I've got all night", value: 'over an hour, I enjoy the process' },
    ],
  },
  {
    id: 'protein',
    question: 'What protein are you feeling?',
    emoji: '🥩',
    options: [
      { label: 'Chicken', value: 'chicken' },
      { label: 'Beef or pork', value: 'beef or pork' },
      { label: 'Seafood or fish', value: 'seafood or fish' },
      { label: 'Vegetarian / flexible', value: 'vegetarian or no strong preference for protein' },
    ],
  },
  {
    id: 'vibe',
    question: 'What cuisine vibe?',
    emoji: '🌍',
    options: [
      { label: 'Classic American', value: 'classic American comfort food' },
      { label: 'Italian / Mediterranean', value: 'Italian or Mediterranean' },
      { label: 'Asian-inspired', value: 'Asian-inspired flavors' },
      { label: 'Anything goes', value: 'no preference, surprise me' },
    ],
  },
  {
    id: 'occasion',
    question: "What's the occasion?",
    emoji: '🍽️',
    options: [
      { label: 'Just me tonight', value: 'just cooking for myself' },
      { label: 'Weeknight family dinner', value: 'a weeknight family dinner' },
      { label: 'Impressing someone', value: 'impressing a guest or date' },
      { label: 'Meal prep / leftovers', value: 'meal prepping for the week' },
    ],
  },
];

// ─── Collections Data ──────────────────────────────────────────────────────────

const COLLECTIONS_DATA: Record<string, CollectionItem[]> = {
  lifestyle: [
    { id: 'one-pot', label: 'One-Pot Wonders', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80', description: 'Big flavor with only one dish to wash' },
    { id: 'sunday-prep', label: 'Sunday Prep & Set', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&q=80', description: 'Cook once, eat well all week long' },
    { id: 'table-two', label: 'Table for Two', image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=400&q=80', description: 'Fancy-ish meals for an intimate night in' },
    { id: 'pantry', label: 'Pantry Foraging', image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&w=400&q=80', description: 'Turn your staples into last-minute meals' },
    { id: 'social', label: 'The Social Hour', image: 'https://images.unsplash.com/photo-1563206767-5b1d97512715?auto=format&fit=crop&w=400&q=80', description: 'Appetizers and snacks for a hungry crowd' },
    { id: '30-min', label: 'The 30-Minute Hustle', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80', description: 'Real food for your busiest weeknights' },
  ],
  global: [
    { id: 'taco', label: 'Taco Tuesday & Beyond', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80', description: 'Bold Mexican flavors and easy fiestas' },
    { id: 'mediterranean', label: 'Mediterranean Escape', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80', description: 'Bright, healthy, and olive-oil-powered' },
    { id: 'nostalgic', label: 'Nostalgic Comforts', image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=400&q=80', description: 'Family favorites that taste like home' },
    { id: 'street', label: 'Global Street Food', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80', description: 'Bold bites and handheld world flavors' },
    { id: 'silk', label: 'The Silk Road', image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80', description: 'Stir-frys, curries, and umami-rich eats' },
    { id: 'trattoria', label: 'The Trattoria', image: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=400&q=80', description: 'Rustic pastas and classic red sauces' },
    { id: 'americana', label: 'Classic Americana', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80', description: 'Diner staples and backyard favorites' },
    { id: 'bistro', label: 'Old World Bistro', image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=400&q=80', description: 'Hearty classics from across the continent' },
  ],
  seasonal: [
    { id: 'holiday', label: 'Holiday Winter', image: 'https://images.unsplash.com/photo-1576867756503-da85b47f8930?auto=format&fit=crop&w=400&q=80', description: 'Big feasts and festive crowd-pleasers' },
    { id: 'bbq', label: 'Summer BBQ & Grilling', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80', description: 'Smoky mains and fresh outdoor sides' },
    { id: 'harvest', label: 'Cozy Fall Harvest', image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?auto=format&fit=crop&w=400&q=80', description: 'Comforting bakes and earthy autumn flavors' },
    { id: 'spring', label: 'The Fresh Spring Table', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80', description: 'Light, vibrant, and herb-forward dishes' },
  ],
};

// ─── Component ─────────────────────────────────────────────────────────────────

const Collections: React.FC<CollectionsProps> = ({
  recipes, onBack, onRecipeSelect, onPlannerOpen, recentCount,
  pantry = [], cookedHistory = [], collectionImages = {}
}) => {
  const [selectedTheme, setSelectedTheme] = useState<CollectionItem | null>(null);
  const [activeSection, setActiveSection] = useState<'collections' | 'quiz' | 'almostThere' | 'history'>('collections');
  const moneySaved = recentCount * 8;

  // ── Quiz state ──────────────────────────────────────────────────────────────
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [matchedRecipe, setMatchedRecipe] = useState<Recipe | null>(null);
  const [matchReason, setMatchReason] = useState<string>('');
  const [quizError, setQuizError] = useState<string>('');
  const mainRef = useRef<HTMLDivElement>(null);

  // ── Collection theme filtering ──────────────────────────────────────────────
  const filteredRecipes = useMemo(() => {
    if (!selectedTheme) return [];
    return recipes.filter(r => {
      const text = (r.title + r.category + r.description).toLowerCase();
      switch (selectedTheme.id) {
        case 'one-pot':       return text.includes('sheet') || text.includes('pot') || text.includes('pan') || text.includes('skillet');
        case 'sunday-prep':   return r.baseServings >= 6 || text.includes('batch') || text.includes('prep');
        case 'table-two':     return r.baseServings === 2 || text.includes('steak') || text.includes('risotto');
        case 'pantry':        return text.includes('pasta') || text.includes('bean') || text.includes('canned') || text.includes('rice');
        case 'social':        return r.category === 'Appetizer' || r.category === 'Beverages' || r.category === 'Beverage' || r.category === 'Cocktail' || text.includes('dip');
        case '30-min':        return (r.prepTime + r.cookTime) <= 35;
        case 'taco':          return text.includes('taco') || text.includes('mexican') || text.includes('salsa') || text.includes('fajita');
        case 'mediterranean': return text.includes('greek') || text.includes('lemon') || text.includes('olive') || text.includes('fish');
        case 'nostalgic':     return text.includes('mac') || text.includes('cheese') || text.includes('pie') || text.includes('roast') || text.includes('soup');
        case 'street':        return text.includes('skewer') || text.includes('bao') || text.includes('sandwich') || text.includes('fried');
        case 'silk':          return text.includes('asian') || text.includes('curry') || text.includes('rice') || text.includes('stir') || text.includes('soy');
        case 'trattoria':     return text.includes('pasta') || text.includes('italian') || text.includes('tomato') || text.includes('lasagna');
        case 'americana':     return text.includes('burger') || text.includes('bbq') || text.includes('fry') || text.includes('diner');
        case 'bistro':        return text.includes('french') || text.includes('steak') || text.includes('onion') || text.includes('wine');
        case 'holiday':       return text.includes('roast') || text.includes('turkey') || text.includes('ham') || text.includes('feast');
        case 'bbq':           return text.includes('grill') || text.includes('bbq') || text.includes('burger') || text.includes('corn');
        case 'harvest':       return text.includes('pumpkin') || text.includes('squash') || text.includes('soup') || text.includes('stew') || text.includes('apple');
        case 'spring':        return text.includes('salad') || text.includes('green') || text.includes('lemon') || text.includes('herb') || text.includes('asparagus');
        default:              return true;
      }
    });
  }, [selectedTheme, recipes]);

  // ── Almost There ────────────────────────────────────────────────────────────
  const almostThereRecipes = useMemo(() => {
    const inStockNames = new Set(
      pantry.filter(p => (p.quantity ?? 0) > 0).map(p => p.name.toLowerCase().trim())
    );
    return recipes
      .map(recipe => {
        const missing = recipe.ingredients.filter(ing => !inStockNames.has(ing.name.toLowerCase().trim()));
        return { recipe, missingCount: missing.length, missingNames: missing.map(i => i.name) };
      })
      .filter(r => r.missingCount > 0 && r.missingCount <= 3)
      .sort((a, b) => a.missingCount - b.missingCount)
      .slice(0, 20);
  }, [recipes, pantry]);

  // ── Cooked History ──────────────────────────────────────────────────────────
  const sortedHistory = useMemo(() => {
    return [...cookedHistory]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);
  }, [cookedHistory]);

  // ── Quiz handlers ───────────────────────────────────────────────────────────

  const startQuiz = () => {
    setAnswers({});
    setCurrentQuestionIdx(0);
    setMatchedRecipe(null);
    setMatchReason('');
    setQuizError('');
    setQuizState('active');
    setTimeout(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const resetQuiz = () => {
    setQuizState('idle');
    setAnswers({});
    setCurrentQuestionIdx(0);
    setMatchedRecipe(null);
    setMatchReason('');
    setQuizError('');
  };

  const handleAnswer = async (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    const isLast = currentQuestionIdx === QUIZ_QUESTIONS.length - 1;

    if (!isLast) {
      setCurrentQuestionIdx(prev => prev + 1);
      setTimeout(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
      return;
    }

    // Final question answered — call Claude
    setQuizState('loading');

    try {
      const recipeList = recipes
        .slice(0, 200)
        .map(r =>
          `ID:${r.id} | "${r.title}" | ${r.category} | ${(r.prepTime || 0) + (r.cookTime || 0)}min | ${r.difficulty || 'N/A'} | ${(r.description || '').slice(0, 80)}`
        )
        .join('\n');

      const userProfile = [
        `Mood: ${newAnswers['mood']}`,
        `Time available: ${newAnswers['time']}`,
        `Protein preference: ${newAnswers['protein']}`,
        `Cuisine vibe: ${newAnswers['vibe']}`,
        `Occasion: ${newAnswers['occasion']}`,
      ].join('\n');

      const prompt = `You are a personal chef assistant helping someone choose a recipe to cook tonight.

Here is their profile:
${userProfile}

Here is the recipe library (ID | title | category | total time | difficulty | description snippet):
${recipeList}

Your task: Pick the single best matching recipe from the list above. You MUST use a recipe ID that exists exactly in the list above.

Respond with ONLY valid JSON — no other text, no markdown fences:
{
  "recipeId": "<exact ID from the list>",
  "reason": "<one warm, enthusiastic sentence explaining why this recipe is perfect for them right now>"
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);

      const data = await response.json();
      const rawText = (data.content as { type: string; text?: string }[])
        ?.map(b => (b.type === 'text' ? b.text : ''))
        .join('') || '';

      const clean = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      const recipe = recipes.find(r => r.id === parsed.recipeId);
      if (!recipe) throw new Error('Recipe ID not found in library');

      setMatchedRecipe(recipe);
      setMatchReason(parsed.reason || '');
      setQuizState('result');
    } catch (err) {
      console.error('Quiz API error:', err);
      setQuizError('Something went wrong finding your match. Give it another shot?');
      setQuizState('error');
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

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

  // ── Quiz sub-renders ────────────────────────────────────────────────────────

  const renderQuizIdle = () => (
    <div className="px-4 pt-10 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-3xl bg-[#636b2f]/20 border border-[#636b2f]/30 flex items-center justify-center mb-6">
        <span className="text-4xl">🧑‍🍳</span>
      </div>
      <h2 className="text-2xl font-black text-white tracking-tight mb-2">What Should I Cook?</h2>
      <p className="text-[#b6baa1] text-sm font-medium leading-relaxed mb-8 max-w-xs">
        Answer 5 quick questions and Claude will pick the perfect recipe from your library for tonight.
      </p>
      <button onClick={startQuiz}
        className="flex items-center gap-3 rounded-full h-14 px-10 bg-[#636b2f] text-white text-sm font-black uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-[#636b2f]/30">
        <span className="material-symbols-outlined text-xl">auto_awesome</span>
        Start the Quiz
      </button>
      <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mt-6">Powered by Claude AI · 5 questions</p>
    </div>
  );

  const renderQuizActive = () => {
    const q = QUIZ_QUESTIONS[currentQuestionIdx];
    const progress = (currentQuestionIdx / QUIZ_QUESTIONS.length) * 100;

    return (
      <div className="px-4 pt-6">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#636b2f] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest shrink-0">
            {currentQuestionIdx + 1} / {QUIZ_QUESTIONS.length}
          </span>
        </div>

        {/* Question */}
        <div className="mb-8">
          <span className="text-5xl block mb-4">{q.emoji}</span>
          <h2 className="text-xl font-black text-white tracking-tight leading-tight">{q.question}</h2>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {q.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleAnswer(q.id, opt.value)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[#1c1d15] border border-white/5 text-left active:scale-[0.98] active:border-[#636b2f]/60 active:bg-[#636b2f]/10 transition-all"
            >
              <div className="w-7 h-7 rounded-full border-2 border-white/15 shrink-0" />
              <span className="text-white font-bold text-sm leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Back */}
        {currentQuestionIdx > 0 && (
          <button
            onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
            className="flex items-center gap-2 mt-7 text-white/30 text-xs font-black uppercase tracking-widest active:opacity-60 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </button>
        )}
      </div>
    );
  };

  const renderQuizLoading = () => (
    <div className="px-4 pt-20 flex flex-col items-center text-center">
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 rounded-full border-2 border-[#636b2f]/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#636b2f] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🧑‍🍳</div>
      </div>
      <h2 className="text-xl font-black text-white mb-2">Finding your match…</h2>
      <p className="text-[#b6baa1] text-sm font-medium leading-relaxed max-w-xs">
        Claude is reading through your library and thinking about what fits you best tonight.
      </p>
    </div>
  );

  const renderQuizResult = () => {
    if (!matchedRecipe) return null;
    const totalTime = (matchedRecipe.prepTime || 0) + (matchedRecipe.cookTime || 0);

    return (
      <div className="px-4 pt-6">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-1">Tonight's Pick</p>
          <h2 className="text-2xl font-black text-white tracking-tight">Perfect Match ✨</h2>
        </div>

        {/* Recipe card */}
        <div
          onClick={() => onRecipeSelect(matchedRecipe)}
          className="rounded-3xl overflow-hidden bg-[#1c1d15] border border-white/5 active:scale-[0.98] transition-transform cursor-pointer mb-4"
        >
          <div className="relative w-full aspect-[4/3] bg-white/5">
            <img
              src={formatImageUrl(matchedRecipe.imageUrl)}
              alt={matchedRecipe.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-[#636b2f] text-white text-[9px] font-black uppercase tracking-widest">
              AI Pick
            </div>
          </div>

          <div className="p-5">
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-1">{matchedRecipe.category}</p>
            <h3 className="text-white font-black text-xl leading-tight mb-3">{matchedRecipe.title}</h3>

            <div className="flex gap-4 mb-4">
              {totalTime > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#636b2f] text-sm">schedule</span>
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{totalTime} min</span>
                </div>
              )}
              {matchedRecipe.difficulty && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#636b2f] text-sm">signal_cellular_alt</span>
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{matchedRecipe.difficulty}</span>
                </div>
              )}
              {matchedRecipe.baseServings > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#636b2f] text-sm">group</span>
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Serves {matchedRecipe.baseServings}</span>
                </div>
              )}
            </div>

            {matchReason && (
              <div className="flex gap-3 p-3 rounded-2xl bg-[#636b2f]/10 border border-[#636b2f]/20">
                <span className="text-lg shrink-0">🧑‍🍳</span>
                <p className="text-[#b6baa1] text-xs font-medium leading-relaxed">{matchReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* CTAs */}
        <button
          onClick={() => onRecipeSelect(matchedRecipe)}
          className="w-full flex items-center justify-center gap-3 rounded-full h-14 bg-[#636b2f] text-white text-sm font-black uppercase tracking-widest active:scale-95 transition-transform mb-3 shadow-lg shadow-[#636b2f]/30"
        >
          <span className="material-symbols-outlined text-xl">menu_book</span>
          Open Recipe
        </button>

        <button
          onClick={resetQuiz}
          className="w-full flex items-center justify-center gap-2 rounded-full h-11 bg-white/5 border border-white/10 text-white/50 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Try Again
        </button>
      </div>
    );
  };

  const renderQuizError = () => (
    <div className="px-4 pt-20 flex flex-col items-center text-center">
      <span className="text-5xl mb-6">😕</span>
      <h2 className="text-xl font-black text-white mb-2">Couldn't find a match</h2>
      <p className="text-[#b6baa1] text-sm font-medium leading-relaxed mb-8 max-w-xs">{quizError}</p>
      <button onClick={resetQuiz}
        className="flex items-center gap-2 rounded-full h-12 px-8 bg-[#1c1d15] border border-white/10 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">
        <span className="material-symbols-outlined text-sm">refresh</span>
        Start Over
      </button>
    </div>
  );

  // ─── Selected theme drill-down view ────────────────────────────────────────

  if (selectedTheme) {
    return (
      <div className="bg-[#000000] min-h-screen text-white flex flex-col w-full">
        <header className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5 header-safe-pt">
          <button onClick={() => setSelectedTheme(null)} className="size-10 flex items-center justify-center active:scale-90">
            <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-black tracking-tight uppercase">{selectedTheme.label}</h1>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">{filteredRecipes.length} Recipes</p>
          </div>
          <div className="w-10" />
        </header>
        <main className="flex-1 p-4 pb-32">
          {filteredRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
              <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
              <p className="font-bold text-xl mb-2">No matches yet</p>
              <p className="text-sm">Add more recipes to populate this collection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredRecipes.map(recipe => (
                <div key={recipe.id} onClick={() => onRecipeSelect(recipe)} className="flex flex-col gap-2 cursor-pointer group">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#1a1d14]">
                    <img src={formatImageUrl(recipe.imageUrl)} alt={recipe.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-black line-clamp-1 group-hover:text-[#636b2f] transition-colors">{recipe.title}</p>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{(recipe.prepTime || 0) + (recipe.cookTime || 0)} MIN</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── Main view ──────────────────────────────────────────────────────────────

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

      {/* 4-tab bar */}
      <div className="sticky top-[60px] z-10 px-4 pt-3 pb-2 bg-[#000000]/95 backdrop-blur-md border-b border-white/5">
        <div className="flex gap-1.5 p-1 bg-white/5 rounded-2xl">
          {([
            { id: 'collections', label: 'Browse',  icon: 'collections_bookmark' },
            { id: 'quiz',        label: 'Quiz',    icon: 'auto_awesome' },
            { id: 'almostThere', label: 'Almost',  icon: 'kitchen' },
            { id: 'history',     label: 'History', icon: 'history' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all gap-0.5 ${
                activeSection === tab.id ? 'bg-[#636b2f] text-white' : 'text-white/40'
              }`}>
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              <span className="text-[7.5px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
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
          <>
            {quizState === 'idle'    && renderQuizIdle()}
            {quizState === 'active'  && renderQuizActive()}
            {quizState === 'loading' && renderQuizLoading()}
            {quizState === 'result'  && renderQuizResult()}
            {quizState === 'error'   && renderQuizError()}
          </>
        )}

        {/* ── ALMOST THERE tab ── */}
        {activeSection === 'almostThere' && (
          <div className="px-4 pt-6">
            <h2 className="text-xl font-black text-white tracking-tight mb-1">Almost There</h2>
            <p className="text-[#b6baa1] text-sm font-medium leading-relaxed mb-6">Recipes you can make with just a few more ingredients.</p>
            {pantry.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center opacity-40 px-8">
                <span className="material-symbols-outlined text-6xl mb-4">kitchen</span>
                <p className="font-bold text-xl mb-2">Pantry not loaded</p>
                <p className="text-sm">Sync your Google Sheet to see recommendations.</p>
              </div>
            ) : almostThereRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center opacity-40 px-8">
                <span className="material-symbols-outlined text-6xl mb-4">check_circle</span>
                <p className="font-bold text-xl mb-2">You're well stocked!</p>
                <p className="text-sm">No recipes are missing 3 or fewer ingredients.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {almostThereRecipes.map(({ recipe, missingCount, missingNames }) => (
                  <div key={recipe.id} onClick={() => onRecipeSelect(recipe)}
                    className="flex gap-4 p-3 bg-[#1c1d15] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                      <img src={formatImageUrl(recipe.imageUrl)} className="w-full h-full object-cover" alt={recipe.title}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
                      <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-1">{recipe.category}</span>
                      <h3 className="text-white font-bold text-base leading-tight mb-1.5 line-clamp-1">{recipe.title}</h3>
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
            )}
          </div>
        )}

        {/* ── HISTORY tab ── */}
        {activeSection === 'history' && (
          <div className="px-4 pt-6">
            <h2 className="text-xl font-black text-white tracking-tight mb-1">Cooked History</h2>
            <p className="text-[#b6baa1] text-sm font-medium mb-6">Every recipe you've made, in order.</p>
            {sortedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center opacity-40 px-8">
                <span className="material-symbols-outlined text-6xl mb-4">history</span>
                <p className="font-bold text-xl mb-2">No history yet</p>
                <p className="text-sm">Mark recipes as Cooked in the Planner and they'll show up here.</p>
              </div>
            ) : (
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
                        {recipe ? (
                          <img src={formatImageUrl(recipe.imageUrl)} className="w-full h-full object-cover" alt={recipe.title}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/20 text-2xl">restaurant</span>
                          </div>
                        )}
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
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default Collections;
