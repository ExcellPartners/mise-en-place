import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { SYNC_HISTORY } from './mockData';
import { Recipe, PantryItem, MealPlan, StoreLocation, StoreMapping, MasterIngredient, ShoppingListItem, RecipeIngredient, MyItem } from './types';
import {
  fetchFullAppData,
  restockPantryFromShopping,
  consumeIngredientsFromPantry,
  addNewPantryItemToSheet,
  addMasterToPantry,
  saveRecipeToSheet,
  updateUserProfile,
  updateRecipeFavoriteInSheet,
  addNewMyItemToSheet,
  saveMealPlanToSheet,
  markMealAsCooked,
  removeMealPlanFromSheet,
} from './services/googleSheets';
import { consolidateShoppingList } from './utils/logic';
import Home from './screens/Home';
import RecipeDetail from './screens/RecipeDetail';
import ShoppingList from './screens/ShoppingList';
import Pantry from './screens/Pantry';
import AddPantryItem from './screens/AddPantryItem';
import CookingMode from './screens/CookingMode';
import SyncSettings from './screens/SyncSettings';
import Planner from './screens/Planner';
import PrecisionConfig from './screens/PrecisionConfig';
import AddOverlay from './screens/AddOverlay';
import AddRecipeManual from './screens/AddRecipeManual';
import ScanRecipe from './screens/ScanRecipe';
import FieldMapping from './screens/FieldMapping';
import Profile from './screens/Profile';
import StoreManagement from './screens/StoreManagement';
import AccountSettings from './screens/AccountSettings';
import EditProfile from './screens/EditProfile';
import HelpSupport from './screens/HelpSupport';
import ChangeAccount from './screens/ChangeAccount';
import Login from './screens/Login';
import OnboardingProfile from './screens/OnboardingProfile';
import SplashScreen from './screens/SplashScreen';
import BackupRestore from './screens/BackupRestore';
import SyncHistory from './screens/SyncHistory';
import AddIngredient from './screens/AddIngredient';
import AddMyItem from './screens/AddMyItem';
import AddNewMyItemEntry from './screens/AddNewMyItemEntry';
import Collections from './screens/Collections';

type View = 'recipes' | 'planner' | 'shopping' | 'pantry' | 'addPantryItem' | 'recipeDetail' | 'cookingMode' | 'settings' | 'config' | 'addRecipeManual' | 'scanRecipe' | 'fieldMapping' | 'profile' | 'storeManagement' | 'accountSettings' | 'editProfile' | 'helpSupport' | 'changeAccount' | 'login' | 'onboarding' | 'addIngredient' | 'addMyItem' | 'addNewMyItemEntry' | 'syncHistory' | 'backupRestore' | 'collections';

export interface GlobalTimerState {
  remainingSeconds: number;
  isRunning: boolean;
  targetTimestamp: number | null;
  originalDuration: number;
}

export interface RawShoppingEntry {
  name: string;
  amount: number;
  unit: string;
  source: 'recipe' | 'manual' | 'myItem';
  completed?: boolean;
}

