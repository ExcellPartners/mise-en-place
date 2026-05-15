/**
 * Mise en Place - Google Sheets Service
 * Reads: direct via API key (public, no auth needed)
 * Writes: via /api/claude proxy using service account (no OAuth token needed)
 */
import { Recipe, RecipeIngredient, MasterIngredient, StoreMapping, ShoppingListItem, MyItem, PantryItem, MealPlan } from '../types';

export interface SheetMappingSchema {
  recipes: Record<string, string>;
  ingredients: Record<string, string>;
  components: Record<string, string>;
  mealLogs: Record<string, string>;
  pantryStock: Record<string, string>;
}

export const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const ID = '16ADJZBC80b4hF_TBqZP_4pCmBYVeMwtFNWLx59-Wyds';
const KEY = 'AIzaSyDFc2raCSZfnfyM5n1fwrsbUco1njqHHMk';

const safeGet = (row: any[], index: number, fallback = ''): string => {
  if (!row || index < 0 || index >= row.length) return fallback;
  const val = row[index];
  return val === undefined || val === null ? fallback : String(val);
};

// All writes go through this — service account handles auth server-side
async function sheetWrite(url: string, body: any, method = 'POST'): Promise<any> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sheetWrite', sheetWrite: { method, url, body } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Sheet write failed ${res.status}`);
  return data;
}

const appendUrl = (tab: string, range: string) =>
  `${GOOGLE_SHEETS_API_BASE}/${ID}/values/${encodeURIComponent(tab)}!${range}:append?valueInputOption=USER_ENTERED&key=${KEY}`;

const putUrl = (range: string) =>
  `${GOOGLE_SHEETS_API_BASE}/${ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED&key=${KEY}`;

const clearUrl = (range: string) =>
  `${GOOGLE_SHEETS_API_BASE}/${ID}/values/${encodeURIComponent(range)}:clear?key=${KEY}`;

