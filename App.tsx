import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { SYNC_HISTORY } from './mockData';
import { Recipe, PantryItem, MealPlan, StoreLocation, StoreMapping, MasterIngredient, ShoppingListItem, RecipeIngredient, MyItem } from './types';
import { fetchFullAppData, restockPantryFromShopping, consumeIngredientsFromPantry, addNewPantryItemToSheet, addMasterToPantry, saveRecipeToSheet, updateUserProfile, updateRecipeFavoriteInSheet, addNewMyItemToSheet } from './services/googleSheets';
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


const App: React.FC = () => {
  const { accessToken, userEmail, userName, spreadsheetId, logout, isAuthenticated, isProfileComplete, completeProfile, login } = useAuth();
  const [viewStack, setViewStack] = useState<View[]>(() => !isAuthenticated ? ['login'] : !isProfileComplete ? ['onboarding'] : ['recipes']);
  
  // Refs for scroll persistence
  const mainRef = useRef<HTMLElement>(null);
  const recipesScrollRef = useRef(0);

  const [recipesList, setRecipesList] = useState<Recipe[]>([]);
  const [masterIngredients, setMasterIngredients] = useState<MasterIngredient[]>([]);
  const [myItemsList, setMyItemsList] = useState<MyItem[]>([]);
  const [mappings, setMappings] = useState<StoreMapping[]>([]);
  
  // Profile State
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

  // Meal plans — persisted to localStorage so refresh doesn't wipe them
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(() => {
    try { const s = localStorage.getItem('mise_meal_plans'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const setMealPlansAndSync = (updater: MealPlan[] | ((p: MealPlan[]) => MealPlan[])) => {
    setMealPlans(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('mise_meal_plans', JSON.stringify(next));
      return next;
    });
  };
  
  const [cookedHistory, setCookedHistory] = useState<{date: string; recipeId: string; recipeName?: string}[]>(() => {
    const saved = localStorage.getItem('mise_cooked_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [pinnedRecipeIds, setPinnedRecipeIds] = useState<string[]>([]);
  const [likedRecipeIds, setLikedRecipeIds] = useState<string[]>([]);

  const [isAddOverlayOpen, setIsAddOverlayOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [timerState, setTimerState] = useState<GlobalTimerState>({ remainingSeconds: 300, isRunning: false, targetTimestamp: null, originalDuration: 300 });
  const [toastState, setToastState] = useState({ message: '', visible: false });

  // Navigation direction for screen transitions
  const [navDirection, setNavDirection] = useState<'forward' | 'back' | 'root'>('root');
  const [screenKey, setScreenKey] = useState(0);

  // Ref always reflects current viewStack — avoids stale closure in event listeners
  const viewStackRef = useRef<View[]>(viewStack);
  useEffect(() => { viewStackRef.current = viewStack; }, [viewStack]);

  // ── Navigation functions ──────────────────────────────────────────────────
  // navigateTo: push onto stack (always has history to go back to)
  const navigateTo = (view: View) => {
    setNavDirection('forward');
    setScreenKey(k => k + 1);
    setViewStack(prev => [...prev, view]);
  };

  // handleBack: pop the stack
  const handleBack = () => {
    setNavDirection('back');
    setScreenKey(k => k + 1);
    setViewStack(prev => prev.length <= 1 ? ['recipes'] : prev.slice(0, -1));
  };

  // navTab: called by bottom nav — always pushes so you can swipe back
  // Exception: if already at root of that tab, stay (don't double-push)
  const navTab = (view: View) => {
    const current = viewStackRef.current;
    if (current.length === 1 && current[0] === view) return; // already there
    setNavDirection('root');
    setScreenKey(k => k + 1);
    // Push the tab onto the existing stack so back gesture returns to previous tab
    setViewStack(prev => [...prev, view]);
  };

  // resetToView: only used internally for hard resets (after checkout, etc.)
  const resetToView = (view: View) => {
    setNavDirection('root');
    setScreenKey(k => k + 1);
    setViewStack([view]);
  };

  // ── Browser/OS back gesture via History API ───────────────────────────────
  // Intercepts the swipe-back gesture before it can leave the app to a previous site
  useEffect(() => {
    window.history.pushState({ mise: true }, '', window.location.href);

    const onPopState = () => {
      const stack = viewStackRef.current;
      if (stack.length > 1) {
        setNavDirection('back');
        setScreenKey(k => k + 1);
        setViewStack(prev => prev.slice(0, -1));
      }
      // Always re-push so the next gesture also hits us
      window.history.pushState({ mise: true }, '', window.location.href);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []); // empty deps — safe because we use viewStackRef

  // ── Touch swipe (fallback for devices where popstate is unreliable) ────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swipeLocked = useRef<'nav' | 'scroll' | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    swipeLocked.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const dx = e.targetTouches[0].clientX - touchStartX.current;
    const dy = e.targetTouches[0].clientY - touchStartY.current;
    if (swipeLocked.current === null) {
      if (Math.abs(dx) > Math.abs(dy) + 8) swipeLocked.current = 'nav';
      else if (Math.abs(dy) > Math.abs(dx) + 8) swipeLocked.current = 'scroll';
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || swipeLocked.current !== 'nav') return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const fromEdge = touchStartX.current < 40;
    if (dx > 60 && (fromEdge || dx > 100) && viewStackRef.current.length > 1) {
      handleBack();
    }
    touchStartX.current = null;
    touchStartY.current = null;
    swipeLocked.current = null;
  };

  // ── Auth state transition ─────────────────────────────────────────────────
  // When auth changes (login completes), update viewStack accordingly
  useEffect(() => {
    if (isAuthenticated && isProfileComplete) {
      setViewStack(prev => {
        if (prev[0] === 'login' || prev[0] === 'onboarding') {
          setNavDirection('root');
          setScreenKey(k => k + 1);
          return ['recipes'];
        }
        return prev;
      });
    } else if (!isAuthenticated) {
      setViewStack(['login']);
    }
  }, [isAuthenticated, isProfileComplete]);

  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) { setLoadingProgress(100); clearInterval(interval); setTimeout(() => setIsLoading(false), 500); }
      else setLoadingProgress(progress);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Handle Scroll Restoration Logic
  useLayoutEffect(() => {
    if (!mainRef.current) return;
    const activeView = viewStack[viewStack.length - 1];
    
    if (activeView === 'recipes') {
      // Restore scroll position when returning to recipes
      mainRef.current.scrollTop = recipesScrollRef.current;
    } else {
      // Ensure other views start at the top
      mainRef.current.scrollTop = 0;
      // Double check: Force scroll to top on next tick to override any browser restoration behavior on the same DOM element
      setTimeout(() => {
        if (mainRef.current) mainRef.current.scrollTop = 0;
      }, 0);
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
        
        // Sync Likes from Column N
        const remoteLikes = data.recipes.filter(r => r.isFavorite).map(r => r.id);
        setLikedRecipeIds(remoteLikes);
      }
    } finally { setIsAutoMapping(false); }
  }

  useEffect(() => { if (isAuthenticated && isProfileComplete) triggerSync(); }, [isAuthenticated, isProfileComplete]);

  const showToast = (msg: string) => {
    setToastState({ message: msg, visible: true });
    setTimeout(() => setToastState(prev => ({ ...prev, visible: false })), 2000);
  };

  const handleTogglePin = (id: string) => {
    setPinnedRecipeIds(prev => {
      const exists = prev.includes(id);
      if (exists) {
        showToast('Removed from Planner');
        return prev.filter(x => x !== id);
      }
      showToast('Pinned to Meal Planner');
      return [...prev, id];
    });
  };

  const handleToggleLike = async (id: string) => {
    // 1. Optimistic UI Update
    const recipe = recipesList.find(r => r.id === id);
    const newStatus = !recipe?.isFavorite;
    
    setRecipesList(prev => prev.map(r => r.id === id ? { ...r, isFavorite: newStatus } : r));
    setLikedRecipeIds(prev => newStatus ? [...prev, id] : prev.filter(x => x !== id));
    
    // Update selected recipe if it's open
    if (selectedRecipe && selectedRecipe.id === id) {
        setSelectedRecipe(prev => prev ? { ...prev, isFavorite: newStatus } : null);
    }

    showToast(newStatus ? 'Added to Favorites' : 'Removed from Favorites');

    // 2. Background Sync
    if (spreadsheetId) {
      await updateRecipeFavoriteInSheet(spreadsheetId, id, newStatus, accessToken);
    }
  };

  const handleClearShoppingList = () => {
    setRawShoppingEntries([]);
    localStorage.removeItem('mise_active_trip_raw');
    localStorage.removeItem('mise_active_trip');
  };

  const handleRemoveMealPlan = (date: string, mealType: string) => {
    setMealPlansAndSync(prev => prev.filter(p => !(p.date === date && p.mealType === mealType)));
  };

  const handleAddToShopping = (ing: MasterIngredient | MyItem | string | RecipeIngredient, source: 'recipe' | 'manual' | 'myItem', amountOverride?: number) => {
    let name = typeof ing === 'string' ? ing : ing.name;
    let amount = amountOverride || (ing as any).amount || 1;
    let unit = (ing as any).unit || 'Unit';

    setRawShoppingEntries(prev => {
      const existingIndex = prev.findIndex(
        entry => entry.name.toLowerCase() === name.toLowerCase() && entry.unit.toLowerCase() === unit.toLowerCase() && !entry.completed
      );

      let next;
      if (existingIndex >= 0) {
        next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          amount: next[existingIndex].amount + amount
        };
      } else {
        const newEntry: RawShoppingEntry = { name, amount, unit, source, completed: false };
        next = [...prev, newEntry];
      }
      
      localStorage.setItem('mise_active_trip_raw', JSON.stringify(next));
      return next;
    });
  };

  const handleAddToPantry = async (ing: MasterIngredient) => {
    const newItem: PantryItem = {
      name: ing.name,
      inStock: true,
      lowStock: false,
      quantity: ing.unitsPerPurchase,
      unit: ing.recipeUnit,
      category: ing.category,
      lastUpdated: new Date().toLocaleDateString()
    };
    
    setPantry(prev => {
      const exists = prev.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
      if (exists) {
        return prev.map(p => p.name.toLowerCase() === ing.name.toLowerCase() ? { ...p, inStock: true, quantity: (p.quantity || 0) + 1 } : p);
      }
      return [...prev, newItem];
    });

    if (spreadsheetId) {
      addMasterToPantry(spreadsheetId, ing, accessToken).then(() => triggerSync());
    }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    setRecipesList(prev => [...prev, recipe]);
    resetToView('recipes');
    showToast('Recipe Saved & Synced');

    if (spreadsheetId) {
      await saveRecipeToSheet(spreadsheetId, recipe, accessToken, masterIngredients);
      triggerSync(); 
    }
  };

  const shoppingListConsolidated = useMemo(() => {
    return consolidateShoppingList(rawShoppingEntries, masterIngredients, mappings, selectedStore, myItemsList);
  }, [rawShoppingEntries, masterIngredients, mappings, selectedStore, myItemsList]);

  const handleToggleItem = (name: string) => {
    setRawShoppingEntries(prev => {
      const entries = prev.filter(e => e.name.toLowerCase() === name.toLowerCase());
      const hasIncomplete = entries.some(e => !e.completed);
      const newStatus = hasIncomplete; 

      const next = prev.map(e => e.name.toLowerCase() === name.toLowerCase() ? { ...e, completed: newStatus } : e);
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
    // 1. Local Update
    const newItem: MyItem = {
      name: data.name,
      category: data.category,
      packages: data.packages,
      buyAs: data.buyAs,
      aisle: { Monroe: data.monroe || '', Perinton: data.perinton || '', East: data.east || '' },
      shelf: { Monroe: '', Perinton: '', East: '' }
    };
    setMyItemsList(prev => [...prev, newItem]);
    
    // 2. Sheet Update
    if (spreadsheetId) {
      await addNewMyItemToSheet(spreadsheetId, data, accessToken);
    }
    
    handleBack(); // Return to list
    showToast(`Added ${data.name} to Catalog`);
  };

  const handleSaveProfile = async (data: { name: string; bio: string; avatarUrl: string }) => {
    if (spreadsheetId) {
      await updateUserProfile(spreadsheetId, data, accessToken);
    }
    login(data.name);
    setUserAvatar(data.avatarUrl); // Update local avatar state
    setUserBio(data.bio); // Update local bio state
    
    localStorage.setItem('mise_user_avatar', data.avatarUrl); // Persist
    localStorage.setItem('mise_user_bio', data.bio); // Persist
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
    if (currentView === 'profile') return <Profile user={{name: userName||'Chef', bio: userBio || 'Ready to Cook', avatarUrl: userAvatar}} onBack={handleBack} onSettings={() => navigateTo('settings')} onManageStores={() => navigateTo('storeManagement')} onLogout={logout} onAccountSettings={() => navigateTo('accountSettings')} onEditProfile={() => navigateTo('editProfile')} onHelpSupport={() => navigateTo('helpSupport')} />;
    if (currentView === 'settings') return <SyncSettings currentAccount={userEmail||''} onBack={handleBack} onSync={() => triggerSync()} isSyncing={isAutoSyncing} onMapFields={() => navigateTo('fieldMapping')} onOpenHistory={() => navigateTo('syncHistory')} onOpenBackup={() => navigateTo('backupRestore')} onChangeAccount={() => navigateTo('changeAccount')} />;
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
    
    if (currentView === 'syncHistory') return <SyncHistory history={SYNC_HISTORY} onBack={handleBack} onClear={() => {}} onResolve={(id) => navigateTo('planner')} />;
    if (currentView === 'backupRestore') return <BackupRestore onBack={handleBack} />;

    if (currentView === 'config') return <PrecisionConfig masters={masterIngredients} pantry={pantry} mappings={mappings} selectedStore={selectedStore} onStoreChange={setSelectedStore} onUpdateMappings={setMappings} onBack={handleBack} />;

    if (currentView === 'collections') return <Collections 
      recipes={recipesList}
      onBack={handleBack}
      onRecipeSelect={(r) => { setSelectedRecipe(r); navigateTo('recipeDetail'); }}
      recentCount={recentCookedCount}
      onPlannerOpen={() => navigateTo('planner')}
    />;

    if (currentView === 'planner') return <Planner 
      mealPlans={mealPlans} recipes={recipesList} pantry={pantry} pinnedIds={pinnedRecipeIds} 
      shoppingList={rawShoppingEntries}
      onScheduleMeal={(d, t, id) => setMealPlansAndSync(prev => [...prev, {date:d, mealType:t, recipeId:id, servings:4}])} 
      onGenerateShopping={() => resetToView('shopping')} onBack={handleBack} 
      onStartCooking={(r) => { setSelectedRecipe(r); navigateTo('cookingMode'); }} 
      onAddToShopping={(ings) => ings.forEach(ing => handleAddToShopping(ing, 'recipe'))} 
      onRemoveSlot={handleRemoveMealPlan}
      onClearItinerary={async () => {
        // Logic 4B: Subtract from Pantry (Consume)
        setIsAutoMapping(true);
        const success = await consumeIngredientsFromPantry(spreadsheetId || '', shoppingListConsolidated, accessToken);
        if (success) {
          // Archive to History for Recap
          const newHistory = mealPlans.map(p => ({ date: p.date, recipeId: p.recipeId }));
          const updatedHistory = [...cookedHistory, ...newHistory];
          setCookedHistory(updatedHistory);
          localStorage.setItem('mise_cooked_history', JSON.stringify(updatedHistory));

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
        // Logic 4A: Add to Pantry (Restock)
        setIsAutoMapping(true); 
        const success = await restockPantryFromShopping(spreadsheetId || '', items, accessToken); 
        if (success) {
          handleClearShoppingList(); 
          alert('Restock Complete! Items added to Pantry.');
          resetToView('pantry'); 
          triggerSync(); 
        } else {
          alert('Checkout Failed. Check connection.');
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

    if (currentView === 'recipeDetail') return selectedRecipe ? <RecipeDetail 
      recipe={selectedRecipe} 
      pantry={pantry} 
      isPinned={pinnedRecipeIds.includes(selectedRecipe.id)} 
      isLiked={!!selectedRecipe.isFavorite} // Source of truth is now recipe property
      onTogglePin={() => handleTogglePin(selectedRecipe.id)}
      onToggleLike={() => handleToggleLike(selectedRecipe.id)}
      onBack={handleBack} 
      onCook={() => navigateTo('cookingMode')} 
      onAddToPlanner={() => { handleTogglePin(selectedRecipe.id); }} 
    /> : null;
    
    if (currentView === 'cookingMode') return selectedRecipe ? <CookingMode recipe={selectedRecipe} onExit={handleBack} timer={timerState} onUpdateTimer={setTimerState} /> : null;
    
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
      onTouchEnd={onTouchEnd}
    >
  const isError = toastState.message.toLowerCase().includes('fail') || toastState.message.toLowerCase().includes('error');
  const isRemove = toastState.message.toLowerCase().includes('remov') || toastState.message.toLowerCase().includes('clear') || toastState.message.toLowerCase().includes('archive');
  const isWarning = toastState.message.toLowerCase().includes('low') || toastState.message.toLowerCase().includes('expire');
  const toastIcon = isError ? 'error' : isWarning ? 'warning' : isRemove ? 'delete_sweep' : 'check_circle';
  const toastColor = isError ? 'text-red-400' : isWarning ? 'text-amber-400' : isRemove ? 'text-white/50' : 'text-[#636b2f]';

  const transitionClass = navDirection === 'forward' ? 'screen-enter'
    : navDirection === 'back' ? 'screen-back'
    : 'screen-fade';

  const currentView = viewStack[viewStack.length - 1];

  return (
    <div
      className="min-h-screen w-full bg-[#000000] text-gray-200 flex flex-col overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Themed toast — slides down from top */}
      <div
        className={`fixed top-0 left-0 right-0 z-[300] flex justify-center pointer-events-none transition-all duration-300 ease-out ${
          toastState.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
        }`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="mx-4 flex items-center gap-3 bg-[#2a2c21] border border-[#636b2f]/40 rounded-2xl px-5 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] max-w-sm w-full">
          <span className={`material-symbols-outlined text-xl fill-1 shrink-0 ${toastColor}`}>{toastIcon}</span>
          <p className="text-white text-sm font-bold tracking-wide flex-1">{toastState.message}</p>
        </div>
      </div>

      {isLoading && <SplashScreen progress={loadingProgress} />}
      <main key={screenKey} ref={mainRef} className={`flex-1 overflow-y-auto no-scrollbar pb-24 ${transitionClass}`}>{renderView()}</main>

      {isAuthenticated && isProfileComplete && !['login', 'onboarding', 'cookingMode', 'scanRecipe', 'addRecipeManual'].includes(currentView) && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0c0a]/95 backdrop-blur-xl border-t border-gray-800 z-[100] nav-safe-pb">
          <div className="flex justify-around items-end px-4 pt-3 max-w-3xl mx-auto">
            <button onClick={() => navTab('recipes')} className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'recipes' ? 'text-primary' : 'text-gray-500'}`}>
              <span className="material-symbols-outlined">home</span>
              <span className="text-[10px] font-bold uppercase">Home</span>
            </button>
            <button onClick={() => navTab('planner')} className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'planner' ? 'text-primary' : 'text-gray-500'}`}>
              <span className="material-symbols-outlined">calendar_today</span>
              <span className="text-[10px] font-medium uppercase">Planner</span>
            </button>
            <div className="relative -top-4">
              <button onClick={() => setIsAddOverlayOpen(true)} className="w-14 h-14 bg-primary rounded-full shadow-2xl flex items-center justify-center text-white ring-4 ring-[#0a0c0a]">
                <span className="material-symbols-outlined text-3xl font-bold">add</span>
              </button>
            </div>
            <button onClick={() => navTab('shopping')} className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'shopping' ? 'text-primary' : 'text-gray-500'}`}>
              <span className="material-symbols-outlined">shopping_basket</span>
              <span className="text-[10px] font-medium uppercase">Shopping</span>
            </button>
            <button onClick={() => navTab('pantry')} className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'pantry' ? 'text-primary' : 'text-gray-500'}`}>
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="text-[10px] font-medium uppercase">Pantry</span>
            </button>
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