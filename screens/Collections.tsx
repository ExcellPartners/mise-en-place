import React, { useState, useMemo } from 'react';
import { Recipe } from '../types';
import { formatImageUrl } from '../utils/logic';

interface CollectionsProps {
  recipes: Recipe[];
  onBack: () => void;
  onRecipeSelect: (recipe: Recipe) => void;
  onPlannerOpen: () => void;
  recentCount: number;
}

interface CollectionItem {
  id: string;
  label: string;
  image: string;
  description: string;
  longDescription?: string;
}

// Define the sub-collections (Themes)
const COLLECTIONS_DATA: Record<string, CollectionItem[]> = {
  lifestyle: [
    { 
      id: 'one-pot', 
      label: 'One-Pot Wonders', 
      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80', 
      description: 'Big flavor with only one dish to wash',
      longDescription: 'Maximum flavor, minimum cleanup—your Dutch oven and sheet pan’s time to shine.'
    },
    { 
      id: 'sunday-prep', 
      label: 'Sunday Prep & Set', 
      image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&q=80', 
      description: 'Cook once, eat well all week long',
      longDescription: 'Cook once, eat better all week. Recipes designed for the ultimate meal-prep routine.'
    },
    { 
      id: 'table-two', 
      label: 'Table for Two', 
      image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=400&q=80', 
      description: 'Fancy-ish meals for an intimate night in',
      longDescription: 'Elevated, intimate recipes for when you want to skip the restaurant and stay in.'
    },
    { 
      id: 'pantry', 
      label: 'Pantry Foraging', 
      image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&w=400&q=80', 
      description: 'Turn your staples into last-minute meals',
      longDescription: 'The "Use It or Lose It" collection—turn your staples into spectacular last-minute meals.'
    },
    { 
      id: 'social', 
      label: 'The Social Hour', 
      image: 'https://images.unsplash.com/photo-1563206767-5b1d97512715?auto=format&fit=crop&w=400&q=80', 
      description: 'Appetizers and snacks for a hungry crowd',
      longDescription: 'Big-batch snacks and crowd-pleasing apps designed for easy entertaining.'
    },
    { 
      id: '30-min', 
      label: 'The 30-Minute Hustle', 
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80', 
      description: 'Real food for your busiest weeknights',
      longDescription: 'For the nights when time is short but you refuse to compromise on a real meal.'
    }
  ],
  global: [
    { 
      id: 'taco', 
      label: 'Taco Tuesday & Beyond', 
      image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80', 
      description: 'Bold Mexican flavors and easy fiestas', 
      longDescription: 'Vibrant salsas, street-style meats, and everything you need for a Mexican-inspired fiesta.' 
    },
    { 
      id: 'mediterranean', 
      label: 'Mediterranean Escape', 
      image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80', 
      description: 'Bright, healthy, and olive-oil-powered', 
      longDescription: 'Sun-drenched flavors powered by fresh lemon, golden olive oil, and coastal inspiration.' 
    },
    { 
      id: 'nostalgic', 
      label: 'Nostalgic Comforts', 
      image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=400&q=80', 
      description: 'Family favorites that taste like home', 
      longDescription: 'The "tastes like childhood" collection—classic recipes that feel like a warm hug.' 
    },
    { 
      id: 'street', 
      label: 'Global Street Food', 
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80', 
      description: 'Bold bites and handheld world flavors', 
      longDescription: 'Bold, handheld, and high-energy bites inspired by the world’s busiest night markets.' 
    },
    { 
      id: 'silk', 
      label: 'The Silk Road', 
      image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80', 
      description: 'Stir-frys, curries, and Umami-rich eats', 
      longDescription: 'From wok-fired favorites to delicate dumplings—a journey through East and Southeast Asia.' 
    },
    { 
      id: 'trattoria', 
      label: 'The Trattoria', 
      image: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=400&q=80', 
      description: 'Rustic pastas and classic red sauces', 
      longDescription: 'Rustic pastas, handmade sauces, and the timeless art of simple, high-quality ingredients.' 
    },
    { 
      id: 'americana', 
      label: 'Classic Americana', 
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80', 
      description: 'Diner staples and backyard favorites', 
      longDescription: 'Diner-style staples, backyard burgers, and the legendary dishes of the American kitchen.' 
    },
    { 
      id: 'bistro', 
      label: 'Old World Bistro', 
      image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=400&q=80', 
      description: 'Hearty classics from across the continent', 
      longDescription: 'Refined continental classics, from French bistros to hearty Central European fare.' 
    }
  ],
  seasonal: [
    { 
      id: 'holiday', 
      label: 'Holiday Winter Showstoppers', 
      image: 'https://images.unsplash.com/photo-1576867756503-da85b47f8930?auto=format&fit=crop&w=400&q=80', 
      description: 'Big feasts and festive crowd-pleasers', 
      longDescription: 'Make it a December to remember with impressive, festive feasts designed for your holiday table.' 
    },
    { 
      id: 'bbq', 
      label: 'Summer BBQ & Grilling', 
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80', 
      description: 'Smoky mains and fresh outdoor sides', 
      longDescription: 'Smoky flavors and backyard favorites—from the perfect char to the freshest outdoor sides.' 
    },
    { 
      id: 'harvest', 
      label: 'Cozy Fall Harvest', 
      image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?auto=format&fit=crop&w=400&q=80', 
      description: 'Comforting bakes and earthy autumn flavors', 
      longDescription: 'Embrace the crisp air with earthy root vegetables, warm spices, and slow-roasted comforts.' 
    },
    { 
      id: 'spring', 
      label: 'The Fresh Spring Table', 
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80', 
      description: 'Light, vibrant, and herb-forward dishes', 
      longDescription: 'Celebrate the renewal with light, herb-forward dishes and the very first greens of the season.' 
    }
  ]
};

