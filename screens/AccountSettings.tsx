
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AccountSettingsProps {
  onBack: () => void;
  onLogout: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ onBack, onLogout }) => {
  const { userEmail } = useAuth();
  const [security, setSecurity] = useState({ biometric: true });
  const [notifications, setNotifications] = useState({
    restockReminders: localStorage.getItem('mise_push_enabled') === 'true',
  });

  const toggleSecurity = (key: keyof typeof security) => {
    setSecurity(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTogglePush = async () => {
    const nextState = !notifications.restockReminders;
    
    if (nextState) {
      if (!('Notification' in window)) {
        alert('This browser does not support notifications.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Push backend not configured — enable locally only
        setNotifications({ restockReminders: true });
        localStorage.setItem('mise_push_enabled', 'true');
      } else {
        alert('Notification permission was denied.');
      }
    } else {
      setNotifications({ restockReminders: false });
      localStorage.setItem('mise_push_enabled', 'false');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#1c1d15] text-white font-display max-w-[480px] mx-auto border-x border-white/5 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#1c1d15]/80 backdrop-blur-xl px-4 pt-6 pb-4 flex items-center border-b border-white/5 header-safe-pt">
        <button 
          onClick={onBack}
          className="flex items-center justify-center p-2 -ml-2 text-primary hover:opacity-70 transition-opacity active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold tracking-tight pr-6">Account</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-40 no-scrollbar">
        {/* Profile Information */}
        <section className="mb-8">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1 mb-4">Profile Information</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
            <div className="p-4 flex items-center justify-between active:bg-white/10 transition-colors cursor-pointer group">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Email Address</span>
                <span className="text-base font-bold truncate max-w-[240px]">{userEmail || 'Not Provided'}</span>
              </div>
              <span className="material-symbols-outlined text-slate-600 group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
            <div className="p-4 flex items-center justify-between active:bg-white/10 transition-colors cursor-pointer group">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Password</span>
                <span className="text-base font-bold tracking-widest">••••••••••••</span>
              </div>
              <span className="material-symbols-outlined text-slate-600 group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="mb-8">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1 mb-4">Security</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined fill-1">fingerprint</span>
                </div>
                <span className="text-base font-bold">Biometric Login</span>
              </div>
              <button 
                onClick={() => toggleSecurity('biometric')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  security.biometric ? 'bg-primary' : 'bg-white/10'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  security.biometric ? 'translate-x-5' : 'translate-x-0'
                }`}></span>
              </button>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="mb-8">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1 mb-4">Proactive Ledger</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${notifications.restockReminders ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-500'}`}>
                  <span className={`material-symbols-outlined ${notifications.restockReminders ? 'fill-1' : ''}`}>
                    notifications_active
                  </span>
                </div>
                <div>
                  <span className="text-base font-bold block">Push Notifications</span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Stock & Plan Alerts</span>
                </div>
              </div>
              <button 
                onClick={handleTogglePush}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.restockReminders ? 'bg-primary' : 'bg-white/10'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notifications.restockReminders ? 'translate-x-5' : 'translate-x-0'
                }`}></span>
              </button>
            </div>
          </div>
          {notifications.restockReminders && (
            <p className="mt-3 px-2 text-[10px] text-slate-500 italic leading-relaxed">
              Notifications enabled on this device.
            </p>
          )}
        </section>

        {/* Log Out */}
        <div className="mt-4">
          <button 
            onClick={onLogout}
            className="w-full bg-red-500/10 text-red-500 font-black py-4 px-6 rounded-2xl border border-red-500/20 active:bg-red-500/20 transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/5"
          >
            <span className="material-symbols-outlined">logout</span>
            Log Out
          </button>
        </div>
      </main>
    </div>
  );
};

export default AccountSettings;
