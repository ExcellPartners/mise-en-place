import React, { useState, useRef, useEffect } from 'react';
import { Recipe, RecipeIngredient } from '../types';

interface AddRecipeManualProps {
  onBack: () => void;
  onSave: (recipe: Recipe) => Promise<void> | void;
  initialData?: Recipe;
  existingIds?: string[];         // for duplicate-safe ID generation
  spreadsheetId?: string | null;  // for collections auto-tagging
  accessToken?: string | null;
}

const VALID_UNITS = ['tsp', 'tsps', 'tbsp', 'tbsps', 'lb', 'lbs', 'cup', 'cups', 'oz', 'g', 'kg', 'ml', 'l', 'pinch', 'clove', 'cloves', 'unit', 'units', 'slice', 'slices', 'bag', 'bags', 'pack', 'packs', 'can', 'cans'];

const DESCRIPTOR_TERMS = ['minced', 'chopped', 'diced', 'sliced', 'halved', 'melted', 'crushed', 'grated', 'shredded', 'peeled', 'trimmed', 'softened', 'beaten', 'sifted', 'packed', 'heaping', 'roughly', 'finely', 'coarsely', 'thinly', 'freshly', 'ground', 'toasted', 'cooked', 'frozen', 'thawed', 'drained', 'rinsed', 'room temperature'];

const toTitleCase = (str: string) =>
  str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const toSentenceCase = (str: string): string => {
  if (!str) return str;
  const s = str.trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

// Strip processing descriptors from an ingredient name
const atomizeName = (name: string): { cleanName: string; descriptors: string[] } => {
  const words = name.split(/\s+/);
  const descriptors: string[] = [];
  const cleanWords = words.filter(w => {
    if (DESCRIPTOR_TERMS.includes(w.toLowerCase().replace(/,/g, ''))) {
      descriptors.push(w.replace(/,/g, ''));
      return false;
    }
    return true;
  });
  return { cleanName: toTitleCase(cleanWords.join(' ').trim()), descriptors };
};

// Generate a duplicate-safe R-XXXXX id
const generateId = (existingIds: string[]): string => {
  const existing = new Set(existingIds);
  let id = '';
  let attempts = 0;
  do {
    const num = Math.floor(10000 + Math.random() * 90000);
    id = `R-${num}`;
    attempts++;
  } while (existing.has(id) && attempts < 1000);
  return id;
};

// ── Collections the AI might tag ──────────────────────────────────────────────
const COLLECTION_NAMES = [
  'One-Pot Wonders', 'Prep Once, Eat All Week', 'Table for Two', 'Pantry Foraging',
  'Host & Toast', '30-Minute Wins', 'Set It & Forget It', 'Comfort Classics',
  'Big Payoff, Little Effort', 'Taco Tuesday & Beyond', 'Mediterranean Escape',
  'Spice Route', 'Global Street Food', 'East Asia Table', 'The Trattoria',
  'Classic Americana', 'Old World Bistro', 'Holiday Winter Showstoppers',
  'The Fresh Spring Table', 'Summer BBQ & Grilling', 'Cozy Fall Harvest', 'Year Round',
];

async function autoTagCollections(recipe: Recipe): Promise<string[]> {
  const prompt = `You are a recipe cataloger. Given this recipe, decide which of the following collections it belongs in.

Recipe:
Title: ${recipe.title}
Category: ${recipe.category}
Description: ${recipe.description}
Ingredients: ${recipe.ingredients.map(i => i.name).join(', ')}
Instructions snippet: ${recipe.instructions.slice(0, 2).join(' ')}

Collections to choose from:
${COLLECTION_NAMES.join('\n')}

Return ONLY a JSON array of collection names that apply — be selective, only include genuinely fitting ones:
["Collection Name 1", "Collection Name 2"]

If none fit, return: []`;

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) return [];
  const data = await response.json();
  const rawText = (data.content as { type: string; text?: string }[])
    ?.map(b => (b.type === 'text' ? b.text : '')).join('') || '';
  const clean = rawText.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1) return [];
  return JSON.parse(clean.slice(start, end + 1));
}

