
import React, { useState } from 'react';
import { Recipe } from '../types';
import { scaleIngredients } from '../utils/logic';

interface PrintPreviewProps {
  recipe: Recipe;
  servings: number;
  pageSize: 'Standard' | 'Recipe Card';
  options: any; 
  onClose: () => void;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({ recipe, servings, onClose }) => {
  // Default: Ingredients and Directions always true
  const [includePicture, setIncludePicture] = useState(true);
  const [includeChefTip, setIncludeChefTip] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true); // Prep/Cook/Diff
  const [isExporting, setIsExporting] = useState(false);

  const scaledIngredients = scaleIngredients(recipe, servings);

  const generateHtml = (mode: 'Letter' | 'Card') => {
    setIsExporting(true);
    
    // CSS Theme: Olive (#636b2f) Accent, Clean layout
    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
      body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
      h1 { font-size: 28pt; margin: 0 0 10px 0; color: #000; font-weight: 800; letter-spacing: -1px; }
      .category { font-size: 9pt; color: #636b2f; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; margin-bottom: 5px; }
      .meta-grid { display: flex; gap: 30px; margin-bottom: 30px; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 15px 0; }
      .meta-item strong { display: block; font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #888; }
      .meta-item span { font-size: 11pt; font-weight: 800; }
      
      h3 { font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; }
      
      ul { list-style: none; padding: 0; }
      li { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 10px; }
      .qty { font-weight: 800; color: #636b2f; min-width: 60px; }
      
      .step { margin-bottom: 15px; display: flex; gap: 15px; }
      .step-num { font-weight: 800; color: #fff; background: #636b2f; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10pt; flex-shrink: 0; }
      
      .tip-box { background: #f4f6e8; padding: 20px; border-radius: 12px; border-left: 4px solid #636b2f; margin-top: 30px; }
      .tip-title { font-size: 9pt; font-weight: 800; text-transform: uppercase; color: #636b2f; letter-spacing: 1px; margin-bottom: 5px; }
      .tip-text { font-style: italic; color: #444; font-size: 10pt; }
      
      .hero-img { width: 100%; height: 250px; object-fit: cover; border-radius: 12px; margin-bottom: 25px; }
      
      @page { margin: 0.5in; }
    `;

    const cardCss = `
      body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 20px; color: #1a1a1a; line-height: 1.3; width: 6in; height: 4in; box-sizing: border-box; overflow: hidden; }
      h1 { font-size: 16pt; margin: 0; }
      .category { font-size: 7pt; color: #636b2f; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; }
      .columns { display: flex; gap: 20px; height: 3.2in; }
      .col { flex: 1; overflow: hidden; }
      h3 { font-size: 9pt; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 10px 0 5px 0; text-transform: uppercase; font-weight: 800; }
      ul { padding: 0; margin: 0; list-style: none; font-size: 8pt; }
      li { margin-bottom: 4px; border-bottom: 1px solid #f5f5f5; padding-bottom: 2px; display: flex; gap: 5px; }
      .qty { font-weight: 800; color: #636b2f; min-width: 40px; }
      .step { margin-bottom: 6px; display: flex; gap: 8px; font-size: 8pt; }
      .step-num { font-weight: 800; color: #636b2f; min-width: 15px; }
      .mini-meta { display: flex; gap: 10px; font-size: 7pt; color: #666; margin-bottom: 5px; }
      .mini-meta strong { color: #000; }
    `;

    const content = `
      <html>
        <head>
          <title>${recipe.title}</title>
          <style>${mode === 'Card' ? cardCss : css}</style>
        </head>
        <body>
          <div class="category">${recipe.category}</div>
          <h1>${recipe.title}</h1>
          
          ${includeDetails ? `
            <div class="${mode === 'Card' ? 'mini-meta' : 'meta-grid'}">
              <div class="meta-item"><strong>Prep</strong> <span>${recipe.prepTime}m</span></div>
              <div class="meta-item"><strong>Cook</strong> <span>${recipe.cookTime}m</span></div>
              <div class="meta-item"><strong>Serves</strong> <span>${servings}</span></div>
              <div class="meta-item"><strong>Skill</strong> <span>${recipe.difficulty}</span></div>
            </div>
          ` : ''}

          ${mode === 'Letter' && includePicture ? `<img src="${recipe.imageUrl}" class="hero-img" />` : ''}

          ${mode === 'Card' ? '<div class="columns">' : ''}
          
          <div class="col">
            <h3>Ingredients</h3>
            <ul>
              ${scaledIngredients.map(ing => `<li><span class="qty">${ing.amount} ${ing.unit}</span> ${ing.name}</li>`).join('')}
            </ul>
          </div>

          <div class="col">
            <h3>Instructions</h3>
            ${recipe.instructions.map((step, i) => `
              <div class="step">
                <span class="step-num">${i + 1}</span>
                <span>${step}</span>
              </div>
            `).join('')}
          </div>
          
          ${mode === 'Card' ? '</div>' : ''}

          ${mode === 'Letter' && includeChefTip && recipe.chefTip ? `
            <div class="tip-box">
              <div class="tip-title">Chef's Tip</div>
              <div class="tip-text">"${recipe.chefTip}"</div>
            </div>
          ` : ''}
        </body>
      </html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipe.title.replace(/\s+/g, '_')}_${mode}.html`;
    link.click();
    
    setTimeout(() => {
      setIsExporting(false);
      onClose(); 
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#1c1d15] text-white flex flex-col font-sans max-w-[480px] mx-auto overflow-hidden">
      <header className="flex items-center px-4 py-4 justify-between shrink-0 bg-[#1c1d15] border-b border-white/5 header-safe-pt">
        <button onClick={onClose} className="text-white flex size-10 items-center justify-center active:scale-90">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-white text-lg font-black tracking-tight">Export Recipe</h2>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 px-6 pt-8 pb-12 overflow-y-auto">
        <div className="mb-8">
          <h3 className="text-[#636b2f] text-xs font-black uppercase tracking-[0.2em] mb-4 px-1">Customize</h3>
          <div className="bg-[#2a2c21] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <label className="flex items-center justify-between p-5 cursor-pointer active:bg-white/5">
              <span className="font-bold">Include Picture</span>
              <input type="checkbox" checked={includePicture} onChange={(e) => setIncludePicture(e.target.checked)} className="accent-[#636b2f] size-5" />
            </label>
            <label className="flex items-center justify-between p-5 cursor-pointer active:bg-white/5">
              <span className="font-bold">Include Details (Time/Yield)</span>
              <input type="checkbox" checked={includeDetails} onChange={(e) => setIncludeDetails(e.target.checked)} className="accent-[#636b2f] size-5" />
            </label>
            <label className="flex items-center justify-between p-5 cursor-pointer active:bg-white/5">
              <span className="font-bold">Include Chef's Tip</span>
              <input type="checkbox" checked={includeChefTip} onChange={(e) => setIncludeChefTip(e.target.checked)} className="accent-[#636b2f] size-5" />
            </label>
          </div>
          <p className="text-xs text-[#b6baa1] mt-3 px-2">Ingredients and Instructions are always included.</p>
        </div>

        <h3 className="text-[#636b2f] text-xs font-black uppercase tracking-[0.2em] mb-4 px-1">Download Format</h3>
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => generateHtml('Letter')}
            disabled={isExporting}
            className="w-full bg-[#3b3e2e] hover:bg-[#4a4d3a] text-white p-5 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-2xl">description</span>
              <div className="text-left">
                <p className="font-bold text-lg">Standard Letter</p>
                <p className="text-xs text-[#b6baa1] uppercase tracking-wider">8.5" x 11" PDF Ready</p>
              </div>
            </div>
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">download</span>
          </button>

          <button 
            onClick={() => generateHtml('Card')}
            disabled={isExporting}
            className="w-full bg-[#3b3e2e] hover:bg-[#4a4d3a] text-white p-5 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-2xl">style</span>
              <div className="text-left">
                <p className="font-bold text-lg">Recipe Card</p>
                <p className="text-xs text-[#b6baa1] uppercase tracking-wider">4" x 6" Index Format</p>
              </div>
            </div>
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">download</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default PrintPreview;