const Collections: React.FC<CollectionsProps> = ({ 
  recipes, 
  onBack, 
  onRecipeSelect,
  onPlannerOpen,
  recentCount
}) => {
  // State to track if we are viewing the main dashboard or a specific sub-collection
  const [selectedTheme, setSelectedTheme] = useState<CollectionItem | null>(null);

  const moneySaved = recentCount * 8; // Avg savings

  // Filter logic for specific themes
  const filteredRecipes = useMemo(() => {
    if (!selectedTheme) return [];
    
    return recipes.filter(r => {
      const text = (r.title + r.category + r.description).toLowerCase();
      
      switch (selectedTheme.id) {
        // Lifestyle
        case 'one-pot': return text.includes('sheet') || text.includes('pot') || text.includes('pan') || text.includes('skillet');
        case 'sunday-prep': return r.baseServings >= 6 || text.includes('batch') || text.includes('prep');
        case 'table-two': return r.baseServings === 2 || text.includes('steak') || text.includes('risotto') || text.includes('date');
        case 'pantry': return text.includes('pasta') || text.includes('bean') || text.includes('canned') || text.includes('rice');
        case 'social': return r.category === 'Appetizer' || r.category === 'Beverages' || r.category === 'Beverage' || r.category === 'Cocktail' || r.category === 'Snack' || text.includes('dip');
        case '30-min': return (r.prepTime + r.cookTime) <= 35;
        
        // Global Gallery
        case 'taco': return text.includes('taco') || text.includes('mexican') || text.includes('salsa') || text.includes('fajita');
        case 'mediterranean': return text.includes('greek') || text.includes('lemon') || text.includes('olive') || text.includes('fish');
        case 'nostalgic': return text.includes('mac') || text.includes('cheese') || text.includes('pie') || text.includes('roast') || text.includes('soup');
        case 'street': return text.includes('skewer') || text.includes('bao') || text.includes('sandwich') || text.includes('fried');
        case 'silk': return text.includes('asian') || text.includes('curry') || text.includes('rice') || text.includes('stir') || text.includes('soy');
        case 'trattoria': return text.includes('pasta') || text.includes('italian') || text.includes('tomato') || text.includes('lasagna');
        case 'americana': return text.includes('burger') || text.includes('bbq') || text.includes('fry') || text.includes('diner');
        case 'bistro': return text.includes('french') || text.includes('steak') || text.includes('onion') || text.includes('wine');
        
        // Seasonal Suite
        case 'holiday': return r.category === 'Whole Meal' || text.includes('roast') || text.includes('turkey') || text.includes('ham') || text.includes('feast');
        case 'bbq': return text.includes('grill') || text.includes('bbq') || text.includes('burger') || text.includes('corn') || text.includes('summer');
        case 'harvest': return text.includes('pumpkin') || text.includes('squash') || text.includes('soup') || text.includes('stew') || text.includes('spice') || text.includes('apple');
        case 'spring': return text.includes('salad') || text.includes('green') || text.includes('lemon') || text.includes('herb') || text.includes('asparagus') || text.includes('fresh');
        
        default: return true;
      }
    });
  }, [selectedTheme, recipes]);

  // Reusable card renderer to ensure consistency across all sections
  const renderCollectionCards = (items: CollectionItem[]) => (
    <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
      {items.map(item => (
        <button 
          key={item.id}
          onClick={() => setSelectedTheme(item)}
          className="relative w-[160px] h-[220px] shrink-0 rounded-[1.25rem] overflow-hidden group active:scale-95 transition-transform bg-[#1c1d15] border border-white/5"
        >
          <img src={item.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
            <h3 className="text-white font-black text-lg leading-none mb-2 line-clamp-2">{item.label}</h3>
            <p className="text-[#b6baa1] text-[9px] font-medium leading-relaxed line-clamp-3 opacity-90">{item.description}</p>
          </div>
        </button>
      ))}
    </div>
  );

  if (selectedTheme) {
    return (
      <div className="bg-[#000000] min-h-screen text-white flex flex-col font-sans w-full">
        <header className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5 header-safe-pt">
          <button onClick={() => setSelectedTheme(null)} className="flex items-center justify-center size-10 active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-2xl text-white font-bold">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-black tracking-tight uppercase">{selectedTheme.label}</h1>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">{filteredRecipes.length} Recipes</p>
          </div>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 p-4 pb-32 overflow-y-auto no-scrollbar">
          {/* Long Description Block */}
          {selectedTheme.longDescription && (
            <div className="mb-6 px-2">
              <p className="text-[#b6baa1] text-sm font-medium leading-relaxed text-center italic opacity-80">
                "{selectedTheme.longDescription}"
              </p>
            </div>
          )}

          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredRecipes.map(recipe => (
                <div 
                  key={recipe.id} 
                  onClick={() => onRecipeSelect(recipe)}
                  className="flex gap-4 p-2 bg-[#1c1d15] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform"
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                    <img src={formatImageUrl(recipe.imageUrl)} className="w-full h-full object-cover" alt={recipe.title} />
                  </div>
                  <div className="flex flex-col justify-center flex-1 py-1">
                    <span className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-1">{recipe.category}</span>
                    <h3 className="text-white font-bold text-base leading-tight mb-2 line-clamp-2">{recipe.title}</h3>
                    <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                      <span>{recipe.prepTime + recipe.cookTime} Min</span>
                      <span>•</span>
                      <span>{recipe.difficulty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <span className="material-symbols-outlined text-5xl mb-4">search_off</span>
              <p className="text-sm font-bold">No matching recipes found.</p>
              <p className="text-xs">Try adding more recipes to your library.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#000000] min-h-screen text-white flex flex-col font-sans w-full">
      <header className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5 header-safe-pt">
        <button onClick={onBack} className="flex items-center justify-center size-10 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-2xl text-white font-bold">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-black tracking-tight uppercase">Collections</h1>
          <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Curated Suites</p>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 pb-32 overflow-y-auto no-scrollbar">
        
        {/* RECAP BLOCK - Moved from Home */}
        <section className="px-4 pt-6 pb-8">
          <h2 className="text-sm font-black text-white tracking-widest uppercase mb-4 px-1 text-[#636b2f] opacity-80">Insight</h2>
          <div className="flex flex-col gap-4 rounded-3xl bg-[#1c1d15] p-6 shadow-2xl border border-white/5 relative overflow-hidden group">
            <div className="flex flex-col gap-1.5 relative z-10">
              <p className="text-white text-lg font-black leading-tight">Last 30 Days Recap</p>
              <p className="text-[#b6baa1] text-sm font-medium leading-relaxed">
                You cooked <span className="text-white font-bold">{recentCount} meals</span> this month, potentially saving <span className="text-[#636b2f] font-bold">${moneySaved}</span> vs. dining out.
              </p>
            </div>
            <button 
              onClick={onPlannerOpen}
              className="flex min-w-[120px] cursor-pointer items-center justify-center rounded-full h-11 px-8 bg-[#3b3e2e] text-white gap-2 text-xs font-black uppercase tracking-widest hover:bg-[#4a4d3a] transition-all active:scale-95 w-fit relative z-10"
            >
              <span>View Planner</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#636b2f]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#636b2f]/5 rounded-full blur-2xl -ml-12 -mb-12"></div>
          </div>
        </section>

        {/* 1. The Lifestyle Lab */}
        <section className="mb-8">
          <div className="px-4 mb-3">
            <h2 className="text-xl font-black text-white tracking-tight">The Lifestyle Lab</h2>
            <p className="text-[10px] font-bold uppercase text-[#636b2f] tracking-widest mt-1 opacity-80">
              Solving your "Right Now" reality
            </p>
          </div>
          {renderCollectionCards(COLLECTIONS_DATA.lifestyle)}
        </section>

        {/* 2. The Global Gallery */}
        <section className="mb-8">
          <div className="px-4 mb-3">
            <h2 className="text-xl font-black text-white tracking-tight">The Global Gallery</h2>
            <p className="text-[10px] font-bold uppercase text-[#636b2f] tracking-widest mt-1 opacity-80">
              Enjoy a taste around the world
            </p>
          </div>
          {renderCollectionCards(COLLECTIONS_DATA.global)}
        </section>

        {/* 3. The Seasonal Suite */}
        <section className="mb-8">
          <div className="px-4 mb-3">
            <h2 className="text-xl font-black text-white tracking-tight">The Seasonal Suite</h2>
            <p className="text-[10px] font-bold uppercase text-[#636b2f] tracking-widest mt-1 opacity-80">
              A recipe perfect for anytime of the year
            </p>
          </div>
          {renderCollectionCards(COLLECTIONS_DATA.seasonal)}
        </section>

      </main>
    </div>
  );
};

export default Collections;