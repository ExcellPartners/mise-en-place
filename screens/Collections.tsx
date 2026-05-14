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

// ─── Multi-Filter Types ────────────────────────────────────────────────────────

interface FilterGroup {
  id: string;
  label: string;
  emoji: string;
  options: FilterOption[];
  // How this group scores a recipe. Returns 0 (no match) or 1 (match).
  score: (recipe: Recipe, selected: string[]) => number;
}

interface FilterOption {
  label: string;
  value: string;
}

// ─── Filter Definitions ────────────────────────────────────────────────────────

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'time',
    label: 'Time',
    emoji: '⏱️',
    options: [
      { label: 'Under 20 min', value: 'under20' },
      { label: '20–40 min',    value: '20to40'  },
      { label: '40–60 min',    value: '40to60'  },
      { label: '60+ min',      value: 'over60'  },
    ],
    score: (r, selected) => {
      const total = (r.prepTime || 0) + (r.cookTime || 0);
      return selected.some(v =>
        (v === 'under20' && total < 20) ||
        (v === '20to40'  && total >= 20 && total <= 40) ||
        (v === '40to60'  && total > 40  && total <= 60) ||
        (v === 'over60'  && total > 60)
      ) ? 1 : 0;
    },
  },
  {
    id: 'difficulty',
    label: 'Difficulty',
    emoji: '📊',
    options: [
      { label: 'Easy',   value: 'easy'   },
      { label: 'Medium', value: 'medium' },
      { label: 'Hard',   value: 'hard'   },
    ],
    score: (r, selected) => {
      const d = (r.difficulty || '').toLowerCase();
      return selected.some(v => d.includes(v)) ? 1 : 0;
    },
  },
  {
    id: 'protein',
    label: 'Protein',
    emoji: '🥩',
    options: [
      { label: 'Chicken',    value: 'chicken'                    },
      { label: 'Beef',       value: 'beef'                       },
      { label: 'Pork',       value: 'pork'                       },
      { label: 'Seafood',    value: 'seafood'                    },
      { label: 'Fish',       value: 'fish'                       },
      { label: 'Vegetarian', value: 'vegetarian'                 },
    ],
    score: (r, selected) => {
      const text = `${r.title} ${r.description} ${r.category} ${(r.ingredients || []).map((i: { name: string }) => i.name).join(' ')}`.toLowerCase();
      return selected.some(v => text.includes(v)) ? 1 : 0;
    },
  },
  {
    id: 'cuisine',
    label: 'Cuisine',
    emoji: '🌍',
    options: [
      { label: 'American',      value: 'american'     },
      { label: 'Italian',       value: 'italian'      },
      { label: 'Mexican',       value: 'mexican'      },
      { label: 'Asian',         value: 'asian'        },
      { label: 'Mediterranean', value: 'mediterranean'},
      { label: 'French',        value: 'french'       },
      { label: 'Indian',        value: 'indian'       },
    ],
    score: (r, selected) => {
      const text = `${r.title} ${r.description} ${r.category}`.toLowerCase();
      // Expand some terms for better matching
      const expansions: Record<string, string[]> = {
        asian:         ['asian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'soy', 'stir', 'ramen', 'sushi', 'teriyaki', 'curry'],
        italian:       ['italian', 'pasta', 'pizza', 'risotto', 'lasagna', 'parmesan', 'marinara', 'pesto'],
        mexican:       ['mexican', 'taco', 'salsa', 'fajita', 'enchilada', 'guacamole', 'burrito', 'quesadilla'],
        mediterranean: ['mediterranean', 'greek', 'hummus', 'falafel', 'olive', 'tzatziki'],
        french:        ['french', 'bistro', 'coq au vin', 'ratatouille', 'beurre', 'gratin'],
        indian:        ['indian', 'curry', 'masala', 'tikka', 'naan', 'tandoori', 'dal'],
        american:      ['american', 'burger', 'bbq', 'diner', 'mac and cheese', 'fried chicken', 'coleslaw'],
      };
      return selected.some(v => (expansions[v] || [v]).some(kw => text.includes(kw))) ? 1 : 0;
    },
  },
  {
    id: 'season',
    label: 'Season',
    emoji: '🌿',
    options: [
      { label: '🌸 Spring', value: 'spring' },
      { label: '☀️ Summer', value: 'summer' },
      { label: '🍂 Fall',   value: 'fall'   },
      { label: '❄️ Winter', value: 'winter' },
    ],
    score: (r, selected) => {
      const text = `${r.title} ${r.description} ${r.category}`.toLowerCase();
      const expansions: Record<string, string[]> = {
        spring: ['spring', 'asparagus', 'pea', 'radish', 'artichoke', 'light', 'fresh herb'],
        summer: ['summer', 'grill', 'bbq', 'corn', 'tomato', 'zucchini', 'cold', 'salad'],
        fall:   ['fall', 'autumn', 'pumpkin', 'squash', 'apple', 'cider', 'harvest', 'mushroom'],
        winter: ['winter', 'soup', 'stew', 'braise', 'roast', 'comfort', 'holiday', 'chili', 'warm'],
      };
      return selected.some(v => (expansions[v] || [v]).some(kw => text.includes(kw))) ? 1 : 0;
    },
  },
  {
    id: 'vibe',
    label: 'Vibe',
    emoji: '✨',
    options: [
      { label: 'Comfort food',   value: 'comfort'   },
      { label: 'Light & fresh',  value: 'light'     },
      { label: 'Fancy / impress',value: 'fancy'     },
      { label: 'Meal prep',      value: 'mealprep'  },
      { label: 'One pot',        value: 'onepot'    },
      { label: 'Quick weeknight',value: 'weeknight' },
    ],
    score: (r, selected) => {
      const text = `${r.title} ${r.description} ${r.category}`.toLowerCase();
      const total = (r.prepTime || 0) + (r.cookTime || 0);
      return selected.some(v => {
        switch (v) {
          case 'comfort':   return text.includes('comfort') || text.includes('cozy') || text.includes('hearty') || text.includes('creamy');
          case 'light':     return text.includes('light') || text.includes('fresh') || text.includes('salad') || text.includes('lean');
          case 'fancy':     return text.includes('steak') || text.includes('risotto') || text.includes('roast') || text.includes('elegant') || text.includes('filet');
          case 'mealprep':  return (r.baseServings || 0) >= 6 || text.includes('batch') || text.includes('prep') || text.includes('freeze');
          case 'onepot':    return text.includes('pot') || text.includes('pan') || text.includes('skillet') || text.includes('sheet');
          case 'weeknight': return total <= 35;
          default:          return false;
        }
      }) ? 1 : 0;
    },
  },
];

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