async function appendToCollectionsSheet(
  spreadsheetId: string,
  accessToken: string,
  recipeId: string,
  collectionNames: string[]
): Promise<void> {
  const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
  const API_KEY = 'AIzaSyDFc2raCSZfnfyM5n1fwrsbUco1njqHHMk';

  // Read current Collections tab
  const res = await fetch(`${API_BASE}/${spreadsheetId}/values/Collections!A:B?key=${API_KEY}`);
  if (!res.ok) return;
  const data = await res.json();
  const rows: string[][] = data.values || [];

  for (const colName of collectionNames) {
    const rowIdx = rows.findIndex(r => r[0]?.trim().toLowerCase() === colName.trim().toLowerCase());
    if (rowIdx === -1) continue;

    const currentIds = (rows[rowIdx][1] || '').split(',').map(s => s.trim()).filter(Boolean);
    if (currentIds.includes(recipeId)) continue;
    currentIds.push(recipeId);

    const range = `Collections!B${rowIdx + 1}`;
    await fetch(`${API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED&key=${API_KEY}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values: [[currentIds.join(', ')]] }),
    });
  }
}

// ── Web import via proxy ───────────────────────────────────────────────────────
async function importRecipeFromUrl(url: string): Promise<any> {
  const prompt = `Extract the complete recipe from this page: ${url}

CRITICAL INGREDIENT RULES:
- Strip ALL processing descriptors from ingredient names: minced, chopped, diced, sliced, halved, melted, crushed, grated, shredded, peeled, trimmed, softened, room temperature, beaten, sifted
- "4 cloves garlic minced" → name: "Garlic", amount: 4, unit: "clove"
- Ingredient name = just the food item in Title Case
- Collect stripped descriptors into prepWork array

Return ONLY valid JSON, no markdown:
{
  "title": "Recipe Name",
  "description": "one sentence, sentence case",
  "prepTime": 15,
  "cookTime": 30,
  "baseServings": 4,
  "category": "Main",
  "difficulty": "Easy",
  "chefTip": "one tip, sentence case",
  "sourceName": "Site or book name",
  "ingredients": [{"name": "Garlic", "amount": 4, "unit": "clove"}],
  "prepWork": ["Mince the garlic", "Dice the onion"],
  "instructions": ["Step 1...", "Step 2..."]
}

category: Main | Side | Appetizer | Dessert | Beverage | Breakfast
difficulty: Easy | Medium | Hard
unit: tsp | tbsp | cup | oz | lb | g | kg | ml | l | pinch | clove | unit | slice | can | bag | pack`;

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
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
  const rawText = (data.content as { type: string; text?: string }[])
    ?.map(b => (b.type === 'text' ? b.text : '')).join('') || '';
  const clean = rawText.replace(/```json|```/g, '').trim();
  const s = clean.indexOf('{');
  const e = clean.lastIndexOf('}');
  if (s === -1) throw new Error('Could not extract recipe from that URL.');
  return JSON.parse(clean.slice(s, e + 1));
}

// ── Component ─────────────────────────────────────────────────────────────────
const AddRecipeManual: React.FC<AddRecipeManualProps> = ({
  onBack, onSave, initialData, existingIds = [], spreadsheetId, accessToken
}) => {
  const [method, setMethod] = useState<'Manual' | 'Web'>('Manual');
  const [webUrl, setWebUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitPhase, setCommitPhase] = useState<'saving' | 'tagging' | 'done' | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
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

  const populateFromParsed = (data: any, srcUrl?: string) => {
    setTitle(data.title || '');
    setDescription(toSentenceCase(data.description || ''));
    setPrepTime(String(data.prepTime || 15));
    setCookTime(String(data.cookTime || 30));
    setServings(String(data.baseServings || 4));
    setCategory(data.category || 'Main');
    setDifficulty(data.difficulty || 'Medium');
    setChefTip(toSentenceCase(data.chefTip || ''));
    setSourceName(data.sourceName || (srcUrl ? new URL(srcUrl).hostname : ''));
    setSourceAuthor('');
    setSourceUrl(srcUrl || '');

    // Atomize ingredients
    const parsedIngs: RecipeIngredient[] = (data.ingredients || []).map((ing: any) => {
      const { cleanName } = atomizeName(ing.name || '');
      return { name: cleanName, amount: Number(ing.amount) || 1, unit: (ing.unit || 'unit').toLowerCase() };
    });
    setIngredients(parsedIngs.length ? parsedIngs : [{ name: '', amount: 0, unit: '' }]);

    // Prepend prep step if any descriptors were stripped
    const prepWork: string[] = data.prepWork || [];
    const originalSteps: string[] = Array.isArray(data.instructions) ? data.instructions : [];
    const finalSteps = prepWork.length > 0
      ? [`Prep work: ${prepWork.join(', ')}.`, ...originalSteps]
      : originalSteps;
    setInstructions(finalSteps.length ? finalSteps : ['']);
  };

  const handleImportWeb = async () => {
    if (!webUrl.trim()) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const data = await importRecipeFromUrl(webUrl.trim());
      populateFromParsed(data, webUrl.trim());
      setMethod('Manual');
    } catch (err: any) {
      setImportError(err.message || 'Failed to extract recipe. Try pasting manually.');
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
    const { cleanName } = atomizeName(updated[index].name);
    updated[index].name = cleanName;
    setIngredients(updated);
  };

  const isUnitValid = (unit: string) => !unit || VALID_UNITS.includes(unit.toLowerCase());
  const allUnitsValid = ingredients.every(ing => !ing.name || isUnitValid(ing.unit));

  const handleSave = async () => {
    if (!title.trim()) { alert('Please provide a recipe title.'); return; }
    const invalid = ingredients.find(i => i.name && !isUnitValid(i.unit));
    if (invalid) { alert(`Invalid unit "${invalid.unit}". Use: ${VALID_UNITS.slice(0, 8).join(', ')}...`); return; }

    const cleanedIngredients = ingredients
      .filter(i => i.name.trim())
      .map(i => {
        const { cleanName } = atomizeName(i.name);
        return { ...i, name: cleanName, unit: i.unit.toLowerCase() };
      });

    if (cleanedIngredients.length === 0) { alert('Please add at least one ingredient.'); return; }

    const newId = generateId(existingIds);

    const recipe: Recipe = {
      id: newId,
      title,
      description: toSentenceCase(description) || `A delicious ${category.toLowerCase()} dish.`,
      prepTime: parseInt(prepTime) || 0,
      cookTime: parseInt(cookTime) || 0,
      baseServings: parseInt(servings) || 4,
      category,
      difficulty,
      chefTip: toSentenceCase(chefTip) || 'Enjoy your meal!',
      sourceName: sourceName || undefined,
      sourceAuthor: sourceAuthor || undefined,
      sourceUrl: sourceUrl || undefined,
      ingredients: cleanedIngredients,
      instructions: instructions.filter(s => s.trim()),
      imageUrl: coverPhoto || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=600&h=800',
    };

    setIsCommitting(true);
    setCommitPhase('saving');
    setCommitError(null);

    try {
      // 1. Write directly to sheet from here — do not rely on parent
      const targetId = spreadsheetId || '16ADJZBC80b4hF_TBqZP_4pCmBYVeMwtFNWLx59-Wyds';
      const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
      const API_KEY = 'AIzaSyDFc2raCSZfnfyM5n1fwrsbUco1njqHHMk';

      // Build recipe row — A=ID, B=Title, C=Category, D=Serves, E=Prep, F=Cook,
      // G=Difficulty, H=Score, I=Description, J=ChefTip, K=Instructions,
      // L=Image, M=unused, N=Favorites, O=Date, P=unused, Q=SourceName, R=SourceAuthor, S=SourceURL
      // Strip base64 data URIs — they're too large for Sheets and useless as a stored URL
      const stripBase64 = (s: string) => s?.startsWith('data:') ? '' : (s || '');
      const truncate = (s: string, max = 45000) => stripBase64(s).slice(0, max);
      const recipeRow = [
        recipe.id,                                      // A - Recipe ID
        recipe.title,                                   // B - Recipe Name
        recipe.category,                                // C - Category
        recipe.ingredients.length,                      // D - # of Ingredients
        recipe.baseServings,                            // E - Serves or Makes
        recipe.prepTime,                                // F - Prep (Minutes)
        recipe.cookTime,                                // G - Cook (Minutes)
        recipe.difficulty,                              // H - Difficulty
        0,                                              // I - Score
        truncate(recipe.description, 2000),             // J - Description
        truncate(recipe.chefTip, 1000),                 // K - Chef's Tip
        truncate(recipe.instructions.join('\n'), 40000), // L - Instructions
        '',                                             // M - Picture (add later)
        'FALSE',                                        // N - Favorites
        'FALSE',                                        // O - Complete Meal
        '',                                             // P - Protein
        truncate(recipe.sourceName || '', 200),         // Q - SourceName
        truncate(recipe.sourceAuthor || '', 200),       // R - SourceAuthor
        truncate(recipe.sourceUrl || '', 500),          // S - SourceURL
      ];

      // Write to Recipes tab via service account proxy (no OAuth needed)
      const sheetProxyWrite = async (sheetUrl: string, body: any) => {
        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sheetWrite', sheetWrite: { method: 'POST', url: sheetUrl, body } }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sheet write failed ' + res.status);
        return data;
      };

      await sheetProxyWrite(
        `${API_BASE}/${targetId}/values/Recipes!A:S:append?valueInputOption=USER_ENTERED&key=${API_KEY}`,
        { range: 'Recipes!A:S', majorDimension: 'ROWS', values: [recipeRow] }
      );

      // Write to Components tab
      const componentRows = recipe.ingredients.map((ing: any) => [recipe.id, ing.name, ing.amount, ing.unit]);
      if (componentRows.length > 0) {
        await sheetProxyWrite(
          `${API_BASE}/${targetId}/values/Components!A:D:append?valueInputOption=USER_ENTERED&key=${API_KEY}`,
          { range: 'Components!A:D', majorDimension: 'ROWS', values: componentRows }
        );
      }

      // 2. Add to local state via parent
      await onSave(recipe);

      // 3. AI Collections auto-tagging
      if (spreadsheetId && accessToken) {
        setCommitPhase('tagging');
        try {
          const tags = await autoTagCollections(recipe);
          if (tags.length > 0) {
            await appendToCollectionsSheet(spreadsheetId, accessToken, newId, tags);
          }
        } catch (tagErr) {
          console.warn('Collections auto-tag failed (non-critical):', tagErr);
        }
      }

      setCommitPhase('done');
      setTimeout(() => {
        setIsCommitting(false);
        setCommitPhase(null);
        onBack();
      }, 1200);
    } catch (err: any) {
      console.error('Save failed:', err);
      setCommitError(err.message || 'Unknown error — check console');
      setIsCommitting(false);
      setCommitPhase(null);
    }
  };

  // ── Committing overlay ──────────────────────────────────────────────────────
  if (isCommitting || commitError) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#1c1d15] flex flex-col items-center justify-center p-10 text-center">
        <div className="relative mb-10">
          {commitPhase === 'done' ? (
            <div className="size-28 rounded-full bg-[#636b2f]/20 flex items-center justify-center border border-[#636b2f]/30">
              <span className="material-symbols-outlined text-[#636b2f] text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          ) : commitError ? (
            <div className="size-28 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <span className="material-symbols-outlined text-red-400 text-6xl">error</span>
            </div>
          ) : (
            <>
              <div className="size-28 rounded-full border-4 border-[#636b2f]/10 border-t-[#636b2f] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🧑‍🍳</div>
            </>
          )}
        </div>
        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">
          {commitError ? 'Save Failed' : commitPhase === 'done' ? 'Recipe Saved!' : commitPhase === 'tagging' ? 'Tagging Collections…' : 'Committing to Ledger…'}
        </h2>
        <p className="text-[#b6baa1] text-sm leading-relaxed mb-6 px-4">
          {commitError
            ? commitError
            : commitPhase === 'done'
              ? 'Your recipe is live and searchable.'
              : commitPhase === 'tagging'
                ? 'Claude is placing this recipe in the right collections.'
                : 'Writing to your Google Sheet…'}
        </p>
        {commitError && (
          <button
            onClick={() => setCommitError(null)}
            className="px-8 py-3 rounded-full bg-white/10 text-white font-black uppercase tracking-widest text-sm active:scale-95 transition-transform"
          >
            Go Back & Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-[#1c1d15] text-white">
      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setCoverPhoto(reader.result as string);
          reader.readAsDataURL(file);
        }
      }} accept="image/*" className="hidden" />

      {/* Header */}
      <div className="flex items-center bg-[#1c1d15]/95 backdrop-blur-md p-4 pb-2 justify-between sticky top-0 z-30 border-b border-[#2c332c] header-safe-pt">
        <button onClick={onBack} className="text-[#636b2f] flex size-12 shrink-0 items-center justify-start active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center pr-12">New Recipe</h2>
      </div>

      <div className="flex-1 pb-40">
        {/* Method toggle */}
        <div className="grid grid-cols-2 gap-4 p-4">
          {(['Web', 'Manual'] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)}
              className={`flex flex-col gap-3 pb-3 items-center text-center transition-all ${method === m ? 'scale-105' : 'opacity-40'}`}>
              <div className={`w-full aspect-video flex items-center justify-center rounded-2xl border ${method === m ? 'bg-[#636b2f]/10 border-[#636b2f]/30' : 'bg-[#1a1f1a] border-[#2c332c]'}`}>
                <span className={`material-symbols-outlined text-3xl ${method === m ? 'text-[#636b2f]' : 'text-gray-500'}`}>
                  {m === 'Web' ? 'language' : 'edit_note'}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest">{m === 'Web' ? 'Web Import' : 'Manual Entry'}</p>
            </button>
          ))}
        </div>

        {/* Web import panel */}
        {method === 'Web' && (
          <div className="p-4 space-y-4">
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Paste Recipe URL</h3>
            <div className="bg-[#1a1f1a] rounded-2xl p-4 border border-[#2c332c] focus-within:border-[#636b2f]/50 transition-colors">
              <input type="url" className="bg-transparent border-none text-white w-full focus:ring-0 placeholder:text-gray-600 outline-none"
                placeholder="https://..." value={webUrl} onChange={(e) => setWebUrl(e.target.value)} />
            </div>
            {importError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-300 text-xs font-medium leading-relaxed">{importError}</p>
              </div>
            )}
            <button onClick={handleImportWeb} disabled={isImporting || !webUrl.trim()}
              className="w-full bg-[#636b2f] text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all">
              <span className={`material-symbols-outlined ${isImporting ? 'animate-spin' : ''}`}>
                {isImporting ? 'sync' : 'auto_fix_high'}
              </span>
              {isImporting ? 'Reading with Claude…' : 'Import Recipe'}
            </button>
            <p className="text-[9px] text-gray-500 text-center px-4 leading-relaxed">
              Claude fetches the page and extracts the full recipe — ingredients, steps, and source info.
            </p>
          </div>
        )}

        {/* Manual form */}
        {method === 'Manual' && (
          <div className="space-y-6">
            {/* Cover photo */}
            <div className="px-4 pt-4">
              <div onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video bg-[#1a1f1a] rounded-2xl border-2 border-dashed border-[#2c332c] flex flex-col items-center justify-center gap-2 overflow-hidden cursor-pointer">
                {coverPhoto
                  ? <img src={coverPhoto} className="w-full h-full object-cover" alt="cover" />
                  : <><span className="material-symbols-outlined text-[#636b2f] text-3xl">add_a_photo</span><p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Recipe Portrait</p></>
                }
              </div>
            </div>

            <div className="px-4 space-y-4">
              <label className="block">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Recipe Name</p>
                <input className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-14 px-4 font-bold outline-none"
                  placeholder="e.g. Garlic Confit Pasta" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>

              <label className="block">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Short Description</p>
                <textarea className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-20 px-4 py-3 font-medium text-sm resize-none outline-none"
                  placeholder="A brief summary…" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Category</p>
                  <select className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 px-4 appearance-none outline-none"
                    value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option>Main</option><option>Side</option><option>Appetizer</option>
                    <option>Beverage</option><option>Breakfast</option><option>Dessert</option>
                  </select>
                </label>
                <label className="block">
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Difficulty</p>
                  <select className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 px-4 appearance-none outline-none"
                    value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
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
                <textarea className="bg-[#1a1f1a] border border-[#2c332c] focus:border-[#636b2f] text-white w-full rounded-xl h-16 px-4 py-3 font-medium text-sm resize-none outline-none"
                  placeholder="Secret technique…" value={chefTip} onChange={(e) => setChefTip(e.target.value)} />
              </label>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 ml-1">
                  <span className="material-symbols-outlined text-sm text-white/40">menu_book</span>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Source <span className="text-white/20 normal-case font-medium tracking-normal">(optional)</span></p>
                </div>
                <input className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 px-4 font-medium text-sm outline-none" placeholder="Cookbook title or website name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
                <input className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 px-4 font-medium text-sm outline-none" placeholder="Author (for books)" value={sourceAuthor} onChange={(e) => setSourceAuthor(e.target.value)} />
                <input type="url" className="bg-[#1a1f1a] border border-[#2c332c] text-white w-full rounded-xl h-12 px-4 font-medium text-sm outline-none" placeholder="https://…" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
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
                  <p className="text-[9px] font-black text-[#636b2f]/60 uppercase tracking-[0.2em] mb-1">Clean Names Only</p>
                  <p className="text-[10px] text-[#636b2f] font-medium leading-tight">Descriptors (minced, diced…) are stripped automatically on blur</p>
                </div>
                {ingredients.map((ing, idx) => {
                  const unitError = ing.unit && !isUnitValid(ing.unit);
                  return (
                    <div key={idx} className="flex flex-col gap-2 p-3 bg-[#1a1f1a] rounded-2xl border border-white/5">
                      <div className="flex gap-2">
                        <input type="number" className="bg-[#121612] text-white w-16 rounded-xl h-12 text-center outline-none" placeholder="Qty" value={ing.amount || ''} onChange={(e) => handleUpdateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)} />
                        <div className="relative flex-1">
                          <input className={`bg-[#121612] w-full rounded-xl h-12 px-4 outline-none text-sm ${unitError ? 'ring-2 ring-amber-500/50 text-amber-500' : 'text-[#636b2f] font-bold'}`}
                            placeholder="Unit (tsp, cup…)" value={ing.unit} onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value.toLowerCase())} />
                          {unitError && <span className="absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-amber-500 text-sm">warning</span>}
                        </div>
                      </div>
                      <input className="bg-[#121612] text-white flex-1 rounded-xl h-12 px-4 outline-none font-medium"
                        placeholder="Ingredient Name (e.g. Garlic)"
                        value={ing.name}
                        onChange={(e) => handleUpdateIngredient(idx, 'name', e.target.value)}
                        onBlur={() => handleIngredientBlur(idx)} />
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
                    <textarea className="bg-[#1a1f1a] text-gray-300 flex-1 rounded-xl p-4 min-h-[80px] text-sm outline-none resize-none"
                      placeholder="Instruction text…" value={step}
                      onChange={(e) => { const u = [...instructions]; u[idx] = e.target.value; setInstructions(u); }} />
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
        <button onClick={handleSave} disabled={!allUnitsValid || method === 'Web'}
          className="w-full bg-[#636b2f] disabled:grayscale disabled:opacity-30 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined">save</span>
          {method === 'Web' ? 'Import a Recipe First' : allUnitsValid ? 'Commit to Ledger' : 'Fix Units to Save'}
        </button>
      </div>
    </div>
  );
};

export default AddRecipeManual;
