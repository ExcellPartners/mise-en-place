import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SignUpProps {
  onBack: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onBack }) => {
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email || !password) {
      alert('Please fill in all fields to create your ledger.');
      return;
    }

    setIsRegistering(true);
    // Simulate API registration delay
    setTimeout(() => {
      // Default to "Chef" role for new signups
      login(`Chef ${firstName}`);
      setIsRegistering(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-[#0f110c] flex flex-col font-sans w-full overflow-hidden">
      <div className="absolute top-[-10%] right-[-20%] w-[80%] aspect-square bg-primary/10 rounded-full blur-[120px]"></div>
      
      <header className="relative z-10 flex items-center px-4 py-6 header-safe-pt">
        <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-white">arrow_back_ios_new</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col px-8 pt-4 pb-12 overflow-y-auto no-scrollbar">
        <div className="mb-10">
          <h1 className="text-white text-4xl font-black tracking-tighter mb-3 font-display">Create Account</h1>
          <p className="text-[#b6baa1] text-sm font-medium leading-relaxed">
            Initialize your personal kitchen ledger and start optimizing your routes.
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">First Name</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 group-focus-within:text-primary transition-colors text-xl">person</span>
              <input 
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-14 bg-[#1a1d14] border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Email Address</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 group-focus-within:text-primary transition-colors text-xl">mail</span>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@example.com"
                className="w-full h-14 bg-[#1a1d14] border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Secure Password</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 group-focus-within:text-primary transition-colors text-xl">lock</span>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 bg-[#1a1d14] border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isRegistering}
            className="w-full h-16 bg-primary text-white font-black text-lg rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-10"
          >
            {isRegistering ? (
              <>
                <div className="size-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                <span>Securing Vault...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined font-bold">verified</span>
                <span>Create My Account</span>
              </>
            )}
          </button>
        </form>
      </main>

      <footer className="relative z-10 p-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 opacity-40">
          <span className="material-symbols-outlined text-xs">encrypted</span>
          <p className="text-[9px] font-black uppercase tracking-[0.4em]">End-to-End Encrypted Sessions</p>
        </div>
      </footer>
    </div>
  );
};

export default SignUp;