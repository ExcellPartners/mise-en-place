
import React from 'react';
import { StoreLocation, StoreMapping } from '../types';

interface StoreManagementProps {
  onBack: () => void;
  onStoreSelect: (store: StoreLocation) => void;
  selectedStore: StoreLocation;
  onSetDefault: (store: StoreLocation) => void;
  onOpenMap: (store: StoreLocation) => void;
  mappings: StoreMapping[];
}

const StoreManagement: React.FC<StoreManagementProps> = ({ 
  onBack, 
  onStoreSelect, 
  selectedStore, 
  onSetDefault,
  onOpenMap,
  mappings
}) => {
  
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
    <div className="flex flex-col h-screen bg-[#1c1d15] text-white font-display w-full overflow-hidden">
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
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4 group transition-all relative"
              >
                {/* Map Shortcut */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMap(store.id);
                  }}
                  className="absolute top-4 right-4 text-primary p-2 hover:bg-primary/10 rounded-full transition-colors z-10 active:scale-90"
                >
                  <span className="material-symbols-outlined">map</span>
                </button>

                {/* Store Main Info */}
                <div 
                  onClick={() => onStoreSelect(store.id)}
                  className="flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform pr-8"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border border-white/5 ${
                      stats.status === 'Optimized' ? 'bg-primary/20 text-primary' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <span className="material-symbols-outlined text-3xl">{store.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold whitespace-normal leading-tight">{store.label}</h2>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full ${stats.status === 'Optimized' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <p className={`text-sm font-medium ${stats.status === 'Optimized' ? 'text-emerald-500/90' : 'text-amber-500'}`}>
                          {stats.status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-slate-500 font-medium whitespace-normal text-right leading-tight max-w-[60px]">{stats.count}/{mappings.length} Aisles</span>
                    <span className="material-symbols-outlined text-slate-600">chevron_right</span>
                  </div>
                </div>

                {/* Set as Default Toggle */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Set as Default</span>
                  <button 
                    onClick={() => onSetDefault(store.id)}
                    aria-pressed={selectedStore === store.id}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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

        {/* Info Banner */}
        <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/20 flex gap-3">
          <span className="material-symbols-outlined text-primary text-xl">info</span>
          <p className="text-xs leading-relaxed text-slate-300">
            Your default store will be pre-selected for new grocery lists. Optimized layouts can save you up to 15 minutes per trip.
          </p>
        </div>
      </main>
    </div>
  );
};

export default StoreManagement;
