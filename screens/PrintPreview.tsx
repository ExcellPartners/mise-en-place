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
  const [includePicture, setIncludePicture] = useState(true);
  const [includeChefTip, setIncludeChefTip] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [format, setFormat] = useState<'Letter' | 'Card'>('Letter');
  const [isExporting, setIsExporting] = useState(false);

  const scaledIngredients = scaleIngredients(recipe, servings);

  // Split ingredients and instructions across multiple 4x6 cards if needed
  const buildCards = () => {
    const INGS_PER_CARD = 12;
    const STEPS_PER_CARD = 4;

    const ingChunks: typeof scaledIngredients[] = [];
    for (let i = 0; i < scaledIngredients.length; i += INGS_PER_CARD) {
      ingChunks.push(scaledIngredients.slice(i, i + INGS_PER_CARD));
    }

    const stepChunks: string[][] = [];
    for (let i = 0; i < recipe.instructions.length; i += STEPS_PER_CARD) {
      stepChunks.push(recipe.instructions.slice(i, i + STEPS_PER_CARD));
    }

    return { ingChunks, stepChunks };
  };

  const generateHtml = (mode: 'Letter' | 'Card') => {
    setIsExporting(true);

    const sharedFonts = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');`;

    const letterCss = `
      ${sharedFonts}
      * { box-sizing: border-box; }
      body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; max-width: 8.5in; margin: 0 auto; }
      h1 { font-size: 28pt; margin: 0 0 10px 0; font-weight: 800; letter-spacing: -1px; }
      .category { font-size: 9pt; color: #636b2f; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; margin-bottom: 5px; }
      .meta-grid { display: flex; gap: 30px; margin: 15px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 15px 0; }
      .meta-item strong { display: block; font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #888; }
      .meta-item span { font-size: 11pt; font-weight: 800; }
      .hero-img { width: 100%; height: 280px; object-fit: cover; border-radius: 12px; margin: 20px 0; }
      h3 { font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 5px; margin: 25px 0 15px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
      ul { list-style: none; padding: 0; margin: 0; }
      li { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 10px; }
      .qty { font-weight: 800; color: #636b2f; min-width: 70px; }
      .step { margin-bottom: 15px; display: flex; gap: 15px; }
      .step-num { font-weight: 800; color: #fff; background: #636b2f; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10pt; flex-shrink: 0; }
      .tip-box { background: #f4f6e8; padding: 20px; border-radius: 12px; border-left: 4px solid #636b2f; margin-top: 30px; }
      .tip-title { font-size: 9pt; font-weight: 800; text-transform: uppercase; color: #636b2f; margin-bottom: 5px; }
      .tip-text { font-style: italic; color: #444; font-size: 10pt; }
      @page { margin: 0.5in; size: letter; }
    `;

    const cardCss = `
      ${sharedFonts}
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #f5f5f0; }
      .card {
        width: 6in; height: 4in;
        padding: 18px 20px;
        background: white;
        page-break-after: always;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border: 1px solid #ddd;
      }
      .card:last-child { page-break-after: auto; }
      .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 6px; }
      .card-title { font-size: 14pt; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; }
      .card-category { font-size: 7pt; color: #636b2f; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; }
      .card-meta { display: flex; gap: 12px; font-size: 7pt; color: #666; margin-bottom: 8px; }
      .card-meta strong { color: #000; font-weight: 800; }
      .card-body { flex: 1; overflow: hidden; }
      .card-columns { display: flex; gap: 16px; height: 100%; }
      .col { flex: 1; overflow: hidden; }
      h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 6px; }
      ul { list-style: none; }
      li { font-size: 7.5pt; margin-bottom: 3px; padding-bottom: 3px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 6px; }
      .qty { font-weight: 800; color: #636b2f; min-width: 45px; }
      .step { margin-bottom: 5px; display: flex; gap: 6px; font-size: 7.5pt; }
      .step-num { font-weight: 800; color: #636b2f; min-width: 14px; flex-shrink: 0; }
      .card-footer { font-size: 6pt; color: #bbb; text-align: right; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
      @page { size: 6in 4in; margin: 0; }
      @media print { body { background: white; } }
    `;

    let bodyHtml = '';

    if (mode === 'Letter') {
      bodyHtml = `
        <div class="category">${recipe.category}</div>
        <h1>${recipe.title}</h1>
        ${includeDetails ? `
          <div class="meta-grid">
            <div class="meta-item"><strong>Prep</strong><span>${recipe.prepTime} min</span></div>
            <div class="meta-item"><strong>Cook</strong><span>${recipe.cookTime} min</span></div>
            <div class="meta-item"><strong>Serves</strong><span>${servings}</span></div>
            <div class="meta-item"><strong>Skill</strong><span>${recipe.difficulty}</span></div>
          </div>` : ''}
        ${includePicture && recipe.imageUrl ? `<img src="${recipe.imageUrl}" class="hero-img" />` : ''}
        <div class="two-col">
          <div>
            <h3>Ingredients</h3>
            <ul>${scaledIngredients.map(ing => `<li><span class="qty">${ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(2)} ${ing.unit}</span>${ing.name}</li>`).join('')}</ul>
          </div>
          <div>
            <h3>Instructions</h3>
            ${recipe.instructions.map((s, i) => `<div class="step"><span class="step-num">${i + 1}</span><span>${s}</span></div>`).join('')}
          </div>
        </div>
        ${includeChefTip && recipe.chefTip ? `
          <div class="tip-box">
            <div class="tip-title">Chef's Tip</div>
            <div class="tip-text">"${recipe.chefTip}"</div>
          </div>` : ''}
      `;
    } else {
      // 4x6 card mode — paginate across multiple cards
      const { ingChunks, stepChunks } = buildCards();
      const totalCards = Math.max(ingChunks.length, stepChunks.length);

      for (let i = 0; i < totalCards; i++) {
        const ings = ingChunks[i] || [];
        const steps = stepChunks[i] || [];
        const isFirst = i === 0;
        const cardLabel = totalCards > 1 ? `Card ${i + 1} of ${totalCards}` : '';

        bodyHtml += `
          <div class="card">
            ${isFirst ? `
              <div class="card-header">
                <div>
                  <div class="card-category">${recipe.category}</div>
                  <div class="card-title">${recipe.title}</div>
                </div>
              </div>
              ${includeDetails ? `
                <div class="card-meta">
                  <span><strong>Prep</strong> ${recipe.prepTime}m</span>
                  <span><strong>Cook</strong> ${recipe.cookTime}m</span>
                  <span><strong>Serves</strong> ${servings}</span>
                  <span><strong>Skill</strong> ${recipe.difficulty}</span>
                </div>` : ''}
            ` : `
              <div class="card-header">
                <div class="card-title" style="font-size:11pt">${recipe.title} <span style="font-weight:400;font-size:9pt;color:#888">(continued)</span></div>
              </div>
            `}
            <div class="card-body">
              <div class="card-columns">
                ${ings.length > 0 ? `
                  <div class="col">
                    <h3>Ingredients</h3>
                    <ul>${ings.map(ing => `<li><span class="qty">${ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(2)} ${ing.unit}</span>${ing.name}</li>`).join('')}</ul>
                  </div>` : ''}
                ${steps.length > 0 ? `
                  <div class="col">
                    <h3>Instructions</h3>
                    ${steps.map((s, idx) => {
                      const globalIdx = i * 4 + idx + 1;
                      return `<div class="step"><span class="step-num">${globalIdx}</span><span>${s}</span></div>`;
                    }).join('')}
                  </div>` : ''}
              </div>
            </div>
            ${cardLabel ? `<div class="card-footer">${cardLabel} • Mise en Place</div>` : ''}
          </div>
        `;
      }

      // Chef tip gets its own card if enabled and there's content
      if (includeChefTip && recipe.chefTip) {
        bodyHtml += `
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="font-size:11pt">${recipe.title}</div>
            </div>
            <div class="card-body" style="display:flex;align-items:center;justify-content:center;padding:12px 0">
              <div style="background:#f4f6e8;padding:16px;border-radius:8px;border-left:3px solid #636b2f;width:100%">
                <div style="font-size:7pt;font-weight:800;text-transform:uppercase;color:#636b2f;letter-spacing:1px;margin-bottom:6px">Chef's Tip</div>
                <div style="font-style:italic;color:#444;font-size:8.5pt;line-height:1.5">"${recipe.chefTip}"</div>
              </div>
            </div>
            <div class="card-footer">Mise en Place</div>
          </div>
        `;
      }
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${recipe.title}</title>
  <style>${mode === 'Card' ? cardCss : letterCss}</style>
</head>
<body>${bodyHtml}</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipe.title.replace(/\s+/g, '_')}_${mode}.html`;
    link.click();
    URL.revokeObjectURL(url);

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

      <main className="flex-1 px-6 pt-8 pb-32 overflow-y-auto no-scrollbar">

        {/* Format picker */}
        <h3 className="text-[#636b2f] text-xs font-black uppercase tracking-[0.2em] mb-3 px-1">Format</h3>
        <div className="flex gap-2 p-1.5 bg-[#2a2c21] rounded-2xl border border-white/5 mb-8">
          {(['Letter', 'Card'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${format === f ? 'bg-[#636b2f] text-white shadow' : 'text-white/40'}`}
            >
              {f === 'Letter' ? 'Standard (8.5×11)' : 'Recipe Card (4×6)'}
            </button>
          ))}
        </div>

        {/* Options */}
        <h3 className="text-[#636b2f] text-xs font-black uppercase tracking-[0.2em] mb-3 px-1">Include</h3>
        <div className="bg-[#2a2c21] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5 mb-6">
          {[
            { label: 'Recipe Photo', value: includePicture, set: setIncludePicture, letterOnly: true },
            { label: 'Times & Servings', value: includeDetails, set: setIncludeDetails },
            { label: "Chef's Tip", value: includeChefTip, set: setIncludeChefTip },
          ].filter(o => !o.letterOnly || format === 'Letter').map(opt => (
            <label key={opt.label} className="flex items-center justify-between p-5 cursor-pointer active:bg-white/5">
              <span className="font-bold">{opt.label}</span>
              <input
                type="checkbox"
                checked={opt.value}
                onChange={e => opt.set(e.target.checked)}
                className="accent-[#636b2f] size-5"
              />
            </label>
          ))}
        </div>

        {format === 'Card' && (
          <div className="bg-[#636b2f]/10 border border-[#636b2f]/20 rounded-2xl p-4 mb-6 flex gap-3">
            <span className="material-symbols-outlined text-[#636b2f] text-xl shrink-0">auto_awesome</span>
            <p className="text-xs text-[#b6baa1] leading-relaxed">
              Long recipes automatically paginate across multiple 4×6 cards. Open the downloaded file and print — your browser's print dialog handles the rest.
            </p>
          </div>
        )}

        <p className="text-xs text-[#b6baa1] px-1 mb-8">Ingredients and instructions are always included.</p>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#1c1d15] via-[#1c1d15]/95 to-transparent pt-10">
        <button
          onClick={() => generateHtml(format)}
          disabled={isExporting}
          className="w-full bg-[#636b2f] text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-base active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <span className={`material-symbols-outlined ${isExporting ? 'animate-spin' : ''}`}>
            {isExporting ? 'sync' : 'download'}
          </span>
          {isExporting ? 'Generating...' : `Download ${format === 'Letter' ? 'Letter' : 'Recipe Cards'}`}
        </button>
      </footer>
    </div>
  );
};

export default PrintPreview;
