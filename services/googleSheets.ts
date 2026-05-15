/**
 * Mise en Place - Google Sheets Relational Connector
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
const HARDCODED_SPREADSHEET_ID = '16ADJZBC80b4hF_TBqZP_4pCmBYVeMwtFNWLx59-Wyds';
const GOOGLE_API_KEY = 'AIzaSyDFc2raCSZfnfyM5n1fwrsbUco1njqHHMk';

const safeGet = (row: any[], index: number, fallback: string = ''): string => {
  if (!row || index < 0 || index >= row.length) return fallback;
  const val = row[index];
  return val === undefined || val === null ? fallback : String(val);
};

export async function fetchFullAppData(
  spreadsheetId: string | null,
  onProgress?: (tab: string, current: number, total: number) => void
): Promise<{
  recipes: Recipe[];
  recipeIds: string[];              // ← for duplicate-safe ID generation
  masters: MasterIngredient[];
  storeMappings: StoreMapping[];
  myItems: MyItem[];
  pantry: PantryItem[];
  collectionImages: Record<string, string>;
  mealPlans: MealPlan[];
} | null> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  try {
    const fetchTab = async (tabName: string) => {
      const range = `${tabName}!A2:Z10000`;
      const url = `${GOOGLE_SHEETS_API_BASE}/${targetId}/values/${range}?key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      return data.values || [];
    };

    const [recipeRows, ingredientRows, componentRows, myItemRows, pantryRows, collectionImageRows, mealLogRows] = await Promise.all([
      fetchTab('Recipes'),
      fetchTab('Ingredients'),
      fetchTab('Components'),
      fetchTab('My Items'),
      fetchTab('Pantry Stock'),
      fetchTab('Collection Images'),
      fetchTab('Meal Logs'),
    ]);

    const pantry: PantryItem[] = (pantryRows || []).map(row => {
      const name = safeGet(row, 0);
      if (!name) return null;
      return {
        name,
        inStock: safeGet(row, 1, 'No').toLowerCase() === 'yes',
        lowStock: safeGet(row, 2, 'No').toLowerCase() === 'yes',
        quantity: parseFloat(safeGet(row, 3, '0')),
        unit: safeGet(row, 4, 'unit'),
        lastUpdated: safeGet(row, 5),
        category: 'Other',
        icon: 'inventory_2'
      };
    }).filter((item): item is PantryItem => item !== null);

    const masters: MasterIngredient[] = [];
    const storeMappings: StoreMapping[] = [];
    (ingredientRows || []).forEach((row) => {
      const name = safeGet(row, 0);
      if (!name) return;
      masters.push({
        name,
        recipeUnit: safeGet(row, 2, 'unit'),
        purchaseUnit: safeGet(row, 9, 'Unit'),
        unitsPerPurchase: parseFloat(safeGet(row, 11, '1')) || 1,
        isStaple: true,
        category: safeGet(row, 1, 'Other'),
        details: safeGet(row, 14, '')
      });
      // ColF=5=Monroe, ColG=6=Perinton, ColH=7=East
      // Each cell contains "13A R4" — aisle + shelf together
      storeMappings.push({
        ingredientName: name,
        department: safeGet(row, 1, 'Other'),
        aisle: {
          Monroe: safeGet(row, 5, ''),
          Perinton: safeGet(row, 6, ''),
          East: safeGet(row, 7, '')
        },
        shelf: {
          Monroe: '',
          Perinton: '',
          East: ''
        }
      });
    });

    pantry.forEach(pItem => {
      const master = masters.find(m => m.name.toLowerCase() === pItem.name.toLowerCase());
      if (master) {
        pItem.category = master.category;
        if (master.category?.includes('Dairy')) pItem.icon = 'egg_alt';
        else if (master.category?.includes('Produce')) pItem.icon = 'eco';
        else if (master.category?.includes('Meat')) pItem.icon = 'restaurant';
        else if (master.category?.includes('Baking')) pItem.icon = 'bakery_dining';
      }
    });

    const myItems: MyItem[] = (myItemRows || []).map(row => ({
      name: safeGet(row, 0),
      category: safeGet(row, 1, 'Other'),
      packages: parseFloat(safeGet(row, 2, '1')) || 1,
      buyAs: safeGet(row, 3, 'Unit'),
      aisle: {
        Monroe: safeGet(row, 4, ''),
        Perinton: safeGet(row, 5, ''),
        East: safeGet(row, 6, '')
      },
      shelf: { Monroe: '', Perinton: '', East: '' }
    })).filter(i => i.name);

    const componentMap: Record<string, RecipeIngredient[]> = {};
    (componentRows || []).forEach(row => {
      const rId = safeGet(row, 0);
      if (!rId) return;
      if (!componentMap[rId]) componentMap[rId] = [];
      componentMap[rId].push({
        name: safeGet(row, 1),
        amount: parseFloat(safeGet(row, 2, '0')) || 0,
        unit: safeGet(row, 3, 'unit')
      });
    });

    const recipes: Recipe[] = (recipeRows || []).map(row => {
      const rId = safeGet(row, 0);
      if (!rId) return null;
      const rawInst = safeGet(row, 11);
      const isFav = safeGet(row, 13, 'FALSE').toUpperCase() === 'TRUE';
      return {
        id: rId,
        title: safeGet(row, 1, 'Untitled'),
        category: safeGet(row, 2, 'Main'),
        difficulty: safeGet(row, 7, 'Medium'),
        prepTime: parseInt(safeGet(row, 5)) || 0,
        cookTime: parseInt(safeGet(row, 6)) || 0,
        baseServings: parseInt(safeGet(row, 4)) || 4,
        description: safeGet(row, 9),
        chefTip: safeGet(row, 10),
        imageUrl: safeGet(row, 12),
        ingredients: componentMap[rId] || [],
        instructions: rawInst.includes('\n') ? rawInst.split('\n').filter(s => s.trim()) : [rawInst],
        isFavorite: isFav,
        dateAdded: safeGet(row, 14, new Date().toISOString()),
        sourceName: safeGet(row, 16) || undefined,
        sourceAuthor: safeGet(row, 17) || undefined,
        sourceUrl: safeGet(row, 18) || undefined,
      };
    }).filter((r): r is Recipe => r !== null);

    const recipeIds = recipes.map(r => r.id);

    const collectionImages: Record<string, string> = {};
    (collectionImageRows || []).forEach(row => {
      const name = safeGet(row, 0).trim();
      const url = safeGet(row, 1).trim();
      if (name && url) collectionImages[name] = url;
    });

    // Meal Logs: A=Date, B=MealType, C=RecipeId, D=Servings, E=Status
    const mealPlans: MealPlan[] = (mealLogRows || [])
      .map((row) => {
        const date = safeGet(row, 0);
        const mealType = safeGet(row, 1) as MealPlan['mealType'];
        const recipeId = safeGet(row, 2);
        const servings = parseInt(safeGet(row, 3, '4')) || 4;
        const status = safeGet(row, 4, 'Planned');
        if (!date || !recipeId || status !== 'Planned') return null;
        return { date, mealType, recipeId, servings } as MealPlan;
      })
      .filter((p): p is MealPlan => p !== null);

    return { recipes, recipeIds, masters, storeMappings, myItems, pantry, collectionImages, mealPlans };
  } catch (err) { return null; }
}

export async function saveMealPlanToSheet(
  spreadsheetId: string,
  plan: MealPlan,
  accessToken: string | null
): Promise<boolean> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  if (!accessToken || accessToken.startsWith('mock_')) return true;
  try {
    const row = [plan.date, plan.mealType, plan.recipeId, plan.servings, 'Planned'];
    await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Meal Logs!A:E:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ range: 'Meal Logs!A:E', majorDimension: 'ROWS', values: [row] }),
    });
    return true;
  } catch (err) { return false; }
}

export async function markMealAsCooked(
  spreadsheetId: string,
  recipeId: string,
  date: string,
  accessToken: string | null
): Promise<boolean> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  if (!accessToken || accessToken.startsWith('mock_')) return true;
  try {
    const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Meal Logs!A:E?key=${GOOGLE_API_KEY}`);
    const data = await res.json();
    const rows: any[][] = data.values || [];
    const rowIdx = rows.findIndex(r => r[0] === date && r[2] === recipeId && (r[4] || 'Planned') === 'Planned');
    if (rowIdx === -1) return false;
    const range = `Meal Logs!E${rowIdx + 1}`;
    await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/${range}?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values: [['Cooked']] }),
    });
    return true;
  } catch (err) { return false; }
}

export async function removeMealPlanFromSheet(
  spreadsheetId: string,
  recipeId: string,
  date: string,
  mealType: string,
  accessToken: string | null
): Promise<boolean> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  if (!accessToken || accessToken.startsWith('mock_')) return true;
  try {
    const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Meal Logs!A:E?key=${GOOGLE_API_KEY}`);
    const data = await res.json();
    const rows: any[][] = data.values || [];
    const rowIdx = rows.findIndex(r => r[0] === date && r[1] === mealType && r[2] === recipeId && (r[4] || 'Planned') === 'Planned');
    if (rowIdx === -1) return true;
    const range = `Meal Logs!A${rowIdx + 1}:E${rowIdx + 1}`;
    await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/${range}:clear?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    });
    return true;
  } catch (err) { return false; }
}

export async function saveRecipeToSheet(
  spreadsheetId: string,
  recipe: Recipe,
  accessToken: string | null,
  existingMasters: MasterIngredient[] = []
): Promise<boolean> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  if (!accessToken) return false;

  try {
    // A=ID, B=Title, C=Category, D=Serves, E=Prep, F=Cook, G=Difficulty,
    // H=Score, I=Description, J=ChefTip, K=Instructions, L=Image,
    // M=unused, N=Favorites, O=DateAdded, P=unused,
    // Q=SourceName, R=SourceAuthor, S=SourceURL
    const recipeRow = [
      recipe.id,
      recipe.title,
      recipe.category,
      recipe.baseServings,
      recipe.prepTime,
      recipe.cookTime,
      recipe.difficulty,
      0,
      recipe.description,
      recipe.chefTip,
      recipe.instructions.join('\n'),
      recipe.imageUrl || '',
      '',
      'FALSE',
      new Date().toISOString(),
      '',
      recipe.sourceName || '',
      recipe.sourceAuthor || '',
      recipe.sourceUrl || '',
    ];

    await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Recipes!A:S:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ range: 'Recipes!A:S', majorDimension: 'ROWS', values: [recipeRow] })
    });

    const componentRows = recipe.ingredients.map(ing => [recipe.id, ing.name, ing.amount, ing.unit]);
    if (componentRows.length > 0) {
      await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Components!A:D:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ range: 'Components!A:D', majorDimension: 'ROWS', values: componentRows })
      });
    }

    const newIngredients: any[] = [];
    const masterNames = new Set(existingMasters.map(m => m.name.toLowerCase()));
    recipe.ingredients.forEach(ing => {
      if (!masterNames.has(ing.name.toLowerCase())) {
        const newRow = new Array(15).fill('');
        newRow[0] = ing.name;
        newRow[1] = 'Other';
        newRow[2] = ing.unit;
        newRow[9] = 'Unit';
        newRow[11] = 1;
        newIngredients.push(newRow);
        masterNames.add(ing.name.toLowerCase());
      }
    });

    if (newIngredients.length > 0) {
      await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Ingredients!A:O:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ range: 'Ingredients!A:O', majorDimension: 'ROWS', values: newIngredients })
      });
    }

    return true;
  } catch (err) {
    console.error('Save Recipe Transaction Failed:', err);
    return false;
  }
}

export async function updateRecipeFavoriteInSheet(
  spreadsheetId: string,
  recipeId: string,
  isFavorite: boolean,
  accessToken: string | null
): Promise<boolean> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  if (!accessToken || accessToken.startsWith('mock_')) return true;
  try {
    const url = `${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Recipes!A:A?key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.values || [];
    const rowIdx = rows.findIndex((r: any[]) => r[0] === recipeId);
    if (rowIdx !== -1) {
      const range = `Recipes!N${rowIdx + 2}`;
      await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/${range}?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ range, majorDimension: 'ROWS', values: [[isFavorite ? 'TRUE' : 'FALSE']] })
      });
      return true;
    }
    return false;
  } catch (err) { return false; }
}

export async function restockPantryFromShopping(
  spreadsheetId: string,
  items: ShoppingListItem[],
  accessToken: string | null
): Promise<boolean> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  if (!accessToken || accessToken.startsWith('mock_')) return true;
  try {
    const pantryRes = await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Pantry Stock!A:F?key=${GOOGLE_API_KEY}`);
    const pantryData = await pantryRes.json();
    const rows = pantryData.values || [];
    const today = new Date().toLocaleDateString();

    for (const item of items) {
      // myItem and manual sources do NOT touch pantry stock
      if (item.source !== 'recipe') continue;

      const rowIdx = rows.findIndex((r: any[]) => r[0]?.toLowerCase().trim() === item.name.toLowerCase().trim());
      const currentQty = rowIdx !== -1 ? parseFloat(rows[rowIdx][3]) || 0 : 0;
      const addedVolume = item.unitsToBuy * item.unitsPerPurchase;
      const finalQty = currentQty + addedVolume;

      if (rowIdx !== -1) {
        const updateRange = `Pantry Stock!D${rowIdx + 1}:F${rowIdx + 1}`;
        await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/${updateRange}?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ range: updateRange, majorDimension: 'ROWS', values: [[finalQty, item.unit, today]] })
        });
      } else {
        const newRow = [item.name, 'Yes', 'No', finalQty, item.unit, today];
        await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Pantry Stock!A:F:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ range: 'Pantry Stock!A:F', majorDimension: 'ROWS', values: [newRow] })
        });
      }
    }
    return true;
  } catch (err) { return false; }
}

export async function consumeIngredientsFromPantry(
  spreadsheetId: string,
  items: ShoppingListItem[],
  accessToken: string | null
): Promise<boolean> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  if (!accessToken || accessToken.startsWith('mock_')) return true;
  try {
    const pantryRes = await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Pantry Stock!A:F?key=${GOOGLE_API_KEY}`);
    const pantryData = await pantryRes.json();
    const rows = pantryData.values || [];
    const today = new Date().toLocaleDateString();
    for (const item of items) {
      if (item.source !== 'recipe') continue;
      const rowIdx = rows.findIndex((r: any[]) => r[0]?.toLowerCase().trim() === item.name.toLowerCase().trim());
      if (rowIdx !== -1) {
        const currentQty = parseFloat(rows[rowIdx][3]) || 0;
        const finalQty = Math.max(0, currentQty - item.totalQuantityNeeded);
        const updateRange = `Pantry Stock!D${rowIdx + 1}:F${rowIdx + 1}`;
        await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/${updateRange}?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({ range: updateRange, majorDimension: 'ROWS', values: [[finalQty, item.unit, today]] })
        });
      }
    }
    return true;
  } catch (err) { return false; }
}

export async function addMasterToPantry(spreadsheetId: string, master: MasterIngredient, accessToken: string | null): Promise<boolean> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  if (!accessToken || accessToken.startsWith('mock_')) return true;
  try {
    const res = await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Pantry Stock!A:A?key=${GOOGLE_API_KEY}`);
    const data = await res.json();
    const rows = data.values || [];
    const exists = rows.some((r: any[]) => r[0]?.toLowerCase() === master.name.toLowerCase());
    const today = new Date().toLocaleDateString();
    if (exists) {
      const rowIdx = rows.findIndex((r: any[]) => r[0]?.toLowerCase() === master.name.toLowerCase());
      await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Pantry Stock!B${rowIdx + 1}:C${rowIdx + 1}?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ range: `Pantry Stock!B${rowIdx + 1}:C${rowIdx + 1}`, majorDimension: 'ROWS', values: [['Yes', 'No']] })
      });
    } else {
      await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/Pantry Stock!A:F:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ range: 'Pantry Stock!A:F', majorDimension: 'ROWS', values: [[master.name, 'Yes', 'No', master.unitsPerPurchase, master.recipeUnit, today]] })
      });
    }
    return true;
  } catch (err) { return false; }
}

export async function addNewMyItemToSheet(spreadsheetId: string, data: any, accessToken: string | null): Promise<boolean> {
  const targetId = spreadsheetId || HARDCODED_SPREADSHEET_ID;
  if (!accessToken || accessToken.startsWith('mock_')) return true;
  try {
    await fetch(`${GOOGLE_SHEETS_API_BASE}/${targetId}/values/My Items!A:G:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ range: 'My Items!A:G', majorDimension: 'ROWS', values: [[data.name, data.category, data.packages, data.buyAs, data.monroe, data.perinton, data.east]] })
    });
    return true;
  } catch (err) { return false; }
}

export async function updateUserProfile(spreadsheetId: string, data: any, accessToken: string | null): Promise<boolean> { return true; }
export async function addNewPantryItemToSheet(spreadsheetId: string, data: any, accessToken: string | null): Promise<boolean> { return true; }
export async function updateStoreAisleInSheet(spreadsheetId: string, ingredientName: string, store: any, aisleData: string, accessToken: string | null): Promise<boolean> { return true; }
export async function fetchSheetHeaders(spreadsheetId: string | null): Promise<any> { return null; }
export async function saveSchemaToSheet(spreadsheetId: string, schema: any, accessToken: string | null): Promise<boolean> { return true; }
export async function saveDeviceToken(spreadsheetId: string, token: string, email: string, accessToken: string | null): Promise<boolean> { return true; }
