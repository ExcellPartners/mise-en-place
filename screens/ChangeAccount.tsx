
import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

interface ChangeAccountProps {
  currentAccount: string;
  onBack: () => void;
  onSelect: (email: string, token: string) => void;
}

const ChangeAccount: React.FC<ChangeAccountProps> = ({ currentAccount, onBack, onSelect }) => {
  const { login, spreadsheetId, completeProfile } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  // Remove default fallback to ensure user input is prompted
  const [sheetIdInput, setSheetIdInput] = useState(spreadsheetId || '');

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!sheetIdInput.trim()) {
        alert("Action Required: Please enter your Spreadsheet ID before linking.");
        setIsAuthenticating(false);
        return;
      }
      try {
        const infoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
        });
        const info = await infoResponse.json();
        
        // Update context with the verified data
        login(info.name || 'Chef');
        completeProfile(info.name || 'Chef', sheetIdInput.trim());
        onSelect(info.email, tokenResponse.access_token);
      } catch (err) {
        console.error("User info fetch failed:", err);
        login('Chef Maddie');
        onSelect('maddie@kitchen.local', tokenResponse.access_token);
      } finally {
        setIsAuthenticating(false);
      }
    },
    onError: (error) => {
      console.error('Login Failed:', error);
      setIsAuthenticating(false);
      alert('Authentication Failed.');
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
  });

  const handleLogin = () => {
    if (!sheetIdInput.trim()) {
      alert("Verification Required: Enter a Spreadsheet ID string to proceed.");
      return;
    }
    setIsAuthenticating(true);
    googleLogin();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0f110c] text-white font-display max-w-[480px] mx-auto border-x border-white/5 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f110c]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between header-safe-pt border-b border-white/5">
        <button onClick={onBack} className="flex items-center justify-center size-10 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight">Cloud Link</h1>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 px-8 pt-12 pb-32 overflow-y-auto no-scrollbar">
        {/* Google Branding Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="size-24 rounded-[2rem] bg-white flex items-center justify-center p-5 mb-8 shadow-[0_25px_50px_-12px_rgba(255,255,255,0.1)] border border-white/10 ring-4 ring-primary/10">
            <img 
              alt="Google" 
              className="w-full h-full object-contain" 
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
            />
          </div>
          <h2 className="text-4xl font-black text-center mb-4 tracking-tighter drop-shadow-lg">Relational Sync</h2>
          <p className="text-[#b6baa1] text-center text-sm leading-relaxed opacity-80">
            Connect your <span className="text-white font-bold">Google Cloud</span> session to establish your persistent kitchen ledger.
          </p>
        </div>

        {/* Spreadsheet ID Input Field - PREVENT CRASHES */}
        <div className="mb-10 space-y-3">
          <div className="flex justify-between items-center px-1">
             <label className="text-[11px] font-black text-primary uppercase tracking-[0.25em]">Ledger Spreadsheet ID</label>
             <span className="material-symbols-outlined text-primary text-sm">lock</span>
          </div>
          <input 
            type="text"
            value={sheetIdInput}
            onChange={(e) => setSheetIdInput(e.target.value)}
            placeholder="Paste Unique ID String"
            className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white font-mono text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-inner"
          />
          <p className="text-[9px] text-[#b6baa1] opacity-50 px-1 leading-relaxed">
            Must be a valid ID from your spreadsheet URL.
          </p>
        </div>

        {/* Dynamic Provider Status */}
        <div className="space-y-8">
          {currentAccount ? (
            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6 backdrop-blur-md">
               <div className="size-20 rounded-3xl bg-primary/15 flex items-center justify-center border border-primary/25 shadow-inner">
                  <span className="material-symbols-outlined text-primary text-4xl fill-1 animate-pulse">verified_user</span>
               </div>
               <div>
                  <p className="text-white font-black text-2xl tracking-tight leading-none mb-2">{currentAccount}</p>
                  <p className="text-primary text-[11px] font-black uppercase tracking-[0.2em] opacity-80">Session Authenticated</p>
               </div>
               <button 
                onClick={handleLogin}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[12px] font-black text-white/50 uppercase tracking-[0.2em] hover:text-white hover:bg-white/10 transition-all active:scale-95"
               >
                 Change Principal Account
               </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              disabled={isAuthenticating}
              className="w-full flex flex-col items-center gap-6 p-10 rounded-[3rem] bg-[#1a1d14] border-2 border-dashed border-primary/30 hover:border-primary transition-all active:scale-[0.98] group shadow-2xl"
            >
              <div className="size-16 rounded-2xl bg-white flex items-center justify-center p-3.5 shadow-xl group-hover:scale-110 transition-transform duration-500">
                <img 
                  alt="Google" 
                  className="w-full h-full object-contain" 
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                />
              </div>
              <div className="text-center">
                <p className="text-white font-black text-2xl tracking-tight">Authorize Link</p>
                <p className="text-[#b6baa1] text-xs mt-1.5 opacity-60">Grant Sheets API Access</p>
              </div>
            </button>
          )}
        </div>
      </main>

      {isAuthenticating && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center animate-in fade-in duration-300">
           <div className="flex flex-col items-center gap-6">
              <div className="size-14 rounded-full border-[4px] border-primary/15 border-t-primary animate-spin shadow-[0_0_40px_rgba(99,107,47,0.4)]"></div>
              <p className="text-primary text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">Establishing Tunnel...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default ChangeAccount;
