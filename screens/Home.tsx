import React, { useState, useMemo } from 'react';
import { Recipe, MealPlan } from '../types';
import { formatImageUrl } from '../utils/logic';

interface HomeProps {
  recipes: Recipe[];
  pinnedIds: string[];
  likedIds: string[];
  mealPlans?: MealPlan[];
  onTogglePin: (id: string) => void;
  onToggleLike: (id: string) => void;
  onRecipeSelect: (recipe: Recipe) => void;
  onSettingsOpen: () => void;
  onPlannerOpen: () => void;
  onCollectionsOpen: () => void;
  recentCount?: number;
}

const RECIPES_PER_PAGE = 72;

const Home: React.FC<HomeProps> = ({ 
  recipes = [], 
  pinnedIds = [], 
  likedIds = [],
  mealPlans = [],
  onTogglePin, 
  onRecipeSelect, 
  onSettingsOpen, 
  onPlannerOpen,
  onCollectionsOpen,
  recentCount = 0
}) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const categories = ['All', 'Favorites', 'Whole Meal', 'Main', 'Side', 'Appetizer', 'Cocktail', 'Breakfast', 'Dessert'];

  const displayRecipes = useMemo(() => {
    return [...recipes]
      .filter(recipe => {
        let matchesCategory = true;
        if (activeCategory === 'Favorites') matchesCategory = likedIds.includes(recipe.id);
        else if (activeCategory !== 'All') matchesCategory = recipe.category === activeCategory;
        const title = (recipe.title || '').toLowerCase();
        const desc = (recipe.description || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return matchesCategory && (title.includes(query) || desc.includes(query));
      })
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [recipes, activeCategory, searchQuery, likedIds]);

  const totalPages = Math.max(1, Math.ceil(displayRecipes.length / RECIPES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRecipes = displayRecipes.slice((safePage - 1) * RECIPES_PER_PAGE, safePage * RECIPES_PER_PAGE);

  const handleCategoryChange = (cat: string) => { setActiveCategory(cat); setCurrentPage(1); };
  const handleSearchChange = (q: string) => { setSearchQuery(q); setCurrentPage(1); };

  return (
    <div className="w-full min-h-screen bg-[#000000]">
      {/* Home Header - Logo Left */}
      <header className="flex items-center justify-between mb-2 px-4 header-safe-pt pt-6">
        <div className="flex items-center gap-3">
          <div className="size-14 rounded-2xl overflow-hidden shadow-inner border border-white/10 p-1">
            <img 
              src="https://res.cloudinary.com/dwf0blscr/image/upload/v1769963656/Mise_en_Place_Icon_-_Green_4x_uv2xxn.png" 
              alt="Mise en Place" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter text-white font-display leading-none">Mise en Place</h1>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#636b2f] mt-0.5">Kitchen Dashboard</p>
          </div>
        </div>
        <button 
          onClick={onSettingsOpen}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-[#1a1d14] border border-gray-800 text-gray-400 active:scale-90 transition-transform shadow-xl"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
      </header>

      {/* Navigation to Collections (Replaces Recent Creations) */}
      <div className="mt-6 mb-6 px-4">
        <button 
          onClick={onCollectionsOpen}
          className="w-full relative overflow-hidden rounded-3xl h-[160px] group shadow-2xl border border-white/5"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
          
          <div className="relative h-full flex flex-col justify-center px-6 items-start text-left">
            <div className="bg-[#636b2f]/20 backdrop-blur-md px-3 py-1 rounded-full border border-[#636b2f]/30 mb-2">
              <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest">New Feature</p>
            </div>
            <h2 className="text-white text-2xl font-black tracking-tight leading-none mb-2">The Collection</h2>
            <p className="text-[#b6baa1] text-xs font-medium max-w-[200px] leading-relaxed">
              Explore curated suites, lifestyle labs, and global galleries.
            </p>
            
            <div className="mt-4 flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest group-active:translate-x-1 transition-transform">
              <span>Enter Gallery</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </div>
          </div>
        </button>
      </div>

      <div className="mb-4 px-4">
        <div className="relative flex items-center group">
          <div className="absolute left-4 text-gray-500 group-focus-within:text-[#636b2f] transition-colors">
            <span className="material-symbols-outlined text-xl">search</span>
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search your collection..."
            className="w-full h-14 bg-[#1c1d15] border border-gray-800 rounded-2xl pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#636b2f]/50 focus:border-[#636b2f]/50 transition-all font-medium shadow-inner"
          />
        </div>
      </div>

      <div className="mb-8 px-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 -mx-4 px-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex h-9 shrink-0 items-center justify-center px-4 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                activeCategory === cat 
                  ? 'bg-[#636b2f] text-white shadow-lg shadow-[#636b2f]/20 font-bold scale-105 border border-[#636b2f]' 
                  : 'bg-[#1c1d15] border border-gray-800 text-gray-400 font-bold'
              }`}
            >
              <span className="text-[10px] uppercase tracking-widest leading-none">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pagination controls — top */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 mb-3 gap-2">
          <p className="text-white/30 text-[10px] font-black uppercase tracking-widest whitespace-nowrap shrink-0">
            {displayRecipes.length} recipes • {safePage}/{totalPages}
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              className="size-7 flex items-center justify-center rounded-lg bg-white/5 text-white/40 disabled:opacity-20 active:scale-90 transition-all shrink-0">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px]">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - safePage) <= 2 || p === 1 || p === totalPages)
                .reduce<(number | 'gap')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('gap');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) => item === 'gap'
                  ? <span key={`g${idx}`} className="text-white/20 text-[10px] px-0.5">…</span>
                  : <button key={item} onClick={() => setCurrentPage(item as number)}
                      className={`size-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all active:scale-90 shrink-0 ${item === safePage ? 'bg-[#636b2f] text-white' : 'bg-white/5 text-white/40'}`}>
                      {item}
                    </button>
                )}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className="size-7 flex items-center justify-center rounded-lg bg-white/5 text-white/40 disabled:opacity-20 active:scale-90 transition-all shrink-0">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-6 px-4">
        {pagedRecipes.map(recipe => {
          const isPinned = pinnedIds.includes(recipe.id);
          const finalImageUrl = formatImageUrl(recipe.imageUrl);
          return (
            <div key={recipe.id} className="flex flex-col gap-3 group cursor-pointer" onClick={() => onRecipeSelect(recipe)}>
              <div className="relative w-full aspect-square rounded-3xl shadow-2xl overflow-hidden border border-white/5 bg-[#1a1d14]">
                {finalImageUrl ? (
                  <img src={finalImageUrl} alt={recipe.title} referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (img.src.includes('uc?export=view')) {
                        const idMatch = img.src.match(/id=([a-zA-Z0-9_-]+)/);
                        if (idMatch) { img.src = `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`; return; }
                      }
                      img.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 text-white/20">
                    <span className="material-symbols-outlined text-4xl mb-2">image_not_supported</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">No Media</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                <button onClick={(e) => { e.stopPropagation(); onTogglePin(recipe.id); }}
                  className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-xl border active:scale-90 transition-all flex items-center justify-center shadow-lg ${isPinned ? 'bg-[#636b2f] border-[#636b2f] text-white' : 'bg-black/40 border-white/10 text-white'}`}>
                  <span className="material-symbols-outlined text-base">push_pin</span>
                </button>
              </div>
              <div className="px-1">
                <p className="text-white text-base font-black leading-tight group-hover:text-[#636b2f] transition-colors line-clamp-1">{recipe.title}</p>
                <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-widest mt-1">
                  {(recipe.prepTime || 0) + (recipe.cookTime || 0)} MIN • {recipe.difficulty || 'Easy'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination controls — bottom */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 px-4 pb-8 pt-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 text-white/50 disabled:opacity-20 active:scale-95 transition-all text-xs font-black uppercase tracking-widest">
            <span className="material-symbols-outlined text-base">arrow_back</span>Prev
          </button>
          <span className="text-white/30 text-xs font-bold">{safePage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#636b2f] text-white disabled:opacity-20 active:scale-95 transition-all text-xs font-black uppercase tracking-widest">
            Next<span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default Home;