
import React, { useRef } from 'react';

interface SyncSettingsProps {
  onBack: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onMapFields?: () => void;
  onOpenHistory?: () => void;
  onOpenBackup?: () => void;
  onChangeAccount?: () => void;
  currentAccount: string;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ 
  onBack, 
  onSync, 
  isSyncing, 
  onMapFields, 
  onOpenHistory, 
  onOpenBackup, 
  onChangeAccount,
  currentAccount 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`File "${file.name}" received. Proceeding to Data Architecture mapping to verify column headers.`);
      onMapFields?.();
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#0f110c] text-white font-sans max-w-[480px] mx-auto">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json,.csv,.xlsx" 
        onChange={handleFileUpload} 
      />

      {/* Top App Bar */}
      <div className="flex items-center bg-[#0f110c]/95 backdrop-blur-md p-4 pb-2 justify-between sticky top-0 z-10 header-safe-pt">
        <button 
          onClick={onBack}
          className="text-white flex size-12 shrink-0 items-center justify-start cursor-pointer active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined font-black">arrow_back_ios</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12 font-display">Master Import Hub</h2>
      </div>

      <div className="flex flex-col gap-8 px-4 py-6 flex-1">
        {/* Connection Status Section */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Connection Health</h3>
            <span className="bg-primary/10 text-primary text-[9px] font-black px-2.5 py-1 rounded-full border border-primary/20">SYSTEM READY</span>
          </div>
          <div 
            onClick={onOpenHistory}
            className="bg-[#1a1d14] rounded-[2rem] p-6 border border-white/5 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all shadow-2xl group"
          >
            <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 group-active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-primary fill-1 text-2xl">history</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white font-bold text-lg leading-tight truncate">Sync Activity</p>
              <p className="text-white/40 text-xs font-bold mt-1 uppercase tracking-widest">View Historical Logs</p>
            </div>
            <span className="material-symbols-outlined text-white/20">chevron_right</span>
          </div>
        </div>

        {/* Option A: Google Sheets Link */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Option A: Cloud Link</h3>
            <span className="text-[9px] text-primary font-black uppercase tracking-widest italic">Live Sync</span>
          </div>
          <div 
            onClick={onChangeAccount}
            className="flex flex-col gap-2 p-6 bg-[#1a1d14] rounded-[2rem] border border-white/5 shadow-inner cursor-pointer active:bg-white/5 transition-colors group"
          >
             <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-2xl bg-white flex items-center justify-center p-2.5 shadow-inner overflow-hidden shrink-0 group-active:scale-95 transition-transform">
                <img 
                  alt="Sheets Icon" 
                  className="w-full h-full object-contain" 
                  src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg"
                />
              </div>
              <div className="overflow-hidden">
                <p className="text-white font-bold text-base truncate">Google Sheets Ledger</p>
                <p className="text-white/30 text-xs truncate mt-0.5">{currentAccount}</p>
              </div>
            </div>
            <div className="h-px bg-white/5 my-2"></div>
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Sync automatically on app launch</p>
              <span className="material-symbols-outlined text-primary text-sm">verified</span>
            </div>
          </div>
        </div>

        {/* Option B: Direct File Import */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Option B: Manual Import</h3>
            <span className="text-[9px] text-amber-500/60 font-black uppercase tracking-widest italic">Offline Only</span>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-4 p-6 bg-[#1a1d14] rounded-[2rem] border border-white/5 shadow-inner cursor-pointer active:bg-white/5 transition-colors group text-left w-full"
          >
            <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-white/60 text-2xl">upload_file</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white font-bold text-base truncate">Upload Backup File</p>
              <p className="text-white/30 text-xs truncate mt-0.5">Select .json, .csv, or .xlsx</p>
            </div>
          </button>
        </div>

        {/* Data Architecture Config */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">2. Data Architecture</h3>
            <button onClick={onMapFields} className="text-[10px] text-primary font-black uppercase tracking-widest">Configure Columns</button>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'RECIPES', icon: 'table_chart', status: 'Mapped' },
              { label: 'LEDGER', icon: 'inventory', status: 'Mapped' },
              { label: 'MAPPING', icon: 'reorder', status: 'Mapped' }
            ].map((pillar, i) => (
              <div key={i} className="bg-[#1a1d14] p-5 rounded-[1.5rem] border border-white/5 flex flex-col items-center gap-2 text-center shadow-lg group active:scale-95 transition-transform cursor-pointer" onClick={onMapFields}>
                <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-110 transition-transform">{pillar.icon}</span>
                <p className="text-[9px] font-black text-white/80 tracking-widest mt-1">{pillar.label}</p>
                <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-tighter">{pillar.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Backup & Export Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Safekeeping</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onOpenBackup}
              className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-3 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-primary text-lg">download</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Export All</span>
            </button>
            <button 
              onClick={onOpenBackup}
              className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-3 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-primary text-lg">restore</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Recovery</span>
            </button>
          </div>
        </div>

        {/* Sync Controls Area */}
        <div className="mt-12 mb-20">
          {isSyncing ? (
            <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-8 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="size-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin mb-6"></div>
                <p className="text-white font-bold text-xl tracking-tight">Processing Import...</p>
                <p className="text-white/40 text-xs font-medium mt-2">Merging database entities</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] px-1">
                  <span className="text-primary">Progress</span>
                  <span className="text-white">82%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-primary shadow-[0_0_15px_rgba(99,107,47,0.5)] transition-all duration-1000" style={{ width: '82%' }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 flex items-start gap-4">
                <span className="material-symbols-outlined text-primary text-2xl">info</span>
                <p className="text-[10px] text-white/40 font-bold leading-relaxed uppercase tracking-widest">
                  Any changes to your <span className="text-white">Column Mapping</span> will affect how your ingredients are sorted in the <span className="text-white">Shopping Path</span>.
                </p>
              </div>
              
              <button 
                onClick={onSync}
                className="w-full h-20 bg-primary text-white font-black text-lg rounded-[2rem] shadow-2xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
              >
                <span className="material-symbols-outlined font-black text-2xl">sync</span>
                Process & Update App
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="p-8 pt-0 text-center pb-12">
        <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">Personal Build 2.5.0 • Data Management Central</p>
      </footer>
    </div>
  );
};

export default SyncSettings;
