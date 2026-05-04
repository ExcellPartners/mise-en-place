
import { Recipe, MasterIngredient, StoreMapping, PantryItem, MealPlan, EssentialItem, SyncHistoryEntry } from './types';

export const RECIPES: Recipe[] = [
  {
    id: 'R-105',
    title: 'Adobo Chicken & Rice',
    category: 'Whole Meal',
    difficulty: 'Medium',
    prepTime: 15,
    cookTime: 40,
    baseServings: 4,
    score: 83.2,
    description: 'A savory and tangy Filipino classic, slow-cooked to perfection.',
    chefTip: 'Use cane vinegar for the most authentic flavor profile.',
    imageUrl: 'https://images.unsplash.com/photo-1541696490-8744a5db0223?auto=format&fit=crop&w=600&h=800',
    ingredients: [
      { name: 'Chicken Thighs', amount: 1, unit: 'lb' },
      { name: 'Soy Sauce', amount: 0.5, unit: 'cup' },
      { name: 'Vinegar', amount: 0.25, unit: 'cup' }
    ],
    instructions: ['Marinate chicken.', 'Simmer with garlic and peppercorns.', 'Serve over steamed rice.']
  },
  {
    id: 'R-076',
    title: 'Beef Bourguignon',
    category: 'Whole Meal',
    difficulty: 'Medium',
    prepTime: 30,
    cookTime: 180,
    baseServings: 6,
    score: 94,
    description: 'The ultimate French comfort food, rich with red wine and pearl onions.',
    chefTip: 'Brown the beef in small batches to ensure a deep crust.',
    imageUrl: 'https://images.unsplash.com/photo-1534939561126-755b8bad4b4f?auto=format&fit=crop&w=600&h=800',
    ingredients: [
      { name: 'Beef Chuck', amount: 3, unit: 'lb' },
      { name: 'Red Wine', amount: 750, unit: 'ml' },
      { name: 'Pearl Onions', amount: 1, unit: 'cup' }
    ],
    instructions: ['Sear beef.', 'Deglaze pan with wine.', 'Slow cook for 3 hours.']
  },
  {
    id: 'R-001',
    title: 'Gumbo',
    category: 'Whole Meal',
    difficulty: 'Medium',
    prepTime: 30,
    cookTime: 185,
    baseServings: 8,
    score: 99.7,
    description: 'Hearty Cajun stew with a deep, dark roux and the holy trinity of veg.',
    chefTip: 'The secret is in the roux—cook it until it is the color of dark chocolate.',
    imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a7c41eb?auto=format&fit=crop&w=600&h=800',
    ingredients: [
      { name: 'Flour', amount: 1, unit: 'cup' },
      { name: 'Oil', amount: 1, unit: 'cup' },
      { name: 'Shrimp', amount: 2, unit: 'lb' }
    ],
    instructions: ['Make the dark roux.', 'Add the trinity.', 'Simmer with stock and spices.']
  },
  {
    id: 'R-123',
    title: 'Cinnamon Rolls',
    category: 'Dessert',
    difficulty: 'High',
    prepTime: 120,
    cookTime: 20,
    baseServings: 10,
    score: 272,
    description: 'Fluffy, buttery brioche rolls swirled with spiced cinnamon sugar.',
    chefTip: 'Use bread flour for a chewier, more professional texture.',
    imageUrl: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=600&h=800',
    ingredients: [
      { name: 'Flour', amount: 4, unit: 'cups' },
      { name: 'Butter', amount: 1, unit: 'cup' },
      { name: 'Cinnamon', amount: 2, unit: 'tbsp' }
    ],
    instructions: ['Proof the yeast.', 'Knead the dough.', 'Roll, cut, and bake.']
  },
  {
    id: 'R-113',
    title: 'Butter Chicken',
    category: 'Main',
    difficulty: 'Medium',
    prepTime: 20,
    cookTime: 45,
    baseServings: 4,
    score: 94.2,
    description: 'Creamy, tomato-based Indian curry with tender marinated chicken.',
    chefTip: 'Double marinate the chicken with yogurt and lemon for maximum tenderness.',
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&h=800',
    ingredients: [
      { name: 'Chicken', amount: 2, unit: 'lb' },
      { name: 'Tomato Sauce', amount: 1, unit: 'cup' },
      { name: 'Cream', amount: 0.5, unit: 'cup' }
    ],
    instructions: ['Marinate chicken.', 'Grill or sear.', 'Simmer in tomato cream sauce.']
  }
];

