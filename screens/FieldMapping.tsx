
import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveSchemaToSheet, SheetMappingSchema, fetchFullAppData, fetchSheetHeaders } from '../services/googleSheets';

interface FieldMappingProps {
  onBack: () => void;
  onConfirm: (count: number) => void;
}

interface PillarField {
  key: string;
  label: string;
  required: boolean;
  icon: string;
}

interface PillarConfig {
  id: keyof SheetMappingSchema;
  title: string;
  description: string;
  fields: PillarField[];
}

const PILLARS: PillarConfig[] = [
  {
    id: 'recipes',
    title: '1. Recipes Tab',
    description: 'Core metadata for your recipe collection',
    fields: [
      { key: 'id', label: 'Recipe ID (Relational)', required: true, icon: 'tag' },
      { key: 'title', label: 'Recipe Name', required: true, icon: 'title' },
      { key: 'category', label: 'Category', required: false, icon: 'category' },
      { key: 'baseServings', label: 'Serves or Makes', required: false, icon: 'groups' },
      { key: 'prepTime', label: 'Prep (Minutes)', required: false, icon: 'timer' },
      { key: 'cookTime', label: 'Cook (Minutes)', required: false, icon: 'skillet' },
      { key: 'difficulty', label: 'Difficulty', required: false, icon: 'speed' },
      { key: 'description', label: 'Description', required: false, icon: 'description' },
      { key: 'chefTip', label: 'Chef\'s Tip', required: false, icon: 'lightbulb' },
      { key: 'instructions', label: 'Instructions', required: true, icon: 'assignment' },
      { key: 'imageUrl', label: 'Picture (URL)', required: false, icon: 'image' },
    ]
  },
  {
    id: 'ingredients',
    title: '2. Ingredients Tab',
    description: 'Master ledger for store aisles and package logic',
    fields: [
      { key: 'ingName', label: 'Ingredient', required: true, icon: 'nutrition' },
      { key: 'category', label: 'Category', required: false, icon: 'category' },
      { key: 'monroe', label: 'Monroe Avenue (Aisle)', required: false, icon: 'location_on' },
      { key: 'perinton', label: 'Perinton (Aisle)', required: false, icon: 'location_on' },
      { key: 'east', label: 'East Avenue (Aisle)', required: false, icon: 'location_on' },
      { key: 'purchaseQty', label: 'Default Purchase Qty (Multiplier)', required: true, icon: 'calculate' },
      { key: 'buyAsUnit', label: 'Buy As', required: true, icon: 'shopping_cart' },
    ]
  },
  {
    id: 'components',
    title: '3. Components Tab',
    description: 'Relational mapping of recipes to quantities',
    fields: [
      { key: 'recipeId', label: 'Recipe ID (Relational)', required: true, icon: 'link' },
      { key: 'name', label: 'Ingredient Name', required: true, icon: 'label' },
      { key: 'amount', label: 'Quantity', required: true, icon: 'calculate' },
      { key: 'unit', label: 'Unit', required: true, icon: 'straighten' },
    ]
  },
  {
    id: 'mealLogs',
    title: '4. Meal Logs',
    description: 'History of scheduled and cooked meals',
    fields: [
      { key: 'date', label: 'Date', required: true, icon: 'calendar_month' },
      { key: 'mealType', label: 'Meal Type', required: true, icon: 'sunny' },
      { key: 'recipeId', label: 'Recipe ID', required: true, icon: 'link' },
      { key: 'servings', label: 'Actual Servings', required: true, icon: 'groups' },
    ]
  },
  {
    id: 'pantryStock',
    title: '5. Pantry Stock',
    description: 'Real-time inventory levels',
    fields: [
      { key: 'name', label: 'Item Name', required: true, icon: 'label' },
      { key: 'quantity', label: 'Quantity On Hand', required: true, icon: 'calculate' },
      { key: 'unit', label: 'Unit', required: true, icon: 'straighten' },
      { key: 'lowStockThreshold', label: 'Low Stock At', required: false, icon: 'notification_important' },
    ]
  }
];

