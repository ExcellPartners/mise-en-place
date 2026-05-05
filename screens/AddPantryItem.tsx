
import React, { useState } from 'react';

interface AddPantryItemProps {
  onBack: () => void;
  onSave: (data: any) => void;
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

const AddPantryItem: React.FC<AddPantryItemProps> = ({ onBack, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Baking');
  const [defaultUnit, setDefaultUnit] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('0');
  
  const [monroeAisle, setMonroeAisle] = useState('');
  const [perintonAisle, setPerintonAisle] = useState('');
  const [eastAisle, setEastAisle] = useState('');

  const [purchaseQty, setPurchaseQty] = useState('1');
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [multiplier, setMultiplier] = useState('');

  const handleSave = () => {
    if (!name || !defaultUnit || !purchaseUnit || !multiplier) {
      alert('Please fill in all core ledger fields (Name, Units, Multiplier)');
      return;
    }

    onSave({
      name,
      category,
      defaultUnit,
      currentQuantity: parseFloat(currentQuantity) || 0,
      monroeAisle,
      perintonAisle,
      eastAisle,
      purchaseQty: parseFloat(purchaseQty) || 1,
      purchaseUnit,
      multiplier: parseFloat(multiplier) || 1
    });
  };

  return (
    <div className="w-full min-h-screen flex flex-col relative bg-[#1c1d15] text-gray-100 overflow-x-hidden font-display">
      <header className="sticky top-0 z-20 bg-[#1c1d15] border-b border-white/10">
        <div className="flex items-center p-4 justify-between">
          <button 
            onClick={onBack}
            className="flex items-center justify-center h-10 w-10 text-[#b6baa1] active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center">Add New Item</h2>
          <div className="w-10"></div> 
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-32 no-scrollbar">
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-[#25261d] rounded-2xl border border-white/5 p-4 shadow-sm">
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Ingredient Name</label>
              <input 
                className="w-full bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600" 
                placeholder="e.g. All-purpose Flour" 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Category</label>
                <div className="relative">
                  <select 
                    className="w-full bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer pr-10"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-[#1c1d15]">{cat}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-primary">
                    <span className="material-symbols-outlined text-xl">expand_more</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Default Unit</label>
                <input 
                  className="w-full bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600" 
                  placeholder="e.g. cups" 
                  type="text"
                  value={defaultUnit}
                  onChange={(e) => setDefaultUnit(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Current Pantry Quantity</label>
              <input 
                className="w-full bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600" 
                placeholder="0" 
                type="number"
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(e.target.value)}
              />
            </div>
          </div>

          {/* Store Mapping Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 ml-1">
              <span className="material-symbols-outlined text-lg">storefront</span>
              Store Aisle Mapping
            </h3>
            <div className="bg-[#25261d] rounded-2xl border border-white/5 p-4 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Monroe Avenue</label>
                <input 
                  className="w-full bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600" 
                  placeholder="Aisle number or section" 
                  type="text"
                  value={monroeAisle}
                  onChange={(e) => setMonroeAisle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Perinton</label>
                <input 
                  className="w-full bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600" 
                  placeholder="Aisle number or section" 
                  type="text"
                  value={perintonAisle}
                  onChange={(e) => setPerintonAisle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">East Avenue</label>
                <input 
                  className="w-full bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600" 
                  placeholder="Aisle number or section" 
                  type="text"
                  value={eastAisle}
                  onChange={(e) => setEastAisle(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Purchase Logic Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 ml-1">
              <span className="material-symbols-outlined text-lg">calculate</span>
              Purchase Logic
            </h3>
            <div className="bg-[#25261d] rounded-2xl border border-white/5 p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Purchase Qty</label>
                  <input 
                    className="w-full bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                    type="number" 
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Purchase Unit</label>
                  <input 
                    className="w-full bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600" 
                    placeholder="e.g. Bag" 
                    type="text"
                    value={purchaseUnit}
                    onChange={(e) => setPurchaseUnit(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Multiplier (to default units)</label>
                <div className="flex items-center gap-3">
                  <input 
                    className="flex-1 bg-[#2a2b1f] border border-white/10 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600" 
                    placeholder="e.g. 5" 
                    type="number"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                  />
                  <div className="text-gray-500">
                    <span className="material-symbols-outlined">close</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 italic px-1">Example: 1 Bag = 5 Cups. Multiplier is 5.</p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#b6baa1] mb-1.5 ml-1">Buy As Summary</label>
                <div className="bg-primary/10 rounded-xl p-3 border border-primary/20">
                  <p className="text-sm font-semibold text-primary">
                    {purchaseQty || '1'} {purchaseUnit || 'Unit'} (yields {(parseFloat(multiplier) || 0) * (parseFloat(purchaseQty) || 1)} {defaultUnit || 'units'})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="p-4 bg-gradient-to-t from-[#1c1d15] via-[#1c1d15]/95 to-transparent pb-8 sticky bottom-0 z-30">
        <button 
          onClick={handleSave}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">save</span>
          Save Pantry Item
        </button>
      </div>
    </div>
  );
};

export default AddPantryItem;
