import React, { useState, useMemo, useRef } from 'react';
import { 
  MealPlan, 
  Recipe, 
  MasterIngredient, 
  StoreMapping, 
  PantryItem, 
  StoreLocation,
  ShoppingListItem 
} from '../types';
import { pluralizeUnit } from '../utils/logic';

interface ShoppingListProps {
  mealPlans: MealPlan[];
  recipes: Recipe[];
  masters: MasterIngredient[];
  mappings: StoreMapping[];
  pantry: PantryItem[];
  selectedStore: StoreLocation;
  onStoreChange: (store: StoreLocation) => void;
  onOpenMap: () => void;
  onOpenConfig?: () => void;
  onBack?: () => void;
  onCheckout?: (items: ShoppingListItem[]) => void;
  onClearList?: () => void;
  onDeleteItem?: (name: string) => void;
  onToggleItem?: (name: string) => void;
  manualItems?: string[];
  onAddManualItem?: (name: string) => void;
  itemsFromState?: ShoppingListItem[];
}

const ShoppingList: React.FC<ShoppingListProps> = ({ 
  selectedStore, 
  onStoreChange,
  onOpenConfig,
  onBack,
  onCheckout,
  onClearList,
  onDeleteItem,
  onToggleItem,
  onAddManualItem,
  itemsFromState = []
}) => {
  const [quickAddValue, setQuickAddValue] = useState('');
  const [swipeX, setSwipeX] = useState<Record<string, number>>({});
  
  // Track X and Y to distinguish between Swipe and Scroll
  const touchStart = useRef<{x: number, y: number} | null>(null);

  const neededItems = useMemo(() => itemsFromState.filter(item => !item.inPantry), [itemsFromState]);
  
  const groupedItems = useMemo<Record<string, ShoppingListItem[]>>(() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    neededItems.forEach(item => {
      // If aisle is missing or generic "Shelf", default to Misc, unless it has a specific department
      let header = item.aisle;
      
      // Clean up headers
      if (!header || header.toLowerCase() === 'shelf') header = 'Misc'; 
      if (item.department === 'UNMAPPED') header = 'UNMAPPED';
      
      if (!groups[header]) groups[header] = [];
      groups[header].push(item);
    });

    const sortedGroups: Record<string, ShoppingListItem[]> = {};
    if (groups['UNMAPPED']) sortedGroups['UNMAPPED'] = groups['UNMAPPED'];
    
    // Sort logic: Numeric aisles first, then alpha
    Object.keys(groups).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(key => {
      if (key !== 'UNMAPPED') sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [neededItems]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent, name: string) => {
    if (!touchStart.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStart.current.x;
    const diffY = currentY - touchStart.current.y;

    // SCROLL LOCK: If moving vertically more than horizontally, it's a scroll. Ignore swipe.
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    // Swipe Left Logic (Drag right-to-left to delete)
    if (diffX < 0) { 
      // Clamp at -100px
      setSwipeX(prev => ({ ...prev, [name]: Math.max(diffX, -100) }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, name: string) => {
    if (!touchStart.current) return;
    const endX = e.changedTouches[0].clientX;
    const diffX = endX - touchStart.current.x;
    
    // Threshold to trigger delete
    if (diffX < -80) {
      if (onDeleteItem) {
        onDeleteItem(name);
        // Clean up state
        setSwipeX(prev => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    } else {
      // Snap back
      setSwipeX(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    touchStart.current = null;
  };

  const handleQuickAdd = () => {
    if (quickAddValue.trim()) {
      onAddManualItem?.(quickAddValue.trim());
      setQuickAddValue('');
    }
  };

  const getHeaderLabel = (header: string) => {
    const h = header.toLowerCase();
    if (h === 'unmapped') return 'Quick List';
    if (h === 'misc') return 'General';
    if (h === 'shelf') return ''; // STRICT FIX: Never show "Shelf Department"
    
    // Numeric Aisle (e.g. "1", "12A")
    if (/^\d/.test(header)) return `Aisle ${header}`; 
    
    // Specific Shelf Codes (L1, R10) used as headers
    if (/^[LRlr]\d+$/.test(header)) return `Shelf ${header}`;
    
    // Named Departments
    if (['back', 'front', 'deli', 'bakery', 'produce', 'meat', 'seafood', 'dairy'].includes(h)) return `${header} Department`;
    
    return `${header} Department`; 
  };

  const completedCount = neededItems.filter(i => i.completed).length;

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden bg-[#000000] text-white font-sans">
      
      {/* Header */}
      <div className="sticky top-0 z-[60] bg-[#000000]/95 backdrop-blur-xl border-b border-white/5 header-safe-pt">
        <div className="flex items-center px-4 pb-2 justify-between">
          <button onClick={onBack} className="text-white flex size-10 shrink-0 items-center justify-center active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-white text-lg font-black leading-tight tracking-tight uppercase">Shopping List</h2>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Mise en Place</p>
          </div>
          <div className="flex items-center gap-1 w-10 justify-end">
            <button 
              onClick={onOpenConfig}
              className="flex items-center justify-center rounded-lg h-10 w-10 text-[#636b2f] active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined font-black">tune</span>
            </button>
          </div>
        </div>
        
        <div className="px-4 pb-3 pt-2">
          <div className="flex bg-white/5 p-1 rounded-xl items-center justify-between gap-1 border border-white/5">
            {(['Monroe', 'East', 'Perinton'] as StoreLocation[]).map(store => (
              <button
                key={store}
                onClick={() => onStoreChange(store)}
                className={`flex-1 whitespace-nowrap px-1 py-3 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${
                  selectedStore === store ? 'bg-[#636b2f] text-white shadow-lg' : 'text-gray-500'
                }`}
              >
                {store === 'Perinton' ? 'Perinton' : `${store} Avenue`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 pt-4 pb-[240px]">
        {/* Quick Add */}
        <div className="px-4 mb-6">
          <div className="bg-white/5 rounded-2xl flex items-center px-4 border border-white/10 focus-within:border-orange-500 transition-colors shadow-inner">
            <input 
              type="text" 
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              className="bg-transparent border-none focus:ring-0 text-base py-5 w-full text-white placeholder:text-gray-600 font-bold" 
              placeholder="Quick add item..." 
            />
            <button onClick={handleQuickAdd} className={quickAddValue ? 'text-orange-500' : 'text-gray-600'}>
              <span className="material-symbols-outlined font-black text-3xl">add_circle</span>
            </button>
          </div>
        </div>

        {/* Clear Button - Explicit Z-Index and Container */}
        <div className="px-4 mb-4 flex justify-end relative z-20">
           <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm("Are you sure you want to clear the entire list?")) {
                  onClearList?.();
                }
              }}
              className="text-red-500/60 text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:text-red-500 transition-colors bg-white/5 rounded-lg active:bg-white/10 border border-white/5"
            >
              Clear Itinerary
            </button>
        </div>

        {(Object.entries(groupedItems) as [string, ShoppingListItem[]][]).map(([header, items]) => {
          const isUnmapped = header === 'UNMAPPED';
          const headerLabel = getHeaderLabel(header);
          
          return (
            <div key={header} className="mb-6 relative">
              {headerLabel && (
                <div className={`sticky top-[148px] z-40 ${isUnmapped ? 'bg-orange-500/10' : 'bg-[#1c1f1a]/95'} backdrop-blur-md py-3 px-4 border-y border-white/5 flex items-center justify-between shadow-sm`}>
                  <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-lg flex items-center justify-center ${isUnmapped ? 'bg-orange-500 text-white' : 'bg-[#636b2f]/20 text-[#636b2f]'}`}>
                      <span className="material-symbols-outlined text-lg">{isUnmapped ? 'bolt' : 'forklift'}</span>
                    </div>
                    <h3 className={`text-lg font-black uppercase tracking-widest font-display ${isUnmapped ? 'text-orange-500' : 'text-white'}`}>
                      {headerLabel}
                    </h3>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col">
                {items.map((item) => {
                  const isChecked = !!item.completed;
                  const offset = swipeX[item.name] || 0;
                  const isShelfCode = /^[LRlr]\d+/.test(item.shelf);

                  return (
                    <div 
                      key={item.name} 
                      className="relative overflow-hidden group select-none bg-[#000000] min-h-[90px] border-b border-white/5"
                    >
                      {/* Swipe Background (Delete) */}
                      <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6 z-0" style={{ opacity: offset < 0 ? 1 : 0 }}>
                        <span className="material-symbols-outlined text-white text-3xl font-bold">delete</span>
                      </div>

                      {/* Foreground Content with Swipe Handlers */}
                      <div 
                        style={{ transform: `translateX(${offset}px)` }}
                        className={`relative flex items-center gap-4 px-4 h-full py-4 justify-between bg-[#000000] z-10 transition-transform duration-75 touch-pan-y ${isChecked ? 'opacity-40' : ''}`}
                        onTouchStart={handleTouchStart}
                        onTouchMove={(e) => handleTouchMove(e, item.name)}
                        onTouchEnd={(e) => handleTouchEnd(e, item.name)}
                      >
                        <div className="flex items-center gap-4 overflow-hidden flex-1 pointer-events-none">
                          {/* Checkbox Button - Pointer Events Enabled Explicitly */}
                          <button
                            type="button"
                            className="relative z-20 flex size-12 items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform pointer-events-auto"
                            onClick={(e) => {
                              e.stopPropagation(); 
                              onToggleItem?.(item.name);
                            }}
                          >
                            <div 
                              className={`h-7 w-7 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-[#007896] border-[#007896]' : 'border-[#007896]'}`}
                            >
                               {isChecked && <span className="material-symbols-outlined text-white text-[18px] font-black">check</span>}
                            </div>
                          </button>
                          
                          <div className="overflow-hidden flex-1">
                            <p className={`text-white text-lg font-bold leading-tight truncate font-display transition-all ${isChecked ? 'line-through decoration-[#007896] decoration-2' : ''}`}>
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {/* Only show shelf label if it's a code like L1/R10 */}
                              {item.shelf && isShelfCode && !isUnmapped && (
                                <span className="text-[#636b2f] text-[10px] font-black uppercase tracking-[0.2em] font-display">
                                  Shelf {item.shelf}
                                </span>
                              )}
                              {isUnmapped && <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest font-display">Unsorted</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className={`shrink-0 text-right ml-2 bg-[#636b2f]/10 px-4 py-2 rounded-xl border border-[#636b2f]/20 transition-all ${isChecked ? 'grayscale opacity-20' : ''}`}>
                          <p className="text-[#636b2f] text-xl font-black tabular-nums">
                            {item.unitsToBuy} <span className="text-[10px] uppercase font-black">{pluralizeUnit(item.purchaseUnit, item.unitsToBuy)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-[84px] left-0 right-0 w-full z-[90]">
        <div className="px-4 pb-4 pt-4 bg-[#000000]/95 backdrop-blur-xl flex flex-col gap-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/5">
          <button 
            onClick={() => onCheckout?.(neededItems)}
            disabled={completedCount === 0}
            className="w-full bg-[#636b2f] disabled:opacity-30 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#636b2f]/20 active:scale-[0.98] transition-all text-lg"
          >
            <span className="material-symbols-outlined">shopping_cart_checkout</span>
            <span>Checkout Trip ({completedCount} Items)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;