export const MASTER_INGREDIENTS: MasterIngredient[] = [
  { name: 'Flour', recipeUnit: 'cup', purchaseUnit: 'Bag', unitsPerPurchase: 10, isStaple: true },
  { name: 'Beef Chuck', recipeUnit: 'lb', purchaseUnit: 'Pack', unitsPerPurchase: 2, isStaple: false },
  { name: 'Chicken Thighs', recipeUnit: 'lb', purchaseUnit: 'Pack', unitsPerPurchase: 1.5, isStaple: false },
  { name: 'Eggs', recipeUnit: 'whole', purchaseUnit: 'Dozen', unitsPerPurchase: 12, isStaple: true },
  { name: 'Butter', recipeUnit: 'cup', purchaseUnit: 'Box', unitsPerPurchase: 2, isStaple: true },
  { name: 'Tortilla Chips', recipeUnit: 'bag', purchaseUnit: 'Bag', unitsPerPurchase: 1, isStaple: false },
  { name: 'Peanut Butter', recipeUnit: 'jar', purchaseUnit: 'Jar', unitsPerPurchase: 1, isStaple: false },
  { name: 'Glass Cleaner', recipeUnit: 'bottle', purchaseUnit: 'Bottle', unitsPerPurchase: 1, isStaple: false },
  { name: 'Paper Towels', recipeUnit: 'pack', purchaseUnit: 'Pack', unitsPerPurchase: 1, isStaple: false },
  { name: 'Kibble (10lb)', recipeUnit: 'bag', purchaseUnit: 'Bag', unitsPerPurchase: 1, isStaple: false }
];

export const STORE_MAPPING: StoreMapping[] = [
  {
    ingredientName: 'Flour',
    department: 'Baking',
    aisle: { Monroe: '04B', East: '12A', Perinton: '08' },
    shelf: { Monroe: 'L1', East: 'R3', Perinton: 'L6' }
  },
  {
    ingredientName: 'Beef Chuck',
    department: 'Meat',
    aisle: { Monroe: '01A', East: '02B', Perinton: '01' },
    shelf: { Monroe: 'R5', East: 'L2', Perinton: 'R1' }
  },
  {
    ingredientName: 'Tortilla Chips',
    department: 'Snacks',
    aisle: { Monroe: '7', East: '8', Perinton: '9' },
    shelf: { Monroe: 'L2', East: 'L1', Perinton: 'L4' }
  },
  {
    ingredientName: 'Peanut Butter',
    department: 'Snacks',
    aisle: { Monroe: '11', East: '12', Perinton: '10' },
    shelf: { Monroe: 'R2', East: 'R3', Perinton: 'R1' }
  },
  {
    ingredientName: 'Glass Cleaner',
    department: 'Cleaning',
    aisle: { Monroe: '2', East: '4', Perinton: '3' },
    shelf: { Monroe: 'L6', East: 'L5', Perinton: 'L4' }
  },
  {
    ingredientName: 'Paper Towels',
    department: 'Cleaning',
    aisle: { Monroe: '1', East: '3', Perinton: '2' },
    shelf: { Monroe: 'R1', East: 'R2', Perinton: 'R3' }
  },
  {
    ingredientName: 'Kibble (10lb)',
    department: 'Pets',
    aisle: { Monroe: 'Back', East: 'Back Wall', Perinton: 'Back' },
    shelf: { Monroe: 'R9', East: 'L9', Perinton: 'R9' }
  }
];

export const INITIAL_PANTRY: PantryItem[] = [
  { name: 'Flour', inStock: true, lowStock: true, icon: 'bakery_dining', details: 'Baking Ledger', quantity: 2.5, unit: 'cups' },
  { name: 'Vinegar', inStock: true, lowStock: false, icon: 'opacity', details: 'Staple', quantity: 12, unit: 'oz' },
  { name: 'Butter', inStock: true, lowStock: false, icon: 'square', details: 'Fridge Stock', quantity: 1.25, unit: 'cups' }
];

export const ESSENTIALS: EssentialItem[] = [
  { id: 'E1', name: 'Tortilla Chips', category: 'Snacks', imageUrl: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=200', store: 'Monroe', aisle: '7' },
  { id: 'E2', name: 'Peanut Butter', category: 'Snacks', imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=200', store: 'East', aisle: '12' },
  { id: 'E3', name: 'Glass Cleaner', category: 'Cleaning', imageUrl: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=200', store: 'Perinton', aisle: '3' },
  { id: 'E4', name: 'Paper Towels', category: 'Cleaning', imageUrl: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=200', store: 'Monroe', aisle: '1' },
  { id: 'E5', name: 'Kibble (10lb)', category: 'Pets', imageUrl: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=200', store: 'East', aisle: 'Back Wall' }
];

export const INITIAL_MEAL_PLAN: MealPlan[] = [
  { date: '2023-10-12', mealType: 'Dinner', recipeId: 'R-105', servings: 4 },
  { date: '2023-10-13', mealType: 'Dinner', recipeId: 'R-076', servings: 2 }
];

export const SYNC_HISTORY: SyncHistoryEntry[] = [
  {
    id: 'sh-1',
    timestamp: 'Today, 10:30 AM',
    type: 'success',
    summary: '4 recipes added, 2 updated',
    details: {
      added: ['Grandma’s Apple Pie', 'Spicy Ramen', 'Caesar Salad', 'Beef Tacos'],
      updated: ['Tomato Soup', 'Garlic Bread']
    }
  },
  {
    id: 'sh-2',
    timestamp: 'Yesterday, 4:15 PM',
    type: 'success',
    summary: 'Success: 10 recipes synced',
    details: {
      added: ['Mediterranean Bowl', 'Shrimp Scampi', 'Taco Salad', 'Pesto Pasta', 'Grilled Cheese', 'Mushroom Risotto', 'Berry Smoothie', 'Avocado Toast', 'Lentil Soup', 'Fruit Salad']
    }
  }
];
