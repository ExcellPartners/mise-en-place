
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveSchemaToSheet, SheetMappingSchema } from '../services/googleSheets';

const OnboardingProfile: React.FC = () => {
  const { userName, userEmail, completeProfile, accessToken } = useAuth();
  const [name, setName] = useState(userName || '');
  const [sheetId, setSheetId] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  const handleComplete = async () => {
    if (!name.trim() || !sheetId.trim()) {
      alert("Account Integrity Check: Please provide both your Chef Name and your target Spreadsheet ID.");
      return;
    }

    setIsCommitting(true);
    
    try {
      // Create initial AppConfig structure in their sheet
      // Fix: Added missing mealLogs and pantryStock to satisfy the SheetMappingSchema interface requirements.
      const profileData: SheetMappingSchema = {
        recipes: { "PROFILE_NAME": name, "SYNC_EMAIL": userEmail || '', "CREATED_AT": new Date().toISOString() },
        ingredients: { "DATABASE_VERSION": "2.5.0", "PLATFORM": "Mise en Place" },
        components: {},
        mealLogs: {},
        pantryStock: {}
      };

      const success = await saveSchemaToSheet(sheetId, profileData, accessToken);
      
      if (success) {
        completeProfile(name, sheetId);
      } else {
        throw new Error("Verification Failed: Google API rejected the ledger write. Please ensure your Spreadsheet ID is correct and permissions are shared.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-[#0f110c] flex flex-col font-sans max-w-[480px] mx-auto overflow-hidden">
      {/* Decorative Cloud Graphic */}
      <div className="absolute top-[-10%] left-[-20%] w-[100%] aspect-square bg-primary/10 rounded-full blur-[120px] opacity-60"></div>
      
      <main className="relative z-10 flex-1 flex flex-col px-10 pt-24 pb-12 overflow-y-auto no-scrollbar">
        <div className="mb-14">
          <div className="inline-flex items-center justify-center bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-8 shadow-inner">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Vault Initialization</span>
          </div>
          <h1 className="text-white text-4xl font-black tracking-tighter mb-4 font-display leading-tight">Set Your Kitchen</h1>
          <p className="text-[#b6baa1] text-base font-medium leading-relaxed opacity-70">
            Welcome, Chef. Link your central Google Sheet to establish your persistent kitchen ledger.
          </p>
        </div>

        <div className="space-y-10">
          {/* Identity Field */}
          <div className="space-y-3">
            <label className="block text-[11px] font-black text-primary uppercase tracking-[0.25em] ml-1">Chef Alias</label>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-600 group-focus-within:text-primary transition-colors text-xl">person</span>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How shall we address you?"
                className="w-full h-16 bg-white/[0.02] border border-white/10 rounded-2xl pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all font-bold text-lg shadow-inner"
              />
            </div>
          </div>

          {/* Data Persistence Field */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="block text-[11px] font-black text-primary uppercase tracking-[0.25em]">Spreadsheet Ledger ID</label>
              <a 
                href="https://support.google.com/docs/answer/44445" 
                target="_blank" 
                className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-primary transition-colors underline flex items-center gap-1"
              >
                Help <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            </div>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-600 group-focus-within:text-primary transition-colors text-xl">database</span>
              <input 
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="Enter unique ID string"
                className="w-full h-16 bg-white/[0.02] border border-white/10 rounded-2xl pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all font-mono text-sm shadow-inner"
              />
            </div>
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 mt-4">
               <p className="text-[10px] text-[#b6baa1] leading-relaxed font-medium">
                Find this unique ID in your browser address bar: <br/>
                <span className="text-white italic opacity-40">google.com/spreadsheets/d/</span>
                <span className="text-primary font-bold">[YOUR_ID]</span>
                <span className="text-white italic opacity-40">/edit</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-16">
          <button 
            onClick={handleComplete}
            disabled={isCommitting}
            className="w-full h-18 bg-primary text-white font-black text-xl rounded-[1.5rem] shadow-[0_20px_40px_rgba(99,107,47,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
          >
            {isCommitting ? (
              <>
                <div className="size-6 rounded-full border-[3px] border-white/20 border-t-white animate-spin"></div>
                <span className="uppercase tracking-[0.1em]">Securing Workspace...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined font-black text-2xl fill-1">kitchen</span>
                <span className="uppercase tracking-[0.1em]">Enter Kitchen</span>
              </>
            )}
          </button>
        </div>
      </main>

      {/* Cloud Handshake Persistence Overlay */}
      {isCommitting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[1200] flex items-center justify-center animate-in fade-in duration-500">
           <div className="bg-[#1a1d14] border border-white/10 p-10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] text-center max-w-[300px] border-b-primary/30">
              <div className="size-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-inner">
                 <span className="material-symbols-outlined text-primary text-5xl animate-[spin_4s_linear_infinite]">sync</span>
              </div>
              <h3 className="text-white font-black text-2xl mb-3 tracking-tighter">Syncing Core</h3>
              <p className="text-[#b6baa1] text-xs leading-relaxed font-medium opacity-80">Writing AppConfig headers and initializing relational pointers in your sheet...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingProfile;
