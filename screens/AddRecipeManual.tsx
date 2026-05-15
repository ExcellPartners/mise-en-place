import React, { useState, useRef, useEffect } from 'react';
import { Recipe, RecipeIngredient } from '../types';

interface AddRecipeManualProps {
  onBack: () => void;
  onSave: (recipe: Recipe) => void;
  initialData?: Recipe;
}

const VALID_UNITS = ['tsp', 'tsps', 'tbsp', 'tbsps', 'lb', 'lbs', 'cup', 'cups', 'oz', 'g', 'kg', 'ml', 'l', 'pinch', 'clove', 'cloves', 'unit', 'units', 'slice', 'slices', 'bag', 'bags', 'pack', 'packs', 'can', 'cans'];

const toTitleCase = (str: string) =>
  str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// ── Claude-powered web import via proxy ────────────────────────────────────────
async function importRecipeFromUrl(url: string): Promise<{
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  baseServings: number;
  category: string;
  difficulty: string;
  chefTip: string;
  sourceName: string;
  sourceUrl: string;
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string[];
}> {
  // The proxy will fetch the page server-side and inject the text into this prompt
  const prompt = `Extract the recipe from this page: ${url}

Return ONLY valid JSON with no other text or markdown fences:
{
  "title": "Recipe name",
  "description": "One sentence description of the dish",
  "prepTime": 15,
  "cookTime": 30,
  "baseServings": 4,
  "category": "Main",
  "difficulty": "Medium",
  "chefTip": "A useful tip from the recipe, or empty string",
  "sourceName": "Website or publication name",
  "sourceUrl": "${url}",
  "ingredients": [
    { "name": "Ingredient Name", "amount": 1.5, "unit": "cup" }
  ],
  "instructions": [
    "Step 1 full text",
    "Step 2 full text"
  ]
}

Rules:
- category must be one of: Main, Side, Appetizer, Dessert, Beverage, Breakfast
- difficulty must be one of: Easy, Medium, Hard
- unit must be one of: tsp, tbsp, cup, oz, lb, g, kg, ml, l, pinch, clove, unit, slice, can, bag, pack
- Convert ingredient names to Title Case
- Split instructions into individual steps — do not combine them
- Extract ONLY the main recipe, ignore ads, comments, and related recipes`;

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,                          // proxy fetches this server-side
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  const data = await response.json();

  // Extract text from all content blocks (web search may add multiple blocks)
  const rawText = (data.content as { type: string; text?: string }[])
    ?.map(b => (b.type === 'text' ? b.text : ''))
    .join('') || '';

  const clean = rawText.replace(/```json|```/g, '').trim();
  const jsonStart = clean.indexOf('{');
  const jsonEnd = clean.lastIndexOf('}');
  if (jsonStart === -1) throw new Error('Could not extract recipe data from that URL.');

  return JSON.parse(clean.slice(jsonStart, jsonEnd + 1));
}

