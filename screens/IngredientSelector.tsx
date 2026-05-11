
import React, { useState, useMemo } from 'react';
import { Recipe, PantryItem, RecipeIngredient, ShoppingListItem } from '../types';
import { scaleIngredients } from '../utils/logic';
import { RawShoppingEntry } from '../App';

interface IngredientSelectorProps {
  recipe: Recipe;
  servings: number;
  pantry: PantryItem[];
  shoppingList?: RawShoppingEntry[];
  onClose: () => void;
  onConfirm: (selectedIngredients: RecipeIngredient[]) => void;
}

const IngredientSelector: React.FC<IngredientSelectorProps> = ({ 
  recipe, 
  servings, 
  pantry, 
  shoppingList = [],
  onClose, 
  onConfirm 
}) => {
  const scaled = useMemo(() => scaleIngredients(recipe, servings), [recipe, servings]);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if this recipe has been interacted with in the shopping list
  const hasPriorInteraction = useMemo(() => {
    return scaled.some(ing => shoppingList.some(entry => entry.name.toLowerCase() === ing.name.toLowerCase()));
  }, [scaled, shoppingList]);

  const getPantryStatus = (ingredient: any) => {
    const pantryItem = pantry.find(p => p.name.toLowerCase() === ingredient.name.toLowerCase());
    const qtyInPantry = pantryItem?.quantity || 0;
    const threshold = pantryItem?.lowStockThreshold || 2;
    const needed = ingredient.amount;

    if (qtyInPantry < needed || qtyInPantry === 0) {
      return { label: 'NEED TO BUY', color: '#ef4444', autoSelect: true };
    }
    if (qtyInPantry >= needed && qtyInPantry <= threshold) {
      return { label: 'LOW STOCK', color: '#f59e0b', autoSelect: false };
    }
    return { label: 'IN STOCK', color: '#10b981', autoSelect: false };
  };

  const statuses = useMemo(() => {
    return scaled.reduce((acc, ing) => {
      acc[ing.name] = getPantryStatus(ing);
      return acc;
    }, {} as Record<string, any>);
  }, [scaled, pantry]);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    scaled.forEach(ing => {
      if (hasPriorInteraction) {
        // If recipe was already synced, use the Shopping List as Source of Truth
        // An item is "Selected" if it exists in the raw shopping list
        const isInList = shoppingList.some(entry => entry.name.toLowerCase() === ing.name.toLowerCase() && !entry.completed);
        initial[ing.name] = isInList;
      } else {
        // Default Pantry Logic for new recipe add
        initial[ing.name] = statuses[ing.name].autoSelect;
      }
    });
    return initial;
  });

  const handleToggle = (name: string) => {
    setCheckedItems(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleToggleAll = () => {
    const allChecked = Object.values(checkedItems).every(v => v);
    const newState: Record<string, boolean> = {};
    scaled.forEach(ing => {
      newState[ing.name] = !allChecked;
    });
    setCheckedItems(newState);
  };

  const selectedCount = Object.values(checkedItems).filter(v => v).length;
  const isAllSelected = selectedCount === scaled.length;

  const handleConfirm = () => {
    const selected = scaled.filter(ing => checkedItems[ing.name]);
    
    onConfirm(selected);
    setIsSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center font-sans">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-[480px] bg-[#1c1d15] rounded-t-[2.5rem] shadow-2xl border-t border-white/5 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300 overflow-hidden pb-8">
        <div className="flex flex-col items-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
          <div className="h-1.5 w-12 rounded-full bg-[#3b3e2e]"></div>
        </div>

        <div className="px-6 py-4 flex flex-col gap-1">
          <div className="flex justify-between items-start">
            <h2 className="text-white text-2xl font-black leading-tight tracking-tight font-display">Check Inventory</h2>
            <button onClick={onClose} className="text-[#b6baa1] text-xs font-black uppercase tracking-widest pt-1">Cancel</button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 w-fit px-4 py-1.5 rounded-xl">
              <span className="material-symbols-outlined text-primary text-sm fill-1">restaurant</span>
              <p className="text-white text-xs font-bold truncate max-w-[140px]">{recipe.title}</p>
            </div>
            <button 
              onClick={handleToggleAll}
              className="text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 px-3 py-1.5 rounded-lg active:bg-primary/10"
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-48">
          <div className="space-y-3">
            {scaled.map((ing, idx) => {
              const status = statuses[ing.name];
              const isChecked = checkedItems[ing.name];
              const amount = ing.amount ?? 0;
              return (
                <div 
                  key={idx} 
                  onClick={() => handleToggle(ing.name)}
                  className={`flex flex-col gap-3 p-4 rounded-[1.25rem] border transition-all cursor-pointer bg-[#2a2c21] w-full ${isChecked ? 'border-[#007896]/40' : 'border-white/5'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-6 shrink-0 items-center justify-center">
                      <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-[#007896] border-[#007896]' : 'border-[#3b3e2e]'}`}>
                        {isChecked && <span className="material-symbols-outlined text-white text-[16px] font-black">check</span>}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-base font-bold leading-tight break-words">
                        {amount % 1 === 0 ? amount : amount.toFixed(1)} {ing.unit} {ing.name}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border" style={{ borderColor: `${status.color}30`, backgroundColor: `${status.color}10` }}>
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: status.color }}></span>
                          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: status.color }}>{status.label}</span>
                        </div>
                        {status.label !== 'IN STOCK' && (
                          <span className="text-[9px] font-bold text-[#b6baa1] uppercase tracking-tighter">
                            {pantry.find(p => p.name.toLowerCase() === ing.name.toLowerCase())?.quantity || 0} left in ledger
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Updated Footer Position */}
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-[#1c1d15] via-[#1c1d15] to-transparent pt-16 pointer-events-none z-20"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
          <button 
            disabled={selectedCount === 0 || isSuccess}
            onClick={handleConfirm}
            className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-[0.98] disabled:opacity-30 pointer-events-auto ${
              isSuccess ? 'bg-emerald-500 text-white' : 'bg-primary text-white shadow-primary/20'
            }`}
          >
            <span className="material-symbols-outlined font-black">
              {isSuccess ? 'done_all' : 'shopping_cart'}
            </span>
            <span className="text-lg font-black uppercase tracking-widest">
              {isSuccess ? 'Successfully Added!' : `Add ${selectedCount} Items to Trip`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientSelector;
