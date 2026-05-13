import React, { useState, useRef, useEffect } from 'react';
import { Recipe, RecipeIngredient } from '../types';
import { scrapeRecipe } from '../services/geminiScraper';

interface AddRecipeManualProps {
  onBack: () => void;
  onSave: (recipe: Recipe) => void;
  initialData?: Recipe;
}

const VALID_UNITS = ['tsp', 'tsps', 'tbsp', 'tbsps', 'lb', 'lbs', 'cup', 'cups', 'oz', 'g', 'kg', 'ml', 'l', 'pinch', 'clove', 'cloves', 'unit', 'units', 'slice', 'slices', 'bag', 'bags', 'pack', 'packs', 'can', 'cans'];

const toTitleCase = (str: string) => {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const AddRecipeManual: React.FC<AddRecipeManualProps> = ({ onBack, onSave, initialData }) => {
  const [method, setMethod] = useState<'Manual' | 'Web'>(initialData ? 'Manual' : 'Manual');
  const [webUrl, setWebUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [groundingLinks, setGroundingLinks] = useState<{title: string, uri: string}[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [category, setCategory] = useState('Whole Meal');
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
      setCategory(initialData.category || 'Whole Meal');
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
      reader.onloadend = () => {
        setCoverPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleImportWeb = async () => {
    if (!webUrl) return;
    setIsImporting(true);
    setGroundingLinks([]);
    
    try {
      // Use the new geminiScraper service which returns structured data
      const data = await scrapeRecipe(webUrl);
      
      // Map the structured ingredients from Gemini to App's RecipeIngredient format
      const parsedIngredients: RecipeIngredient[] = (data.ingredients || []).map((ing: any) => ({
        name: toTitleCase(ing.name || 'Ingredient'),
        amount: ing.quantity || 0,
        unit: (ing.unit || 'unit').toLowerCase()
      }));

      setTitle(data.title || '');
      // Defaults for fields not returned by the schema
      setDescription(`Imported from ${new URL(webUrl).hostname}`);
      setPrepTime('15');
      setCookTime('30');
      setServings('4');
      setCategory('Whole Meal');
      setDifficulty('Medium');
      setChefTip('');
      setSourceName('');
      setSourceAuthor('');
      setSourceUrl('');
      
      setIngredients(parsedIngredients.length ? parsedIngredients : [{ name: '', amount: 0, unit: '' }]);
      setInstructions(data.instructions?.length ? data.instructions : ['']);
      
      setMethod('Manual');
    } catch (error: any) {
      console.error("Web extraction error:", error);
      alert(`Failed to extract recipe: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: 0, unit: '' }]);
  };

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

  const isUnitValid = (unit: string) => {
    if (!unit) return true;
    return VALID_UNITS.includes(unit.toLowerCase());
  };

  const handleSave = () => {
    const invalidIngredient = ingredients.find(ing => ing.name && !isUnitValid(ing.unit));
    if (invalidIngredient) {
      alert(`Invalid unit "${invalidIngredient.unit}". Please use standard abbreviations: ${VALID_UNITS.slice(0, 8).join(', ')}...`);
      return;
    }

    if (!title.trim()) {
      alert('Please provide at least a recipe title.');
      return;
    }

    const cleanedIngredients = ingredients.filter(i => i.name.trim() !== '').map(i => ({
      ...i,
      name: toTitleCase(i.name),
      unit: i.unit.toLowerCase()
    }));

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

  const allUnitsValid = ingredients.every(ing => !ing.name || isUnitValid(ing.unit));

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden w-full bg-[#1c1d15] text-white">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      <div className="flex items-center bg-[#1c1d15]/95 backdrop-blur-md p-4 pb-2 justify-between sticky top-0 z-30 border-b border-[#2c332c] header-safe-pt">
        <button onClick={onBack} className="text-[#636b2f] flex size-12 shrink-0 items-center justify-start active:scale-95">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">New Recipe</h2>
      </div>

      <div className="flex-1 pb-40">
        <div className="grid grid-cols-2 gap-4 p-4">
          <button onClick={() => setMethod('Web')} className={`flex flex-col gap-3 pb-3 items-center text-center transition-all ${method === 'Web' ? 'scale-105' : 'opacity-40'}`}>
            <div className={`w-full aspect-video flex items-center justify-center rounded-2xl border ${method === 'Web' ? 'bg-[#636b2f]/10 border-[#636b2f]/30' : 'bg-[#1a1f1a] border-[#2c332c]'}`}>
              <span className={`material-symbols-outlined text-3xl ${method === 'Web' ? 'text-primary' : 'text-gray-500'}`}>language</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">Web Import</p>
          </button>
          <button onClick={() => setMethod('Manual')} className={`flex flex-col gap-3 pb-3 items-center text-center transition-all ${method === 'Manual' ? 'scale-105' : 'opacity-40'}`}>
            <div className={`w-full aspect-video flex items-center justify-center rounded-2xl border ${method === 'Manual' ? 'bg-[#636b2f]/10 border-[#636b2f]/30' : 'bg-[#1a1f1a] border-[#2c332c]'}`}>
              <span className={`material-symbols-outlined text-3xl ${method === 'Manual' ? 'text-primary' : 'text-gray-500'}`}>edit_note</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">Manual Entry</p>
          </button>
        </div>

        {method === 'Web' ? (
          <div className="p-4 space-y-4">
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Paste Recipe URL</h3>
            <div className="bg-[#1a1f1a] rounded-2xl p-4 border border-[#2c332c] focus-within:border-primary/50">
              <input type="url" className="bg-transparent border-none text-white w-full focus:ring-0 placeholder:text-gray-600" placeholder="https://..." value={webUrl} onChange={(e) => setWebUrl(e.target.value)} />
            </div>
            <button onClick={handleImportWeb} disabled={isImporting || !webUrl} className="w-full bg-[#636b2f] text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
              <span className={`material-symbols-outlined ${isImporting ? 'animate-spin' : ''}`}>{isImporting ? 'sync' : 'auto_fix_high'}</span>
              {isImporting ? 'Using Grounding...' : 'Meld & Extrapolate'}
            </button>
            <p className="text-[9px] text-gray-500 text-center px-4 leading-relaxed">
              Powered by Google Search Grounding. The AI will visit the URL to extract details, avoiding browser CORS restrictions.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="px-4 pt-4">
               <div onClick={triggerFileInput} className="w-full aspect-video bg-[#1a1f1a] rounded-2xl border-2 border-dashed border-[#2c332c] flex flex-col items-center justify-center gap-2 overflow-hidden relative">
                {coverPhoto ? <img src={coverPhoto} className="w-full h-full object-cover" /> : <><span className="material-symbols-outlined text-[#636b2f] text-3xl">add_a_photo</span><p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Recipe Portrait</p></>}
              </div>
            </div>

            <div className="px-4 space-y-4">
              <label className="block">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Recipe Name</p>
                <input className="bg-[#1a1f1a] border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-14 px-4 font-bold" placeholder="e.g. Garlic Confit Pasta" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>

              <label className="block">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Short Description</p>
                <textarea className="bg-[#1a1f1a] border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-20 px-4 py-3 font-medium text-sm resize-none" placeholder="A brief summary..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Category</p>
                  <select className="bg-[#1a1f1a] border-[#2c332c] text-white w-full rounded-xl h-12 px-4 appearance-none" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option>Whole Meal</option><option>Main</option><option>Side</option><option>Appetizer</option><option>Cocktail</option><option>Breakfast</option><option>Dessert</option>
                  </select>
                </label>
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Difficulty</p>
                  <select className="bg-[#1a1f1a] border-[#2c332c] text-white w-full rounded-xl h-12 px-4 appearance-none" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Prep/Cook (min)</p>
                  <div className="flex gap-2">
                    <input className="bg-[#1a1f1a] border-[#2c332c] text-white w-full rounded-xl h-12 text-center text-xs" placeholder="Prep" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
                    <input className="bg-[#1a1f1a] border-[#2c332c] text-white w-full rounded-xl h-12 text-center text-xs" placeholder="Cook" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
                  </div>
                </label>
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Servings</p>
                  <input className="bg-[#1a1f1a] border-[#2c332c] text-white w-full rounded-xl h-12 text-center font-bold" placeholder="4" value={servings} onChange={(e) => setServings(e.target.value)} />
                </label>
              </div>

              <label className="block">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Chef's Tip</p>
                <textarea className="bg-[#1a1f1a] border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-16 px-4 py-3 font-medium text-sm resize-none" placeholder="Secret technique..." value={chefTip} onChange={(e) => setChefTip(e.target.value)} />
              </label>

              {/* Source */}
              <label className="flex flex-col gap-2">
                <div className="flex items-center gap-2 ml-1">
                  <span className="material-symbols-outlined text-sm text-white/40">menu_book</span>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Source <span className="text-white/20 normal-case font-medium tracking-normal">(optional)</span></p>
                </div>
                <input className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-12 px-4 font-medium text-sm outline-none" placeholder="Cookbook title or website name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
                <input className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-12 px-4 font-medium text-sm outline-none" placeholder="Author (for books)" value={sourceAuthor} onChange={(e) => setSourceAuthor(e.target.value)} />
                <input type="url" className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-12 px-4 font-medium text-sm outline-none" placeholder="https://... (optional link)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
              </label>
            </div>

            <div className="px-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-white text-sm font-black uppercase tracking-widest">Ingredients</p>
                <button onClick={handleAddIngredient} className="text-[#636b2f] text-xs font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">add_circle</span> Add
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 mb-4">
                  <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em] mb-1">Standard Units Only</p>
                  <p className="text-[10px] text-primary font-medium leading-tight">
                    tsp, tbsp, lb, cups, oz, g, kg, unit, clove, pinch, can
                  </p>
                </div>

                {ingredients.map((ing, idx) => {
                  const unitError = ing.unit && !isUnitValid(ing.unit);
                  return (
                    <div key={idx} className="flex flex-col gap-2 p-3 bg-[#1a1f1a] rounded-2xl border border-white/5 shadow-inner">
                      <div className="flex gap-2">
                        <input type="number" className="bg-[#121612] border-none text-white w-16 rounded-xl h-12 text-center outline-none" placeholder="Qty" value={ing.amount || ''} onChange={(e) => handleUpdateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)} />
                        <div className="relative flex-1">
                          <input 
                            className={`bg-[#121612] w-full rounded-xl h-12 px-4 outline-none text-sm transition-all ${unitError ? 'ring-2 ring-amber-500/50 text-amber-500' : 'text-[#636b2f] font-bold'}`} 
                            placeholder="Unit (tsp, cups...)" 
                            value={ing.unit} 
                            onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value.toLowerCase())} 
                          />
                          {unitError && <span className="absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-amber-500 text-sm">warning</span>}
                        </div>
                      </div>
                      <input 
                        className="bg-[#121612] border-none text-white flex-1 rounded-xl h-12 px-4 outline-none font-medium" 
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

            <div className="px-4">
               <p className="text-white text-sm font-black uppercase tracking-widest mb-3 px-1">Instructions</p>
               <div className="space-y-4">
                {instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-none w-7 h-7 bg-[#636b2f] rounded-full flex items-center justify-center text-white text-[10px] font-black mt-1">{idx + 1}</div>
                    <textarea className="bg-[#1a1f1a] border-none text-gray-300 flex-1 rounded-xl p-4 min-h-[80px] text-sm outline-none" placeholder="Instruction text..." value={step} onChange={(e) => { const u = [...instructions]; u[idx] = e.target.value; setInstructions(u); }} />
                  </div>
                ))}
                <button onClick={() => setInstructions([...instructions, ''])} className="w-full py-4 border-2 border-dashed border-[#2c332c] rounded-xl text-gray-500 text-xs font-black uppercase tracking-widest">Add Step</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1c1d15]/90 backdrop-blur-xl border-t border-[#2c332c] z-40">
        <button 
          onClick={handleSave} 
          disabled={!allUnitsValid}
          className="w-full bg-[#636b2f] disabled:grayscale disabled:opacity-30 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          <span className="material-symbols-outlined">save</span>
          {allUnitsValid ? 'Commit to Ledger' : 'Standardize Units to Save'}
        </button>
      </div>
    </div>
  );
};

export default AddRecipeManual;