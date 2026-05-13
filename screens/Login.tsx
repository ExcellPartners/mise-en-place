import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleStart = () => {
    setIsAuthenticating(true);
    // Simulate initialization delay
    setTimeout(() => {
      login('Chef Maddie'); // Explicitly adding Chef prefix for default demo user
      setIsAuthenticating(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-[#0f110c] flex flex-col font-sans w-full overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-[-15%] right-[-30%] w-[100%] aspect-square bg-primary/25 rounded-full blur-[140px] opacity-60"></div>
      <div className="absolute bottom-[-10%] left-[-25%] w-[80%] aspect-square bg-primary/15 rounded-full blur-[120px] opacity-40"></div>
      
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start pt-8 px-10 text-center overflow-y-auto no-scrollbar">
        <div className="mb-6 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="size-16 bg-primary rounded-[1.75rem] flex items-center justify-center mx-auto mb-4 shadow-[0_15px_40px_rgba(99,107,47,0.4)] rotate-12 group">
            <span className="material-symbols-outlined text-white text-3xl fill-1 -rotate-12 transition-transform duration-500 group-hover:scale-110">restaurant</span>
          </div>
          <h1 className="text-white text-4xl font-black tracking-tighter mb-2 font-display leading-[0.85] drop-shadow-2xl">
            Mise en<br/><span className="text-primary">Place</span>
          </h1>
          <p className="text-[#b6baa1] text-sm font-medium leading-relaxed max-w-[220px] mx-auto opacity-80">
            Precision kitchen ledger & grocery optimizer.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 w-full mb-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-[1.25rem] p-3 text-left backdrop-blur-md shadow-2xl">
             <div className="size-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-inner shrink-0">
                <span className="material-symbols-outlined text-lg">table_chart</span>
             </div>
             <div className="flex flex-col overflow-hidden">
                <p className="text-white font-black text-[10px] uppercase tracking-widest truncate">Hardcoded Ledger</p>
                <p className="text-[#b6baa1] text-[9px] font-medium leading-tight truncate">Cloud ID: 16ADJZBC8...</p>
             </div>
          </div>
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-[1.25rem] p-3 text-left backdrop-blur-md shadow-2xl">
             <div className="size-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-inner shrink-0">
                <span className="material-symbols-outlined text-lg">route</span>
             </div>
             <div className="flex flex-col overflow-hidden">
                <p className="text-white font-black text-[10px] uppercase tracking-widest truncate">Local Persistence</p>
                <p className="text-[#b6baa1] text-[9px] font-medium leading-tight truncate">Reliable session data storage</p>
             </div>
          </div>
        </div>

        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-500 mb-6">
          <button 
            type="button"
            onClick={handleStart}
            disabled={isAuthenticating}
            className="w-full h-14 bg-white text-black font-black text-base rounded-[1.15rem] shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            <span className="material-symbols-outlined text-black text-xl font-black">lock_open</span>
            {isAuthenticating ? 'Authorizing...' : 'Secure Login'}
          </button>
          
          <div className="flex items-center justify-center gap-2 opacity-40">
             <span className="material-symbols-outlined text-[10px]">shield</span>
             <p className="text-[8px] text-white font-black uppercase tracking-[0.4em]">
               Sandbox Mode Active
             </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 p-4 flex flex-col items-center gap-2 opacity-20 shrink-0">
        <div className="flex gap-4 items-center">
           <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white">Cloud Link</span>
           <div className="size-1 rounded-full bg-primary"></div>
           <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white">Relational Data Engine</span>
        </div>
      </footer>

      {isAuthenticating && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[1200] flex items-center justify-center animate-in fade-in duration-700">
           <div className="flex flex-col items-center gap-8">
              <div className="relative">
                <div className="size-16 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl animate-pulse fill-1">kitchen</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-primary text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Initializing Hub</p>
                <p className="text-white/40 text-[8px] font-medium uppercase tracking-[0.2em]">Authenticating personal ledger</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;