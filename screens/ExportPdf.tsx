
import React, { useState } from 'react';
import { Recipe } from '../types';

interface ExportPdfProps {
  recipe: Recipe;
  onBack: () => void;
  servings?: number;
  onGenerate: (options: any, pageSize: 'Standard' | 'Recipe Card') => void;
}

const ExportPdf: React.FC<ExportPdfProps> = ({ recipe, onBack, servings = 4, onGenerate }) => {
  const [options, setOptions] = useState({
    fullImage: true,
    chefTips: true,
    shortDescription: true,
    cookTimes: true,
    printScaled: true,
  });
  const [pageSize, setPageSize] = useState<'Standard' | 'Recipe Card'>('Standard');

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = () => {
    onGenerate(options, pageSize);
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[#1d1d15] text-white flex flex-col font-display overflow-hidden no-print">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center bg-[#1d1d15] p-4 pb-2 justify-between border-b border-white/5">
        <button 
          onClick={onBack}
          className="text-white flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-white/5 rounded-full active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Export to PDF</h2>
      </header>

      <main className="flex-1 overflow-y-auto pb-40 no-scrollbar">
        {/* Layout Preview Section */}
        <section className="mt-4">
          <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] px-5 pb-3 pt-2">Layout Preview</h3>
          <div className="px-4">
            {/* The "Ink-Friendly" White Card Preview */}
            <div className="bg-white rounded-[1.5rem] p-6 shadow-2xl transform scale-[0.98] origin-top text-[#1d1d15] border border-white/10 transition-all duration-300">
              <div className="flex justify-between items-start gap-4 mb-5">
                <div className="flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#636b2f] mb-1.5">{recipe.category || 'Family Favorites'}</p>
                  <h1 className="text-2xl font-black leading-tight mb-2 tracking-tight">{recipe.title}</h1>
                  {options.shortDescription && (
                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                      {recipe.description || 'A light and healthy dinner prepared with fresh ingredients and expert care.'}
                    </p>
                  )}
                </div>
                {options.fullImage && (
                  <div 
                    className="w-20 h-20 bg-gray-100 rounded-xl bg-cover bg-center shrink-0 shadow-inner border border-gray-100" 
                    style={{ backgroundImage: `url('${recipe.imageUrl}')` }}
                  ></div>
                )}
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 border-y border-gray-100 py-3.5 mb-5">
                {options.cookTimes && (
                  <>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Prep Time</p>
                      <p className="text-xs font-bold">{recipe.prepTime} Min</p>
                    </div>
                    <div className="border-l border-gray-100 pl-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Cook Time</p>
                      <p className="text-xs font-bold">{recipe.cookTime} Min</p>
                    </div>
                  </>
                )}
                <div className={`${options.cookTimes ? 'border-l border-gray-100 pl-3' : ''}`}>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Servings</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold">{options.printScaled ? servings : recipe.baseServings}</p>
                    <span className="material-symbols-outlined text-[14px] text-[#636b2f] fill-1">scale</span>
                  </div>
                </div>
              </div>
              
              {/* Chef's Tip Box */}
              {options.chefTips && (
                <div className="bg-[#f3f4ed] rounded-xl p-4 mb-5 border-l-[5px] border-[#636b2f] shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#636b2f] mb-1.5">Chef's Tip</p>
                  <p className="text-[11px] italic text-gray-700 leading-relaxed font-medium">
                    {recipe.chefTip || 'Pat the protein completely dry before seasoning to ensure a perfectly crisp texture when searing.'}
                  </p>
                </div>
              )}

              {/* Instruction Placeholders */}
              <div className="space-y-2.5 opacity-30 mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full w-full"></div>
                <div className="h-1.5 bg-gray-200 rounded-full w-[92%]"></div>
                <div className="h-1.5 bg-gray-200 rounded-full w-[85%]"></div>
                <div className="h-1.5 bg-gray-200 rounded-full w-[60%]"></div>
              </div>
              
              <p className="mt-6 text-[9px] text-center text-gray-300 font-black uppercase tracking-[0.3em]">{pageSize === 'Standard' ? 'A4 PRINT DIMENSIONS' : '4x6 INDEX CARD DIMENSIONS'}</p>
            </div>
          </div>
        </section>

        {/* Settings Section */}
        <section className="mt-8 px-4">
          <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] pb-3 px-1">Include in PDF</h3>
          <div className="bg-[#2c2c21] rounded-2xl overflow-hidden divide-y divide-white/5 border border-white/10 shadow-lg">
            {[
              { id: 'fullImage', label: 'Full Image' },
              { id: 'chefTips', label: 'Chef\'s Tips' },
              { id: 'shortDescription', label: 'Short Description' },
              { id: 'cookTimes', label: 'Cook Times' },
              { id: 'printScaled', label: 'Print Scaled' }
            ].map(opt => (
              <label key={opt.id} className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
                <span className="text-white text-base font-bold tracking-tight">{opt.label}</span>
                <div className="relative inline-block w-11 h-6 align-middle select-none transition duration-200 ease-in">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={options[opt.id as keyof typeof options]}
                    onChange={() => toggleOption(opt.id as keyof typeof options)}
                  />
                  <div className={`block h-6 rounded-full transition-colors ${options[opt.id as keyof typeof options] ? 'bg-[#636b2f]' : 'bg-gray-700'} after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:rounded-full after:h-[19px] after:w-[19px] after:transition-all ${options[opt.id as keyof typeof options] ? 'after:translate-x-5' : ''}`}></div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Page Size Section */}
        <section className="mt-8 px-4">
          <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] pb-3 px-1">Card Size</h3>
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-[#2c2c21] rounded-[1.25rem] border border-white/10 shadow-lg">
            <button 
              onClick={() => setPageSize('Standard')}
              className={`py-3 px-4 rounded-xl shadow-sm transition-all text-xs font-black uppercase tracking-widest ${pageSize === 'Standard' ? 'bg-[#636b2f] text-white' : 'text-[#babaa1] hover:text-white'}`}
            >
              Standard (8.5x11)
            </button>
            <button 
              onClick={() => setPageSize('Recipe Card')}
              className={`py-3 px-4 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${pageSize === 'Recipe Card' ? 'bg-[#636b2f] text-white shadow-sm' : 'text-[#babaa1] hover:text-white'}`}
            >
              Recipe Card (4x6)
            </button>
          </div>
        </section>
      </main>

      {/* Footer Area */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#1d1d15] via-[#1d1d15]/95 to-transparent pt-12 z-30 max-w-[480px] mx-auto">
        <button 
          onClick={handleGenerate}
          className="w-full bg-[#636b2f] hover:brightness-110 text-white font-black py-4 rounded-2xl shadow-[0_8px_30px_rgba(99,107,47,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
        >
          <span className="material-symbols-outlined font-bold">picture_as_pdf</span>
          Generate PDF
        </button>
        <p className="text-center text-[9px] text-[#babaa1] mt-4 uppercase tracking-[0.2em] font-black opacity-60">V 2.4.0 • SYSTEM READY</p>
      </footer>
    </div>
  );
};

export default ExportPdf;