// ── Read ───────────────────────────────────────────────────────────────────────
export async function fetchFullAppData(
  _spreadsheetId: string | null,
  _onProgress?: (tab: string, current: number, total: number) => void
): Promise<{
  recipes: Recipe[];
  recipeIds: string[];
  masters: MasterIngredient[];
  storeMappings: StoreMapping[];
  myItems: MyItem[];
  pantry: PantryItem[];
  collectionImages: Record<string, string>;
  mealPlans: MealPlan[];
} | null> {
  try {
    const fetchTab = async (tab: string) => {
      const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${ID}/values/${encodeURIComponent(tab)}!A2:Z10000?key=${KEY}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.values || [];
    };

    const [recipeRows, ingredientRows, componentRows, myItemRows, pantryRows, collectionImageRows, mealLogRows] = await Promise.all([
      fetchTab('Recipes'), fetchTab('Ingredients'), fetchTab('Components'),
      fetchTab('My Items'), fetchTab('Pantry Stock'), fetchTab('Collection Images'), fetchTab('Meal Logs'),
    ]);

    const pantry: PantryItem[] = (pantryRows || []).map((row: any[]) => {
      const name = safeGet(row, 0);
      if (!name) return null;
      return {
        name,
        inStock: safeGet(row, 1, 'No').toLowerCase() === 'yes',
        lowStock: safeGet(row, 2, 'No').toLowerCase() === 'yes',
        quantity: parseFloat(safeGet(row, 3, '0')),
        unit: safeGet(row, 4, 'unit'),
        lastUpdated: safeGet(row, 5),
        category: 'Other', icon: 'inventory_2'
      };
    }).filter(Boolean) as PantryItem[];

    const masters: MasterIngredient[] = [];
    const storeMappings: StoreMapping[] = [];
    (ingredientRows || []).forEach((row: any[]) => {
      const name = safeGet(row, 0);
      if (!name) return;
      masters.push({
        name, recipeUnit: safeGet(row, 2, 'unit'), purchaseUnit: safeGet(row, 9, 'Unit'),
        unitsPerPurchase: parseFloat(safeGet(row, 11, '1')) || 1,
        isStaple: true, category: safeGet(row, 1, 'Other'), details: safeGet(row, 14, '')
      });
      // ColF=Monroe, ColG=Perinton, ColH=East — full location string e.g. "13A R4"
      storeMappings.push({
        ingredientName: name, department: safeGet(row, 1, 'Other'),
        aisle: { Monroe: safeGet(row, 5, ''), Perinton: safeGet(row, 6, ''), East: safeGet(row, 7, '') },
        shelf: { Monroe: '', Perinton: '', East: '' }
      });
    });

    pantry.forEach(p => {
      const m = masters.find(m => m.name.toLowerCase() === p.name.toLowerCase());
      if (m) {
        p.category = m.category;
        if (m.category?.includes('Dairy')) p.icon = 'egg_alt';
        else if (m.category?.includes('Produce')) p.icon = 'eco';
        else if (m.category?.includes('Meat')) p.icon = 'restaurant';
        else if (m.category?.includes('Baking')) p.icon = 'bakery_dining';
      }
    });

    const myItems: MyItem[] = (myItemRows || []).map((row: any[]) => ({
      name: safeGet(row, 0), category: safeGet(row, 1, 'Other'),
      packages: parseFloat(safeGet(row, 2, '1')) || 1, buyAs: safeGet(row, 3, 'Unit'),
      aisle: { Monroe: safeGet(row, 4, ''), Perinton: safeGet(row, 5, ''), East: safeGet(row, 6, '') },
      shelf: { Monroe: '', Perinton: '', East: '' }
    })).filter((i: any) => i.name);

    const componentMap: Record<string, RecipeIngredient[]> = {};
    (componentRows || []).forEach((row: any[]) => {
      const rId = safeGet(row, 0);
      if (!rId) return;
      if (!componentMap[rId]) componentMap[rId] = [];
      componentMap[rId].push({ name: safeGet(row, 1), amount: parseFloat(safeGet(row, 2, '0')) || 0, unit: safeGet(row, 3, 'unit') });
    });

    const recipes: Recipe[] = (recipeRows || []).map((row: any[]) => {
      const rId = safeGet(row, 0);
      if (!rId) return null;
      const rawInst = safeGet(row, 11);
      return {
        id: rId, title: safeGet(row, 1, 'Untitled'), category: safeGet(row, 2, 'Main'),
        difficulty: safeGet(row, 7, 'Medium'), prepTime: parseInt(safeGet(row, 5)) || 0,
        cookTime: parseInt(safeGet(row, 6)) || 0, baseServings: parseInt(safeGet(row, 4)) || 4,
        description: safeGet(row, 9), chefTip: safeGet(row, 10), imageUrl: safeGet(row, 12),
        ingredients: componentMap[rId] || [],
        instructions: rawInst.includes('\n') ? rawInst.split('\n').filter((s: string) => s.trim()) : [rawInst],
        isFavorite: safeGet(row, 13, 'FALSE').toUpperCase() === 'TRUE', // N
        dateAdded: safeGet(row, 14, new Date().toISOString()),
        sourceName: safeGet(row, 16) || undefined,  // Q
        sourceAuthor: safeGet(row, 17) || undefined, // R
        sourceUrl: safeGet(row, 18) || undefined,   // S
      };
    }).filter(Boolean) as Recipe[];

    const recipeIds = recipes.map(r => r.id);

    const collectionImages: Record<string, string> = {};
    (collectionImageRows || []).forEach((row: any[]) => {
      const name = safeGet(row, 0).trim();
      const url = safeGet(row, 1).trim();
      if (name && url) collectionImages[name] = url;
    });

    const mealPlans: MealPlan[] = (mealLogRows || []).map((row: any[]) => {
      const date = safeGet(row, 0); const recipeId = safeGet(row, 2);
      const status = safeGet(row, 4, 'Planned');
      if (!date || !recipeId || status !== 'Planned') return null;
      return { date, mealType: safeGet(row, 1) as MealPlan['mealType'], recipeId, servings: parseInt(safeGet(row, 3, '4')) || 4 };
    }).filter(Boolean) as MealPlan[];

    return { recipes, recipeIds, masters, storeMappings, myItems, pantry, collectionImages, mealPlans };
  } catch (err) { console.error('fetchFullAppData failed:', err); return null; }
}

