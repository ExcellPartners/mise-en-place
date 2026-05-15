import React, { useState, useMemo, useRef } from 'react';
import {
  MasterIngredient, StoreMapping, PantryItem, StoreLocation, ShoppingListItem
} from '../types';
import { pluralizeUnit } from '../utils/logic';

interface ShoppingListProps {
  masters: MasterIngredient[];
  mappings: StoreMapping[];
  pantry: PantryItem[];
  selectedStore: StoreLocation;
  onStoreChange: (store: StoreLocation) => void;
  onOpenConfig?: () => void;
  onBack?: () => void;
  onCheckout?: (items: ShoppingListItem[]) => void;
  onClearList?: () => void;
  onDeleteItem?: (name: string) => void;
  onToggleItem?: (name: string) => void;
  onAddManualItem?: (name: string) => void;
  itemsFromState?: ShoppingListItem[];
}

// ── Aisle sorting ──────────────────────────────────────────────────────────────
// Priority departments shop first. Everything else groups by aisle code.
const PRIORITY_DEPTS = ['Produce', 'Bakery & Bread', 'Bakery', 'Bread', 'Meat & Seafood', 'Meat', 'Seafood', 'Deli', 'Dairy & Eggs', 'Dairy', 'Cheese', 'Wines & Spirits', 'Beer & Ciders', 'Alcohol'];
const PRIORITY_LABEL_ORDER = ['Produce', 'Bakery & Bread', 'Meat & Seafood', 'Dairy & Eggs', 'Wines & Spirits'];

// Parse aisle code like "13A" from "13A R4" or "13A"
const parseAisleCode = (locationStr: string): string => {
  if (!locationStr) return '';
  return locationStr.trim().split(/\s+/)[0] || '';
};

// Parse shelf code like "R4" from "13A R4"
const parseShelf = (locationStr: string): string => {
  if (!locationStr) return '';
  const parts = locationStr.trim().split(/\s+/);
  return parts[1] || '';
};

// Sort shelf codes: R4, L4 before R9, L9 — numeric ascending, left/right together
const compareShelf = (a: string, b: string): number => {
  const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
  const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
  if (numA !== numB) return numA - numB;
  return a.localeCompare(b); // L vs R same number
};

// Sort aisle codes: numeric aisles by number, letter suffix secondary
const compareAisle = (a: string, b: string): number => {
  // Extract leading number
  const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
  const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
  if (numA !== numB) return numA - numB;
  return a.localeCompare(b);
};

// Get priority index for a department name — lower = earlier in route
const deptPriority = (dept: string): number => {
  const d = dept.toLowerCase();
  if (d.includes('produce')) return 0;
  if (d.includes('bakery') || d.includes('bread')) return 1;
  if (d.includes('meat') || d.includes('seafood') || d.includes('deli')) return 2;
  if (d.includes('dairy') || d.includes('cheese') || d.includes('egg')) return 3;
  if (d.includes('wine') || d.includes('beer') || d.includes('spirit') || d.includes('alcohol')) return 4;
  return 99; // aisle-sorted items come after
};

const getDeptIcon = (header: string): string => {
  const h = header.toLowerCase();
  if (h.includes('produce')) return 'eco';
  if (h.includes('bread') || h.includes('bakery')) return 'bakery_dining';
  if (h.includes('meat') || h.includes('seafood') || h.includes('deli')) return 'restaurant';
  if (h.includes('dairy') || h.includes('egg') || h.includes('cheese')) return 'egg_alt';
  if (h.includes('wine') || h.includes('beer') || h.includes('spirit') || h.includes('alcohol')) return 'wine_bar';
  if (/^\d/.test(header)) return 'shopping_cart';
  if (h === 'misc' || h === 'other') return 'more_horiz';
  return 'forklift';
};

