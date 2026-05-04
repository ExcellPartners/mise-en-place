
import React, { useState } from 'react';
import { Recipe, RecipeIngredient } from '../types';

interface ReviewScanProps {
  scannedRecipe: Recipe;
  onSave: (recipe: Recipe) => void;
  onRescan: () => void;
  onBack: () => void;
}

const ReviewScan: React.FC<ReviewScanProps> = ({ scannedRecipe, onSave, onRescan, onBack }) => {
  const [title, setTitle] = useState(scannedRecipe.title || "Grandma's Apple Pie");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(scannedRecipe.ingredients || []);
  const [instructions, setInstructions] = useState<string[]>(scannedRecipe.instructions || []);

  const handleUpdateIngredient = (index: number, value: string) => {
    const updated = [...ingredients];
    // For the UI, we're editing the string representation for simplicity in this review mode
    // Realistically we'd parse this, but here we just update the name
    updated[index] = { ...updated[index], name: value };
    setIngredients(updated);
  };

  const handleUpdateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: 'New ingredient', amount: 1, unit: 'unit' }]);
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col max-w-[480px] mx-auto overflow-x-hidden pb-24 bg-[#1c1d15] text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 flex items-center bg-[#1c1d15]/95 backdrop-blur-md p-4 pb-2 justify-between">
        <button 
          onClick={onBack}
          className="text-primary flex size-12 shrink-0 items-center justify-start active:scale-95"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Review Scan</h2>
        <div className="flex w-12 items-center justify-end">
          <button 
            onClick={onRescan}
            className="text-primary text-base font-bold leading-normal tracking-[0.015em] shrink-0 active:opacity-60"
          >
            Rescan
          </button>
        </div>
      </div>

      {/* Reference Image Thumbnail */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-4 bg-[#2a2c21] p-3 rounded-2xl border border-[#555841]">
          <div 
            className="w-16 h-16 rounded-lg bg-center bg-no-repeat bg-cover shrink-0" 
            style={{ backgroundImage: `url("${scannedRecipe.imageUrl}")` }}
          ></div>
          <div className="flex-1">
            <p className="text-white text-sm font-bold">Original Reference</p>
            <p className="text-[#b6baa1] text-xs">Tap to view full image</p>
          </div>
          <span className="material-symbols-outlined text-primary">visibility</span>
        </div>
      </div>

      {/* Recipe Title Section */}
      <div className="flex flex-col gap-4 px-4 py-3">
        <label className="flex flex-col min-w-40 flex-1">
          <div className="flex justify-between items-center pb-2">
            <p className="text-white text-base font-medium leading-normal">Recipe Title</p>
            <span className="material-symbols-outlined text-primary text-lg">edit</span>
          </div>
          <input 
            className="w-full min-w-0 flex-1 rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-[#555841] bg-[#2a2c21] h-14 placeholder:text-[#b6baa1] px-4 text-base font-normal leading-normal" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      </div>

      {/* Ingredients Section */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Ingredients</h3>
        <button 
          onClick={handleAddIngredient}
          className="text-primary flex items-center gap-1 active:scale-95"
        >
          <span className="material-symbols-outlined text-xl">add_circle</span>
          <span className="text-sm font-bold">Add</span>
        </button>
      </div>
      <div className="px-4">
        <div className="flex flex-col gap-2">
          {ingredients.map((ing, idx) => (
            <label key={idx} className="flex items-center gap-x-3 py-3 px-4 bg-[#2a2c21] rounded-2xl border border-white/5">
              <input 
                checked 
                readOnly
                type="checkbox"
                className="h-6 w-6 rounded-full border-[#555841] border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:outline-none" 
              />
              <input 
                className="bg-transparent border-none focus:ring-0 text-white text-base font-normal leading-normal w-full" 
                value={`${ing.amount > 0 ? ing.amount + ' ' : ''}${ing.unit ? ing.unit + ' of ' : ''}${ing.name}`}
                onChange={(e) => handleUpdateIngredient(idx, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Instructions Section */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Instructions</h3>
        <span className="material-symbols-outlined text-primary text-lg">reorder</span>
      </div>
      <div className="px-4 space-y-4">
        {instructions.map((step, idx) => (
          <div key={idx} className="flex gap-4 items-start bg-[#2a2c21] p-4 rounded-2xl border border-[#555841]">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-sm">
              {idx + 1}
            </div>
            <textarea 
              className="bg-transparent border-none focus:ring-0 text-white text-base font-normal leading-normal w-full resize-none min-h-[80px]" 
              value={step}
              onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Floating Confirmation Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1c1d15] via-[#1c1d15] to-transparent pt-10 z-50">
        <div className="max-w-[480px] mx-auto">
          <button 
            onClick={() => onSave({ ...scannedRecipe, title, ingredients, instructions })}
            className="w-full bg-primary hover:bg-opacity-90 text-white text-lg font-bold py-4 rounded-full shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">check_circle</span>
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewScan;
