
import React, { useState } from 'react';

interface AddEssentialProps {
  onCancel: () => void;
  onSave: (name: string, category: string, storeLocations: any, purchaseUnit: any) => void;
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

const AddEssential: React.FC<AddEssentialProps> = ({ onCancel, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Snacks');
  
  const [monroeAisle, setMonroeAisle] = useState('');
  const [eastAisle, setEastAisle] = useState('');
  const [perintonAisle, setPerintonAisle] = useState('');

  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('Bag');
  const [size, setSize] = useState('12');
  const [metric, setMetric] = useState('oz');

  const handleSave = () => {
    if (!name) {
      alert('Please enter an item name');
      return;
    }
    // Matching the expected structure of the onSave handler while maintaining simplicity
    onSave(
      name, 
      category, 
      { 
        monroeAisle, monroeShelf: '', 
        eastAisle, eastShelf: '', 
        perintonAisle, perintonShelf: '' 
      },
      { qty, unit, size, metric }
    );
  };

  return (
    <div className="bg-[#1c1d15] text-white min-h-screen pb-32 max-w-[480px] mx-auto overflow-x-hidden relative">
      <header className="sticky top-0 z-50 bg-[#1c1d15]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center p-4 justify-between">
          <button onClick={onCancel} className="flex items-center text-[#636b2f] active:scale-95 transition-transform">
            <span className="material-symbols-outlined">arrow_back_ios</span>
            <span className="font-medium">Cancel</span>
          </button>
          <h1 className="text-white text-lg font-bold font-display">Add New Essential</h1>
          <button onClick={handleSave} className="font-bold text-[#636b2f] active:opacity-60 transition-opacity">Save</button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Item Details */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Item Details</h2>
          <div className="bg-[#2a2b21] rounded-xl overflow-hidden border border-white/5">
            <div className="flex items-center px-4 py-3 border-b border-white/5">
              <label className="text-slate-400 text-sm font-medium w-28 shrink-0">Item Name</label>
              <input 
                className="bg-transparent border-none text-white text-base w-full p-0 focus:ring-0 placeholder:text-gray-600" 
                placeholder="e.g. Tortilla Chips" 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex items-center px-4 py-3 relative">
              <label className="text-slate-400 text-sm font-medium w-28 shrink-0">Category</label>
              <div className="relative flex-1">
                <select 
                  className="bg-transparent border-none text-white text-base w-full p-0 focus:ring-0 appearance-none cursor-pointer pr-8"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-[#1c1d15]">{cat}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-xl">expand_more</span>
              </div>
            </div>
          </div>
        </section>

        {/* Store Locations */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 px-1">
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
        </section>

        {/* Purchase Unit */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Purchase Unit</h2>
          <div className="bg-[#2a2b21] rounded-xl p-6 border border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 flex flex-col items-center">
                <input className="bg-transparent border-none text-white text-xl font-bold w-full p-0 text-center border-b border-white/20 pb-1 focus:ring-0" type="text" value={qty} onChange={(e) => setQty(e.target.value)} />
                <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest">Qty</p>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <input className="bg-transparent border-none text-white text-xl font-bold w-full p-0 text-center border-b border-white/20 pb-1 focus:ring-0" placeholder="Bag" type="text" value={unit} onChange={(e) => setUnit(e.target.value)} />
                <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest">Unit</p>
              </div>
              <div className="text-[#636b2f] font-black text-xl">=</div>
              <div className="flex-1 flex flex-col items-center">
                <input className="bg-transparent border-none text-white text-xl font-bold w-full p-0 text-center border-b border-white/20 pb-1 focus:ring-0" type="text" value={size} onChange={(e) => setSize(e.target.value)} />
                <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest">Size</p>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <input className="bg-transparent border-none text-white text-xl font-bold w-full p-0 text-center border-b border-white/20 pb-1 focus:ring-0" placeholder="oz" type="text" value={metric} onChange={(e) => setMetric(e.target.value)} />
                <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest">Metric</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-6 text-center italic opacity-60">Example: 1 Bag = 12 oz</p>
          </div>
        </section>
      </main>

      {/* Floating Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-10 bg-[#1c1d15]/95 backdrop-blur-lg border-t border-white/5 max-w-[480px] mx-auto z-40">
        <button 
          onClick={handleSave}
          className="w-full bg-[#636b2f] text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all"
        >
          Save Item
        </button>
      </div>
    </div>
  );
};

export default AddEssential;