// ── Recipe save ────────────────────────────────────────────────────────────────
export async function saveRecipeToSheet(
  _spreadsheetId: string,
  recipe: Recipe,
  _accessToken: string | null,
  existingMasters: MasterIngredient[] = []
): Promise<boolean> {
  try {
    const tr = (s: string | undefined, max = 45000) => (s?.startsWith('data:') ? '' : (s || '')).slice(0, max);
    const recipeRow = [
      recipe.id,                                        // A - Recipe ID
      recipe.title,                                     // B - Recipe Name
      recipe.category,                                  // C - Category
      recipe.ingredients.length,                        // D - # of Ingredients
      recipe.baseServings,                              // E - Serves or Makes
      recipe.prepTime,                                  // F - Prep (Minutes)
      recipe.cookTime,                                  // G - Cook (Minutes)
      recipe.difficulty,                                // H - Difficulty
      0,                                                // I - Score
      tr(recipe.description, 2000),                     // J - Description
      tr(recipe.chefTip, 1000),                         // K - Chef's Tip
      tr(recipe.instructions.join('\n'), 40000),       // L - Instructions
      tr(recipe.imageUrl, 500),                         // M - Picture
      'FALSE',                                          // N - Favorites
      'FALSE',                                          // O - Complete Meal
      '',                                               // P - Protein
      tr(recipe.sourceName, 200),                       // Q - SourceName
      tr(recipe.sourceAuthor, 200),                     // R - SourceAuthor
      tr(recipe.sourceUrl, 500),                        // S - SourceURL
    ];

    await sheetWrite(appendUrl('Recipes', 'A:S'), { range: 'Recipes!A:S', majorDimension: 'ROWS', values: [recipeRow] });

    const componentRows = recipe.ingredients.map(ing => [recipe.id, ing.name, ing.amount, ing.unit]);
    if (componentRows.length > 0) {
      await sheetWrite(appendUrl('Components', 'A:D'), { range: 'Components!A:D', majorDimension: 'ROWS', values: componentRows });
    }

    const masterNames = new Set(existingMasters.map(m => m.name.toLowerCase()));
    const newIngredients: any[] = [];
    recipe.ingredients.forEach(ing => {
      if (!masterNames.has(ing.name.toLowerCase())) {
        const row = new Array(15).fill('');
        row[0] = ing.name; row[1] = 'Other'; row[2] = ing.unit; row[9] = 'Unit'; row[11] = 1;
        newIngredients.push(row);
        masterNames.add(ing.name.toLowerCase());
      }
    });
    if (newIngredients.length > 0) {
      await sheetWrite(appendUrl('Ingredients', 'A:O'), { range: 'Ingredients!A:O', majorDimension: 'ROWS', values: newIngredients });
    }

    return true;
  } catch (err) { console.error('saveRecipeToSheet failed:', err); return false; }
}

