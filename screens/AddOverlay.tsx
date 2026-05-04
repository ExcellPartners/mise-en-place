
import React from 'react';

interface AddOverlayProps {
  onClose: () => void;
  onImportFromSheets: () => void;
  onAddManual?: () => void;
  onScan?: () => void;
  onAddIngredient?: () => void;
  onAddMyItem?: () => void;
}

const AddOverlay: React.FC<AddOverlayProps> = ({ onClose, onImportFromSheets, onAddManual, onScan, onAddIngredient, onAddMyItem }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end pb-12 backdrop-blur-xl bg-[#1c1d15]/85 transition-all duration-300">
      <div className="w-full max-w-md px-4 mb-12">
        <div className="grid grid-cols-2 gap-4 items-end mb-8">
          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={onAddIngredient}
              className="size-20 bg-[#636b2f] hover:bg-[#636b2f]/90 transition-colors rounded-full flex items-center justify-center text-white shadow-lg shadow-[#636b2f]/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-3xl">nutrition</span>
            </button>
            <div className="text-center">
              <p className="text-white text-[13px] font-semibold">Ingredient</p>
              <p className="text-white/50 text-[10px] uppercase tracking-widest">Master Ledger</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={onAddMyItem}
              className="size-20 bg-[#636b2f] hover:bg-[#636b2f]/90 transition-colors rounded-full flex items-center justify-center text-white shadow-lg shadow-[#636b2f]/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-3xl">inventory_2</span>
            </button>
            <div className="text-center">
              <p className="text-white text-[13px] font-semibold">My Item</p>
              <p className="text-white/50 text-[10px] uppercase tracking-widest">Personal Catalog</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 items-end mb-10 border-t border-white/5 pt-8">
          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={onAddManual}
              className="size-16 bg-white/5 border border-white/10 transition-colors rounded-full flex items-center justify-center text-white active:scale-95"
            >
              <span className="material-symbols-outlined text-2xl">edit_note</span>
            </button>
            <p className="text-white/50 text-[9px] uppercase font-bold tracking-widest">Manual Recipe</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={onScan}
              className="size-20 bg-white/10 border border-white/20 transition-colors rounded-full flex items-center justify-center text-white active:scale-95 shadow-xl"
            >
              <span className="material-symbols-outlined text-3xl">photo_camera</span>
            </button>
            <p className="text-white text-[10px] uppercase font-black tracking-widest">Scan Recipe</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={onImportFromSheets}
              className="size-16 bg-white/5 border border-white/10 transition-colors rounded-full flex items-center justify-center text-white active:scale-95"
            >
              <span className="material-symbols-outlined text-2xl">sync</span>
            </button>
            <p className="text-white/50 text-[9px] uppercase font-bold tracking-widest">Cloud Sync</p>
          </div>
        </div>
      </div>

      <div className="flex px-4 py-3 justify-center w-full">
        <button 
          onClick={onClose}
          className="flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white dark:bg-[#1c1d15] text-[#1c1d15] dark:text-white shadow-2xl active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-3xl">close</span>
        </button>
      </div>
    </div>
  );
};

export default AddOverlay;
