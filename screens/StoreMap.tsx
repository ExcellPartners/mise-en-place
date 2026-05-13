import React from 'react';

interface StoreMapProps {
  onBack: () => void;
}

const StoreMap: React.FC<StoreMapProps> = ({ onBack }) => {
  return (
    <div className="bg-[#1c1d15] text-white flex flex-col h-screen overflow-hidden font-sans w-full relative">
      {/* Header with Blur Effect */}
      <header className="sticky top-0 z-30 bg-[#1c1d15]/80 backdrop-blur-xl px-4 pt-6 pb-4 flex items-center border-b border-white/5">
        <button 
          onClick={onBack}
          className="flex items-center justify-center p-2 -ml-2 text-primary hover:opacity-70 transition-opacity active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios</span>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold tracking-tight">Monroe Avenue</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Live Navigation</p>
        </div>
        <button className="p-2 text-primary active:scale-90">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </header>

      {/* Interactive Map Area */}
      <main className="flex-1 relative overflow-hidden bg-[#1c1d15] map-grid">
        {/* Search Bar Overlay */}
        <div className="absolute top-4 left-4 right-4 z-30">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">search</span>
            <input 
              className="w-full bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-white placeholder-slate-400 shadow-xl" 
              placeholder="Find Item (e.g. Avocado)" 
              type="text" 
              defaultValue="Avocado"
            />
          </div>
        </div>

        {/* Store Floor Plan Layout */}
        <div className="absolute inset-0 p-6 pt-24 flex flex-col gap-4">
          {/* Top Section: Produce & Refrigerated */}
          <div className="grid grid-cols-4 gap-3 h-1/4">
            <div className="col-span-2 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pulse-highlight flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Produce</span>
            </div>
            <div className="bg-[#2a2b21] border border-white/10 rounded-xl"></div>
            <div className="bg-[#2a2b21] border border-white/10 rounded-xl"></div>
          </div>

          {/* Middle Section: Aisles & Meat/Dairy */}
          <div className="flex-1 grid grid-cols-6 gap-3 py-4">
            <div className="bg-[#2a2b21] border border-white/10 rounded-lg flex flex-col justify-between py-4 items-center">
              <span className="text-[8px] text-slate-500 font-bold">A1</span>
            </div>
            <div className="bg-[#2a2b21] border border-white/10 rounded-lg flex flex-col justify-between py-4 items-center">
              <span className="text-[8px] text-slate-500 font-bold">A2</span>
            </div>
            <div className="bg-[#2a2b21] border border-white/10 rounded-lg flex flex-col justify-between py-4 items-center">
              <span className="text-[8px] text-slate-500 font-bold">A3</span>
            </div>
            <div className="col-span-3 flex flex-col gap-3">
              <div className="flex-1 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary/80 uppercase">Meat & Seafood</span>
              </div>
              <div className="flex-1 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary uppercase">Dairy & Eggs</span>
              </div>
            </div>
          </div>

          {/* Bottom Section: Frozen & Bakery */}
          <div className="h-1/5 grid grid-cols-3 gap-3">
            <div className="col-span-2 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">Frozen Foods</span>
            </div>
            <div className="bg-[#2a2b21] border border-white/10 rounded-xl flex items-center justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Bakery</span>
            </div>
          </div>
        </div>

        {/* SVG Path Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 400 600">
          <path 
            className="walking-path opacity-40" 
            d="M 120,520 L 120,400 Q 120,380 140,380 L 180,380 Q 200,380 200,360 L 200,180" 
            fill="none" 
            stroke="#636b2f" 
            strokeWidth="2.5" 
          />
        </svg>

        {/* User Location Indicator */}
        <div className="absolute bottom-[80px] left-[100px] z-20 pointer-events-none">
          <div className="user-beam absolute -top-16 -left-16 w-40 h-40 rounded-full opacity-60"></div>
          <div className="relative flex items-center justify-center">
            <div className="absolute w-8 h-8 bg-[#007AFF]/20 rounded-full animate-ping"></div>
            <div className="w-4 h-4 bg-[#007AFF] rounded-full border-2 border-white shadow-lg shadow-[#007AFF]/50"></div>
          </div>
        </div>

        {/* Floating Action Buttons */}
        <button className="fixed bottom-[340px] right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-2xl z-50 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-2xl font-semibold">track_changes</span>
        </button>
        <div className="absolute top-40 right-4 flex flex-col gap-2 z-20">
          <button className="w-10 h-10 bg-zinc-900/90 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-xl">layers</span>
          </button>
        </div>
      </main>

      {/* Navigation Detail Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 w-full">
        <div className="flex justify-center mb-2">
          <div className="w-10 h-1 bg-white/20 rounded-full"></div>
        </div>
        <div className="bg-zinc-900 rounded-t-[2.5rem] border-t border-white/10 backdrop-blur-xl pt-6 pb-10 px-6 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xs font-bold text-primary uppercase tracking-wider">Current Aisle</h2>
              <p className="text-2xl font-bold">Aisle 4 <span className="text-slate-500 text-lg font-normal ml-1">Produce</span></p>
            </div>
            <div className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
              <p className="text-primary font-bold">8 items left</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Next in route</p>
            {/* Item 1 */}
            <div className="flex items-center gap-4 group cursor-pointer active:bg-white/5 transition-colors p-1 -m-1 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/5">
                <span className="material-symbols-outlined">nutrition</span>
              </div>
              <div className="flex-1 border-b border-white/5 pb-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Organic Spinach</h3>
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">Aisle 4</span>
                </div>
              </div>
            </div>
            {/* Item 2 */}
            <div className="flex items-center gap-4 group cursor-pointer active:bg-white/5 transition-colors p-1 -m-1 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/5">
                <span className="material-symbols-outlined">egg</span>
              </div>
              <div className="flex-1 border-b border-white/5 pb-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Greek Yogurt</h3>
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">Aisle 7</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-primary/20">
              <span className="material-symbols-outlined">check_circle</span>
              Mark as Picked
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .map-grid {
          background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .walking-path {
          stroke-dasharray: 6;
          animation: march 20s linear infinite;
        }
        @keyframes march {
          to { stroke-dashoffset: -120; }
        }
        .user-beam {
          background: conic-gradient(from 150deg at 50% 50%, rgba(0, 122, 255, 0.3) 0deg, transparent 60deg);
          transform: rotate(-30deg);
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.33); opacity: 1; }
          80%, 100% { opacity: 0; }
        }
        .pulse-highlight::before {
          content: '';
          position: absolute;
          box-sizing: border-box;
          width: 40px;
          height: 40px;
          border: 3px solid #636b2f;
          border-radius: 50%;
          animation: pulse-ring 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        }
      `}</style>
    </div>
  );
};

export default StoreMap;