const SHEET_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const FieldMapping: React.FC<FieldMappingProps> = ({ onBack, onConfirm }) => {
  const { accessToken, spreadsheetId } = useAuth();
  const [activePillar, setActivePillar] = useState<PillarConfig['id']>('recipes');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  
  const [mappings, setMappings] = useState<SheetMappingSchema>(() => {
    const saved = localStorage.getItem('mise_field_mappings');
    return saved ? JSON.parse(saved) : {
      recipes: {}, ingredients: {}, components: {}, mealLogs: {}, pantryStock: {}
    };
  });

  const handleUpdateMapping = (pillarId: string, fieldKey: string, column: string) => {
    setMappings(prev => ({
      ...prev,
      [pillarId]: { ...prev[pillarId as keyof SheetMappingSchema], [fieldKey]: column }
    }));
  };

  const handleAutoMap = async () => {
    setIsAutoMapping(true);
    try {
      const headersMap = await fetchSheetHeaders(spreadsheetId);
      if (!headersMap) throw new Error("Connection Failure");
      const currentHeaders = headersMap[activePillar] || [];
      const currentPillarConfig = PILLARS.find(p => p.id === activePillar);
      if (!currentPillarConfig) return;
      const newTabMappings: Record<string, string> = {};
      currentPillarConfig.fields.forEach((field, fieldIndex) => {
        const exactMatchIndex = currentHeaders.findIndex(h => 
          h && h.toString().trim().toLowerCase() === field.label.trim().toLowerCase()
        );
        if (exactMatchIndex !== -1) {
          newTabMappings[field.key] = `Column ${SHEET_COLUMNS[exactMatchIndex]}`;
        } else if (fieldIndex < currentHeaders.length && currentHeaders[fieldIndex]) {
          newTabMappings[field.key] = `Column ${SHEET_COLUMNS[fieldIndex]}`;
        }
      });
      setMappings(prev => ({ ...prev, [activePillar]: newTabMappings }));
    } catch (err) {
      console.error(err);
      alert("Header Scan Failed. Verify your API Key.");
    } finally {
      setIsAutoMapping(false);
    }
  };

  const handleConfirm = async () => {
    setCommitError(null);
    setIsCommitting(true);
    try {
      localStorage.setItem('mise_field_mappings', JSON.stringify(mappings));
      if (accessToken && !accessToken.startsWith('mock_')) {
          await saveSchemaToSheet(spreadsheetId || '', mappings, accessToken);
      }
      const data = await fetchFullAppData(spreadsheetId);
      if (data) {
        setSuccessCount(data.recipes.length);
        setTimeout(() => {
          setIsCommitting(false);
          onConfirm(data.recipes.length); 
        }, 1500);
      } else {
        throw new Error("Handshake failed: Data empty.");
      }
    } catch (error: any) {
      setCommitError(error.message || "Sync rejected.");
      setIsCommitting(false);
    }
  };

  const currentPillar = useMemo(() => PILLARS.find(p => p.id === activePillar) || PILLARS[0], [activePillar]);

  if (isCommitting || commitError) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#0f110c] flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-500 w-full shadow-2xl">
        <div className="relative mb-12">
          {!commitError ? (
            <div className="size-32 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
          ) : (
            <div className="size-32 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40">
              <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
            </div>
          )}
        </div>
        <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-widest">{!commitError ? 'Architecture Check' : 'Handshake Failed'}</h2>
        <p className="text-[#b6baa1] text-sm mb-8 opacity-60 leading-relaxed px-4">{!commitError ? 'Aligning relational pointers...' : commitError}</p>
        {commitError && (
          <div className="flex flex-col gap-3 w-full">
            <button onClick={handleConfirm} className="w-full bg-primary text-white font-black py-4 rounded-2xl">Retry Handshake</button>
            <button onClick={() => setCommitError(null)} className="w-full bg-white/5 text-white/40 font-black py-4 rounded-2xl">Back</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0f110c] text-white font-sans h-screen flex flex-col w-full overflow-hidden border-x border-white/5 shadow-2xl">
      <header className="bg-[#0f110c]/95 backdrop-blur-md sticky top-0 z-30 border-b border-white/5 header-safe-pt">
        <div className="flex items-center justify-between px-4 pb-4">
          <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform"><span className="material-symbols-outlined text-primary font-bold">arrow_back_ios_new</span></button>
          <div className="flex flex-col items-center"><h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Relational Map</h2><p className="text-[10px] text-[#b6baa1] font-bold mt-0.5 opacity-60">Architecture Setup</p></div>
          <button onClick={handleAutoMap} disabled={isAutoMapping} className="size-10 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary active:scale-90 transition-all"><span className={`material-symbols-outlined ${isAutoMapping ? 'animate-spin' : ''}`}>{isAutoMapping ? 'sync' : 'auto_fix_high'}</span></button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-4">
          {PILLARS.map(p => (
            <button key={p.id} onClick={() => setActivePillar(p.id)} className={`flex-none px-5 py-3 rounded-2xl border transition-all ${activePillar === p.id ? 'bg-primary border-primary text-white font-black' : 'bg-white/5 border-white/10 text-[#b6baa1] font-bold'}`}><span className="text-[10px] uppercase tracking-widest whitespace-nowrap">{p.title.split('. ')[1]}</span></button>
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 pt-8 pb-48">
        <div className="mb-8 px-1"><h1 className="text-3xl font-black tracking-tight mb-2 font-display">{currentPillar.title}</h1><p className="text-sm text-[#b6baa1] leading-relaxed font-medium opacity-70">{currentPillar.description}</p></div>
        <div className="space-y-3">
          {currentPillar.fields.map(field => {
             const currentVal = (mappings as any)[activePillar][field.key];
             const hasValue = currentVal && currentVal !== 'Select';
             return (
              <div key={field.key} className={`flex items-center gap-4 p-5 rounded-[1.75rem] border transition-all duration-300 ${hasValue ? 'bg-primary/5 border-primary/40' : 'bg-white/[0.03] border-white/5'}`}>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-3"><div className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${hasValue ? 'bg-primary text-white border-primary/20' : 'bg-white/5 text-[#b6baa1]'}`}><span className="material-symbols-outlined text-xl">{field.icon}</span></div><p className="text-[11px] font-black uppercase tracking-widest text-white/90 truncate">{field.label} {field.required && <span className="text-amber-500 font-black">*</span>}</p></div></div>
                <div className="relative shrink-0">
                  <select value={currentVal || 'Select'} onChange={(e) => handleUpdateMapping(activePillar, field.key, e.target.value)} className={`bg-[#1c1d15] border border-white/10 rounded-xl h-12 px-4 text-xs font-black appearance-none pr-10 outline-none min-w-[120px] ${hasValue ? 'text-primary' : 'text-[#b6baa1]'}`}>
                    <option value="Select">SELECT</option>
                    {SHEET_COLUMNS.map(col => <option key={col} value={`Column ${col}`}>COLUMN {col}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-xl">unfold_more</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f110c] via-[#0f110c]/90 to-transparent z-50 w-full">
        <button onClick={handleConfirm} className="w-full h-18 rounded-[2rem] bg-primary text-white font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] uppercase tracking-widest"><span className="material-symbols-outlined font-black text-2xl">verified</span>Confirm & Save Ledger</button>
      </div>
    </div>
  );
};

export default FieldMapping;
