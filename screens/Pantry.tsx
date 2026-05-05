
import React, { useState, useMemo } from 'react';
import { PantryItem, StoreMapping } from '../types';
import { pluralizeUnit } from '../utils/logic';

interface PantryProps {
  pantry: PantryItem[];
  mappings: StoreMapping[];
  onUpdate: (newPantry: PantryItem[]) => void;
  onAddNew?: () => void;
  onAddToList?: (item: PantryItem) => void;
}

type Tab = 'In Stock' | 'Low Stock' | 'Out' | 'Expired';

const Pantry: React.FC<PantryProps> = ({ pantry, mappings, onUpdate, onAddNew, onAddToList }) => {
  const [activeTab, setActiveTab] = useState<Tab>('In Stock');
  const [searchQuery, setSearchQuery] = useState('');

  const lowStockCount = pantry.filter(item => (item.quantity || 0) > 0 && (item.quantity || 0) < 2).length;
  const expiredCount  = pantry.filter(item => item.isExpired || item.isExpiringSoon).length;

  const updateQuantity = (name: string, delta: number) => {
    onUpdate(pantry.map(item => {
      if (item.name === name) {
        const newQty = Math.max(0, (item.quantity || 0) + delta);
        return { ...item, quantity: newQty, inStock: newQty > 0, lowStock: newQty > 0 && newQty < 2 };
      }
      return item;
    }));
  };

  const groupedPantry = useMemo<Record<string, PantryItem[]>>(() => {
    const filtered = pantry.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      const qty = item.quantity || 0;
      if (activeTab === 'In Stock')  return qty > 0 && !item.isExpired;
      if (activeTab === 'Low Stock') return qty > 0 && qty < 2 && !item.isExpired;
      if (activeTab === 'Out')       return qty === 0 && !item.isExpired;
      if (activeTab === 'Expired')   return !!item.isExpired || !!item.isExpiringSoon;
      return true;
    });

    const groups: Record<string, PantryItem[]> = {};
    filtered.forEach(item => {
      const map = mappings.find(m => m.ingredientName.toLowerCase() === item.name.toLowerCase());
      const cat = map?.department || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    const sortedGroups: Record<string, PantryItem[]> = {};
    // Expired tab: sort by days remaining ascending (most urgent first)
    Object.keys(groups).sort().forEach(cat => {
      sortedGroups[cat] = groups[cat].sort((a, b) => {
        if (activeTab === 'Expired') return (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999);
        return a.name.localeCompare(b.name);
      });
    });
    return sortedGroups;
  }, [pantry, activeTab, searchQuery, mappings]);

  const formatExpiryLabel = (item: PantryItem): { label: string; color: string } => {
    if (item.isExpired) return { label: 'Expired — discard', color: 'text-red-400' };
    if (item.daysRemaining !== null && item.daysRemaining !== undefined) {
      if (item.daysRemaining <= 0) return { label: 'Gone bad today', color: 'text-red-400' };
      if (item.daysRemaining === 1) return { label: 'Expires tomorrow', color: 'text-orange-400' };
      if (item.daysRemaining <= 3) return { label: `${Math.round(item.daysRemaining)} days left`, color: 'text-orange-400' };
      if (item.daysRemaining <= 7) return { label: `Use within ${Math.round(item.daysRemaining)} days`, color: 'text-amber-400' };
    }
    if (item.expiryDate) return { label: `Best by ${item.expiryDate}`, color: 'text-white/30' };
    return { label: '', color: '' };
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#1c1d15] text-gray-100 overflow-x-hidden font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#1c1d15] header-safe-pt">
        <div className="flex items-center px-4 py-4 justify-between">
          <div className="w-10"></div>
          <div className="flex-1 text-center">
            <h2 className="text-white text-lg font-black leading-tight tracking-tight uppercase">Kitchen Ledger</h2>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Mise en Place</p>
          </div>
          <button 
            onClick={onAddNew}
            className="flex items-center justify-center rounded-full size-10 bg-[#2a2c21] text-white border border-white/5 active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-2xl font-bold">add</span>
          </button>
        </div>

        {lowStockCount > 0 && (
          <div className="px-4 pb-3">
            <button
              onClick={() => setActiveTab('Low Stock')}
              className="w-full bg-[#2a2c21] border border-[#3b3e2e] rounded-[1.5rem] p-4 flex items-center gap-4 active:scale-[0.98] transition-all"
            >
              <div className="bg-[#636b2f] text-[#0f110c] rounded-full size-10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl font-black">priority_high</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-black text-[#636b2f] uppercase tracking-[0.2em] mb-0.5">Low Stock Alerts</p>
                <p className="text-base font-medium text-white/90 leading-tight">
                  {lowStockCount} {lowStockCount === 1 ? 'item is' : 'items are'} running low
                </p>
              </div>
              <span className="material-symbols-outlined text-white/20">chevron_right</span>
            </button>
          </div>
        )}

        {expiredCount > 0 && (
          <div className="px-4 pb-3">
            <button
              onClick={() => setActiveTab('Expired')}
              className="w-full bg-red-500/10 border border-red-500/20 rounded-[1.5rem] p-4 flex items-center gap-4 active:scale-[0.98] transition-all"
            >
              <div className="bg-red-500 text-white rounded-full size-10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl font-black">delete_forever</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-0.5">Throw Out Reminder</p>
                <p className="text-base font-medium text-white/90 leading-tight">
                  {expiredCount} {expiredCount === 1 ? 'item has' : 'items have'} expired or expire soon
                </p>
              </div>
              <span className="material-symbols-outlined text-white/20">chevron_right</span>
            </button>
          </div>
        )}

        <div className="px-4 pb-4">
          <div className="flex w-full items-stretch rounded-[1.25rem] h-14 overflow-hidden bg-[#2a2c21] border border-white/5 focus-within:border-[#636b2f]/50 transition-all">
            <div className="text-white/40 flex items-center justify-center pl-5">
              <span className="material-symbols-outlined text-2xl">search</span>
            </div>
            <input 
              className="flex w-full min-w-0 flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/30 px-4 pl-3 text-base font-medium" 
              placeholder="Search staples..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="px-4">
          <div className="flex gap-1.5 pb-4">
            {(['In Stock', 'Low Stock', 'Out', 'Expired'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex flex-col items-center justify-center h-11 rounded-xl transition-all relative font-bold text-[9px] uppercase tracking-wider ${
                  activeTab === tab
                    ? tab === 'Expired' ? 'bg-red-500/80 text-white' : 'bg-[#636b2f] text-white'
                    : 'bg-[#2a2c21] text-white/40 border border-white/5'
                }`}
              >
                {tab}
                {tab === 'Low Stock' && lowStockCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-2.5 bg-red-500 rounded-full border-2 border-[#0f110c]"></span>
                )}
                {tab === 'Expired' && expiredCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-2.5 bg-red-500 rounded-full border-2 border-[#0f110c]"></span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-2 pb-40 no-scrollbar">
        {Object.keys(groupedPantry).length > 0 ? (
          (Object.entries(groupedPantry) as [string, PantryItem[]][]).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-[#636b2f] text-[10px] font-black uppercase tracking-[0.25em] px-2 mb-3">
                {category}
              </h3>
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const qty = item.quantity ?? 0;
                  const isLow = qty > 0 && qty < 2;
                  const expiryInfo = formatExpiryLabel(item);
                  const cardBorder = item.isExpired ? 'border-red-500/30' : item.isExpiringSoon ? 'border-orange-500/30' : isLow ? 'border-[#636b2f]/30' : 'border-white/5';
                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col gap-3 p-5 rounded-[1.5rem] border shadow-sm transition-all bg-[#2a2c21] ${cardBorder}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center rounded-xl shrink-0 size-12 transition-colors ${
                          item.isExpired ? 'bg-red-500/20 text-red-400' : item.isExpiringSoon ? 'bg-orange-500/20 text-orange-400' : isLow ? 'bg-[#636b2f]/20 text-[#636b2f]' : 'bg-white/5 text-white/40'
                        }`}>
                          <span className="material-symbols-outlined text-2xl">{item.icon || 'inventory_2'}</span>
                        </div>
                        <div className="flex flex-col justify-center flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white text-lg font-bold leading-tight">{item.name}</p>
                            {qty > 0 && !isLow && !item.isExpired && !item.isExpiringSoon && <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></span>}
                            {item.isExpired && <span className="flex h-2 w-2 rounded-full bg-red-500"></span>}
                            {item.isExpiringSoon && !item.isExpired && <span className="flex h-2 w-2 rounded-full bg-orange-400"></span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {qty !== undefined && (
                              <p className="text-[#636b2f] text-[10px] font-black uppercase tracking-widest">
                                {qty % 1 === 0 ? qty : qty.toFixed(1)} {pluralizeUnit(item.unit, qty)}
                              </p>
                            )}
                            {expiryInfo.label && (
                              <>
                                <span className="text-white/10 text-[10px]">•</span>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${expiryInfo.color}`}>
                                  {expiryInfo.label}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                           {activeTab === 'Out' ? (
                             <button 
                                onClick={() => onAddToList?.(item)}
                                className="h-10 px-4 bg-[#636b2f] text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all shadow-lg"
                             >
                               Add to List
                             </button>
                           ) : (
                             <div className="flex items-center bg-[#1c1d15] rounded-xl p-1 border border-white/5">
                                <button onClick={() => updateQuantity(item.name, -1)} className="size-8 flex items-center justify-center text-[#636b2f] active:scale-90"><span className="material-symbols-outlined text-xl font-bold">remove</span></button>
                                <span className="px-3 font-black text-white min-w-[32px] text-center text-sm">{qty % 1 === 0 ? qty : qty.toFixed(1)}</span>
                                <button onClick={() => updateQuantity(item.name, 1)} className="size-8 flex items-center justify-center text-[#636b2f] active:scale-90"><span className="material-symbols-outlined text-xl font-bold">add</span></button>
                              </div>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center opacity-30">
            <span className="material-symbols-outlined text-7xl mb-6">inventory_2</span>
            <p className="font-bold text-xl mb-2">
              {activeTab === 'In Stock' ? 'No items in stock' : activeTab === 'Low Stock' ? 'Stock levels healthy' : 'Nothing out of stock'}
            </p>
            <p className="text-sm font-medium leading-relaxed max-w-[240px]">Sync with Google Sheets or add items manually to track your stock levels.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Pantry;