// ── Favorites ──────────────────────────────────────────────────────────────────
export async function updateRecipeFavoriteInSheet(
  _spreadsheetId: string, recipeId: string, isFavorite: boolean, _accessToken: string | null
): Promise<boolean> {
  try {
    const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${ID}/values/Recipes!A:A?key=${KEY}`);
    const data = await res.json();
    const rows = data.values || [];
    const rowIdx = rows.findIndex((r: any[]) => r[0] === recipeId);
    if (rowIdx === -1) return false;
    const range = `Recipes!N${rowIdx + 2}`;
    await sheetWrite(putUrl(range), { range, majorDimension: 'ROWS', values: [[isFavorite ? 'TRUE' : 'FALSE']] }, 'PUT');
    return true;
  } catch (err) { return false; }
}

// ── Meal Plans ─────────────────────────────────────────────────────────────────
export async function saveMealPlanToSheet(_spreadsheetId: string, plan: MealPlan, _accessToken: string | null): Promise<boolean> {
  try {
    await sheetWrite(appendUrl('Meal Logs', 'A:E'), { range: 'Meal Logs!A:E', majorDimension: 'ROWS', values: [[plan.date, plan.mealType, plan.recipeId, plan.servings, 'Planned']] });
    return true;
  } catch (err) { return false; }
}

export async function markMealAsCooked(_spreadsheetId: string, recipeId: string, date: string, _accessToken: string | null): Promise<boolean> {
  try {
    const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${ID}/values/Meal%20Logs!A:E?key=${KEY}`);
    const data = await res.json();
    const rows: any[][] = data.values || [];
    const rowIdx = rows.findIndex(r => r[0] === date && r[2] === recipeId && (r[4] || 'Planned') === 'Planned');
    if (rowIdx === -1) return false;
    const range = `Meal Logs!E${rowIdx + 1}`;
    await sheetWrite(putUrl(range), { range, majorDimension: 'ROWS', values: [['Cooked']] }, 'PUT');
    return true;
  } catch (err) { return false; }
}

export async function removeMealPlanFromSheet(_spreadsheetId: string, recipeId: string, date: string, mealType: string, _accessToken: string | null): Promise<boolean> {
  try {
    const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${ID}/values/Meal%20Logs!A:E?key=${KEY}`);
    const data = await res.json();
    const rows: any[][] = data.values || [];
    const rowIdx = rows.findIndex(r => r[0] === date && r[1] === mealType && r[2] === recipeId && (r[4] || 'Planned') === 'Planned');
    if (rowIdx === -1) return true;
    const range = `Meal Logs!A${rowIdx + 1}:E${rowIdx + 1}`;
    await sheetWrite(clearUrl(range), {}, 'POST');
    return true;
  } catch (err) { return false; }
}

// ── Pantry ─────────────────────────────────────────────────────────────────────
export async function restockPantryFromShopping(_spreadsheetId: string, items: ShoppingListItem[], _accessToken: string | null): Promise<boolean> {
  try {
    // Read full pantry including col G (LastPurchasedDate)
    const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${ID}/values/Pantry%20Stock!A:G?key=${KEY}`);
    const data = await res.json();
    const rows: any[][] = data.values || [];
    const today = new Date().toLocaleDateString();

    for (const item of items) {
      // Only recipe-sourced items touch pantry; manual quick-adds and myItems do not
      if (item.source !== 'recipe') continue;

      // Find existing row by name (case-insensitive, trimmed)
      const rowIdx = rows.findIndex(r =>
        (r[0] || '').toLowerCase().trim() === item.name.toLowerCase().trim()
      );

      const addedQty = (item.unitsToBuy || 1) * (item.unitsPerPurchase || 1);

      if (rowIdx !== -1) {
        // Row exists — ADD to current quantity, update date in ColG
        const currentQty = parseFloat(rows[rowIdx][3]) || 0;
        const finalQty = currentQty + addedQty;
        const range = `Pantry Stock!D${rowIdx + 1}:G${rowIdx + 1}`;
        await sheetWrite(
          putUrl(range),
          { range, majorDimension: 'ROWS', values: [[finalQty, item.unit, '', today]] },
          'PUT'
        );
        // Update our local copy so subsequent items in the same batch see correct qty
        rows[rowIdx][3] = String(finalQty);
        rows[rowIdx][6] = today;
      } else {
        // New item — append a new row
        await sheetWrite(
          appendUrl('Pantry Stock', 'A:G'),
          { range: 'Pantry Stock!A:G', majorDimension: 'ROWS', values: [[item.name, 'Yes', 'No', addedQty, item.unit, '', today]] }
        );
        // Add to local copy so duplicates in same batch don't create two rows
        rows.push([item.name, 'Yes', 'No', String(addedQty), item.unit, '', today]);
      }
    }
    return true;
  } catch (err) { console.error('restockPantryFromShopping failed:', err); return false; }
}