const Toast: React.FC<{ message: string; isVisible: boolean }> = ({ message, isVisible }) => (
  <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[300] transition-all duration-500 transform pointer-events-none ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
    <div className="bg-[#1a1d14]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-3">
      <span className="material-symbols-outlined text-[#636b2f] text-xl fill-1">check_circle</span>
      <p className="text-white text-sm font-bold tracking-wide">{message}</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const { accessToken, userEmail, userName, spreadsheetId, logout, isAuthenticated, isProfileComplete, completeProfile, login } = useAuth();
  const [viewStack, setViewStack] = useState<View[]>(() => !isAuthenticated ? ['login'] : !isProfileComplete ? ['onboarding'] : ['recipes']);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  const mainRef = useRef<HTMLElement>(null);
  const recipesScrollRef = useRef(0);
  const recipePageRef = useRef(1);

  const [recipesList, setRecipesList] = useState<Recipe[]>([]);
  const [collectionImages, setCollectionImages] = useState<Record<string, string>>({});
  const [masterIngredients, setMasterIngredients] = useState<MasterIngredient[]>([]);
  const [myItemsList, setMyItemsList] = useState<MyItem[]>([]);
  const [mappings, setMappings] = useState<StoreMapping[]>([]);

  const [userAvatar, setUserAvatar] = useState<string>(() => localStorage.getItem('mise_user_avatar') || '');
  const [userBio, setUserBio] = useState<string>(() => localStorage.getItem('mise_user_bio') || '');

  const [selectedStore, setSelectedStore] = useState<StoreLocation>(() => {
    const saved = localStorage.getItem('mise_default_store');
    return (saved as StoreLocation) || 'Monroe';
  });

  const [rawShoppingEntries, setRawShoppingEntries] = useState<RawShoppingEntry[]>(() => {
    const saved = localStorage.getItem('mise_active_trip_raw');
    return saved ? JSON.parse(saved) : [];
  });

  const [pantry, setPantry] = useState<PantryItem[]>(() => {
    const saved = localStorage.getItem('mise_pantry');
    return saved ? JSON.parse(saved) : [];
  });

  const [isAutoSyncing, setIsAutoMapping] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [scannedRecipeData, setScannedRecipeData] = useState<Recipe | undefined>(undefined);

  const [mealPlans, setMealPlans] = useState<MealPlan[]>(() => {
    try { const s = localStorage.getItem('mise_meal_plans'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  // Persist meal plans to localStorage AND Sheet
  const setMealPlansAndSync = (updater: MealPlan[] | ((p: MealPlan[]) => MealPlan[])) => {
    setMealPlans(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('mise_meal_plans', JSON.stringify(next));
      return next;
    });
  };

  const [cookedHistory, setCookedHistory] = useState<{ date: string; recipeId: string; recipeName?: string }[]>(() => {
    try { const s = localStorage.getItem('mise_cooked_history'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [pinnedRecipeIds, setPinnedRecipeIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('mise_pinned'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [likedRecipeIds, setLikedRecipeIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('mise_liked'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [isAddOverlayOpen, setIsAddOverlayOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [timerState, setTimerState] = useState<GlobalTimerState>({ remainingSeconds: 300, isRunning: false, targetTimestamp: null, originalDuration: 300 });
  const [toastState, setToastState] = useState({ message: '', visible: false });
  const [navDirection, setNavDirection] = useState<'forward' | 'back' | 'root'>('root');
  const [screenKey, setScreenKey] = useState(0);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) { setLoadingProgress(100); clearInterval(interval); setTimeout(() => setIsLoading(false), 500); }
      else setLoadingProgress(progress);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const prevViewRef = useRef<string>('recipes');

  useEffect(() => {
    const activeView = viewStack[viewStack.length - 1];
    prevViewRef.current = activeView;
    if (!mainRef.current) return;
    if (activeView === 'recipes') {
      const savedPos = recipesScrollRef.current;
      requestAnimationFrame(() => { if (mainRef.current) mainRef.current.scrollTop = savedPos; });
    } else {
      mainRef.current.scrollTop = 0;
    }
  }, [viewStack]);

  async function triggerSync() {
    if (!isAuthenticated) return;
    setIsAutoMapping(true);
    try {
      const data = await fetchFullAppData(spreadsheetId);
      if (data) {
        setRecipesList(data.recipes);
        setMasterIngredients(data.masters);
        setMappings(data.storeMappings);
        setMyItemsList(data.myItems);
        if (data.pantry) setPantry(data.pantry);
        if (data.collectionImages) setCollectionImages(data.collectionImages);

        // Sync Likes from Column N
        const remoteLikes = data.recipes.filter(r => r.isFavorite).map(r => r.id);
        setLikedRecipeIds(remoteLikes);

        // ── Sync Meal Plans from Sheet (Planned rows only) ──────────────────
        if (data.mealPlans && data.mealPlans.length > 0) {
          setMealPlans(data.mealPlans);
          localStorage.setItem('mise_meal_plans', JSON.stringify(data.mealPlans));
        }
      }
    } finally { setIsAutoMapping(false); }
  }

  useEffect(() => { if (isAuthenticated && isProfileComplete) triggerSync(); }, [isAuthenticated, isProfileComplete]);

  const handleBack = () => {
    setNavDirection('back');
    setScreenKey(k => k + 1);
    if (viewStack.length <= 1) setViewStack(['recipes']);
    else setViewStack(prev => prev.slice(0, -1));
  };

  const navigateTo = (view: View) => {
    if (viewStack[viewStack.length - 1] === 'recipes' && mainRef.current) {
      recipesScrollRef.current = mainRef.current.scrollTop;
    }
    setNavDirection('forward');
    setScreenKey(k => k + 1);
    setViewStack(prev => [...prev, view]);
  };

  const resetToView = (view: View) => {
    setNavDirection('root');
    setScreenKey(k => k + 1);
    if (view === 'recipes') recipesScrollRef.current = 0;
    setViewStack([view]);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd || !touchStartY) return;
    const horizontalDistance = touchStart - touchEnd;
    const verticalDistance = Math.abs(e.changedTouches[0].clientY - touchStartY);
    const isRightSwipe = horizontalDistance < -80 && verticalDistance < 40;
    if (isRightSwipe && viewStack.length > 1) handleBack();
  };

  const showToast = (msg: string) => {
    setToastState({ message: msg, visible: true });
    setTimeout(() => setToastState(prev => ({ ...prev, visible: false })), 2000);
  };

  const handleTogglePin = (id: string) => {
    setPinnedRecipeIds(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('mise_pinned', JSON.stringify(next));
      showToast(exists ? 'Removed from Planner' : 'Pinned to Meal Planner');
      return next;
    });
  };

  const handleToggleLike = async (id: string) => {
    const recipe = recipesList.find(r => r.id === id);
    const newStatus = !recipe?.isFavorite;
    setRecipesList(prev => prev.map(r => r.id === id ? { ...r, isFavorite: newStatus } : r));
    setLikedRecipeIds(prev => {
      const next = newStatus ? [...prev, id] : prev.filter(x => x !== id);
      localStorage.setItem('mise_liked', JSON.stringify(next));
      return next;
    });
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe(prev => prev ? { ...prev, isFavorite: newStatus } : null);
    }
    showToast(newStatus ? 'Added to Favorites' : 'Removed from Favorites');
    if (spreadsheetId) {
      await updateRecipeFavoriteInSheet(spreadsheetId, id, newStatus, accessToken);
    }
  };

  const handleClearShoppingList = () => {
    setRawShoppingEntries([]);
    localStorage.removeItem('mise_active_trip_raw');
    localStorage.removeItem('mise_active_trip');
  };

  // ── Meal plan handlers — write to Sheet on every change ──────────────────────

  const handleScheduleMeal = async (date: string, mealType: MealPlan['mealType'], recipeId: string) => {
    const newPlan: MealPlan = { date, mealType, recipeId, servings: 4 };
    setMealPlansAndSync(prev => [...prev, newPlan]);
    // Background write to Sheet
    if (spreadsheetId) {
      saveMealPlanToSheet(spreadsheetId, newPlan, accessToken).catch(console.error);
    }
  };

  const handleRemoveMealPlan = async (date: string, mealType: string) => {
    const plan = mealPlans.find(p => p.date === date && p.mealType === mealType);
    setMealPlansAndSync(prev => prev.filter(p => !(p.date === date && p.mealType === mealType)));
    if (spreadsheetId && plan) {
      removeMealPlanFromSheet(spreadsheetId, plan.recipeId, date, mealType, accessToken).catch(console.error);
    }
  };

  /**
   * Mark a single meal as cooked:
   * - Flips its Sheet row to "Cooked"
   * - Adds to cookedHistory
   * - Removes from active mealPlans
   */
  const handleMarkMealCooked = async (plan: MealPlan) => {
    const recipe = recipesList.find(r => r.id === plan.recipeId);

    // 1. Update history
    const historyEntry = { date: plan.date, recipeId: plan.recipeId, recipeName: recipe?.title };
    const updatedHistory = [historyEntry, ...cookedHistory];
    setCookedHistory(updatedHistory);
    localStorage.setItem('mise_cooked_history', JSON.stringify(updatedHistory));

    // 2. Remove from local plan
    setMealPlansAndSync(prev => prev.filter(p => !(p.date === plan.date && p.mealType === plan.mealType)));

    // 3. Flip Sheet row status
    if (spreadsheetId) {
      markMealAsCooked(spreadsheetId, plan.recipeId, plan.date, accessToken).catch(console.error);
    }

    showToast(`${recipe?.title || 'Meal'} marked as cooked!`);
  };

  const handleAddToShopping = (ing: MasterIngredient | MyItem | string | RecipeIngredient, source: 'recipe' | 'manual' | 'myItem', amountOverride?: number) => {
    const name = typeof ing === 'string' ? ing : ing.name;
    const amount = amountOverride || (ing as any).amount || 1;
    const unit = (ing as any).unit || 'Unit';

    setRawShoppingEntries(prev => {
      const existingIndex = prev.findIndex(
        entry => entry.name.toLowerCase() === name.toLowerCase() && entry.unit.toLowerCase() === unit.toLowerCase() && !entry.completed
      );
      let next;
      if (existingIndex >= 0) {
        next = [...prev];
        next[existingIndex] = { ...next[existingIndex], amount: next[existingIndex].amount + amount };
      } else {
        next = [...prev, { name, amount, unit, source, completed: false }];
      }
      localStorage.setItem('mise_active_trip_raw', JSON.stringify(next));
      return next;
    });
  };

  const handleAddToPantry = async (ing: MasterIngredient) => {
    const newItem: PantryItem = {
      name: ing.name, inStock: true, lowStock: false,
      quantity: ing.unitsPerPurchase, unit: ing.recipeUnit,
      category: ing.category, lastUpdated: new Date().toLocaleDateString()
    };
    setPantry(prev => {
      const exists = prev.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
      if (exists) return prev.map(p => p.name.toLowerCase() === ing.name.toLowerCase() ? { ...p, inStock: true, quantity: (p.quantity || 0) + 1 } : p);
      return [...prev, newItem];
    });
    if (spreadsheetId) {
      addMasterToPantry(spreadsheetId, ing, accessToken).then(() => triggerSync());
    }
  };

  // onSave updates local state immediately, then triggers a background sync
  // so the full recipe (with ingredients from Components tab) appears instantly.
  // Sheet write is handled inside AddRecipeManual — NOT here (avoids double write).
  const handleSaveRecipe = async (recipe: Recipe): Promise<void> => {
    // 1. Add immediately so it's searchable right away
    setRecipesList(prev => prev.find(r => r.id === recipe.id) ? prev : [...prev, recipe]);
    // 2. Clear pre-fill data so next manual entry starts blank
    setScannedRecipeData(undefined);
    // 3. Background sync after a short delay to let the Sheet write complete first
    setTimeout(() => triggerSync(), 2000);
  };

  // Called from Collections "Add to Catalog" — adds to local list + Sheet
  const handleRecipeSavedFromSearch = (recipe: Recipe) => {
    setRecipesList(prev => {
      if (prev.find(r => r.id === recipe.id)) return prev;
      return [...prev, recipe];
    });
    showToast(`"${recipe.title}" added to your catalog!`);
  };

  const shoppingListConsolidated = useMemo(() => {
    return consolidateShoppingList(rawShoppingEntries, masterIngredients, mappings, selectedStore, myItemsList);
  }, [rawShoppingEntries, masterIngredients, mappings, selectedStore, myItemsList]);

  const handleToggleItem = (name: string) => {
    setRawShoppingEntries(prev => {
      const entries = prev.filter(e => e.name.toLowerCase() === name.toLowerCase());
      const hasIncomplete = entries.some(e => !e.completed);
      const next = prev.map(e => e.name.toLowerCase() === name.toLowerCase() ? { ...e, completed: hasIncomplete } : e);
      localStorage.setItem('mise_active_trip_raw', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteItem = (name: string) => {
    setRawShoppingEntries(prev => {
      const next = prev.filter(e => e.name.toLowerCase() !== name.toLowerCase());
      localStorage.setItem('mise_active_trip_raw', JSON.stringify(next));
      return next;
    });
  };

  const handleSavePantryItem = async (data: any) => {
    setIsAutoMapping(true);
    try {
      if (spreadsheetId) await addNewPantryItemToSheet(spreadsheetId, data, accessToken);
      triggerSync();
      handleBack();
    } catch (err: any) { alert(err.message); }
    finally { setIsAutoMapping(false); }
  };

  const handleSaveNewMyItem = async (data: any) => {
    const newItem: MyItem = {
      name: data.name, category: data.category, packages: data.packages, buyAs: data.buyAs,
      aisle: { Monroe: data.monroe || '', Perinton: data.perinton || '', East: data.east || '' },
      shelf: { Monroe: '', Perinton: '', East: '' }
    };
    setMyItemsList(prev => [...prev, newItem]);
    if (spreadsheetId) await addNewMyItemToSheet(spreadsheetId, data, accessToken);
    handleBack();
    showToast(`Added ${data.name} to Catalog`);
  };

  const handleSaveProfile = async (data: { name: string; bio: string; avatarUrl: string }) => {
    if (spreadsheetId) await updateUserProfile(spreadsheetId, data, accessToken);
    login(data.name);
    setUserAvatar(data.avatarUrl);
    setUserBio(data.bio);
    localStorage.setItem('mise_user_avatar', data.avatarUrl);
    localStorage.setItem('mise_user_bio', data.bio);
    handleBack();
  };

  const recentCookedCount = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return cookedHistory.filter(h => new Date(h.date) >= thirtyDaysAgo).length;
  }, [cookedHistory]);

  const renderView = () => {
    const currentView = viewStack[viewStack.length - 1];
    const previousView = viewStack.length > 1 ? viewStack[viewStack.length - 2] : null;

    if (currentView === 'login') return <Login />;
    if (currentView === 'onboarding') return <OnboardingProfile />;
    if (currentView === 'profile') return <Profile user={{ name: userName || 'Chef', bio: userBio || 'Ready to Cook', avatarUrl: userAvatar }} onBack={handleBack} onSettings={() => navigateTo('settings')} onManageStores={() => navigateTo('storeManagement')} onLogout={logout} onAccountSettings={() => navigateTo('accountSettings')} onEditProfile={() => navigateTo('editProfile')} onHelpSupport={() => navigateTo('helpSupport')} />;
    if (currentView === 'settings') return <SyncSettings currentAccount={userEmail || ''} onBack={handleBack} onSync={() => triggerSync()} isSyncing={isAutoSyncing} onMapFields={() => navigateTo('fieldMapping')} onOpenHistory={() => navigateTo('syncHistory')} onOpenBackup={() => navigateTo('backupRestore')} onChangeAccount={() => navigateTo('changeAccount')} />;
    if (currentView === 'storeManagement') return <StoreManagement mappings={mappings} onBack={handleBack} selectedStore={selectedStore} onStoreSelect={setSelectedStore} onSetDefault={(s) => { setSelectedStore(s); localStorage.setItem('mise_default_store', s); }} onOpenMap={() => showToast('Store mapping coming soon')} />;
    if (currentView === 'accountSettings') return <AccountSettings onBack={handleBack} onLogout={logout} />;
    if (currentView === 'helpSupport') return <HelpSupport onBack={handleBack} />;

    if (currentView === 'addIngredient') {
      const isFromPantry = previousView === 'pantry';
      return <AddIngredient
        masters={masterIngredients}
        mappings={mappings}
        onBack={handleBack}
        onAdd={isFromPantry ? handleAddToPantry : (m) => handleAddToShopping(m, 'recipe')}
        onAddNewManual={() => navigateTo('addPantryItem')}
        mode={isFromPantry ? 'pantry' : 'shopping'}
      />;
    }

    if (currentView === 'addMyItem') return <AddMyItem items={myItemsList} onBack={handleBack} onAdd={(i) => handleAddToShopping(i, 'myItem')} onAddNewManual={() => navigateTo('addNewMyItemEntry')} />;
    if (currentView === 'addNewMyItemEntry') return <AddNewMyItemEntry onBack={handleBack} onSave={handleSaveNewMyItem} />;
    if (currentView === 'addPantryItem') return <AddPantryItem onBack={handleBack} onSave={handleSavePantryItem} />;
    if (currentView === 'syncHistory') return <SyncHistory history={SYNC_HISTORY} onBack={handleBack} onClear={() => {}} onResolve={() => navigateTo('planner')} />;
    if (currentView === 'backupRestore') return <BackupRestore onBack={handleBack} />;
    if (currentView === 'config') return <PrecisionConfig masters={masterIngredients} pantry={pantry} mappings={mappings} selectedStore={selectedStore} onStoreChange={setSelectedStore} onUpdateMappings={setMappings} onBack={handleBack} />;
    if (currentView === 'fieldMapping') return <FieldMapping onBack={handleBack} onConfirm={(count) => { showToast(`Synced ${count} recipes`); handleBack(); }} />;

    if (currentView === 'collections') return <Collections
      recipes={recipesList}
      onBack={handleBack}
      onRecipeSelect={(r) => { setSelectedRecipe(r); navigateTo('recipeDetail'); }}
      recentCount={recentCookedCount}
      onPlannerOpen={() => navigateTo('planner')}
      pantry={pantry}
      cookedHistory={cookedHistory}
      collectionImages={collectionImages}
      spreadsheetId={spreadsheetId}
      accessToken={accessToken}
      masterIngredients={masterIngredients}
      onRecipeSaved={handleRecipeSavedFromSearch}
      onAddToCatalog={(recipe) => {
        setScannedRecipeData(recipe);
        navigateTo('addRecipeManual');
      }}
    />;

    if (currentView === 'planner') return <Planner
      mealPlans={mealPlans}
      recipes={recipesList}
      pantry={pantry}
      pinnedIds={pinnedRecipeIds}
      shoppingList={rawShoppingEntries}
      onScheduleMeal={handleScheduleMeal}
      onGenerateShopping={() => resetToView('shopping')}
      onBack={handleBack}
      onStartCooking={(r) => { setSelectedRecipe(r); navigateTo('cookingMode'); }}
      onAddToShopping={(ings) => ings.forEach(ing => handleAddToShopping(ing, 'recipe'))}
      onRemoveSlot={handleRemoveMealPlan}
      onMarkCooked={handleMarkMealCooked}
      onTogglePin={handleTogglePin}
      onToggleLike={handleToggleLike}
      onConsumeIngredients={(ingredients) => {
        if (!spreadsheetId) return;
        // Convert RecipeIngredient[] to ShoppingListItem[] shape for pantry deduction
        const items = ingredients.map(ing => ({
          name: ing.name, amount: ing.amount, unit: ing.unit,
          source: 'recipe' as const, totalQuantityNeeded: ing.amount,
          unitsToBuy: 1, unitsPerPurchase: 1, purchaseUnit: ing.unit,
          inPantry: false, completed: false, department: '', aisle: '',
        }));
        consumeIngredientsFromPantry(spreadsheetId, items, accessToken).catch(console.error);
      }}
      onClearItinerary={async () => {
        setIsAutoMapping(true);
        const success = await consumeIngredientsFromPantry(spreadsheetId || '', shoppingListConsolidated, accessToken);
        if (success) {
          // Mark all current plans as cooked in batch
          for (const plan of mealPlans) {
            const recipe = recipesList.find(r => r.id === plan.recipeId);
            const historyEntry = { date: plan.date, recipeId: plan.recipeId, recipeName: recipe?.title };
            setCookedHistory(prev => {
              const updated = [historyEntry, ...prev];
              localStorage.setItem('mise_cooked_history', JSON.stringify(updated));
              return updated;
            });
            if (spreadsheetId) {
              markMealAsCooked(spreadsheetId, plan.recipeId, plan.date, accessToken).catch(console.error);
            }
          }
          setMealPlansAndSync([]);
          handleClearShoppingList();
          alert('Menu Archived & Ingredients Deducted from Pantry.');
          triggerSync();
        } else {
          alert('Archive Failed. Check connection.');
        }
        setIsAutoMapping(false);
      }}
    />;

    if (currentView === 'shopping') return <ShoppingList
      mealPlans={mealPlans} recipes={recipesList} masters={masterIngredients} mappings={mappings} pantry={pantry} selectedStore={selectedStore}
      onStoreChange={setSelectedStore} onOpenMap={() => {}} onBack={handleBack}
      onCheckout={async (items) => {
        setIsAutoMapping(true);
        try {
          const success = await restockPantryFromShopping(spreadsheetId || '', items, accessToken);
          if (success) {
            handleClearShoppingList();
            showToast('Checked out! Pantry updated.');
            resetToView('pantry');
            triggerSync();
          } else {
            showToast('Checkout failed — check your connection.');
          }
        } catch (err) {
          showToast('Checkout error — try again.');
        }
        setIsAutoMapping(false);
      }}
      onClearList={handleClearShoppingList}
      onDeleteItem={handleDeleteItem}
      onAddManualItem={(name) => handleAddToShopping(name, 'manual')}
      itemsFromState={shoppingListConsolidated}
      onToggleItem={handleToggleItem}
      onOpenConfig={() => navigateTo('config')}
    />;

    if (currentView === 'pantry') return <Pantry
      pantry={pantry}
      mappings={mappings}
      onUpdate={setPantry}
      onAddNew={() => navigateTo('addIngredient')}
      onAddToList={(item) => {
        handleAddToShopping(item.name, 'manual');
        showToast(`Added ${item.name} to Shopping List`);
      }}
    />;

    if (currentView === 'recipeDetail') return null;

    if (currentView === 'cookingMode') return selectedRecipe
      ? <CookingMode recipe={selectedRecipe} onExit={handleBack} timer={timerState} onUpdateTimer={setTimerState} />
      : null;

    if (currentView === 'editProfile') return <EditProfile
      initialName={userName || 'Chef'}
      initialBio={userBio}
      initialAvatar={userAvatar}
      onBack={handleBack}
      onSave={handleSaveProfile}
    />;

    if (currentView === 'addRecipeManual') return <AddRecipeManual
      onBack={handleBack}
      onSave={handleSaveRecipe}
      initialData={scannedRecipeData}
      existingIds={recipesList.map(r => r.id)}
      spreadsheetId={spreadsheetId}
      accessToken={accessToken}
    />;

    if (currentView === 'scanRecipe') return <ScanRecipe
      onClose={handleBack}
      onRecipeFound={(recipe) => {
        setScannedRecipeData(recipe);
        setViewStack(prev => [...prev.slice(0, -1), 'addRecipeManual']);
      }}
    />;

    return <Home
      recipes={recipesList}
      pinnedIds={pinnedRecipeIds}
      likedIds={likedRecipeIds}
      mealPlans={mealPlans}
      onTogglePin={handleTogglePin}
      onToggleLike={handleToggleLike}
      initialPage={recipePageRef.current}
      onPageChange={(p) => { recipePageRef.current = p; }}
      onRecipeSelect={(r) => {
        if (mainRef.current) recipesScrollRef.current = mainRef.current.scrollTop;
        setSelectedRecipe(r);
        navigateTo('recipeDetail');
      }}
      onSettingsOpen={() => {
        if (mainRef.current) recipesScrollRef.current = mainRef.current.scrollTop;
        navigateTo('profile');
      }}
      onPlannerOpen={() => {
        if (mainRef.current) recipesScrollRef.current = mainRef.current.scrollTop;
        navigateTo('planner');
      }}
      onCollectionsOpen={() => {
        if (mainRef.current) recipesScrollRef.current = mainRef.current.scrollTop;
        navigateTo('collections');
      }}
      recentCount={recentCookedCount}
    />;
  };

  return (
    <div
      className="min-h-screen bg-[#000000] text-gray-200 flex flex-col overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={(e) => onTouchEnd(e)}
    >
      <Toast message={toastState.message} isVisible={toastState.visible} />
      {isLoading && <SplashScreen progress={loadingProgress} />}
      <main ref={mainRef} className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div
          key={screenKey}
          className={`h-full w-full ${
            navDirection === 'forward' ? 'animate-slide-in-forward' :
            navDirection === 'back'    ? 'animate-slide-in-back'    :
                                        'animate-slide-in-forward'
          }`}
        >
          {renderView()}
        </div>
      </main>

      {viewStack[viewStack.length - 1] === 'recipeDetail' && selectedRecipe && (
        <div key={selectedRecipe.id} className="fixed inset-0 z-[200] overflow-y-auto no-scrollbar bg-background-dark">
          <RecipeDetail
            recipe={selectedRecipe}
            pantry={pantry}
            isPinned={pinnedRecipeIds.includes(selectedRecipe.id)}
            isLiked={!!selectedRecipe.isFavorite}
            onTogglePin={() => handleTogglePin(selectedRecipe.id)}
            onToggleLike={() => handleToggleLike(selectedRecipe.id)}
            onBack={handleBack}
            onCook={() => navigateTo('cookingMode')}
            onAddToPlanner={() => { handleTogglePin(selectedRecipe.id); }}
          />
        </div>
      )}

      {isAuthenticated && isProfileComplete && !['login', 'onboarding', 'cookingMode', 'scanRecipe', 'addRecipeManual'].includes(viewStack[viewStack.length - 1]) && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0c0a]/95 backdrop-blur-xl border-t border-gray-800 z-[100] nav-safe-pb">
          <div className="flex justify-around items-end px-4 pt-4 pb-2 w-full">
            {([
              { view: 'recipes',  icon: 'home',             label: 'Home'     },
              { view: 'planner',  icon: 'calendar_today',   label: 'Planner'  },
              { view: 'shopping', icon: 'shopping_basket',  label: 'Shopping' },
              { view: 'pantry',   icon: 'inventory_2',      label: 'Pantry'   },
            ] as const).map((tab, idx) => {
              const isActive = viewStack[0] === tab.view || viewStack.includes(tab.view as any);
              const isCurrentRoot = viewStack[0] === tab.view;
              return (
                <React.Fragment key={tab.view}>
                  {idx === 2 && (
                    <div className="relative -top-4">
                      <button onClick={() => setIsAddOverlayOpen(true)} className="w-14 h-14 bg-primary rounded-full shadow-2xl flex items-center justify-center text-white ring-4 ring-[#0a0c0a]">
                        <span className="material-symbols-outlined text-3xl font-bold">add</span>
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (isCurrentRoot && viewStack.length === 1) return; // already there
                      if (isCurrentRoot) {
                        // Already in this section — pop back to root of this section
                        setNavDirection('back');
                        setViewStack([tab.view as View]);
                      } else {
                        // Switch to a different section
                        resetToView(tab.view as View);
                      }
                    }}
                    className={`flex flex-col items-center gap-1 transition-colors ${isCurrentRoot ? 'text-primary' : 'text-gray-500'}`}
                  >
                    <span className="material-symbols-outlined">{tab.icon}</span>
                    <span className="text-[10px] font-bold uppercase">{tab.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </nav>
      )}

      {isAddOverlayOpen && (
        <AddOverlay
          onClose={() => setIsAddOverlayOpen(false)}
          onImportFromSheets={() => { setIsAddOverlayOpen(false); navigateTo('settings'); }}
          onAddManual={() => { setIsAddOverlayOpen(false); navigateTo('addRecipeManual'); }}
          onScan={() => { setIsAddOverlayOpen(false); navigateTo('scanRecipe'); }}
          onAddIngredient={() => { setIsAddOverlayOpen(false); navigateTo('addIngredient'); }}
          onAddMyItem={() => { setIsAddOverlayOpen(false); navigateTo('addMyItem'); }}
        />
      )}
    </div>
  );
};

export default App;
