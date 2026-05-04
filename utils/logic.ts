
import { 
  Recipe, 
  RecipeIngredient, 
  MasterIngredient, 
  ShoppingListItem, 
  MealPlan, 
  StoreMapping, 
  StoreLocation, 
  PantryItem,
  MyItem
} from '../types';

/**
 * Standard kitchen conversion factors to normalize to "Default Unit"
 */
const CONVERSION_TO_CUPS: Record<string, number> = {
  'cup': 1, 'cups': 1,
  'tbsp': 0.0625, 'tbsps': 0.0625, 'tablespoon': 0.0625, 'tablespoons': 0.0625,
  'tsp': 0.0208, 'tsps': 0.0208, 'teaspoon': 0.0208, 'teaspoons': 0.0208,
  'oz': 0.125, 'ounce': 0.125, 'ounces': 0.125,
};

const normalizeQuantity = (amount: number, unit: string, targetUnit: string): number => {
  const u = unit.toLowerCase().trim();
  const t = targetUnit.toLowerCase().trim();
  if (u === t) return amount;
  
  if (CONVERSION_TO_CUPS[u] && CONVERSION_TO_CUPS[t]) {
    const inCups = amount * CONVERSION_TO_CUPS[u];
    return inCups / CONVERSION_TO_CUPS[t];
  }
  
  return amount; 
};

export const formatImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }
  }
  return url;
};

export const pluralizeUnit = (unit: string | undefined, qty: number): string => {
  if (!unit) return '';
  if (qty <= 1) return unit;
  const lower = unit.toLowerCase().trim();
  const nonCountNouns = ['rice', 'flour', 'sugar', 'salt', 'milk', 'water', 'oil', 'garlic', 'pasta', 'cheese'];
  if (lower.endsWith('s') || nonCountNouns.includes(lower)) return unit;
  if (lower === 'box') return unit + 'es';
  if (lower === 'loaf') return unit.slice(0, -1) + 'ves';
  return unit + 's';
};

export const scaleIngredients = (recipe: Recipe, targetServings: number): RecipeIngredient[] => {
  const factor = targetServings / recipe.baseServings;
  return recipe.ingredients.map(ing => ({
    ...ing,
    amount: ing.amount * factor
  }));
};

/**
 * Aggregates raw shopping entries into consolidated items with packaging math (Col L / Col O)
 */
export const consolidateShoppingList = (
  rawEntries: { name: string; amount: number; unit: string; source: string; completed?: boolean }[],
  masters: MasterIngredient[],
  mappings: StoreMapping[],
  selectedStore: StoreLocation,
  myItems: MyItem[] = [] 
): ShoppingListItem[] => {
  const aggregateMap: Record<string, { total: number; source: string; completed: boolean }> = {};

  rawEntries.forEach(entry => {
    const master = masters.find(m => m.name.toLowerCase() === entry.name.toLowerCase());
    // Normalize if master exists, otherwise sum raw
    const normalizedAmount = master 
      ? normalizeQuantity(entry.amount, entry.unit, master.recipeUnit) 
      : entry.amount;
    
    // Key by proper name to handle casing issues
    const key = master?.name || entry.name;
    const lookupKey = key.toLowerCase();
    
    // Find existing key in map to accumulate
    const existingKey = Object.keys(aggregateMap).find(k => k.toLowerCase() === lookupKey);
    
    if (existingKey) {
      aggregateMap[existingKey].total += normalizedAmount;
      // If any entry is incomplete, the item is incomplete. If all are complete, it's complete.
      // Logic: Start false. If existing is false, stay false. If existing is true but new entry is false, become false.
      // Actually, simple logic: if any part of this item is checked, keep it checked? 
      // Better UX: If I check "Onions", all onions are checked. 
      // The raw list tracks individual lines, but consolidation merges them.
      // We will use the latest entry's status or logical OR.
      aggregateMap[existingKey].completed = aggregateMap[existingKey].completed || !!entry.completed;
    } else {
      aggregateMap[key] = { total: normalizedAmount, source: entry.source, completed: !!entry.completed };
    }
  });

  return Object.entries(aggregateMap).map(([name, data]) => {
    const master = masters.find(m => m.name.toLowerCase() === name.toLowerCase());
    const myItem = myItems.find(m => m.name.toLowerCase() === name.toLowerCase());
    const mapping = mappings.find(m => m.ingredientName.toLowerCase() === name.toLowerCase());

    // Formula: Math.ceil(Total Needed / Col L)
    const divisor = master?.unitsPerPurchase || (myItem ? myItem.packages : 1);
    const unitsToBuy = Math.ceil(data.total / divisor);
    
    // Label: Col O (Details)
    const buyAsLabel = (master?.details || master?.purchaseUnit || myItem?.buyAs || 'Unit').toUpperCase();

    // Aisle Logic: Check Mapping -> Check MyItem -> Check Manual
    let dept = 'Other';
    let aisle = 'UNMAPPED';
    let shelf = '';

    if (mapping) {
      dept = mapping.department;
      aisle = mapping.aisle[selectedStore] || 'UNMAPPED';
      shelf = mapping.shelf[selectedStore] || '';
    } else if (myItem) {
      dept = myItem.category;
      aisle = myItem.aisle[selectedStore] || 'UNMAPPED';
      shelf = myItem.shelf[selectedStore] || '';
    }

    return {
      name,
      totalQuantityNeeded: data.total,
      unit: master?.recipeUnit || 'unit',
      purchaseUnit: buyAsLabel,
      unitsToBuy,
      unitsPerPurchase: divisor,
      conversionContext: master ? `1 ${buyAsLabel} = ${divisor} ${master.recipeUnit.toUpperCase()}` : 'Manual Entry',
      department: dept,
      aisle: aisle,
      shelf: shelf,
      inPantry: false,
      isLowStock: false,
      source: data.source as any,
      completed: data.completed
    };
  });
};
