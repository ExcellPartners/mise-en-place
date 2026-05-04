
import React, { useEffect, useState } from 'react';

interface NotificationBannerProps {
  onClose: () => void;
  onViewChanges: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ onClose, onViewChanges }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-dismiss after 8 seconds if not interacted with
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500);
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [onClose]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onClose, 500);
  };

  return (
    <div 
      className={`fixed top-4 left-0 right-0 z-[100] px-4 transition-all duration-500 ease-out transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'
      }`}
    >
      <div className="max-w-[420px] mx-auto backdrop-blur-2xl bg-black/70 dark:bg-[#2a2c21]/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 p-4 relative">
        <div className="flex gap-4">
          {/* Google Sheets Icon Mockup */}
          <div className="size-11 shrink-0 rounded-xl bg-[#626a2f] flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-white text-2xl font-bold">table_chart</span>
          </div>
          
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <h2 className="text-[#626a2f] text-xs font-black leading-none mb-1.5 uppercase tracking-[0.15em]">Sync Successful</h2>
                <p className="text-white text-[15px] font-semibold leading-snug pr-4">
                  3 new recipes added and 5 ingredients updated from your Google Sheet.
                </p>
              </div>
              <span className="text-white/40 text-[11px] font-bold uppercase tracking-tighter shrink-0 mt-0.5">now</span>
            </div>
            
            <div className="flex mt-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChanges();
                }}
                className="flex items-center justify-center rounded-full h-9 px-5 bg-[#626a2f] text-white gap-2 text-xs font-black leading-none hover:bg-[#7a843a] transition-all active:scale-95 shadow-lg shadow-[#626a2f]/20"
              >
                <span>View Changes</span>
                <span className="material-symbols-outlined text-[16px] font-bold">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grabber indicator */}
        <button 
          onClick={handleDismiss}
          className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 hover:bg-white/40 transition-colors"
        ></button>
      </div>
    </div>
  );
};

export default NotificationBanner;