export async function consumeIngredientsFromPantry(_spreadsheetId: string, items: ShoppingListItem[], _accessToken: string | null): Promise<boolean> {
  try {
    const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${ID}/values/Pantry%20Stock!A:F?key=${KEY}`);
    const data = await res.json();
    const rows = data.values || [];
    const today = new Date().toLocaleDateString();

    for (const item of items) {
      if (item.source !== 'recipe') continue;
      const rowIdx = rows.findIndex((r: any[]) => r[0]?.toLowerCase().trim() === item.name.toLowerCase().trim());
      if (rowIdx !== -1) {
        const finalQty = Math.max(0, (parseFloat(rows[rowIdx][3]) || 0) - item.totalQuantityNeeded);
        const range = `Pantry Stock!D${rowIdx + 1}:G${rowIdx + 1}`;
        await sheetWrite(putUrl(range), { range, majorDimension: 'ROWS', values: [[finalQty, item.unit, '', today]] }, 'PUT');
      }
    }
    return true;
  } catch (err) { return false; }
}

export async function addMasterToPantry(_spreadsheetId: string, master: MasterIngredient, _accessToken: string | null): Promise<boolean> {
  try {
    const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${ID}/values/Pantry%20Stock!A:A?key=${KEY}`);
    const data = await res.json();
    const rows = data.values || [];
    const today = new Date().toLocaleDateString();
    const rowIdx = rows.findIndex((r: any[]) => r[0]?.toLowerCase() === master.name.toLowerCase());

    if (rowIdx !== -1) {
      const range = `Pantry Stock!B${rowIdx + 1}:C${rowIdx + 1}`;
      await sheetWrite(putUrl(range), { range, majorDimension: 'ROWS', values: [['Yes', 'No']] }, 'PUT');
    } else {
      await sheetWrite(appendUrl('Pantry Stock', 'A:G'), { range: 'Pantry Stock!A:G', majorDimension: 'ROWS', values: [[master.name, 'Yes', 'No', master.unitsPerPurchase, master.recipeUnit, '', today]] });
    }
    return true;
  } catch (err) { return false; }
}

// ── My Items ───────────────────────────────────────────────────────────────────
export async function addNewMyItemToSheet(_spreadsheetId: string, data: any, _accessToken: string | null): Promise<boolean> {
  try {
    await sheetWrite(appendUrl('My Items', 'A:G'), { range: 'My Items!A:G', majorDimension: 'ROWS', values: [[data.name, data.category, data.packages, data.buyAs, data.monroe, data.perinton, data.east]] });
    return true;
  } catch (err) { return false; }
}

// ── Stubs ──────────────────────────────────────────────────────────────────────
export async function updateUserProfile(_s: string, _d: any, _t: string | null): Promise<boolean> { return true; }
export async function addNewPantryItemToSheet(_s: string, _d: any, _t: string | null): Promise<boolean> { return true; }
export async function updateStoreAisleInSheet(_s: string, _n: string, _st: any, _a: string, _t: string | null): Promise<boolean> { return true; }
export async function fetchSheetHeaders(_s: string | null): Promise<any> { return null; }
export async function saveSchemaToSheet(_s: string, _sc: any, _t: string | null): Promise<boolean> { return true; }
export async function saveDeviceToken(_s: string, _tok: string, _e: string, _t: string | null): Promise<boolean> { return true; }
