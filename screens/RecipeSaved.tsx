
import React from 'react';
import { Recipe } from '../types';

interface RecipeSavedProps {
  recipe: Recipe;
  onGoHome: () => void;
  onViewRecipe: () => void;
  onClose: () => void;
}

const RecipeSaved: React.FC<RecipeSavedProps> = ({ recipe, onGoHome, onViewRecipe, onClose }) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#0f110c] text-white font-display max-w-[480px] mx-auto border-x border-white/5">
      {/* Top Navigation Area */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2 header-safe-pt">
        <button 
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 backdrop-blur-md active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-white">close</span>
        </button>
        <div className="text-white/40 text-sm font-medium">Collection Update</div>
        <div className="w-10"></div>
      </div>

      {/* Main Success Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center pb-24">
        {/* Success Icon with Pulse Rings */}
        <div className="relative mb-10">
          {/* Outer Pulse Ring */}
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75"></div>
          {/* Middle Ring */}
          <div className="absolute -inset-4 rounded-full border border-primary/30"></div>
          {/* Main Checkmark Circle */}
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary shadow-[0_0_40px_rgba(98,106,47,0.4)]">
            <span className="material-symbols-outlined text-6xl text-white fill-1" style={{ fontSize: '64px' }}>check_circle</span>
          </div>
        </div>

        {/* Text Content */}
        <div className="max-w-xs space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Recipe Saved!</h1>
          <p className="text-lg font-medium text-white/70 leading-relaxed">
            {recipe.title} is now in your collection and synced to your ledger.
          </p>
        </div>

        {/* Optional Card Preview */}
        <div className="mt-10 w-full max-w-sm overflow-hidden rounded-3xl bg-[#1a1d14] p-1 border border-white/5 shadow-2xl">
          <div 
            className="h-48 w-full rounded-2xl bg-center bg-cover" 
            style={{ backgroundImage: `url("${recipe.imageUrl || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=600&h=800'}")` }}
          >
          </div>
          <div className="p-5 text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-sm fill-1">timer</span>
              <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">
                {(recipe.prepTime || 0) + (recipe.cookTime || 0)} Minutes
              </span>
            </div>
            <h3 className="text-lg font-black text-white">{recipe.title}</h3>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full mt-10">
          <button 
            onClick={onViewRecipe}
            className="flex h-14 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-primary text-lg font-bold text-white shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            View Full Recipe
          </button>
          <button 
            onClick={onGoHome}
            className="flex h-14 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-white/10 bg-transparent text-lg font-bold text-white/60 transition-colors hover:bg-white/5 active:scale-95"
          >
            Back to Home
          </button>
        </div>
      </main>
    </div>
  );
};

export default RecipeSaved;
