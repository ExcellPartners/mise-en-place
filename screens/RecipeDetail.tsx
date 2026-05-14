
import React, { useState } from 'react';
import { Recipe, PantryItem } from '../types';
import { scaleIngredients, formatImageUrl } from '../utils/logic';
import PrintPreview from './PrintPreview';

interface RecipeDetailProps {
  recipe: Recipe;
  pantry: PantryItem[];
  onBack: () => void;
  onCook: () => void;
  onAddToPlanner: (id: string, servings: number) => void;
  onExportPdf?: (servings: number) => void;
  onDelete?: (id: string) => void;
  isPinned: boolean;
  isLiked: boolean;
  onTogglePin: () => void;
  onToggleLike: () => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ 
  recipe, 
  pantry, 
  onBack, 
  onCook, 
  onAddToPlanner, 
  onExportPdf,
  onDelete,
  isPinned,
  isLiked,
  onTogglePin,
  onToggleLike
}) => {
  const [servings, setServings] = useState(recipe.baseServings);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const scaled = scaleIngredients(recipe, servings);

  const getStockStatus = (ingredientName: string) => {
    // Exact name match logic, case insensitive
    const item = pantry.find(p => p.name.toLowerCase() === ingredientName.toLowerCase());
    
    // Strict logic: If item exists and quantity > 0, it's In Stock. 
    if (item && (item.quantity || 0) > 0) {
      if ((item.quantity || 0) < 2) return 'Low Stock'; // Simplified Low logic
      return null; // Implies In Stock
    }
    
    // Fallback: Out of Stock
    return 'Out of Stock';
  };

  const adjustServings = (delta: number) => {
    setServings(prev => Math.max(1, prev + delta));
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(recipe.id);
    }
    setIsDeleteModalOpen(false);
  };

  const finalHeroUrl = formatImageUrl(recipe.imageUrl);



  return (
    <div className="min-h-screen flex flex-col bg-background-dark overflow-x-hidden pb-52 relative">
      <div 
        className="fixed left-0 right-0 z-50 flex items-center justify-between p-4 bg-transparent no-print header-safe-pt"
      >
        <button 
          onClick={onBack}
          className="size-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl text-white active:scale-95 transition-all border border-white/10"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex gap-2">
          {/* Favorite (Heart) - For filtering on Home */}
          <button 
            onClick={onToggleLike}
            className={`size-10 flex items-center justify-center rounded-full backdrop-blur-xl border active:scale-95 transition-all ${
              isLiked 
                ? 'bg-[#636b2f] border-[#636b2f] text-white shadow-lg' 
                : 'bg-black/40 border-white/10 text-white'
            }`}
          >
            <span className={`material-symbols-outlined ${isLiked ? 'fill-1' : ''}`}>favorite</span>
          </button>

          {/* Planner (Pin) - For Planner Selection */}
          <button 
            onClick={onTogglePin}
            className={`size-10 flex items-center justify-center rounded-full backdrop-blur-xl border active:scale-95 transition-all ${
              isPinned 
                ? 'bg-white text-[#0f110c] border-white shadow-lg' 
                : 'bg-black/40 border-white/10 text-white'
            }`}
          >
            <span className="material-symbols-outlined">push_pin</span>
          </button>
          
          <button 
            onClick={() => setIsPrintModalOpen(true)}
            className="size-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl text-primary border border-primary/20 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">print</span>
          </button>
          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            className="size-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl text-red-500 border border-red-500/20 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div className="w-full h-[40vh] relative bg-surface-dark overflow-hidden">
        {finalHeroUrl ? (
          <img 
            src={finalHeroUrl}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src.includes('uc?export=view')) {
                 const idMatch = img.src.match(/id=([a-zA-Z0-9_-]+)/);
                 if (idMatch) {
                   img.src = `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
                   return;
                 }
              }
              img.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10">
            <span className="material-symbols-outlined text-6xl">image_not_supported</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
      </div>

      <div className="flex-1 px-4 -mt-12 relative z-10">
        <div className="bg-background-dark/80 backdrop-blur-md pt-6 rounded-t-3xl mb-4">
          <div className="flex items-center gap-2 mb-2 px-2">
            <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{recipe.category}</span>
          </div>
          <h1 className="text-[32px] font-black leading-tight tracking-tight text-white px-2 font-display">
            {recipe.title}
          </h1>
          <p className="text-[#b6baa1] mt-3 text-sm leading-relaxed px-2 font-medium">
            {recipe.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-4">
          <div className="flex flex-col justify-between rounded-[1.75rem] p-5 border border-white/5 bg-[#1a1d14] relative">
            <div className="flex items-start justify-between mb-4">
              <span className="material-symbols-outlined text-primary text-2xl fill-1">restaurant</span>
              <div className="flex items-center bg-background-dark rounded-xl p-0.5 border border-white/5 shadow-inner scale-90 -mr-2 -mt-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); adjustServings(-1); }}
                  className="size-8 flex items-center justify-center text-primary active:scale-90 transition-transform disabled:opacity-20"
                  disabled={servings <= 1}
                >
                  <span className="material-symbols-outlined text-base font-black">remove</span>
                </button>
                <span className="text-[10px] font-black text-primary/60 px-1 uppercase">{servings}x</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); adjustServings(1); }}
                  className="size-8 flex items-center justify-center text-primary active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-base font-black">add</span>
                </button>
              </div>
            </div>
            <div>
              <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-[0.15em] mb-0.5">Servings</p>
              <p className="text-white text-xl font-black">{servings} {servings === 1 ? 'person' : 'people'}</p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[1.75rem] p-5 border border-white/5 bg-[#1a1d14]">
            <span className="material-symbols-outlined text-primary text-2xl mb-4">speed</span>
            <div>
              <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-[0.15em] mb-0.5">Difficulty</p>
              <p className="text-white text-xl font-black">{recipe.difficulty || 'Medium'}</p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[1.75rem] p-5 border border-white/5 bg-[#1a1d14]">
            <span className="material-symbols-outlined text-primary text-2xl mb-4">timer</span>
            <div>
              <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-[0.15em] mb-0.5">Prep Time</p>
              <p className="text-white text-xl font-black">{recipe.prepTime} min</p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[1.75rem] p-5 border border-white/5 bg-[#1a1d14]">
            <span className="material-symbols-outlined text-primary text-2xl mb-4">cooking</span>
            <div>
              <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-[0.15em] mb-0.5">Cook Time</p>
              <p className="text-white text-xl font-black">{recipe.cookTime} min</p>
            </div>
          </div>
        </div>

        <div className="z-40 bg-background-dark py-2 my-6 no-print">
          <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-white/5 border border-white/5 p-1">
            <button 
              onClick={() => setActiveTab('ingredients')}
              className={`flex-1 flex h-full items-center justify-center rounded-xl px-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ingredients' ? 'bg-primary text-white shadow-lg' : 'text-white/40'}`}
            >
              Ingredients
            </button>
            <button 
              onClick={() => setActiveTab('instructions')}
              className={`flex-1 flex h-full items-center justify-center rounded-xl px-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'instructions' ? 'bg-primary text-white shadow-lg' : 'text-white/40'}`}
            >
              Instructions
            </button>
          </div>
        </div>

        <div className="mt-2">
          {activeTab === 'ingredients' ? (
            <div className="space-y-3">
              {scaled.map((ing, i) => {
                const stockStatus = getStockStatus(ing.name);
                const amount = ing.amount ?? 0;
                return (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-surface-dark border border-white/5 group active:bg-white/5 transition-colors">
                    <div className={`size-6 rounded-lg ${stockStatus === 'Out of Stock' ? 'bg-amber-900/20 text-amber-500 border border-amber-500/20' : 'bg-primary/20 text-primary border border-primary/20'} flex items-center justify-center shrink-0`}>
                      <span className="material-symbols-outlined text-[16px] font-bold">
                        {stockStatus === 'Out of Stock' ? 'priority_high' : 'check'}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-black text-white text-base leading-tight truncate uppercase tracking-tight">
                        {ing.name}
                      </p>
                      <p className="text-[11px] text-primary font-black uppercase tracking-widest mt-1 opacity-80">
                        {amount % 1 === 0 ? amount : amount.toFixed(1)} {ing.unit}
                      </p>
                    </div>
                    {stockStatus && (
                      <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${stockStatus === 'Out of Stock' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                        {stockStatus}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-8 px-2">
               {recipe.instructions.map((step, i) => (
                <div key={i} className="flex gap-6 relative">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-black text-primary border border-primary/20 shadow-inner z-10">
                    {i + 1}
                  </div>
                  {i < recipe.instructions.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-[-2rem] w-px bg-white/5"></div>
                  )}
                  <p className="text-[#b6baa1] leading-relaxed text-base font-medium flex-1 pt-1">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {recipe.chefTip && (
          <div className="mt-12 p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex flex-col gap-3">
             <div className="flex items-center gap-2 text-amber-500">
                <span className="material-symbols-outlined text-lg fill-1">lightbulb</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Chef's Tip</span>
             </div>
             <p className="text-amber-200/60 italic text-sm leading-relaxed font-medium">
                "{recipe.chefTip}"
             </p>
          </div>
        )}

        {(recipe.sourceName || recipe.sourceAuthor || recipe.sourceUrl) && (
          <div className="mt-6 p-6 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-white/40">
              <span className="material-symbols-outlined text-lg">menu_book</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Source</span>
            </div>
            {recipe.sourceName && <p className="text-white font-bold text-sm leading-snug">{recipe.sourceName}</p>}
            {recipe.sourceAuthor && <p className="text-white/50 text-xs font-medium">by {recipe.sourceAuthor}</p>}
            {recipe.sourceUrl && (
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="mt-1 flex items-center gap-2 text-[#636b2f] text-xs font-black uppercase tracking-widest active:opacity-70"
                onClick={(e) => e.stopPropagation()}>
                <span className="material-symbols-outlined text-base">open_in_new</span>
                {recipe.sourceAuthor ? 'View Book' : 'Visit Website'}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pt-6 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent z-50 no-print"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}>
        <div className="flex gap-3">
          <button 
            onClick={() => onAddToPlanner(recipe.id, servings)}
            className="flex-1 bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-white/10 transition-all"
          >
            <span className="material-symbols-outlined">calendar_add_on</span>
            <span className="text-xs uppercase tracking-widest">Schedule</span>
          </button>
          <button 
            onClick={onCook}
            className="flex-[2] bg-primary text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-2xl fill-1">skillet</span>
            <span className="text-lg uppercase tracking-widest">Cook Now</span>
          </button>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
          <div className="w-full max-w-[340px] bg-[#2a2c21] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="flex flex-col items-center text-center gap-6 relative z-10">
              <div className="size-20 rounded-3xl bg-red-500/20 flex items-center justify-center border border-red-500/30 shadow-inner">
                <span className="material-symbols-outlined text-red-500 text-5xl fill-1">delete_forever</span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white mb-3 font-display">Delete Recipe?</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Are you sure, Maddie? This will permanently remove <span className="text-white font-bold">{recipe.title}</span> from your ledger and cloud database.
                </p>
              </div>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={handleDeleteConfirm}
                  className="w-full h-14 bg-red-500 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-transform"
                >
                  Yes, Remove Permanently
                </button>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full h-14 bg-white/5 text-white font-black rounded-2xl active:scale-95 transition-transform"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPrintModalOpen && (
        <PrintPreview 
          recipe={recipe} 
          servings={servings}
          pageSize="Standard"
          options={{
            fullImage: true,
            chefTips: true,
            shortDescription: true,
            cookTimes: true,
            printScaled: true,
          }}
          onClose={() => setIsPrintModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default RecipeDetail;
