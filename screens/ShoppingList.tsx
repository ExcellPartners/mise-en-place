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

// Department sort order per spec:
// Produce → Bread → Meat → Dairy → Alcohol → Everything Else
const DEPT_ORDER = [
  'Produce',
  'Bakery & Bread',
  'Bakery',
  'Bread',
  'Meat & Seafood',
  'Meat',
  'Seafood',
  'Deli',
  'Cheese',
  'Dairy & Eggs',
  'Dairy',
  'Wines & Spirits',
  'Beer & Ciders',
  'Alcohol',
  'Beverages',
  'Pantry',
  'Pasta & Grains',
  'Canned',
  'Dry Goods',
  'Baking',
  'Spices',
  'Condiments & Sauces',
  'Condiments',
  'Snacks',
  'Frozen',
  'Prepared Foods',
  'International',
  'Health',
  'Household',
  'Other',
  'Misc',
  'UNMAPPED',
];

const ShoppingList: React.FC<ShoppingListProps> = ({
  pantry,           // ← was missing from destructuring — caused the black screen
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
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const neededItems = useMemo(() => itemsFromState.filter(item => !item.inPantry), [itemsFromState]);

  // Low stock: pantry has the item but recipe needs >50% of what's left
  const lowStockWarnings = useMemo(() => {
    if (!pantry?.length) return [];
    return neededItems.filter(item => {
      const pantryItem = pantry.find(p => p.name.toLowerCase() === item.name.toLowerCase());
      if (!pantryItem || !pantryItem.quantity || pantryItem.quantity <= 0) return false;
      return item.totalQuantityNeeded >= pantryItem.quantity * 0.5;
    });
  }, [neededItems, pantry]);

  const groupedItems = useMemo<Record<string, ShoppingListItem[]>>(() => {
    const groups: Record<string, ShoppingListItem[]> = {};

    neededItems.forEach(item => {
      let header = item.department && item.department !== 'UNMAPPED' && item.department.toLowerCase() !== 'shelf'
        ? item.department
        : item.aisle && item.aisle.toLowerCase() !== 'shelf'
          ? item.aisle
          : 'Misc';
      if (item.department === 'UNMAPPED') header = 'UNMAPPED';
      if (!groups[header]) groups[header] = [];
      groups[header].push(item);
    });

    // Sort by DEPT_ORDER, then alphabetically for anything not in list
    const unknownKeys = Object.keys(groups).filter(k => !DEPT_ORDER.includes(k)).sort();
    const allKeys = [
      ...DEPT_ORDER.filter(d => groups[d]),
      ...unknownKeys,
    ];

    const sortedGroups: Record<string, ShoppingListItem[]> = {};
    allKeys.forEach(key => { if (groups[key]) sortedGroups[key] = groups[key]; });
    return sortedGroups;
  }, [neededItems]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent, name: string) => {
    if (!touchStart.current) return;
    const diffX = e.touches[0].clientX - touchStart.current.x;
    const diffY = e.touches[0].clientY - touchStart.current.y;
    if (Math.abs(diffY) > Math.abs(diffX)) return; // vertical scroll — ignore
    if (diffX < 0) {
      setSwipeX(prev => ({ ...prev, [name]: Math.max(diffX, -100) }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, name: string) => {
    if (!touchStart.current) return;
    const diffX = e.changedTouches[0].clientX - touchStart.current.x;
    if (diffX < -80) {
      onDeleteItem?.(name);
      setSwipeX(prev => { const next = { ...prev }; delete next[name]; return next; });
    } else {
      setSwipeX(prev => { const next = { ...prev }; delete next[name]; return next; });
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
    if (h === 'misc' || h === 'other') return 'General';
    if (h === 'shelf') return '';
    if (/^\d/.test(header)) return `Aisle ${header}`;
    if (/^[LRlr]\d+$/.test(header)) return `Shelf ${header}`;
    return header;
  };

  const getDeptIcon = (header: string) => {
    const h = header.toLowerCase();
    if (h.includes('produce')) return 'eco';
    if (h.includes('bread') || h.includes('bakery')) return 'bakery_dining';
    if (h.includes('meat') || h.includes('seafood') || h.includes('deli')) return 'restaurant';
    if (h.includes('dairy') || h.includes('eggs') || h.includes('cheese')) return 'egg_alt';
    if (h.includes('wine') || h.includes('beer') || h.includes('spirit') || h.includes('alcohol')) return 'wine_bar';
    if (h.includes('beverage')) return 'local_cafe';
    if (h.includes('frozen')) return 'ac_unit';
    if (h.includes('baking') || h.includes('spice')) return 'nutrition';
    if (h.includes('snack')) return 'lunch_dining';
    if (h.includes('household')) return 'cleaning_services';
    if (h === 'unmapped') return 'bolt';
    return 'forklift';
  };

  const completedCount = neededItems.filter(i => i.completed).length;
  const totalCount = neededItems.length;

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
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">
              {completedCount} of {totalCount} checked
            </p>
          </div>
          <div className="flex items-center gap-1 w-10 justify-end">
            <button onClick={onOpenConfig}
              className="flex items-center justify-center rounded-lg h-10 w-10 text-[#636b2f] active:scale-90 transition-transform">
              <span className="material-symbols-outlined font-black">tune</span>
            </button>
          </div>
        </div>

        {/* Store selector */}
        <div className="px-4 pb-3 pt-2">
          <div className="flex bg-white/5 p-1 rounded-xl items-center justify-between gap-1 border border-white/5">
            {(['Monroe', 'East', 'Perinton'] as StoreLocation[]).map(store => (
              <button key={store} onClick={() => onStoreChange(store)}
                className={`flex-1 whitespace-nowrap px-1 py-3 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${
                  selectedStore === store ? 'bg-[#636b2f] text-white shadow-lg' : 'text-gray-500'
                }`}>
                {store === 'Perinton' ? 'Perinton' : `${store} Ave`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 pt-4 pb-[240px]">

        {/* Quick Add */}
        <div className="px-4 mb-4">
          <div className="bg-white/5 rounded-2xl flex items-center px-4 border border-white/10 focus-within:border-[#636b2f]/60 transition-colors">
            <input
              type="text"
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              className="bg-transparent border-none focus:ring-0 text-base py-4 w-full text-white placeholder:text-gray-600 font-bold"
              placeholder="Quick add item..."
            />
            <button onClick={handleQuickAdd} className={quickAddValue ? 'text-[#636b2f]' : 'text-gray-600'}>
              <span className="material-symbols-outlined font-black text-3xl">add_circle</span>
            </button>
          </div>
        </div>

        {/* Clear button */}
        <div className="px-4 mb-4 flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Clear the entire shopping list?')) onClearList?.();
            }}
            className="text-red-500/60 text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:text-red-500 transition-colors bg-white/5 rounded-lg active:bg-white/10 border border-white/5"
          >
            Clear List
          </button>
        </div>

        {/* Low stock warnings */}
        {lowStockWarnings.length > 0 && (
          <div className="mx-4 mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-amber-400 text-lg">warning</span>
              <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Low Stock After This Shop</p>
            </div>
            <div className="flex flex-col gap-1">
              {lowStockWarnings.map(item => {
                const pantryItem = pantry?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
                return (
                  <p key={item.name} className="text-amber-200/70 text-xs font-medium">
                    {item.name} — need {item.totalQuantityNeeded} {item.unit}, only {pantryItem?.quantity} left
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center opacity-30">
            <span className="material-symbols-outlined text-7xl mb-6">shopping_basket</span>
            <p className="font-bold text-xl mb-2">Your list is empty</p>
            <p className="text-sm font-medium leading-relaxed max-w-[240px]">
              Add recipes to your Planner or quick-add items above to build your list.
            </p>
          </div>
        )}

        {/* Grouped items */}
        {(Object.entries(groupedItems) as [string, ShoppingListItem[]][]).map(([header, items]) => {
          const isUnmapped = header === 'UNMAPPED';
          const headerLabel = getHeaderLabel(header);
          const icon = getDeptIcon(header);

          return (
            <div key={header} className="mb-6 relative">
              {headerLabel && (
                <div className={`sticky top-[116px] z-40 backdrop-blur-md py-3 px-4 border-y border-white/5 flex items-center justify-between shadow-sm ${
                  isUnmapped ? 'bg-orange-500/10' : 'bg-[#1c1f1a]/95'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-lg flex items-center justify-center ${
                      isUnmapped ? 'bg-orange-500 text-white' : 'bg-[#636b2f]/20 text-[#636b2f]'
                    }`}>
                      <span className="material-symbols-outlined text-lg">{icon}</span>
                    </div>
                    <h3 className={`text-base font-black uppercase tracking-widest ${
                      isUnmapped ? 'text-orange-500' : 'text-white'
                    }`}>
                      {headerLabel}
                    </h3>
                  </div>
                  <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">
                    {items.filter(i => i.completed).length}/{items.length}
                  </span>
                </div>
              )}

              <div className="flex flex-col">
                {items.map((item) => {
                  const isChecked = !!item.completed;
                  const offset = swipeX[item.name] || 0;
                  const isShelfCode = /^[LRlr]\d+/.test(item.shelf);

                  return (
                    <div key={item.name} className="relative overflow-hidden group select-none bg-[#000000] min-h-[80px] border-b border-white/5">
                      {/* Swipe-to-delete background */}
                      <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6 z-0"
                        style={{ opacity: offset < -10 ? Math.min(1, Math.abs(offset) / 80) : 0 }}>
                        <span className="material-symbols-outlined text-white text-3xl font-bold">delete</span>
                      </div>

                      {/* Row content */}
                      <div
                        style={{ transform: `translateX(${offset}px)` }}
                        className={`relative flex items-center gap-4 px-4 h-full py-4 justify-between bg-[#000000] z-10 transition-transform duration-75 touch-pan-y ${isChecked ? 'opacity-40' : ''}`}
                        onTouchStart={handleTouchStart}
                        onTouchMove={(e) => handleTouchMove(e, item.name)}
                        onTouchEnd={(e) => handleTouchEnd(e, item.name)}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          className="relative z-20 flex size-12 items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform"
                          onClick={(e) => { e.stopPropagation(); onToggleItem?.(item.name); }}
                        >
                          <div className={`h-7 w-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isChecked ? 'bg-[#636b2f] border-[#636b2f]' : 'border-white/30'
                          }`}>
                            {isChecked && <span className="material-symbols-outlined text-white text-[18px] font-black" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                          </div>
                        </button>

                        {/* Name + shelf */}
                        <div className="overflow-hidden flex-1">
                          <p className={`text-white text-base font-bold leading-tight truncate transition-all ${
                            isChecked ? 'line-through decoration-white/40 decoration-2' : ''
                          }`}>
                            {item.name}
                          </p>
                          {item.shelf && isShelfCode && !isUnmapped && (
                            <span className="text-[#636b2f] text-[10px] font-black uppercase tracking-[0.2em]">
                              Shelf {item.shelf}
                            </span>
                          )}
                          {isUnmapped && (
                            <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Unsorted</span>
                          )}
                        </div>

                        {/* Qty badge */}
                        <div className={`shrink-0 text-right ml-2 bg-[#636b2f]/10 px-4 py-2 rounded-xl border border-[#636b2f]/20 transition-all ${
                          isChecked ? 'grayscale opacity-20' : ''
                        }`}>
                          <p className="text-[#636b2f] text-xl font-black tabular-nums">
                            {item.unitsToBuy}{' '}
                            <span className="text-[10px] uppercase font-black">
                              {pluralizeUnit(item.purchaseUnit, item.unitsToBuy)}
                            </span>
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

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-[90]">
        <div className="px-4 pb-6 pt-4 bg-[#000000]/95 backdrop-blur-xl flex flex-col gap-3 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/5">
          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#636b2f] rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          )}
          <button
            onClick={() => onCheckout?.(neededItems)}
            disabled={completedCount === 0}
            className="w-full bg-[#636b2f] disabled:opacity-30 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#636b2f]/20 active:scale-[0.98] transition-all text-base uppercase tracking-widest"
          >
            <span className="material-symbols-outlined">shopping_cart_checkout</span>
            <span>Checkout {completedCount > 0 ? `(${completedCount} items)` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;
