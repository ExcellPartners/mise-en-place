
import React, { useState } from 'react';
import { EssentialItem } from '../types';

interface EssentialsProps {
  items: EssentialItem[];
  onBack: () => void;
  onAdd: (name: string) => void;
  onViewShopping: () => void;
  onAddNew: () => void;
}

const Essentials: React.FC<EssentialsProps> = ({ items, onBack, onAdd, onViewShopping, onAddNew }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           item.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const categories = Array.from(new Set(filteredItems.map(item => item.category)));

  return (
    <div className="bg-[#1c1d15] text-white min-h-screen pb-24 max-w-[480px] mx-auto overflow-x-hidden relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1c1d15]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center p-4 pb-2 justify-between">
          <button onClick={onBack} className="text-white flex size-12 shrink-0 items-center justify-start active:scale-90 transition-transform">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center font-display">My Items</h2>
          <div className="flex w-12 items-center justify-end">
            <button 
              onClick={onAddNew}
              className="flex size-10 items-center justify-center rounded-full bg-[#636b2f] text-white active:scale-90 transition-transform shadow-md"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="flex w-full h-11 items-stretch rounded-xl bg-[#3b3e2e]/50 border border-transparent focus-within:border-[#636b2f]/50 transition-all">
            <div className="text-[#b6baa1] flex items-center justify-center pl-4">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input 
              className="flex w-full min-w-0 flex-1 border-none bg-transparent focus:outline-0 focus:ring-0 placeholder:text-[#b6baa1] px-3 text-base font-normal text-white" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main List */}
      <main className="max-w-xl mx-auto">
        {categories.map(category => (
          <section key={category} className="mb-2">
            <h3 className="text-white text-sm font-bold uppercase tracking-widest px-4 pb-2 pt-8 opacity-60">
              {category}
            </h3>
            <div className="flex flex-col">
              {filteredItems.filter(item => item.category === category).map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-4 px-4 min-h-[72px] py-3 justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col justify-center">
                      <p className="text-white text-base font-semibold leading-snug line-clamp-1">{item.name}</p>
                      <p className="text-[#b6baa1] text-xs font-bold uppercase tracking-wider">{item.category}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <button 
                      onClick={() => onAdd(item.name)}
                      className="flex size-10 items-center justify-center rounded-full bg-[#636b2f] text-white shadow-md active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center opacity-40">
            <span className="material-symbols-outlined text-6xl mb-4">inventory</span>
            <p className="font-bold">No library items found. Try a different search.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Essentials;