// ─── Component ─────────────────────────────────────────────────────────────────

const Collections: React.FC<CollectionsProps> = ({
  recipes, onBack, onRecipeSelect, onPlannerOpen, recentCount,
  pantry = [], cookedHistory = [], collectionImages = {}
}) => {
  const [selectedTheme, setSelectedTheme] = useState<CollectionItem | null>(null);
  const [activeSection, setActiveSection] = useState<'collections' | 'finder' | 'almostThere' | 'history'>('collections');
  const moneySaved = recentCount * 8;
  const mainRef = useRef<HTMLDivElement>(null);

  // ── Finder state: Record<groupId, Set<optionValue>> ──────────────────────────
  const [finderSelections, setFinderSelections] = useState<Record<string, Set<string>>>({});

  const toggleOption = (groupId: string, value: string) => {
    setFinderSelections(prev => {
      const current = new Set(prev[groupId] || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [groupId]: current };
    });
  };

  const clearAllFilters = () => setFinderSelections({});

  const activeFilterCount = Object.values(finderSelections).reduce((acc, s) => acc + s.size, 0);

  // ── Finder results ────────────────────────────────────────────────────────────
  // Only run scoring if at least one filter is active.
  // Score = how many active filter GROUPS the recipe satisfies (0 → groupCount).
  // Show recipes that satisfy at least 1 active group, sorted by score desc.
  const finderResults = useMemo(() => {
    const activeGroups = FILTER_GROUPS.filter(g => (finderSelections[g.id]?.size || 0) > 0);
    if (activeGroups.length === 0) return [];

    return recipes
      .map(recipe => {
        const score = activeGroups.reduce((acc, group) => {
          const selected = Array.from(finderSelections[group.id] || []);
          return acc + group.score(recipe, selected);
        }, 0);
        return { recipe, score, total: activeGroups.length };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score || (b.recipe.score || 0) - (a.recipe.score || 0));
  }, [recipes, finderSelections]);

  // ── Collection theme filtering ────────────────────────────────────────────────
  const filteredRecipes = useMemo(() => {
    if (!selectedTheme) return [];
    return recipes.filter(r => {
      const text = `${r.title} ${r.category} ${r.description}`.toLowerCase();
      switch (selectedTheme.id) {
        case 'one-pot':       return text.includes('sheet') || text.includes('pot') || text.includes('pan') || text.includes('skillet');
        case 'sunday-prep':   return (r.baseServings || 0) >= 6 || text.includes('batch') || text.includes('prep');
        case 'table-two':     return r.baseServings === 2 || text.includes('steak') || text.includes('risotto');
        case 'pantry':        return text.includes('pasta') || text.includes('bean') || text.includes('canned') || text.includes('rice');
        case 'social':        return ['Appetizer','Beverages','Beverage','Cocktail'].includes(r.category) || text.includes('dip');
        case '30-min':        return ((r.prepTime || 0) + (r.cookTime || 0)) <= 35;
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

  // ── Almost There ──────────────────────────────────────────────────────────────
  const almostThereRecipes = useMemo(() => {
    const inStockNames = new Set(
      pantry.filter(p => (p.quantity ?? 0) > 0).map(p => p.name.toLowerCase().trim())
    );
    return recipes
      .map(recipe => {
        const missing = recipe.ingredients.filter(
          (ing: { name: string }) => !inStockNames.has(ing.name.toLowerCase().trim())
        );
        return { recipe, missingCount: missing.length, missingNames: missing.map((i: { name: string }) => i.name) };
      })
      .filter(r => r.missingCount > 0 && r.missingCount <= 3)
      .sort((a, b) => a.missingCount - b.missingCount)
      .slice(0, 20);
  }, [recipes, pantry]);

  // ── Cooked History ────────────────────────────────────────────────────────────
  const sortedHistory = useMemo(() => {
    return [...cookedHistory]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);
  }, [cookedHistory]);

  // ── Render helpers ────────────────────────────────────────────────────────────

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

  // ── Finder tab ────────────────────────────────────────────────────────────────

  const renderFinder = () => {
    const activeGroups = FILTER_GROUPS.filter(g => (finderSelections[g.id]?.size || 0) > 0);
    const hasFilters = activeGroups.length > 0;

    return (
      <div className="pt-4">
        {/* Filter groups */}
        <div className="space-y-5 px-4 mb-6">
          {FILTER_GROUPS.map(group => {
            const selected = finderSelections[group.id] || new Set<string>();
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base leading-none">{group.emoji}</span>
                  <span className="text-white text-xs font-black uppercase tracking-widest">{group.label}</span>
                  {selected.size > 0 && (
                    <span className="ml-auto text-[#636b2f] text-[9px] font-black uppercase tracking-widest">
                      {selected.size} selected
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map(opt => {
                    const active = selected.has(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleOption(group.id, opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                          active
                            ? 'bg-[#636b2f] text-white border border-[#636b2f]'
                            : 'bg-white/5 text-white/50 border border-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Results header */}
        {hasFilters && (
          <div className="px-4 mb-3 flex items-center justify-between">
            <div>
              <p className="text-white font-black text-base">
                {finderResults.length} {finderResults.length === 1 ? 'match' : 'matches'}
              </p>
              <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mt-0.5">
                Sorted by best fit · {activeGroups.length} filter{activeGroups.length > 1 ? 's' : ''} active
              </p>
            </div>
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Clear
            </button>
          </div>
        )}

        {/* Results list */}
        {!hasFilters && (
          <div className="flex flex-col items-center justify-center py-16 text-center opacity-40 px-8">
            <span className="text-5xl mb-4">🎛️</span>
            <p className="font-bold text-base mb-1">Pick what you're in the mood for</p>
            <p className="text-sm">Select options above — any combination — and matching recipes appear instantly.</p>
          </div>
        )}

        {hasFilters && finderResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center opacity-40 px-8">
            <span className="text-5xl mb-4">🤷</span>
            <p className="font-bold text-base mb-1">No matches</p>
            <p className="text-sm">Try removing a filter or two — your library may not have this exact combo yet.</p>
          </div>
        )}

        {hasFilters && finderResults.length > 0 && (
          <div className="px-4 space-y-3 pb-4">
            {finderResults.map(({ recipe, score, total }) => {
              const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
              const isPerfect = score === total;
              return (
                <div
                  key={recipe.id}
                  onClick={() => onRecipeSelect(recipe)}
                  className="flex gap-4 p-3 bg-[#1c1d15] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                    <img
                      src={formatImageUrl(recipe.imageUrl)}
                      className="w-full h-full object-cover"
                      alt={recipe.title}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
                    <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-1">{recipe.category}</span>
                    <h3 className="text-white font-bold text-sm leading-tight mb-2 line-clamp-2">{recipe.title}</h3>
                    <div className="flex items-center gap-2">
                      {/* Match badge */}
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                        isPerfect
                          ? 'bg-[#636b2f]/30 border border-[#636b2f]/50'
                          : 'bg-white/5 border border-white/10'
                      }`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isPerfect ? 'text-[#a3ae6a]' : 'text-white/30'}`}>
                          {isPerfect ? '✓ Perfect match' : `${score}/${total} filters`}
                        </span>
                      </div>
                      {/* Time */}
                      {totalTime > 0 && (
                        <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest">{totalTime}m</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── Selected theme drill-down ────────────────────────────────────────────────

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

  // ─── Main view ────────────────────────────────────────────────────────────────

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
            { id: 'finder',      label: 'Finder',  icon: 'tune',                badge: activeFilterCount },
            { id: 'almostThere', label: 'Almost',  icon: 'kitchen'              },
            { id: 'history',     label: 'History', icon: 'history'              },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)}
              className={`flex-1 relative flex flex-col items-center py-2 rounded-xl transition-all gap-0.5 ${
                activeSection === tab.id ? 'bg-[#636b2f] text-white' : 'text-white/40'
              }`}>
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              <span className="text-[7.5px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
              {'badge' in tab && tab.badge > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-white text-[#636b2f] text-[8px] font-black flex items-center justify-center leading-none">
                  {tab.badge}
                </span>
              )}
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

        {/* ── FINDER tab ── */}
        {activeSection === 'finder' && renderFinder()}

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
