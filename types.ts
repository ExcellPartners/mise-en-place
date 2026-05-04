
export type StoreLocation = 'Monroe' | 'East' | 'Perinton';

export interface Recipe {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  baseServings: number;
  description: string;
  chefTip: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  imageUrl: string;
  score?: number;
  isFavorite?: boolean; // New field
  dateAdded?: string;   // New field
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface MasterIngredient {
  name: string;
  recipeUnit: string;
  purchaseUnit: string;
  unitsPerPurchase: number;
  isStaple: boolean;
  category?: string;
  details?: string;
}

export interface MyItem {
  name: string;
  category: string;
  packages: number;
  buyAs: string;
  aisle: Record<StoreLocation, string>;
  shelf: Record<StoreLocation, string>;
}

export interface StoreMapping {
  ingredientName: string;
  department: string;
  aisle: Record<StoreLocation, string>;
  shelf: Record<StoreLocation, string>;
}

export interface PantryItem {
  name: string;
  inStock: boolean;
  lowStock: boolean;
  lowStockThreshold?: number;
  category?: string;
  details?: string;
  quantity?: number;
  unit?: string;
  icon?: string;
  lastUpdated?: string;
}

export interface EssentialItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  store: StoreLocation;
  aisle: string;
}

export interface MealPlan {
  date: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Dessert' | 'Drink' | 'Snack'; 
  recipeId: string;
  servings: number;
}

export interface ShoppingListItem {
  name: string;
  totalQuantityNeeded: number;
  unit: string;
  purchaseUnit: string;
  unitsToBuy: number;
  unitsPerPurchase: number;
  conversionContext: string;
  department: string;
  aisle: string;
  shelf: string;
  inPantry: boolean;
  isLowStock: boolean;
  completed?: boolean;
  source: 'recipe' | 'manual' | 'myItem';
}

export interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  type: 'success' | 'conflict';
  summary: string;
  details?: {
    added?: string[];
    updated?: string[];
    conflicts?: string[];
  };
}
