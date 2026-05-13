
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe } from '../types';
import { GlobalTimerState } from '../App';

interface CookingModeProps {
  recipe: Recipe;
  onExit: () => void;
  timer: GlobalTimerState;
  onUpdateTimer: (updater: (prev: GlobalTimerState) => GlobalTimerState) => void;
}

const CookingMode: React.FC<CookingModeProps> = ({ recipe, onExit, timer, onUpdateTimer }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isListening, setIsListening] = useState(true);

  const totalSteps = recipe.instructions.length;
  const progress = Math.round(((currentStep + 1) / totalSteps) * 100);

  // Natural Language Time Parser
  const detectedTime = useMemo(() => {
    const text = recipe.instructions[currentStep].toLowerCase();
    const timeRegex = /(\d+)(?:-(\d+))?\s*(minutes?|mins?|hours?|hrs?)/i;
    const match = text.match(timeRegex);
    
    if (match) {
      const value = parseInt(match[1]); 
      const unit = match[3];
      
      if (unit && (unit.startsWith('hour') || unit.startsWith('hr'))) {
        return value * 3600;
      }
      return value * 60;
    }
    return 300; 
  }, [currentStep, recipe.instructions]);

  useEffect(() => {
    if (!timer.isRunning) {
      onUpdateTimer(prev => ({
        ...prev,
        remainingSeconds: detectedTime,
        originalDuration: detectedTime,
        targetTimestamp: null
      }));
    }
  }, [detectedTime, currentStep]); 

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onExit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleTimer = () => {
    if (timer.isRunning) {
      onUpdateTimer(prev => ({ ...prev, isRunning: false, targetTimestamp: null }));
    } else {
      const target = Date.now() + (timer.remainingSeconds * 1000);
      onUpdateTimer(prev => ({ ...prev, isRunning: true, targetTimestamp: target }));
    }
  };

  const resetTimer = () => {
    onUpdateTimer(prev => ({
      ...prev,
      remainingSeconds: prev.originalDuration,
      isRunning: false,
      targetTimestamp: null
    }));
  };

  const radius = 60; 
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timer.remainingSeconds / timer.originalDuration) * circumference;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f110c] text-white flex flex-col font-sans w-full overflow-hidden">
      
      {/* Top Section: Fixed Header & Progress */}
      <div className="shrink-0 bg-[#0f110c] z-20 pb-4">
        <header className="flex items-center px-4 py-4 justify-between">
          <button 
            onClick={onExit}
            className="text-white flex size-10 items-center justify-center active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h2 className="text-white text-sm font-bold tracking-tight flex-1 text-center font-display">
            Step {currentStep + 1} of {totalSteps}
          </h2>
          <button className="flex size-10 items-center justify-center rounded-full active:scale-90">
            <span className="material-symbols-outlined text-xl">volume_up</span>
          </button>
        </header>

        <div className="px-6 py-1">
          <div className="flex justify-between items-center mb-1">
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Progress</p>
            <p className="text-primary text-[9px] font-black uppercase tracking-widest">{progress}%</p>
          </div>
          <div className="rounded-full bg-white/5 h-1 w-full overflow-hidden border border-white/5">
            <div 
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Middle Section: Scrollable Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 flex flex-col items-center">
        {/* Timer UI */}
        <div className="flex flex-col items-center gap-3 mb-8 shrink-0">
          <div className="relative flex items-center justify-center">
            <svg width="160" height="160" viewBox="0 0 160 160" className="drop-shadow-2xl">
              <circle 
                className="text-white/5" 
                cx="80" cy="80" fill="transparent" r={radius} 
                stroke="currentColor" strokeWidth="6"
              ></circle>
              <circle 
                className="text-primary transition-all duration-1000 ease-linear" 
                cx="80" cy="80" fill="transparent" r={radius} 
                stroke="currentColor" strokeLinecap="round" strokeWidth="6"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: isNaN(offset) ? 0 : offset,
                  transform: 'rotate(-90deg)',
                  transformOrigin: '80px 80px'
                }}
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-display text-white tabular-nums tracking-tighter">
                {formatTime(timer.remainingSeconds)}
              </span>
              <span className="text-primary text-[7px] font-black uppercase tracking-[0.2em] mt-1">Remaining</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={resetTimer}
              className="size-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 active:bg-white/10"
            >
              <span className="material-symbols-outlined text-lg">restart_alt</span>
            </button>
            <button 
              onClick={toggleTimer}
              className={`size-14 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-90 ${
                timer.isRunning ? 'bg-amber-500 shadow-amber-500/20' : 'bg-primary shadow-primary/20'
              }`}
            >
              <span className="material-symbols-outlined text-2xl fill-1">
                {timer.isRunning ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button 
              className="size-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 opacity-0 pointer-events-none"
            >
              <span className="material-symbols-outlined text-lg">pause</span>
            </button>
          </div>
        </div>

        {/* Instructions Text */}
        <div className="w-full text-center pb-8">
          <h1 className="text-white text-lg font-bold leading-relaxed font-display px-2">
            {recipe.instructions[currentStep]}
          </h1>
          {currentStep < totalSteps - 1 && (
            <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 active:bg-white/10 transition-colors mx-auto max-w-sm">
              <div className="bg-primary/20 p-2 rounded-lg border border-primary/20">
                <span className="material-symbols-outlined text-primary text-lg">skillet</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[#b6baa1] text-[7px] font-black uppercase tracking-widest">Up Next</p>
                <p className="text-white text-[11px] font-bold truncate">
                  {recipe.instructions[currentStep + 1]}
                </p>
              </div>
              <span className="material-symbols-outlined text-white/20 text-sm">chevron_right</span>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Section: Fixed Controls */}
      <footer className="shrink-0 bg-[#0f110c] px-6 pb-8 pt-4 border-t border-white/5 z-20">
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <button 
              onClick={() => setIsListening(!isListening)}
              className="relative size-12 bg-primary rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
            >
              {isListening && <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25"></div>}
              <span className="material-symbols-outlined text-xl font-bold relative z-10">
                {isListening ? 'mic' : 'mic_off'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/5 text-white text-[11px] font-black border border-white/10 disabled:opacity-20 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back
            </button>
            <button 
              onClick={handleNext}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-white text-[11px] font-black shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            >
              {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
          
          <p className="text-[#b6baa1] text-[9px] font-black uppercase tracking-[0.15em] text-center opacity-60">
            Say "Next" to proceed
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CookingMode;
