
import React from 'react';

interface SplashScreenProps {
  progress: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ progress }) => {
  return (
    <div className="fixed inset-0 z-[1000] bg-[#0f110c] flex flex-col items-center justify-center font-sans w-full overflow-hidden">
      {/* Main Branding Section */}
      <div className="flex flex-col items-center gap-8 mb-20 animate-in fade-in zoom-in duration-700">
        <h1 className="text-white text-5xl font-black tracking-tighter text-center px-4 font-display">
          Mise en Place
        </h1>
        
        <div className="flex items-center gap-6">
          <span className="material-symbols-outlined text-primary text-4xl font-bold">restaurant</span>
          <div className="w-px h-10 bg-white/10"></div>
          <span className="material-symbols-outlined text-primary text-4xl fill-1">eco</span>
        </div>
      </div>

      {/* Progress Section at Bottom */}
      <div className="absolute bottom-16 left-0 right-0 px-12 space-y-4">
        <div className="flex justify-between items-end mb-1">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Preparing Workspace</p>
          <p className="text-primary text-[10px] font-black uppercase tracking-widest">{Math.round(progress)}%</p>
        </div>
        
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,107,47,0.5)]"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="pt-10 flex flex-col items-center gap-1.5 opacity-40">
          <p className="text-white text-[9px] font-black uppercase tracking-[0.4em]">Powered by Google Sheets</p>
          <p className="text-primary text-[8px] font-black uppercase tracking-[0.6em]">Made By Maddie</p>
          <div className="size-1 rounded-full bg-primary mt-1"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
