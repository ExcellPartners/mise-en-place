
import React, { useState } from 'react';

interface ConflictField {
  id: string;
  label: string;
  appVersion: string | React.ReactNode;
  sheetVersion: string | React.ReactNode;
  status: 'warning' | 'danger';
}

interface ResolveConflictProps {
  onBack: () => void;
  onConfirm: () => void;
}

const ResolveConflict: React.FC<ResolveConflictProps> = ({ onBack, onConfirm }) => {
  const [selections, setSelections] = useState<Record<string, 'app' | 'sheet'>>({
    cookTime: 'sheet',
    ingredients: 'app', // Initial neutral or app preference
    category: 'app',
    instructions: 'sheet'
  });

  const conflicts: ConflictField[] = [
    {
      id: 'cookTime',
      label: 'Cook Time',
      appVersion: '45 mins',
      sheetVersion: '1 hour',
      status: 'warning'
    },
    {
      id: 'ingredients',
      label: 'Ingredients',
      appVersion: (
        <>
          1lb Ground Beef<br />
          2 cups Mozzarella<br />
          Marinara Sauce
        </>
      ),
      sheetVersion: (
        <>
          1lb Italian Sausage<br />
          3 cups Mozzarella<br />
          Homemade Sauce
        </>
      ),
      status: 'danger'
    },
    {
      id: 'category',
      label: 'Category',
      appVersion: 'Dinner',
      sheetVersion: 'Italian',
      status: 'warning'
    },
    {
      id: 'instructions',
      label: 'Instructions',
      appVersion: 'Layer the noodles with cheese and sauce...',
      sheetVersion: 'Boil noodles first, then layer with meat and...',
      status: 'warning'
    }
  ];

  const handleSelect = (id: string, version: 'app' | 'sheet') => {
    setSelections(prev => ({ ...prev, [id]: version }));
  };

  const getStatusBorder = (status: 'warning' | 'danger', isSelected: boolean) => {
    if (isSelected) return 'border-[#636b2f] bg-[#636b2f]/10 shadow-[0_0_15px_rgba(99,107,47,0.1)]';
    if (status === 'warning') return 'border-yellow-500/40 bg-yellow-500/5';
    return 'border-red-500/40 bg-red-500/5';
  };

  const getStatusText = (status: 'warning' | 'danger', isSelected: boolean) => {
    if (isSelected) return 'text-[#636b2f]';
    if (status === 'warning') return 'text-yellow-500/60';
    return 'text-red-500/60';
  };

  return (
    <div className="bg-[#1c1d15] text-white font-sans overflow-hidden h-screen flex flex-col w-full">
      {/* Header */}
      <header className="flex items-center bg-[#1c1d15] p-4 pb-4 justify-between sticky top-0 z-10 border-b border-[#3b3e2e]">
        <button 
          onClick={onBack}
          className="text-white flex size-10 items-center justify-center cursor-pointer rounded-full active:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 font-display">Resolve Conflict</h2>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-32 no-scrollbar">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-3 font-display">Mom's Lasagna</h1>
          <p className="text-[#b6baa1] text-sm leading-relaxed">
            We found differences between your app and the spreadsheet. Select the version you want to keep for each field.
          </p>
        </div>

        <div className="space-y-10">
          {conflicts.map(conflict => (
            <div key={conflict.id} className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#b6baa1]">
                  {conflict.label}
                </span>
                <button className="text-[10px] font-black text-primary flex items-center gap-1 hover:opacity-80 transition-opacity">
                  <span className="material-symbols-outlined text-sm">call_merge</span>
                  MERGE BOTH
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* App Version Card */}
                <div 
                  onClick={() => handleSelect(conflict.id, 'app')}
                  className={`relative flex flex-col p-5 rounded-2xl border-2 cursor-pointer active:scale-[0.98] transition-all duration-300 ${getStatusBorder(conflict.status, selections[conflict.id] === 'app')}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-widest mb-3 ${getStatusText(conflict.status, selections[conflict.id] === 'app')}`}>
                    APP VERSION
                  </span>
                  <div className={`text-white font-semibold leading-relaxed ${conflict.id === 'instructions' ? 'text-xs line-clamp-3' : 'text-base'}`}>
                    {conflict.appVersion}
                  </div>
                  {selections[conflict.id] === 'app' && (
                    <div className="absolute top-3 right-3 animate-in zoom-in duration-200">
                      <span className="material-symbols-outlined text-primary fill-1">check_circle</span>
                    </div>
                  )}
                </div>

                {/* Sheet Version Card */}
                <div 
                  onClick={() => handleSelect(conflict.id, 'sheet')}
                  className={`relative flex flex-col p-5 rounded-2xl border-2 cursor-pointer active:scale-[0.98] transition-all duration-300 ${getStatusBorder(conflict.status, selections[conflict.id] === 'sheet')}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-widest mb-3 ${getStatusText(conflict.status, selections[conflict.id] === 'sheet')}`}>
                    SHEET VERSION
                  </span>
                  <div className={`text-white font-semibold leading-relaxed ${conflict.id === 'instructions' ? 'text-xs line-clamp-3' : 'text-base'}`}>
                    {conflict.sheetVersion}
                  </div>
                  {selections[conflict.id] === 'sheet' && (
                    <div className="absolute top-3 right-3 animate-in zoom-in duration-200">
                      <span className="material-symbols-outlined text-primary fill-1">check_circle</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-12 bg-gradient-to-t from-[#1c1d15] via-[#1c1d15] to-transparent w-full z-30">
        <button 
          onClick={onConfirm}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-16 px-5 bg-primary text-white gap-2 text-lg font-bold shadow-2xl shadow-primary/20 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined font-bold">verified</span>
          <span>Confirm Resolution</span>
        </button>
      </div>
    </div>
  );
};

export default ResolveConflict;
