
import React, { useState } from 'react';

interface PreferencesProps {
  onBack: () => void;
  onManageStores: () => void;
}

const Preferences: React.FC<PreferencesProps> = ({ onBack, onManageStores }) => {
  const [dietary, setDietary] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: true,
    dairyFree: false,
  });

  const [units, setUnits] = useState<'Metric' | 'Imperial'>('Metric');
  const [pantrySettings, setPantrySettings] = useState({
    autoHide: true,
    expiryNotifs: true,
  });

  const toggleDietary = (key: keyof typeof dietary) => {
    setDietary(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePantry = (key: keyof typeof pantrySettings) => {
    setPantrySettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#1c1d15] text-white font-display w-full overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#1c1d15]/80 backdrop-blur-xl px-4 pt-6 pb-4 flex items-center border-b border-white/5">
        <button 
          onClick={onBack}
          className="flex items-center justify-center p-2 -ml-2 text-primary hover:opacity-70 transition-opacity active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold tracking-tight pr-6">Preferences</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 no-scrollbar">
        {/* Dietary Preferences */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="material-symbols-outlined text-primary text-xl">restaurant</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dietary Preferences</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {[
              { key: 'vegetarian', label: 'Vegetarian' },
              { key: 'vegan', label: 'Vegan' },
              { key: 'glutenFree', label: 'Gluten-Free' },
              { key: 'dairyFree', label: 'Dairy-Free' }
            ].map(item => (
              <div key={item.key} className="p-4 flex items-center justify-between">
                <span className="font-bold text-sm">{item.label}</span>
                <button 
                  onClick={() => toggleDietary(item.key as keyof typeof dietary)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    dietary[item.key as keyof typeof dietary] ? 'bg-primary' : 'bg-white/10'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    dietary[item.key as keyof typeof dietary] ? 'translate-x-5' : 'translate-x-0'
                  }`}></span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Measurement Units */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="material-symbols-outlined text-primary text-xl">straighten</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Measurement Units</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex">
            <button 
              onClick={() => setUnits('Metric')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                units === 'Metric' ? 'bg-primary text-white shadow-lg' : 'text-slate-500'
              }`}
            >
              Metric
            </button>
            <button 
              onClick={() => setUnits('Imperial')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                units === 'Imperial' ? 'bg-primary text-white shadow-lg' : 'text-slate-500'
              }`}
            >
              Imperial
            </button>
          </div>
        </section>

        {/* Pantry Settings */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="material-symbols-outlined text-primary text-xl">inventory_2</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pantry Settings</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Auto-hide stocked items</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Hide items you already have in stock</p>
              </div>
              <button 
                onClick={() => togglePantry('autoHide')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  pantrySettings.autoHide ? 'bg-primary' : 'bg-white/10'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  pantrySettings.autoHide ? 'translate-x-5' : 'translate-x-0'
                }`}></span>
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Expiry Notifications</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Alert me when items are near expiry</p>
              </div>
              <button 
                onClick={() => togglePantry('expiryNotifs')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  pantrySettings.expiryNotifs ? 'bg-primary' : 'bg-white/10'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  pantrySettings.expiryNotifs ? 'translate-x-5' : 'translate-x-0'
                }`}></span>
              </button>
            </div>
          </div>
        </section>

        {/* Manage Stores Link */}
        <section className="mb-8">
          <button 
            onClick={onManageStores}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between active:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">storefront</span>
              <span className="font-bold text-sm">Manage Stores</span>
            </div>
            <span className="material-symbols-outlined text-slate-600 group-hover:translate-x-1 transition-transform">chevron_right</span>
          </button>
        </section>
      </main>
    </div>
  );
};

export default Preferences;
