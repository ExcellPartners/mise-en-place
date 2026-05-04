
import React, { useState } from 'react';

interface AddNewMyItemEntryProps {
  onBack: () => void;
  onSave: (data: any) => void;
}

const CATEGORIES = ["Household", "Snacks", "Pets", "Beverages", "Produce", "Dairy", "Meat", "Baking", "Other"];

const AddNewMyItemEntry: React.FC<AddNewMyItemEntryProps> = ({ onBack, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Other');
  const [packages, setPackages] = useState('1');
  const [buyAs, setBuyAs] = useState('');
  const [monroe, setMonroe] = useState('');
  const [perinton, setPerinton] = useState('');
  const [east, setEast] = useState('');

  const handleSave = () => {
    if (!name || !buyAs) {
      alert('Name and Buy As unit are required.');
      return;
    }
    onSave({
      name, category, packages: parseFloat(packages) || 1, buyAs, monroe, perinton, east
    });
  };

  return (
    <div className="bg-[#1c1d15] text-white min-h-screen flex flex-col max-w-[480px] mx-auto border-x border-white/5 font-sans overflow-y-auto no-scrollbar pb-32">
      <header className="sticky top-0 z-50 bg-[#1c1d15]/95 backdrop-blur-md border-b border-white/5 header-safe-pt">
        <div className="flex items-center px-4 py-4 justify-between">
          <button onClick={onBack} className="text-[#636b2f] flex size-10 items-center justify-center active:scale-90">
            <span className="material-symbols-outlined font-bold">arrow_back_ios</span>
          </button>
          <h2 className="text-white text-lg font-bold">New Catalog Entry</h2>
          <div className="size-10"></div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="space-y-4">
          <label className="block">
            <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Item Name</p>
            <input className="w-full bg-[#2a2c21] border border-white/10 rounded-xl h-14 px-4 font-bold" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dish Soap" />
          </label>

          <label className="block">
            <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Category</p>
            <select className="w-full bg-[#2a2c21] border border-white/10 rounded-xl h-14 px-4 font-bold appearance-none" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Package Multiplier</p>
              <input type="number" className="w-full bg-[#2a2c21] border border-white/10 rounded-xl h-14 px-4 font-bold" value={packages} onChange={(e) => setPackages(e.target.value)} />
            </label>
            <label className="block">
              <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Buy As</p>
              <input className="w-full bg-[#2a2c21] border border-white/10 rounded-xl h-14 px-4 font-bold" value={buyAs} onChange={(e) => setBuyAs(e.target.value)} placeholder="e.g. Bottle" />
            </label>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/5 pt-6">
          <h3 className="text-[#636b2f] text-xs font-black uppercase tracking-widest">Store Aisle Mappings</h3>
          <label className="block">
            <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Monroe Avenue</p>
            <input className="w-full bg-[#2a2c21] border border-white/10 rounded-xl h-12 px-4 text-sm" value={monroe} onChange={(e) => setMonroe(e.target.value)} placeholder="Aisle/Shelf" />
          </label>
          <label className="block">
            <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Perinton</p>
            <input className="w-full bg-[#2a2c21] border border-white/10 rounded-xl h-12 px-4 text-sm" value={perinton} onChange={(e) => setPerinton(e.target.value)} placeholder="Aisle/Shelf" />
          </label>
          <label className="block">
            <p className="text-[#b6baa1] text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">East Avenue</p>
            <input className="w-full bg-[#2a2c21] border border-white/10 rounded-xl h-12 px-4 text-sm" value={east} onChange={(e) => setEast(e.target.value)} placeholder="Aisle/Shelf" />
          </label>
        </div>

        <button onClick={handleSave} className="w-full bg-[#636b2f] h-16 rounded-2xl text-white font-black text-lg shadow-xl shadow-[#636b2f]/20 active:scale-95 transition-all">
          Commit to My Items
        </button>
      </main>
    </div>
  );
};

export default AddNewMyItemEntry;
