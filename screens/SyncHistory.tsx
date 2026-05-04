
import React from 'react';
import { SyncHistoryEntry } from '../types';

interface SyncHistoryProps {
  history: SyncHistoryEntry[];
  onBack: () => void;
  onClear: () => void;
  onResolve: (id: string) => void;
}

const SyncHistory: React.FC<SyncHistoryProps> = ({ history, onBack, onClear, onResolve }) => {
  return (
    <div className="bg-[#1c1d15] text-white min-h-screen flex flex-col font-sans max-w-[480px] mx-auto border-x border-white/5">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-10 bg-[#1c1d15]/95 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center p-4 pb-2 justify-between w-full">
          <button 
            onClick={onBack}
            className="text-white flex size-12 shrink-0 items-center justify-start cursor-pointer active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined font-bold">arrow_back_ios</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center font-display">Sync History</h2>
          <div className="flex w-12 items-center justify-end">
            <button className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-transparent text-white hover:bg-white/10 transition-colors active:scale-90">
              <span className="material-symbols-outlined">sync</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 pt-6 pb-40 no-scrollbar overflow-y-auto">
        {/* Overview Section */}
        <div className="mb-8">
          <h3 className="text-[#626a2f] text-xs font-black uppercase tracking-[0.15em] mb-3">Google Sheets Status</h3>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-4">
            <div className="size-12 rounded-full bg-[#626a2f]/20 flex items-center justify-center border border-[#626a2f]/20">
              <span className="material-symbols-outlined text-[#626a2f] text-2xl fill-1">cloud_done</span>
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">Last synced: 10:30 AM</p>
              <p className="text-[#b6baa1] text-xs font-medium mt-1">Recipe Organizer Pro Sheet</p>
            </div>
          </div>
        </div>

        <h3 className="text-white text-xl font-black leading-tight tracking-tight pb-6 font-display">Activity Timeline</h3>

        {/* Timeline Items */}
        <div className="space-y-0">
          {history.map((entry, idx) => (
            <div key={entry.id} className="grid grid-cols-[44px_1fr] gap-x-2">
              {/* Timeline Connector */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className={`size-8 rounded-full flex items-center justify-center shadow-lg ${
                  entry.type === 'success' ? 'bg-[#626a2f]/20 text-[#626a2f]' : 'bg-[#d4a017]/20 text-[#d4a017]'
                }`}>
                  <span className="material-symbols-outlined text-xl font-bold">
                    {entry.type === 'success' ? 'check_circle' : 'warning'}
                  </span>
                </div>
                {idx !== history.length - 1 && (
                  <div className="w-[2.5px] bg-[#3b3e2e] h-full min-h-[40px] rounded-full"></div>
                )}
              </div>

              {/* Entry Content */}
              <div className="pb-8">
                <details className={`flex flex-col rounded-2xl border px-4 py-4 group overflow-hidden transition-all shadow-xl ${
                  entry.type === 'conflict' 
                    ? 'border-[#d4a017]/30 bg-[#d4a017]/10' 
                    : 'border-white/5 bg-white/5'
                }`} open={idx === 0}>
                  <summary className="flex cursor-pointer items-center justify-between gap-4 list-none outline-none">
                    <div className="flex-1">
                      <p className="text-white text-base font-black font-display tracking-tight">{entry.timestamp}</p>
                      <p className={`text-sm font-medium mt-0.5 ${entry.type === 'conflict' ? 'text-[#d4a017]' : 'text-[#b6baa1]'}`}>
                        {entry.summary}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-white/30 group-open:rotate-180 transition-transform duration-300">expand_more</span>
                  </summary>

                  <div className={`mt-4 pt-4 border-t space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                    entry.type === 'conflict' ? 'border-[#d4a017]/20' : 'border-white/10'
                  }`}>
                    {entry.details?.added && entry.details.added.length > 0 && (
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[#626a2f] text-sm mt-0.5 font-bold">add_circle</span>
                        <p className="text-white/80 text-sm leading-relaxed">
                          {entry.details.added.join(', ')}
                        </p>
                      </div>
                    )}
                    {entry.details?.updated && entry.details.updated.length > 0 && (
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-400 text-sm mt-0.5 font-bold">edit_square</span>
                        <p className="text-white/80 text-sm leading-relaxed">
                          {entry.details.updated.join(', ')}
                        </p>
                      </div>
                    )}
                    {entry.type === 'conflict' && (
                      <div className="space-y-3">
                        <p className="text-white/80 text-sm leading-relaxed">
                          Conflict detected for "{entry.details?.conflicts?.[0]}". Local and cloud versions differ.
                        </p>
                        <button 
                          onClick={() => onResolve(entry.id)}
                          className="bg-[#d4a017]/20 hover:bg-[#d4a017]/30 text-[#d4a017] text-[10px] font-black tracking-widest uppercase py-2.5 px-6 rounded-full border border-[#d4a017]/40 transition-all active:scale-95"
                        >
                          RESOLVE NOW
                        </button>
                      </div>
                    )}
                    {!entry.details?.added && !entry.details?.updated && entry.type === 'success' && (
                       <p className="text-white/80 text-sm leading-relaxed">
                         Full library re-sync completed successfully. All local items match the cloud version.
                       </p>
                    )}
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 pb-12 bg-gradient-to-t from-[#1c1d15] via-[#1c1d15]/95 to-transparent z-20">
        <div className="max-w-[480px] mx-auto">
          <button 
            onClick={onClear}
            className="w-full flex items-center justify-center h-16 bg-white/10 hover:bg-white/15 text-white text-base font-black rounded-full transition-all active:scale-[0.98] shadow-2xl border border-white/5"
          >
            <span className="material-symbols-outlined mr-2 text-xl">delete_sweep</span>
            Clear Sync History
          </button>
        </div>
      </footer>
    </div>
  );
};

export default SyncHistory;
