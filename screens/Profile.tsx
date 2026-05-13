import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileProps {
  user: {
    name: string;
    bio: string;
    avatarUrl: string;
  };
  onBack: () => void;
  onSettings: () => void;
  onManageStores: () => void;
  onAccountSettings?: () => void;
  onEditProfile?: () => void;
  onHelpSupport?: () => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ 
  user,
  onBack, 
  onSettings, 
  onManageStores, 
  onAccountSettings,
  onEditProfile,
  onHelpSupport,
  onLogout
}) => {
  const { spreadsheetId } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-[#1c1d15] text-white font-display w-full w-full">
      {/* Role Reversal Header */}
      <header className="sticky top-0 z-10 bg-[#1c1d15]/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between header-safe-pt border-b border-white/5">
        <button onClick={onBack} className="flex items-center justify-center size-10 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-2xl text-white font-bold">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-black tracking-tight uppercase">Kitchen Profile</h1>
          <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Mise en Place</p>
        </div>
        <button onClick={onSettings} className="flex items-center justify-center size-10 rounded-full bg-white/5 text-[#636b2f] active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-2xl">settings</span>
        </button>
      </header>

      <main className="flex-1 pb-32 overflow-y-auto no-scrollbar px-5">
        <section className="flex flex-col items-center pt-10 pb-8 gap-6">
          <div className="relative" onClick={onEditProfile}>
            <div className="absolute inset-0 bg-[#636b2f]/30 blur-3xl rounded-full scale-150 opacity-50"></div>
            <div className="w-32 h-32 rounded-[3rem] border-[5px] border-[#636b2f]/20 p-1 cursor-pointer active:scale-95 transition-transform bg-[#1c1d15] relative z-10 shadow-2xl">
              <div 
                className="w-full h-full rounded-[2.5rem] bg-cover bg-center shadow-inner flex items-center justify-center bg-[#636b2f]/10 overflow-hidden" 
                style={user.avatarUrl ? { backgroundImage: `url("${user.avatarUrl}")` } : {}}
              >
                {!user.avatarUrl && <span className="material-symbols-outlined text-[#636b2f] text-4xl">person</span>}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#636b2f] size-9 rounded-2xl flex items-center justify-center shadow-lg border-4 border-[#1c1d15] z-20">
               <span className="material-symbols-outlined text-white text-lg font-black">edit</span>
            </div>
          </div>
          <div className="text-center flex flex-col items-center">
            <h2 className="text-3xl font-black tracking-tighter text-white mb-1.5">{user.name}</h2>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#636b2f]/10 border border-[#636b2f]/20">
               <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <p className="text-[#636b2f] font-black text-[10px] uppercase tracking-widest">Master of Mise en Place</p>
            </div>
            {user.bio && (
              <p className="text-[#b6baa1] text-sm italic font-medium mt-4 max-w-[260px] leading-relaxed">
                "{user.bio}"
              </p>
            )}
          </div>
        </section>

        <section className="mb-10">
           <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-2 mb-4">Cloud Architecture</h3>
           <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-xl relative overflow-hidden group">
              <div className="flex items-center gap-5 mb-4 relative z-10">
                <div className="size-12 rounded-2xl bg-white flex items-center justify-center p-2.5 shadow-xl shrink-0">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="size-full object-contain" alt="Google"/>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-white font-bold text-lg leading-tight">Ledger Active</p>
                  <p className="text-[#b6baa1] text-[11px] font-medium opacity-60 truncate mt-1">ID: {spreadsheetId?.slice(0,10)}...</p>
                </div>
                <span className="material-symbols-outlined text-emerald-500 fill-1">check_circle</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[#b6baa1] font-medium opacity-50 relative z-10">
                Persistence engine initialized. All shopping list logs and pantry updates are currently streaming to your Sheet.
              </p>
              <span className="absolute -bottom-4 -right-4 material-symbols-outlined text-white/[0.02] text-9xl font-black">table_chart</span>
           </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-2">Navigation</h3>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={onManageStores}
              className="flex items-center gap-4 p-5 bg-white/[0.03] rounded-[2rem] border border-white/10 active:scale-[0.98] transition-all group"
            >
              <div className="size-12 rounded-2xl bg-[#636b2f]/20 text-[#636b2f] flex items-center justify-center border border-[#636b2f]/20 shadow-inner group-hover:bg-[#636b2f] transition-colors group-hover:text-white">
                <span className="material-symbols-outlined text-2xl">route</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-base leading-tight">Store Logistics</p>
                <p className="text-[10px] font-bold text-[#b6baa1] mt-0.5 uppercase tracking-widest opacity-60">Manage Aisle Layouts</p>
              </div>
              <span className="material-symbols-outlined text-white/20 group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>

            <button 
              onClick={onAccountSettings}
              className="flex items-center gap-4 p-5 bg-white/[0.03] rounded-[2rem] border border-white/10 active:scale-[0.98] transition-all group"
            >
              <div className="size-12 rounded-2xl bg-white/5 text-[#b6baa1] flex items-center justify-center border border-white/5 shadow-inner">
                <span className="material-symbols-outlined text-2xl">shield_person</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-base leading-tight">Privacy & Account</p>
                <p className="text-[10px] font-bold text-[#b6baa1] mt-0.5 uppercase tracking-widest opacity-60">Security & Session</p>
              </div>
              <span className="material-symbols-outlined text-white/20 group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>

            <button 
              onClick={onHelpSupport}
              className="flex items-center gap-4 p-5 bg-white/[0.03] rounded-[2rem] border border-white/10 active:scale-[0.98] transition-all group"
            >
              <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/10 shadow-inner group-hover:bg-amber-500 transition-colors group-hover:text-white">
                <span className="material-symbols-outlined text-2xl">help_center</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-base leading-tight">Help & Support</p>
                <p className="text-[10px] font-bold text-[#b6baa1] mt-0.5 uppercase tracking-widest opacity-60">FAQ & About</p>
              </div>
              <span className="material-symbols-outlined text-white/20 group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>
          </div>
        </section>

        <section className="mt-12 mb-20 px-2 flex flex-col gap-4">
           <button 
            onClick={onLogout}
            className="w-full p-5 rounded-[2rem] border-2 border-red-500/10 text-red-500/60 font-black text-sm uppercase tracking-[0.2em] active:bg-red-500/10 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            Terminate Session
          </button>
          <p className="text-center text-white/10 text-[9px] font-black uppercase tracking-[0.5em]">Mise en Place Build v2.5.2</p>
        </section>
      </main>
    </div>
  );
};

export default Profile;