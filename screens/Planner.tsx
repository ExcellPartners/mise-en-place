
import React, { useState, useMemo, useEffect } from 'react';
import { MealPlan, Recipe, PantryItem, RecipeIngredient } from '../types';
import { RawShoppingEntry } from '../App';
import IngredientSelector from './IngredientSelector';
import { formatImageUrl } from '../utils/logic';

interface PlannerProps {
  mealPlans: MealPlan[];
  recipes: Recipe[];
  pantry: PantryItem[];
  pinnedIds: string[];
  shoppingList?: RawShoppingEntry[];
  onScheduleMeal: (date: string, mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Dessert' | 'Beverage' | 'Snack', recipeId: string) => void;
  onGenerateShopping: () => void;
  onBack?: () => void;
  onStartCooking?: (recipe: Recipe) => void;
  onAddToShopping?: (ingredients: RecipeIngredient[]) => void;
  onClearItinerary?: () => void;
  onRemoveSlot?: (date: string, mealType: string) => void;
  onMarkCooked?: (plan: MealPlan) => void;
  onTogglePin?: (id: string) => void;
  onToggleLike?: (id: string) => void;
  onConsumeIngredients?: (ingredients: RecipeIngredient[]) => void;
}

const Toast: React.FC<{ message: string; isVisible: boolean; onClose: () => void }> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }
  }, [isVisible, onClose]);
  return (
    <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[300] transition-all duration-500 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'}`}>
      <div className="bg-[#636b2f]/95 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-3">
        <span className="material-symbols-outlined text-white text-xl fill-1">check_circle</span>
        <p className="text-white text-sm font-bold tracking-tight">{message}</p>
      </div>
    </div>
  );
};

const MEAL_SLOTS = [
  { type: 'Breakfast' as const, icon: 'coffee'    },
  { type: 'Lunch'     as const, icon: 'sunny'     },
  { type: 'Dinner'    as const, icon: 'dark_mode' },
  { type: 'Dessert'   as const, icon: 'icecream'  },
  { type: 'Beverage'  as const, icon: 'local_bar' },
] as const;

type MealType = typeof MEAL_SLOTS[number]['type'];

// ── Cooked confirmation flow ───────────────────────────────────────────────────
// Step 1: Ask "Was it a favorite?"
// Step 2: Confirm cook + show what happens (unpin + pantry deduct)
type CookStep = 'favorite' | 'confirm';

