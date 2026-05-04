
import React, { useState, useMemo } from 'react';
import { MasterIngredient, StoreMapping } from '../types';

interface AddIngredientProps {
  masters: MasterIngredient[];
  mappings: StoreMapping[];
  onBack: () => void;
  onAdd: (ingredient: MasterIngredient) => void;
  onAddNewManual: () => void;
  mode?: 'shopping' | 'pantry';
}

const AddIngredient: React.FC<AddIngredientProps> = ({ masters, mappings, onBack, onAdd, onAddNewManual, mode = 'shopping' }) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showToast, setShowToast] = useState(false);

  const categories = useMemo(() => ['All', ...Array.from(new Set(masters.map(m => m.category || 'Other'))).sort()], [masters]);

  const filtered = useMemo(() => {
    return masters.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchesCat = filterCategory === 'All' || m.category === filterCategory;
      return matchesSearch && matchesCat;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [masters, search, filterCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, MasterIngredient[]> = {};
    filtered.forEach(m => {
      const cat = m.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [filtered]);

  const handleAddItem = (item: MasterIngredient) => {
    onAdd(item);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="bg-[#1c1d15] text-white min-h-screen flex flex-col max-w-[480px] mx-auto border-x border-white/5 font-sans relative">
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-[#1a1d14]/95 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#636b2f] text-xl fill-1">check_circle</span>
          <p className="text-white font-bold text-sm tracking-wide">
            {mode === 'pantry' ? 'Added to Pantry!' : 'Added to Shopping List!'}
          </p>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-[#1c1d15]/95 backdrop-blur-md border-b border-white/5 header-safe-pt">
        <div className="flex items-center px-4 py-4 justify-between">
          <button onClick={onBack} className="text-[#636b2f] flex size-10 items-center justify-center active:scale-90">
            <span className="material-symbols-outlined font-bold">arrow_back_ios</span>
          </button>
          <h2 className="text-white text-lg font-bold">Add Ingredient</h2>
          <button onClick={onAddNewManual} className="text-[#636b2f] flex size-10 items-center justify-center active:scale-90">
            <span className="material-symbols-outlined font-bold">add</span>
          </button>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">search</span>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#636b2f] focus:outline-none" 
              placeholder="Search master ledger..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  filterCategory === cat ? 'bg-[#636b2f] text-white' : 'bg-white/5 text-gray-400 border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-32 no-scrollbar">
        {(Object.entries(grouped) as [string, MasterIngredient[]][]).map(([category, items]) => (
          <div key={category} className="mb-8">
            <h3 className="text-[#636b2f] text-sm font-black uppercase tracking-[0.3em] px-2 mb-4">{category}</h3>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.name} className="bg-[#2a2c21] p-5 rounded-2xl flex items-center justify-between border border-white/5 shadow-sm">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-white font-black text-base truncate">{item.name}</p>
                    <p className="text-[#b6baa1] text-[10px] font-bold uppercase mt-1 tracking-wider">
                      {mode === 'pantry' 
                        ? `Unit: ${item.recipeUnit}` 
                        : `BUY AS: 1 ${item.details || item.purchaseUnit}`}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleAddItem(item)}
                    className="size-11 rounded-xl bg-[#636b2f] text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-[#636b2f]/20"
                  >
                    <span className="material-symbols-outlined font-black">
                      {mode === 'pantry' ? 'check' : 'add'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default AddIngredient;