const ShoppingList: React.FC<ShoppingListProps> = ({
  pantry,
  selectedStore,
  onStoreChange,
  onOpenConfig,
  onBack,
  onCheckout,
  onClearList,
  onDeleteItem,
  onToggleItem,
  onAddManualItem,
  itemsFromState = [],
}) => {
  const [quickAddValue, setQuickAddValue] = useState('');
  const [swipeX, setSwipeX] = useState<Record<string, number>>({});
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const neededItems = useMemo(() => itemsFromState.filter(item => !item.inPantry), [itemsFromState]);

  const lowStockWarnings = useMemo(() => {
    if (!pantry?.length) return [];
    return neededItems.filter(item => {
      const p = pantry.find(p => p.name.toLowerCase() === item.name.toLowerCase());
      if (!p || !p.quantity || p.quantity <= 0) return false;
      return item.totalQuantityNeeded >= p.quantity * 0.5;
    });
  }, [neededItems, pantry]);

  // ── Build aisle-grouped, priority-ordered sections ─────────────────────────
  const groupedItems = useMemo<{ header: string; items: ShoppingListItem[] }[]>(() => {
    const priorityGroups: Record<string, ShoppingListItem[]> = {};
    const aisleGroups: Record<string, ShoppingListItem[]> = {};

    neededItems.forEach(item => {
      const dept = item.department || '';
      const aisleRaw = item.aisle || '';
      const aisleCode = parseAisleCode(aisleRaw);

      // Is this a priority department?
      const isPriority = PRIORITY_DEPTS.some(pd => dept.toLowerCase().includes(pd.toLowerCase())) || deptPriority(dept) < 5;

      if (isPriority) {
        // Use canonical dept label for grouping
        const label = (() => {
          const d = dept.toLowerCase();
          if (d.includes('produce')) return 'Produce';
          if (d.includes('bakery') || d.includes('bread')) return 'Bakery & Bread';
          if (d.includes('meat') || d.includes('seafood') || d.includes('deli')) return 'Meat & Seafood';
          if (d.includes('dairy') || d.includes('cheese') || d.includes('egg')) return 'Dairy & Eggs';
          if (d.includes('wine') || d.includes('beer') || d.includes('spirit') || d.includes('alcohol')) return 'Wines & Spirits';
          return dept || 'Other';
        })();
        if (!priorityGroups[label]) priorityGroups[label] = [];
        priorityGroups[label].push(item);
      } else if (aisleCode) {
        // Group by exact aisle code (e.g. "13A")
        if (!aisleGroups[aisleCode]) aisleGroups[aisleCode] = [];
        aisleGroups[aisleCode].push(item);
      } else {
        // No aisle info — put in Misc
        if (!aisleGroups['Misc']) aisleGroups['Misc'] = [];
        aisleGroups['Misc'].push(item);
      }
    });

    // Sort within each aisle group by shelf code
    Object.values(aisleGroups).forEach(items => {
      items.sort((a, b) => compareShelf(parseShelf(a.aisle), parseShelf(b.aisle)));
    });

    // Sort priority groups by route order
    const sortedPriority = PRIORITY_LABEL_ORDER
      .filter(l => priorityGroups[l])
      .map(l => ({ header: l, items: priorityGroups[l] }));

    // Any priority groups not in the explicit order list
    const extraPriority = Object.keys(priorityGroups)
      .filter(k => !PRIORITY_LABEL_ORDER.includes(k))
      .sort((a, b) => deptPriority(a) - deptPriority(b))
      .map(k => ({ header: k, items: priorityGroups[k] }));

    // Sort aisle groups numerically
    const sortedAisle = Object.keys(aisleGroups)
      .filter(k => k !== 'Misc')
      .sort(compareAisle)
      .map(k => ({ header: `Aisle ${k}`, items: aisleGroups[k] }));

    const misc = aisleGroups['Misc'] ? [{ header: 'Misc', items: aisleGroups['Misc'] }] : [];

    return [...sortedPriority, ...extraPriority, ...sortedAisle, ...misc];
  }, [neededItems]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = (e: React.TouchEvent, name: string) => {
    if (!touchStartRef.current) return;
    const diffX = e.touches[0].clientX - touchStartRef.current.x;
    const diffY = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(diffY) > Math.abs(diffX)) return;
    if (diffX < 0) setSwipeX(prev => ({ ...prev, [name]: Math.max(diffX, -100) }));
  };
  const handleTouchEnd = (e: React.TouchEvent, name: string) => {
    if (!touchStartRef.current) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    if (diffX < -80) {
      onDeleteItem?.(name);
      setSwipeX(prev => { const n = { ...prev }; delete n[name]; return n; });
    } else {
      setSwipeX(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
    touchStartRef.current = null;
  };

  const handleQuickAdd = () => {
    if (quickAddValue.trim()) {
      onAddManualItem?.(quickAddValue.trim());
      setQuickAddValue('');
    }
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
          <button onClick={onOpenConfig} className="flex items-center justify-center rounded-lg h-10 w-10 text-[#636b2f] active:scale-90 transition-transform">
            <span className="material-symbols-outlined font-black">tune</span>
          </button>
        </div>

        {/* Store selector */}
        <div className="px-4 pb-3 pt-1">
          <div className="flex bg-white/5 p-1 rounded-xl gap-1 border border-white/5">
            {(['Monroe', 'East', 'Perinton'] as StoreLocation[]).map(store => (
              <button key={store} onClick={() => onStoreChange(store)}
                className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${selectedStore === store ? 'bg-[#636b2f] text-white shadow-lg' : 'text-gray-500'}`}>
                {store === 'Perinton' ? 'Perinton' : `${store} Ave`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 pt-4 pb-[280px]">
        {/* Quick add */}
        <div className="px-4 mb-4">
          <div className="bg-white/5 rounded-2xl flex items-center px-4 border border-white/10 focus-within:border-[#636b2f]/60 transition-colors">
            <input type="text" value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              className="bg-transparent border-none focus:ring-0 text-base py-4 w-full text-white placeholder:text-gray-600 font-bold outline-none"
              placeholder="Quick add item…" />
            <button onClick={handleQuickAdd} className={quickAddValue ? 'text-[#636b2f]' : 'text-gray-600'}>
              <span className="material-symbols-outlined font-black text-3xl">add_circle</span>
            </button>
          </div>
        </div>

        {/* Clear */}
        <div className="px-4 mb-4 flex justify-end">
          <button onClick={() => { if (window.confirm('Clear the entire shopping list?')) onClearList?.(); }}
            className="text-red-500/60 text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/5 rounded-lg border border-white/5 active:bg-white/10 transition-colors">
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
            {lowStockWarnings.map(item => {
              const p = pantry?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
              return <p key={item.name} className="text-amber-200/70 text-xs font-medium">{item.name} — need {item.totalQuantityNeeded} {item.unit}, only {p?.quantity} left</p>;
            })}
          </div>
        )}

        {/* Empty state */}
        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center opacity-30">
            <span className="material-symbols-outlined text-7xl mb-6">shopping_basket</span>
            <p className="font-bold text-xl mb-2">Your list is empty</p>
            <p className="text-sm font-medium leading-relaxed max-w-[240px]">Add recipes to your Planner or quick-add items above.</p>
          </div>
        )}

        {/* Aisle-grouped items */}
        {groupedItems.map(({ header, items }) => {
          const icon = getDeptIcon(header);
          const isMisc = header === 'Misc';

          return (
            <div key={header} className="mb-6">
              {/* Section header — sticky */}
              <div className="sticky top-[116px] z-40 backdrop-blur-md py-3 px-4 border-y border-white/5 flex items-center justify-between bg-[#1c1f1a]/95 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg flex items-center justify-center bg-[#636b2f]/20 text-[#636b2f]">
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                  </div>
                  <h3 className="text-base font-black uppercase tracking-widest text-white">{header}</h3>
                </div>
                <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">
                  {items.filter(i => i.completed).length}/{items.length}
                </span>
              </div>

              {/* Items */}
              <div className="flex flex-col">
                {items.map(item => {
                  const isChecked = !!item.completed;
                  const offset = swipeX[item.name] || 0;
                  const shelfCode = parseShelf(item.aisle);

                  return (
                    <div key={item.name} className="relative overflow-hidden select-none bg-[#000000] min-h-[76px] border-b border-white/5">
                      {/* Swipe delete bg */}
                      <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6"
                        style={{ opacity: offset < -10 ? Math.min(1, Math.abs(offset) / 80) : 0, zIndex: 0 }}>
                        <span className="material-symbols-outlined text-white text-3xl font-bold">delete</span>
                      </div>

                      <div
                        style={{ transform: `translateX(${offset}px)`, zIndex: 10 }}
                        className={`relative flex items-center gap-4 px-4 py-4 bg-[#000000] touch-pan-y transition-transform duration-75 ${isChecked ? 'opacity-40' : ''}`}
                        onTouchStart={handleTouchStart}
                        onTouchMove={(e) => handleTouchMove(e, item.name)}
                        onTouchEnd={(e) => handleTouchEnd(e, item.name)}
                      >
                        {/* Checkbox */}
                        <button type="button" onClick={() => onToggleItem?.(item.name)}
                          className="relative z-20 flex size-12 items-center justify-center shrink-0 active:scale-90 transition-transform">
                          <div className={`h-7 w-7 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-[#636b2f] border-[#636b2f]' : 'border-white/30'}`}>
                            {isChecked && <span className="material-symbols-outlined text-white text-[18px] font-black" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                          </div>
                        </button>

                        {/* Name + shelf code */}
                        <div className="overflow-hidden flex-1">
                          <p className={`text-white text-base font-bold leading-tight truncate ${isChecked ? 'line-through decoration-white/40 decoration-2' : ''}`}>
                            {item.name}
                          </p>
                          {shelfCode && (
                            <span className="text-[#636b2f] text-[10px] font-black uppercase tracking-[0.2em]">
                              {shelfCode}
                            </span>
                          )}
                        </div>

                        {/* Qty badge */}
                        <div className={`shrink-0 text-right ml-2 bg-[#636b2f]/10 px-4 py-2 rounded-xl border border-[#636b2f]/20 transition-all ${isChecked ? 'grayscale opacity-20' : ''}`}>
                          <p className="text-[#636b2f] text-xl font-black tabular-nums">
                            {item.unitsToBuy}{' '}
                            <span className="text-[10px] uppercase font-black">{pluralizeUnit(item.purchaseUnit, item.unitsToBuy)}</span>
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

      {/* Checkout CTA — always visible */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-[110]">
        <div className="px-4 pb-6 pt-4 bg-[#000000]/95 backdrop-blur-xl flex flex-col gap-3 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/5">
          {totalCount > 0 && (
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#636b2f] rounded-full transition-all duration-500" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
            </div>
          )}
          <button
            onClick={() => onCheckout?.(neededItems)}
            disabled={completedCount === 0}
            className="w-full bg-[#636b2f] disabled:opacity-30 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#636b2f]/20 active:scale-[0.98] transition-all text-base uppercase tracking-widest"
          >
            <span className="material-symbols-outlined">shopping_cart_checkout</span>
            {completedCount > 0 ? `Checkout (${completedCount} items)` : 'Check Items to Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;
