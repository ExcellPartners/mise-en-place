
import React, { useState } from 'react';
import { StoreLocation, StoreMapping } from '../types';

interface StoreManagementProps {
  onBack: () => void;
  onStoreSelect: (store: StoreLocation) => void;
  selectedStore: StoreLocation;
  onSetDefault: (store: StoreLocation) => void;
  onOpenMap: (store: StoreLocation) => void;
  mappings: StoreMapping[];
}

const START_ZONES = ['Produce', 'Meat & Seafood', 'Bakery', 'Dairy', 'Deli', 'Frozen'];

const StoreManagement: React.FC<StoreManagementProps> = ({ 
  onBack, 
  onStoreSelect, 
  selectedStore, 
  onSetDefault,
  mappings
}) => {
  const [startZones, setStartZones] = useState<Record<StoreLocation, string>>(() => {
    const saved = localStorage.getItem('mise_start_zones');
    return saved ? JSON.parse(saved) : { Monroe: 'Produce', East: 'Produce', Perinton: 'Produce' };
  });
  const [expandedStore, setExpandedStore] = useState<StoreLocation | null>(null);

  const setStartZone = (store: StoreLocation, zone: string) => {
    const updated = { ...startZones, [store]: zone };
    setStartZones(updated);
    localStorage.setItem('mise_start_zones', JSON.stringify(updated));
  };
  
  const getStoreStats = (storeId: StoreLocation) => {
    const totalMapped = mappings.filter(m => m.aisle[storeId] && m.aisle[storeId].trim() !== '').length;
    const totalIngredients = mappings.length || 1; // Avoid divide by zero
    const percentage = Math.round((totalMapped / totalIngredients) * 100);
    
    // Status Logic
    const status = percentage > 50 ? 'Optimized' : 'Partial';
    
    return { count: totalMapped, percentage, status };
  };

  const stores: { id: StoreLocation; label: string; icon: string }[] = [
    { id: 'Monroe', label: 'Monroe Avenue', icon: 'storefront' },
    { id: 'East', label: 'East Avenue', icon: 'local_mall' },
    { id: 'Perinton', label: 'Perinton', icon: 'shopping_basket' },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#1c1d15] text-white font-display max-w-[480px] mx-auto border-x border-white/5 overflow-hidden">
      {/* Header - Removed Add Button */}
      <header className="sticky top-0 z-20 bg-[#1c1d15]/80 backdrop-blur-md px-4 pt-6 pb-4 flex items-center justify-between border-b border-white/5 header-safe-pt">
        <button 
          onClick={onBack}
          className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios_new</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-center flex-1">My Stores</h1>
        <div className="size-10"></div> {/* Spacer to maintain centering */}
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-40 no-scrollbar">
        <p className="text-slate-400 text-sm mb-6 px-1">Manage your store layouts to optimize your shopping route.</p>
        
        <div className="space-y-4">
          {stores.map((store) => {
            const stats = getStoreStats(store.id);
            return (
              <div 
                key={store.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4 transition-all"
              >
                {/* Store Main Info */}
                <div 
                  onClick={() => onStoreSelect(store.id)}
                  className="flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border border-white/5 ${
                      stats.status === 'Optimized' ? 'bg-primary/20 text-primary' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <span className="material-symbols-outlined text-3xl">{store.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold leading-tight">{store.label}</h2>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full ${stats.status === 'Optimized' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <p className={`text-sm font-medium ${stats.status === 'Optimized' ? 'text-emerald-500/90' : 'text-amber-500'}`}>
                          {stats.status} · {stats.count}/{mappings.length} aisles mapped
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Start Zone */}
                <div className="border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-white/40 uppercase tracking-widest">Start Zone</span>
                    <button
                      onClick={() => setExpandedStore(expandedStore === store.id ? null : store.id)}
                      className="text-[#636b2f] text-xs font-black uppercase tracking-widest flex items-center gap-1"
                    >
                      {startZones[store.id]}
                      <span className="material-symbols-outlined text-base">{expandedStore === store.id ? 'expand_less' : 'edit'}</span>
                    </button>
                  </div>
                  {expandedStore === store.id && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {START_ZONES.map(zone => (
                        <button
                          key={zone}
                          onClick={() => { setStartZone(store.id, zone); setExpandedStore(null); }}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                            startZones[store.id] === zone
                              ? 'bg-[#636b2f] text-white'
                              : 'bg-white/5 text-white/50 border border-white/10'
                          }`}
                        >
                          {zone}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Set as Default Toggle */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Set as Default</span>
                  <button 
                    onClick={() => onSetDefault(store.id)}
                    aria-pressed={selectedStore === store.id}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      selectedStore === store.id ? 'bg-primary' : 'bg-white/10'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      selectedStore === store.id ? 'translate-x-5' : 'translate-x-0'
                    }`}></span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/20 flex gap-3">
          <span className="material-symbols-outlined text-primary text-xl shrink-0">info</span>
          <p className="text-xs leading-relaxed text-slate-300">
            Set a <span className="text-white font-bold">Start Zone</span> for each store so your shopping list sorts from where you actually enter. Indoor positioning isn't possible via GPS, but this gives you the same benefit manually.
          </p>
        </div>
      </main>
    </div>
  );
};

export default StoreManagement;