const Planner: React.FC<PlannerProps> = ({
  mealPlans, recipes, pantry, pinnedIds, shoppingList = [],
  onScheduleMeal, onGenerateShopping, onBack, onStartCooking,
  onAddToShopping, onClearItinerary, onRemoveSlot, onMarkCooked,
  onTogglePin, onToggleLike, onConsumeIngredients,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectorData, setSelectorData] = useState<{ recipe: Recipe; servings: number } | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState<{ type: string; date: string } | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [tempDate, setTempDate] = useState(selectedDate);
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate));
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // Cooked flow state
  const [cookedPlan, setCookedPlan] = useState<MealPlan | null>(null);
  const [cookStep, setCookStep] = useState<CookStep>('favorite');
  const [markedFavorite, setMarkedFavorite] = useState<boolean | null>(null);

  const weekDays = useMemo(() => {
    const start = new Date(selectedDate.replace(/-/g, '/'));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i - 3);
      return {
        iso: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNum: d.getDate(),
      };
    });
  }, [selectedDate]);

  const pinnedRecipes = useMemo(() => recipes.filter(r => pinnedIds.includes(r.id)), [recipes, pinnedIds]);
  const getMealPlans = (type: string, date: string) => mealPlans.filter(p => p.date === date && p.mealType === type);
  const getRecipe = (plan: MealPlan) => recipes.find(r => r.id === plan.recipeId);
  const showThemedToast = (msg: string) => setToast({ message: msg, visible: true });

  const groupedSummary = useMemo(() => {
    const groups: Record<string, MealPlan[]> = {};
    [...mealPlans].sort((a, b) => a.date.localeCompare(b.date)).forEach(p => {
      if (!groups[p.date]) groups[p.date] = [];
      groups[p.date].push(p);
    });
    return groups;
  }, [mealPlans]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear(); const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days: { day: number; current: boolean; date: Date }[] = [];
    const prev = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) days.push({ day: prev - i, current: false, date: new Date(year, month - 1, prev - i) });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, current: true, date: new Date(year, month, i) });
    for (let i = 1; days.length < 42; i++) days.push({ day: i, current: false, date: new Date(year, month + 1, i) });
    return days;
  }, [viewMonth]);

  const handleMonthNav = (offset: number) => {
    const next = new Date(viewMonth); next.setMonth(next.getMonth() + offset); setViewMonth(next);
  };

  const handleShareItinerary = async () => {
    let text = 'My Mise en Place Itinerary\n\n';
    (Object.entries(groupedSummary) as [string, MealPlan[]][]).forEach(([date, plans]) => {
      const d = new Date(date.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      text += `${d}\n`;
      plans.forEach(p => { text += `- ${p.mealType}: ${recipes.find(r => r.id === p.recipeId)?.title || 'Unknown'}\n`; });
      text += '\n';
    });
    try { await navigator.clipboard.writeText(text); showThemedToast('Itinerary copied!'); } catch {}
  };

  // ── Open cooked flow ─────────────────────────────────────────────────────────
  const openCookedFlow = (plan: MealPlan) => {
    setCookedPlan(plan);
    setCookStep('favorite');
    setMarkedFavorite(null);
  };

  const handleFavoriteChoice = (fav: boolean) => {
    setMarkedFavorite(fav);
    setCookStep('confirm');
  };

  const handleConfirmCooked = () => {
    if (!cookedPlan) return;
    const recipe = recipes.find(r => r.id === cookedPlan.recipeId);

    // 1. Mark as cooked in sheet + history
    onMarkCooked?.(cookedPlan);

    // 2. Toggle favorite if they said yes
    if (markedFavorite && recipe && !recipe.isFavorite) {
      onToggleLike?.(recipe.id);
    }

    // 3. Unpin
    if (pinnedIds.includes(cookedPlan.recipeId)) {
      onTogglePin?.(cookedPlan.recipeId);
    }

    // 4. Deduct pantry ingredients
    if (recipe?.ingredients?.length) {
      onConsumeIngredients?.(recipe.ingredients);
    }

    showThemedToast(`${recipe?.title || 'Meal'} cooked!${markedFavorite ? ' Added to favorites.' : ''}`);
    setCookedPlan(null);
    setMarkedFavorite(null);
  };

  // ── Meal slot renderer ───────────────────────────────────────────────────────
  const renderSlot = (type: MealType, icon: string) => {
    const plans = getMealPlans(type, selectedDate);
    return (
      <div className={`flex flex-col bg-[#2a2c21] rounded-3xl p-5 border transition-all relative overflow-hidden ${plans.length > 0 ? 'border-white/5 shadow-2xl' : 'border-2 border-dashed border-[#3b3e2e]'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${plans.length > 0 ? 'bg-[#636b2f] text-white shadow-lg' : 'bg-[#3b3e2e] text-[#b6baa1]'}`}>
              <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
            <p className="text-white text-base font-black uppercase tracking-wider">{type}</p>
          </div>
        </div>

        {plans.length > 0 ? (
          <div className="flex flex-col gap-6">
            {plans.map((plan, index) => {
              const recipe = getRecipe(plan);
              if (!recipe) return null;
              return (
                <div key={index} className="flex flex-col gap-4 border-b border-white/5 last:border-0 pb-4 last:pb-0 relative">
                  <button onClick={() => onRemoveSlot?.(selectedDate, type)}
                    className="absolute -top-1 right-0 text-white/30 hover:text-red-500 active:scale-90 transition-colors">
                    <span className="material-symbols-outlined text-xl font-bold">close</span>
                  </button>
                  <div className="flex items-center gap-4">
                    <img src={formatImageUrl(recipe.imageUrl)} referrerPolicy="no-referrer"
                      className="size-16 rounded-2xl object-cover ring-1 ring-white/10" alt={recipe.title}
                      onError={(e) => { const img = e.target as HTMLImageElement; if (img.src.includes('uc?export=view')) { const m = img.src.match(/id=([a-zA-Z0-9_-]+)/); if (m) { img.src = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`; return; } } img.style.display = 'none'; }} />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-white text-lg font-black leading-tight truncate">{recipe.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[#636b2f] text-[10px] font-black uppercase tracking-widest">{(recipe.prepTime || 0) + (recipe.cookTime || 0)} MINS</span>
                        <span className="text-white/20">•</span>
                        <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{recipe.difficulty}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectorData({ recipe, servings: plan.servings || 4 })}
                      className="flex-1 h-11 rounded-xl bg-[#3b3e2e] text-white flex items-center justify-center gap-1.5 active:scale-95">
                      <span className="material-symbols-outlined text-base">shopping_basket</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Ingredients</span>
                    </button>
                    <button onClick={() => onStartCooking?.(recipe)}
                      className="flex-1 h-11 rounded-xl bg-[#636b2f] text-white flex items-center justify-center gap-1.5 active:scale-95">
                      <span className="material-symbols-outlined text-base fill-1">skillet</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Cook Now</span>
                    </button>
                  </div>
                  <button onClick={() => openCookedFlow(plan)}
                    className="w-full h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center gap-2 active:scale-95">
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Mark as Cooked</span>
                  </button>
                </div>
              );
            })}
            <button onClick={() => setIsPickerOpen({ type, date: selectedDate })}
              className="flex items-center justify-center gap-2 py-3 mt-1 text-[#b6baa1] hover:text-[#636b2f] transition-colors">
              <span className="material-symbols-outlined text-lg">add_circle</span>
              <span className="text-xs font-black uppercase tracking-widest">Add another dish</span>
            </button>
          </div>
        ) : (
          <button onClick={() => setIsPickerOpen({ type, date: selectedDate })}
            className="flex flex-col items-center justify-center py-6 gap-2 group">
            <div className="size-12 rounded-full border-2 border-dashed border-[#3b3e2e] flex items-center justify-center text-[#3b3e2e] group-hover:border-[#636b2f] group-hover:text-[#636b2f] transition-colors">
              <span className="material-symbols-outlined text-2xl font-bold">add</span>
            </div>
            <p className="text-[#b6baa1] text-xs font-black uppercase tracking-[0.2em]">Select from Pinned</p>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#1c1d15] text-white font-display relative overflow-hidden">
      <Toast message={toast.message} isVisible={toast.visible} onClose={() => setToast(p => ({ ...p, visible: false }))} />

      <header className="flex flex-col z-10 bg-[#1c1d15]/95 backdrop-blur-md sticky top-0 border-b border-white/5 pb-2 header-safe-pt">
        <div className="flex items-center px-4 pb-2 justify-between">
          <button onClick={onBack} className="flex size-10 shrink-0 items-center justify-center text-white active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-white text-lg font-black leading-tight tracking-tight uppercase">Meal Planner</h2>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Mise en Place</p>
          </div>
          <div className="flex items-center gap-1">
            {/* View Pins button */}
            <button onClick={() => setShowPins(true)}
              className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-[#636b2f] active:scale-90 transition-transform relative">
              <span className="material-symbols-outlined text-[28px]">push_pin</span>
              {pinnedIds.length > 0 && (
                <span className="absolute top-1 right-1 size-4 rounded-full bg-[#636b2f] text-white text-[8px] font-black flex items-center justify-center leading-none">
                  {pinnedIds.length}
                </span>
              )}
            </button>
            <button onClick={() => { setTempDate(selectedDate); setViewMonth(new Date(selectedDate.replace(/-/g, '/'))); setIsCalendarOpen(true); }}
              className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-[#636b2f] active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-[28px] fill-1">calendar_today</span>
            </button>
          </div>
        </div>

        <div className="flex justify-between gap-1 px-4 py-4 overflow-x-auto no-scrollbar">
          {weekDays.map(day => (
            <button key={day.iso} onClick={() => setSelectedDate(day.iso)}
              className={`flex h-16 w-[12.5%] min-w-[54px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl transition-all ${selectedDate === day.iso ? 'bg-[#636b2f] text-white shadow-lg shadow-[#636b2f]/20 scale-110' : 'bg-[#3b3e2e] text-[#b6baa1]'}`}>
              <p className="text-[10px] uppercase font-black tracking-widest">{day.dayName}</p>
              <p className="text-sm font-black">{day.dayNum}</p>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-64 no-scrollbar scroll-smooth">
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="text-white text-3xl font-black leading-tight tracking-tight whitespace-nowrap">
            {new Date(selectedDate.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>
          <div className="bg-[#636b2f]/10 px-3 py-1 rounded-full border border-[#636b2f]/20">
            <p className="text-[#636b2f] text-[10px] font-black uppercase tracking-widest">
              {mealPlans.filter(p => p.date === selectedDate).length} Planned
            </p>
          </div>
        </div>
        <div className="space-y-6">
          {MEAL_SLOTS.map(slot => renderSlot(slot.type, slot.icon))}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 w-full z-40">
        <div className="px-4 pb-4 pt-4 bg-[#1c1d15]/95 backdrop-blur-xl flex flex-col gap-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/5">
          <button onClick={() => setShowSummary(true)}
            className="w-full bg-[#636b2f] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#636b2f]/20 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined">assignment</span>
            <span className="text-base uppercase tracking-widest">Generate Complete Menu</span>
          </button>
        </div>
      </div>

      {/* ── VIEW PINS sheet ── */}
      {showPins && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPins(false)} />
          <div className="relative w-full bg-[#1c1d15] rounded-t-[2.5rem] max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
              <div>
                <h3 className="text-xl font-black text-white">Pinned Recipes</h3>
                <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mt-0.5">
                  {pinnedIds.length} pinned · tap to unpin
                </p>
              </div>
              <button onClick={() => setShowPins(false)} className="size-10 flex items-center justify-center bg-white/5 rounded-full active:scale-90">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-8">
              {pinnedRecipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                  <span className="material-symbols-outlined text-5xl mb-3">push_pin</span>
                  <p className="font-bold text-base">No pinned recipes</p>
                  <p className="text-sm mt-1">Pin recipes from Home to add them here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pinnedRecipes.map(recipe => (
                    <div key={recipe.id} className="flex items-center gap-4 p-3 bg-[#2a2c21] rounded-2xl border border-white/5">
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white/5">
                        <img src={formatImageUrl(recipe.imageUrl)} className="w-full h-full object-cover" alt={recipe.title}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm leading-tight line-clamp-1">{recipe.title}</p>
                        <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mt-0.5">{recipe.category}</p>
                      </div>
                      <button
                        onClick={() => { onTogglePin?.(recipe.id); showThemedToast(`${recipe.title} unpinned`); }}
                        className="flex items-center justify-center size-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 active:scale-90 transition-transform shrink-0"
                      >
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MARK AS COOKED — Step 1: Was it a favorite? ── */}
      {cookedPlan && cookStep === 'favorite' && (() => {
        const recipe = recipes.find(r => r.id === cookedPlan.recipeId);
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
            <div className="w-full max-w-[340px] bg-[#2a2c21] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="flex flex-col items-center text-center gap-6 relative z-10">
                <div className="size-20 rounded-3xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                  <span className="text-5xl">❤️</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white mb-2">Did you love it?</h3>
                  <p className="text-[#b6baa1] text-sm leading-relaxed">
                    Would you add <span className="text-white font-bold">{recipe?.title || 'this'}</span> to your Favorites?
                  </p>
                </div>
                <div className="flex flex-col w-full gap-3">
                  <button onClick={() => handleFavoriteChoice(true)}
                    className="w-full h-14 bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-500/20 active:scale-95 transition-transform flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    Yes, Add to Favorites
                  </button>
                  <button onClick={() => handleFavoriteChoice(false)}
                    className="w-full h-14 bg-white/5 text-white font-black rounded-2xl active:scale-95 transition-transform">
                    No Thanks
                  </button>
                </div>
                <button onClick={() => setCookedPlan(null)} className="text-white/20 text-xs font-black uppercase tracking-widest active:opacity-60">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MARK AS COOKED — Step 2: Confirm + show consequences ── */}
      {cookedPlan && cookStep === 'confirm' && (() => {
        const recipe = recipes.find(r => r.id === cookedPlan.recipeId);
        const isPinned = pinnedIds.includes(cookedPlan.recipeId);
        const hasIngredients = (recipe?.ingredients?.length || 0) > 0;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
            <div className="w-full max-w-[340px] bg-[#2a2c21] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="flex flex-col items-center text-center gap-6 relative z-10">
                <div className="size-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <span className="material-symbols-outlined text-emerald-400 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div className="w-full">
                  <h3 className="text-2xl font-black tracking-tight text-white mb-2">Mark as Cooked?</h3>
                  <p className="text-[#b6baa1] text-sm leading-relaxed mb-4">
                    <span className="text-white font-bold">{recipe?.title || 'This meal'}</span> will be archived to your Cook History.
                  </p>
                  {/* What will happen */}
                  <div className="flex flex-col gap-2 text-left">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                      <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">history</span>
                      <p className="text-white/70 text-xs font-medium">Moved to Cook History</p>
                    </div>
                    {isPinned && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <span className="material-symbols-outlined text-amber-400 text-lg shrink-0">push_pin</span>
                        <p className="text-white/70 text-xs font-medium">Unpinned from Planner</p>
                      </div>
                    )}
                    {hasIngredients && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <span className="material-symbols-outlined text-blue-400 text-lg shrink-0">kitchen</span>
                        <p className="text-white/70 text-xs font-medium">Ingredients deducted from Pantry</p>
                      </div>
                    )}
                    {markedFavorite && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <span className="material-symbols-outlined text-rose-400 text-lg shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        <p className="text-white/70 text-xs font-medium">Added to Favorites</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col w-full gap-3">
                  <button onClick={handleConfirmCooked}
                    className="w-full h-14 bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform">
                    Confirm — Mark as Cooked
                  </button>
                  <button onClick={() => setCookStep('favorite')}
                    className="w-full h-12 bg-white/5 text-white/50 font-black rounded-2xl active:scale-95 transition-transform text-sm">
                    ← Change Favorite Answer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Calendar picker ── */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-[200] bg-[#0f110c] flex flex-col animate-in slide-in-from-bottom duration-300 w-full">
          <header className="pt-4 px-4 header-safe-pt">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setIsCalendarOpen(false)} className="text-white/40 active:scale-90 flex size-10 items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
              <div className="flex gap-4">
                <button onClick={() => { setTempDate(new Date().toISOString().split('T')[0]); setViewMonth(new Date()); }} className="text-sm font-semibold text-[#636b2f]">Today</button>
                <button onClick={() => setTempDate('')} className="text-sm font-semibold text-white/40">Clear</button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-bold">{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                <button onClick={() => handleMonthNav(-1)} className="p-2 bg-white/5 rounded-full active:scale-90"><span className="material-symbols-outlined">chevron_left</span></button>
                <button onClick={() => handleMonthNav(1)} className="p-2 bg-white/5 rounded-full active:scale-90"><span className="material-symbols-outlined">chevron_right</span></button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
              <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-4 no-scrollbar">
            <div className="grid grid-cols-7 gap-y-1">
              {calendarDays.map((d, i) => {
                const iso = d.date.toISOString().split('T')[0];
                const isSel = tempDate === iso;
                return (
                  <button key={i} onClick={() => setTempDate(iso)}
                    className={`h-12 flex items-center justify-center text-sm font-bold transition-all ${!d.current ? 'text-white/20' : 'text-white'}`}>
                    {isSel ? <span className="bg-[#636b2f] size-9 flex items-center justify-center rounded-full text-white shadow-lg scale-110">{d.day}</span> : <span>{d.day}</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-12 mb-8">
              <button disabled={!tempDate} onClick={() => { if (tempDate) { setSelectedDate(tempDate); setIsCalendarOpen(false); } }}
                className="w-full bg-[#636b2f] py-4 rounded-2xl font-black text-lg shadow-xl active:scale-[0.98] disabled:opacity-30">
                Apply Selection
              </button>
            </div>
          </main>
        </div>
      )}

      {/* ── Itinerary summary ── */}
      {showSummary && (
        <div className="fixed inset-0 z-[250] bg-[#1c1d15] flex flex-col animate-in slide-in-from-bottom duration-300 w-full">
          <header className="px-4 py-6 flex items-center justify-between border-b border-white/5 header-safe-pt">
            <h2 className="text-2xl font-black tracking-tight">My Itinerary</h2>
            <button onClick={() => setShowSummary(false)} className="size-10 flex items-center justify-center bg-white/5 rounded-full active:scale-90">
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
            {Object.keys(groupedSummary).length > 0 ? (
              (Object.entries(groupedSummary) as [string, MealPlan[]][]).map(([date, plans]) => (
                <div key={date} className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-0.5 flex-1 bg-[#636b2f]/20" />
                    <p className="text-[#636b2f] text-[10px] font-black uppercase tracking-[0.3em]">
                      {new Date(date.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                    <div className="h-0.5 flex-1 bg-[#636b2f]/20" />
                  </div>
                  <div className="space-y-4">
                    {plans.map((plan, idx) => {
                      const recipe = recipes.find(r => r.id === plan.recipeId);
                      const slotIcon = MEAL_SLOTS.find(s => s.type === plan.mealType)?.icon || 'restaurant';
                      return (
                        <div key={idx} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                          <div className="size-12 rounded-xl bg-[#636b2f]/10 flex items-center justify-center text-[#636b2f] shrink-0 border border-[#636b2f]/10">
                            <span className="material-symbols-outlined">{slotIcon}</span>
                          </div>
                          <div className="flex flex-col justify-center flex-1 min-w-0">
                            <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-widest leading-none mb-1">{plan.mealType}</p>
                            <h4 className="text-white font-bold text-base leading-tight line-clamp-1">{recipe?.title || 'Unknown Recipe'}</h4>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-10">
                <span className="material-symbols-outlined text-6xl mb-4">event_busy</span>
                <p className="text-xl font-bold">No meals planned yet</p>
              </div>
            )}
          </main>
          <footer className="p-6 border-t border-white/5 bg-[#1c1d15] space-y-3">
            <button onClick={handleShareItinerary}
              className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-white/10">
              <span className="material-symbols-outlined">content_copy</span>
              Share Itinerary
            </button>
            <button onClick={onClearItinerary}
              className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-red-500/20">
              <span className="material-symbols-outlined">delete_sweep</span>
              Archive & Clear All
            </button>
          </footer>
        </div>
      )}

      {/* ── Recipe picker ── */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPickerOpen(null)} />
          <div className="relative w-full bg-[#2a2c21] rounded-t-[3rem] p-6 pb-12 flex flex-col gap-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-1.5 bg-[#3b3e2e] rounded-full mb-2" />
              <h4 className="text-2xl font-black text-white text-center">Choose for {isPickerOpen.type}</h4>
              <p className="text-[#b6baa1] text-sm text-center">Select from your pinned recipes</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
              {pinnedRecipes.length > 0 ? (
                pinnedRecipes.map(recipe => (
                  <button key={recipe.id}
                    onClick={() => { onScheduleMeal(isPickerOpen.date, isPickerOpen.type as MealType, recipe.id); setIsPickerOpen(null); }}
                    className="flex flex-col gap-2 p-2 bg-white/5 rounded-3xl border border-white/5 active:scale-95 transition-transform">
                    <img src={formatImageUrl(recipe.imageUrl)} referrerPolicy="no-referrer"
                      className="aspect-square w-full object-cover rounded-2xl" alt={recipe.title}
                      onError={(e) => { const img = e.target as HTMLImageElement; if (img.src.includes('uc?export=view')) { const m = img.src.match(/id=([a-zA-Z0-9_-]+)/); if (m) { img.src = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`; return; } } img.style.display = 'none'; }} />
                    <p className="text-white text-xs font-bold leading-tight px-1 text-left line-clamp-2 h-8">{recipe.title}</p>
                  </button>
                ))
              ) : (
                <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center opacity-40">
                  <span className="material-symbols-outlined text-4xl mb-2">push_pin</span>
                  <p className="text-sm font-bold">No pinned recipes.</p>
                  <p className="text-xs mt-1">Pin recipes from Home to add them here.</p>
                </div>
              )}
            </div>
            <button onClick={() => setIsPickerOpen(null)} className="w-full h-14 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest active:bg-white/10">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Ingredient selector ── */}
      {selectorData && (
        <IngredientSelector
          recipe={selectorData.recipe}
          servings={selectorData.servings}
          pantry={pantry}
          shoppingList={shoppingList}
          onClose={() => setSelectorData(null)}
          onServingsChange={s => setSelectorData(prev => prev ? { ...prev, servings: s } : null)}
          onConfirm={ingredients => {
            onAddToShopping?.(ingredients);
            setSelectorData(null);
            showThemedToast(`${ingredients.length} items added to trip`);
          }}
        />
      )}
    </div>
  );
};

export default Planner;
