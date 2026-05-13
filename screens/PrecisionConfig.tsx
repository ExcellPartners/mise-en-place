
import React, { useState } from 'react';
import { MasterIngredient, PantryItem, StoreMapping, StoreLocation } from '../types';
import { updateStoreAisleInSheet } from '../services/googleSheets';
import { useAuth } from '../contexts/AuthContext';

interface PrecisionConfigProps {
  masters: MasterIngredient[];
  pantry: PantryItem[];
  mappings: StoreMapping[];
  selectedStore: StoreLocation;
  onStoreChange: (store: StoreLocation) => void;
  onUpdateMappings: (newMappings: StoreMapping[]) => void;
  onBack: () => void;
}

const CATEGORIES = [
  "Bakery & Bread",
  "Baking",
  "Beer & Ciders",
  "Condiments & Sauces",
  "Dairy & Eggs",
  "Frozen",
  "Household",
  "Meat & Seafood",
  "Pantry",
  "Pasta & Grains",
  "Prepared Foods",
  "Produce",
  "Snacks",
  "Spices",
  "Wines & Spirits",
  "Other"
];

const PrecisionConfig: React.FC<PrecisionConfigProps> = ({
  masters,
  pantry,
  mappings,
  selectedStore,
  onStoreChange,
  onUpdateMappings,
  onBack
}) => {
  const { spreadsheetId, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'Recipe' | 'MyItems'>('Recipe');
  const [searchQuery, setSearchQuery] = useState('');
  const [localMappings, setLocalMappings] = useState<StoreMapping[]>(mappings);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = (name: string, field: 'dept' | 'location', value: string) => {
    setLocalMappings(prev => {
      const existingIdx = prev.findIndex(m => m.ingredientName === name);
      if (existingIdx > -1) {
        const updated = [...prev];
        const item = { ...updated[existingIdx] };
        if (field === 'dept') {
          item.department = value;
        } else {
          const parts = value.trim().split(/\s+/);
          item.aisle = { ...item.aisle, [selectedStore]: parts[0] || '' };
          item.shelf = { ...item.shelf, [selectedStore]: parts[1] || '' };
        }
        updated[existingIdx] = item;
        return updated;
      } else {
        const newItem: StoreMapping = {
          ingredientName: name,
          department: field === 'dept' ? value : 'Other',
          aisle: { Monroe: '', East: '', Perinton: '', [selectedStore]: field === 'location' ? value.split(' ')[0] : '' },
          shelf: { Monroe: '', East: '', Perinton: '', [selectedStore]: field === 'location' ? value.split(' ')[1] : '' }
        };
        return [...prev, newItem];
      }
    });
  };

  const getMappingForItem = (name: string) => {
    return localMappings.find(m => m.ingredientName === name) || {
      department: 'Other',
      aisle: { Monroe: '', East: '', Perinton: '' },
      shelf: { Monroe: '', East: '', Perinton: '' }
    };
  };

  const itemsToDisplay = activeTab === 'Recipe' 
    ? masters.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : pantry.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getIcon = (item: any) => {
    if (item.icon) return item.icon;
    const mapping = getMappingForItem(item.name);
    switch (mapping.department.toLowerCase()) {
      case 'dairy & eggs': return 'egg_alt';
      case 'produce': return 'eco';
      case 'bakery & bread': return 'bakery_dining';
      case 'household': return 'cleaning_services';
      case 'snacks': return 'lunch_dining';
      default: return 'shopping_basket';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Logic: Update the spreadsheet for items that changed for this specific store
      // In a real app, you'd track a "dirty" state, but here we just update visible items for simplicity
      for (const item of itemsToDisplay) {
        const m = getMappingForItem(item.name);
        const aisleData = `${m.aisle[selectedStore] || ''} ${m.shelf[selectedStore] || ''}`.trim();
        if (spreadsheetId) {
          await updateStoreAisleInSheet(spreadsheetId, item.name, selectedStore, aisleData, accessToken);
        }
      }
      
      onUpdateMappings(localMappings);
      alert('Success: Aisle layouts updated and synced to your ledger.');
      onBack();
    } catch (err) {
      alert('Sync failed. Please check your cloud connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#1c1d15] text-white flex flex-col border-x border-slate-800">
      <div className="sticky top-0 z-20 bg-[#1c1d15]/95 backdrop-blur-md pb-2 header-safe-pt">
        <div className="flex items-center p-4 pb-2 justify-between">
          <button onClick={onBack} className="text-white flex size-12 shrink-0 items-center cursor-pointer active:scale-90">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 font-display">Configuration</h2>
        </div>

        <div className="px-4 py-2">
          <div className="flex p-1 bg-[#2a2c21] rounded-xl relative">
            <button 
              onClick={() => setActiveTab('Recipe')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'Recipe' ? 'bg-[#636b2f] text-white shadow-sm' : 'text-[#b6baa1]'}`}
            >
              Recipe Ingredients
            </button>
            <button 
              onClick={() => setActiveTab('MyItems')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'MyItems' ? 'bg-[#636b2f] text-white shadow-sm' : 'text-[#b6baa1]'}`}
            >
              My Items
            </button>
          </div>
        </div>

        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex flex-col">
            <p className="text-slate-400 text-[10px] font-bold pb-1 uppercase tracking-widest">Active Shopping Store</p>
            <select 
              value={selectedStore}
              onChange={(e) => onStoreChange(e.target.value as StoreLocation)}
              className="w-full rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[#636b2f] border border-[#555841] bg-[#2a2c21] h-12 px-4 text-base font-medium appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem' }}
            >
              <option value="Monroe">Monroe Avenue</option>
              <option value="East">East Avenue</option>
              <option value="Perinton">Perinton</option>
            </select>
          </div>
          <div className="relative flex items-center">
            <div className="absolute left-3 text-[#b6baa1]">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input 
              className="w-full rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[#636b2f] border-none bg-[#3b3e2e] h-11 placeholder:text-[#b6baa1] pl-10 pr-4 text-sm font-normal" 
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 px-4 pb-96">
        <div className="pt-4 pb-2 px-1">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Map {selectedStore} Layout</p>
        </div>

        <div className="space-y-1">
          {itemsToDisplay.map((item, idx) => {
            const m = getMappingForItem(item.name);
            return (
              <div key={idx} className="flex flex-col gap-3 border-b border-slate-800/50 py-4">
                <div className="flex items-center gap-3">
                  <div className="text-white flex items-center justify-center rounded-xl bg-[#3b3e2e] shrink-0 size-10">
                    <span className="material-symbols-outlined text-[#d9ddc4]">{getIcon(item)}</span>
                  </div>
                  <div className="flex flex-col justify-center overflow-hidden">
                    <p className="text-white text-sm font-bold leading-none truncate">{item.name}</p>
                    <p className="text-[#b6baa1] text-[10px] font-medium uppercase tracking-tight mt-1">
                      {activeTab === 'Recipe' ? 'Ingredient' : (item.category || 'Household')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <select 
                      value={m.department}
                      onChange={(e) => handleUpdate(item.name, 'dept', e.target.value)}
                      className="w-full rounded-lg bg-[#2a2c21] border-none text-[13px] font-medium text-white focus:ring-1 focus:ring-[#636b2f] py-2.5 pl-3 pr-8 appearance-none"
                    >
                      {CATEGORIES.map(d => <option key={d} value={d} className="bg-[#1c1d15]">{d}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-base">expand_more</span>
                  </div>
                  <input 
                    className="w-full rounded-lg bg-[#2a2c21] border-none text-[13px] font-medium text-white focus:ring-1 focus:ring-[#636b2f] py-2.5 px-3" 
                    placeholder="e.g. 04B L5" 
                    type="text" 
                    value={`${m.aisle[selectedStore] || ''} ${m.shelf[selectedStore] || ''}`.trim()}
                    onChange={(e) => handleUpdate(item.name, 'location', e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button - Adjusted position for nav bar clearance */}
      <div className="fixed bottom-24 left-0 right-0 w-full p-6 bg-gradient-to-t from-[#1c1d15] via-[#1c1d15]/95 to-transparent z-[60]">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full bg-[#636b2f] hover:bg-[#636b2f]/90 text-white font-bold py-5 rounded-2xl shadow-2xl shadow-[#636b2f]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isSaving ? 'opacity-50' : ''}`}
        >
          <span className={`material-symbols-outlined ${isSaving ? 'animate-spin' : ''}`}>
            {isSaving ? 'sync' : 'save_as'}
          </span>
          {isSaving ? 'Syncing Ledger...' : 'Apply Layout Updates'}
        </button>
      </div>
    </div>
  );
};

export default PrecisionConfig;