const AddRecipeManual: React.FC<AddRecipeManualProps> = ({ onBack, onSave, initialData }) => {
  const [method, setMethod] = useState<'Manual' | 'Web'>('Manual');
  const [webUrl, setWebUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [category, setCategory] = useState('Main');
  const [difficulty, setDifficulty] = useState('Medium');
  const [chefTip, setChefTip] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([{ name: '', amount: 0, unit: '' }]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setPrepTime(initialData.prepTime?.toString() || '');
      setCookTime(initialData.cookTime?.toString() || '');
      setServings(initialData.baseServings?.toString() || '4');
      setCategory(initialData.category || 'Main');
      setDifficulty(initialData.difficulty || 'Medium');
      setChefTip(initialData.chefTip || '');
      setSourceName(initialData.sourceName || '');
      setSourceAuthor(initialData.sourceAuthor || '');
      setSourceUrl(initialData.sourceUrl || '');
      setIngredients(initialData.ingredients?.length ? initialData.ingredients : [{ name: '', amount: 0, unit: '' }]);
      setInstructions(initialData.instructions?.length ? initialData.instructions : ['']);
      setCoverPhoto(initialData.imageUrl || null);
    }
  }, [initialData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImportWeb = async () => {
    if (!webUrl.trim()) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const data = await importRecipeFromUrl(webUrl.trim());

      setTitle(data.title || '');
      setDescription(data.description || `Imported from ${new URL(webUrl).hostname}`);
      setPrepTime(String(data.prepTime || 15));
      setCookTime(String(data.cookTime || 30));
      setServings(String(data.baseServings || 4));
      setCategory(data.category || 'Main');
      setDifficulty(data.difficulty || 'Medium');
      setChefTip(data.chefTip || '');
      setSourceName(data.sourceName || new URL(webUrl).hostname);
      setSourceAuthor('');
      setSourceUrl(webUrl);

      const parsedIngredients: RecipeIngredient[] = (data.ingredients || []).map((ing: any) => ({
        name: toTitleCase(ing.name || 'Ingredient'),
        amount: Number(ing.amount) || 1,
        unit: (ing.unit || 'unit').toLowerCase(),
      }));

      setIngredients(parsedIngredients.length ? parsedIngredients : [{ name: '', amount: 0, unit: '' }]);
      setInstructions(data.instructions?.length ? data.instructions : ['']);
      setMethod('Manual'); // switch to form view so user can review
    } catch (err: any) {
      console.error('Web import error:', err);
      setImportError(err.message || 'Failed to extract recipe. Try pasting the URL again or add manually.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddIngredient = () => setIngredients([...ingredients, { name: '', amount: 0, unit: '' }]);

  const handleUpdateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleIngredientBlur = (index: number) => {
    const updated = [...ingredients];
    updated[index].name = toTitleCase(updated[index].name);
    setIngredients(updated);
  };

  const isUnitValid = (unit: string) => !unit || VALID_UNITS.includes(unit.toLowerCase());

  const allUnitsValid = ingredients.every(ing => !ing.name || isUnitValid(ing.unit));

  const handleSave = () => {
    const invalidIngredient = ingredients.find(ing => ing.name && !isUnitValid(ing.unit));
    if (invalidIngredient) {
      alert(`Invalid unit "${invalidIngredient.unit}". Use: ${VALID_UNITS.slice(0, 8).join(', ')}...`);
      return;
    }
    if (!title.trim()) {
      alert('Please provide at least a recipe title.');
      return;
    }

    const cleanedIngredients = ingredients
      .filter(i => i.name.trim() !== '')
      .map(i => ({ ...i, name: toTitleCase(i.name), unit: i.unit.toLowerCase() }));

    if (cleanedIngredients.length === 0) {
      alert('Please add at least one ingredient.');
      return;
    }

    const newId = `R-${Math.floor(1000 + Math.random() * 9000)}`;

    onSave({
      id: newId,
      title,
      description: description || `A delicious ${category.toLowerCase()} dish.`,
      prepTime: parseInt(prepTime) || 0,
      cookTime: parseInt(cookTime) || 0,
      baseServings: parseInt(servings) || 4,
      category,
      difficulty,
      chefTip: chefTip || 'Enjoy your meal!',
      sourceName: sourceName || undefined,
      sourceAuthor: sourceAuthor || undefined,
      sourceUrl: sourceUrl || undefined,
      ingredients: cleanedIngredients,
      instructions: instructions.filter(s => s.trim() !== ''),
      imageUrl: coverPhoto || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=600&h=800',
    });
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-[#1c1d15] text-white">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* Header */}
      <div className="flex items-center bg-[#1c1d15]/95 backdrop-blur-md p-4 pb-2 justify-between sticky top-0 z-30 border-b border-[#2c332c] header-safe-pt">
        <button onClick={onBack} className="text-[#636b2f] flex size-12 shrink-0 items-center justify-start active:scale-95">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">New Recipe</h2>
      </div>

      <div className="flex-1 pb-40">
        {/* Method selector */}
        <div className="grid grid-cols-2 gap-4 p-4">
          <button onClick={() => setMethod('Web')}
            className={`flex flex-col gap-3 pb-3 items-center text-center transition-all ${method === 'Web' ? 'scale-105' : 'opacity-40'}`}>
            <div className={`w-full aspect-video flex items-center justify-center rounded-2xl border ${method === 'Web' ? 'bg-[#636b2f]/10 border-[#636b2f]/30' : 'bg-[#1a1f1a] border-[#2c332c]'}`}>
              <span className={`material-symbols-outlined text-3xl ${method === 'Web' ? 'text-[#636b2f]' : 'text-gray-500'}`}>language</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">Web Import</p>
          </button>
          <button onClick={() => setMethod('Manual')}
            className={`flex flex-col gap-3 pb-3 items-center text-center transition-all ${method === 'Manual' ? 'scale-105' : 'opacity-40'}`}>
            <div className={`w-full aspect-video flex items-center justify-center rounded-2xl border ${method === 'Manual' ? 'bg-[#636b2f]/10 border-[#636b2f]/30' : 'bg-[#1a1f1a] border-[#2c332c]'}`}>
              <span className={`material-symbols-outlined text-3xl ${method === 'Manual' ? 'text-[#636b2f]' : 'text-gray-500'}`}>edit_note</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">Manual Entry</p>
          </button>
        </div>

        {/* Web import panel */}
        {method === 'Web' && (
          <div className="p-4 space-y-4">
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Paste Recipe URL</h3>
            <div className="bg-[#1a1f1a] rounded-2xl p-4 border border-[#2c332c] focus-within:border-[#636b2f]/50 transition-colors">
              <input
                type="url"
                className="bg-transparent border-none text-white w-full focus:ring-0 placeholder:text-gray-600"
                placeholder="https://..."
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
              />
            </div>

            {importError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-300 text-xs font-medium leading-relaxed">{importError}</p>
              </div>
            )}

            <button
              onClick={handleImportWeb}
              disabled={isImporting || !webUrl.trim()}
              className="w-full bg-[#636b2f] text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              <span className={`material-symbols-outlined ${isImporting ? 'animate-spin' : ''}`}>
                {isImporting ? 'sync' : 'auto_fix_high'}
              </span>
              {isImporting ? 'Reading with Claude...' : 'Import Recipe'}
            </button>
            <p className="text-[9px] text-gray-500 text-center px-4 leading-relaxed">
              Powered by Claude AI. Paste any recipe URL and Claude will extract the full recipe automatically.
            </p>
          </div>
        )}

        {/* Manual form */}
        {method === 'Manual' && (
          <div className="space-y-6">
            {/* Cover photo */}
            <div className="px-4 pt-4">
              <div onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video bg-[#1a1f1a] rounded-2xl border-2 border-dashed border-[#2c332c] flex flex-col items-center justify-center gap-2 overflow-hidden relative cursor-pointer">
                {coverPhoto
                  ? <img src={coverPhoto} className="w-full h-full object-cover" alt="cover" />
                  : <><span className="material-symbols-outlined text-[#636b2f] text-3xl">add_a_photo</span><p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Recipe Portrait</p></>
                }
              </div>
            </div>

            <div className="px-4 space-y-4">
              <label className="block">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Recipe Name</p>
                <input className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-14 px-4 font-bold outline-none" placeholder="e.g. Garlic Confit Pasta" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>

              <label className="block">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Short Description</p>
                <textarea className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-20 px-4 py-3 font-medium text-sm resize-none outline-none" placeholder="A brief summary..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Category</p>
                  <select className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 px-4 appearance-none outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option>Main</option>
                    <option>Side</option>
                    <option>Appetizer</option>
                    <option>Beverage</option>
                    <option>Breakfast</option>
                    <option>Dessert</option>
                  </select>
                </label>
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Difficulty</p>
                  <select className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 px-4 appearance-none outline-none" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Prep / Cook (min)</p>
                  <div className="flex gap-2">
                    <input className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 text-center text-xs outline-none" placeholder="Prep" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
                    <input className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 text-center text-xs outline-none" placeholder="Cook" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
                  </div>
                </label>
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Servings</p>
                  <input className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 text-center font-bold outline-none" placeholder="4" value={servings} onChange={(e) => setServings(e.target.value)} />
                </label>
              </div>

              <label className="block">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Chef's Tip</p>
                <textarea className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-16 px-4 py-3 font-medium text-sm resize-none outline-none" placeholder="Secret technique..." value={chefTip} onChange={(e) => setChefTip(e.target.value)} />
              </label>

              {/* Source */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 ml-1">
                  <span className="material-symbols-outlined text-sm text-white/40">menu_book</span>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Source <span className="text-white/20 normal-case font-medium tracking-normal">(optional)</span></p>
                </div>
                <input className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-12 px-4 font-medium text-sm outline-none" placeholder="Cookbook title or website name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
                <input className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-12 px-4 font-medium text-sm outline-none" placeholder="Author (for books)" value={sourceAuthor} onChange={(e) => setSourceAuthor(e.target.value)} />
                <input type="url" className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-12 px-4 font-medium text-sm outline-none" placeholder="https://... (optional link)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
              </div>
            </div>

            {/* Ingredients */}
            <div className="px-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-white text-sm font-black uppercase tracking-widest">Ingredients</p>
                <button onClick={handleAddIngredient} className="text-[#636b2f] text-xs font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">add_circle</span> Add
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-[#636b2f]/5 p-3 rounded-xl border border-[#636b2f]/10 mb-4">
                  <p className="text-[9px] font-black text-[#636b2f]/60 uppercase tracking-[0.2em] mb-1">Standard Units Only</p>
                  <p className="text-[10px] text-[#636b2f] font-medium leading-tight">tsp, tbsp, lb, cup, oz, g, kg, unit, clove, pinch, can</p>
                </div>

                {ingredients.map((ing, idx) => {
                  const unitError = ing.unit && !isUnitValid(ing.unit);
                  return (
                    <div key={idx} className="flex flex-col gap-2 p-3 bg-[#1a1f1a] rounded-2xl border border-white/5">
                      <div className="flex gap-2">
                        <input type="number" className="bg-[#121612] text-white w-16 rounded-xl h-12 text-center outline-none border-none" placeholder="Qty" value={ing.amount || ''} onChange={(e) => handleUpdateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)} />
                        <div className="relative flex-1">
                          <input
                            className={`bg-[#121612] w-full rounded-xl h-12 px-4 outline-none text-sm transition-all border-none ${unitError ? 'ring-2 ring-amber-500/50 text-amber-500' : 'text-[#636b2f] font-bold'}`}
                            placeholder="Unit (tsp, cup...)"
                            value={ing.unit}
                            onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value.toLowerCase())}
                          />
                          {unitError && <span className="absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-amber-500 text-sm">warning</span>}
                        </div>
                      </div>
                      <input
                        className="bg-[#121612] text-white flex-1 rounded-xl h-12 px-4 outline-none font-medium border-none"
                        placeholder="Ingredient Name"
                        value={ing.name}
                        onChange={(e) => handleUpdateIngredient(idx, 'name', e.target.value)}
                        onBlur={() => handleIngredientBlur(idx)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instructions */}
            <div className="px-4">
              <p className="text-white text-sm font-black uppercase tracking-widest mb-3 px-1">Instructions</p>
              <div className="space-y-4">
                {instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-none w-7 h-7 bg-[#636b2f] rounded-full flex items-center justify-center text-white text-[10px] font-black mt-1">{idx + 1}</div>
                    <textarea
                      className="bg-[#1a1f1a] border-none text-gray-300 flex-1 rounded-xl p-4 min-h-[80px] text-sm outline-none"
                      placeholder="Instruction text..."
                      value={step}
                      onChange={(e) => { const u = [...instructions]; u[idx] = e.target.value; setInstructions(u); }}
                    />
                  </div>
                ))}
                <button onClick={() => setInstructions([...instructions, ''])}
                  className="w-full py-4 border-2 border-dashed border-[#2c332c] rounded-xl text-gray-500 text-xs font-black uppercase tracking-widest">
                  Add Step
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1c1d15]/90 backdrop-blur-xl border-t border-[#2c332c] z-40">
        <button
          onClick={handleSave}
          disabled={!allUnitsValid || method === 'Web'}
          className="w-full bg-[#636b2f] disabled:grayscale disabled:opacity-30 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined">save</span>
          {method === 'Web' ? 'Import a Recipe First' : allUnitsValid ? 'Commit to Ledger' : 'Standardize Units to Save'}
        </button>
      </div>
    </div>
  );
};

export default AddRecipeManual;
