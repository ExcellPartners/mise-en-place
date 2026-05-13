import React, { useState } from 'react';

interface HelpSupportProps {
  onBack: () => void;
}

const FAQ_ITEMS = [
  {
    question: "How do I add a new store layout?",
    answer: "You can add a new store layout from your Profile > Manage Store Locations. Tap 'Add New Store' at the bottom to begin the setup process."
  },
  {
    question: "Can I share recipes with family?",
    answer: "Yes! Open any recipe and tap the Print icon. You can save it as a PDF or share the digital version directly via your favorite messaging apps."
  },
  {
    question: "Is there an offline mode?",
    answer: "All your recipes and shopping lists are saved locally. You only need a connection to sync changes from your Google Sheets."
  },
  {
    question: "How does the 'One Path' route work?",
    answer: "The app calculates your shopping route based on the Aisle codes in your ledger for the selected store. It groups items by aisle and sorts them by shelf to minimize backtracking."
  }
];

const HelpSupport: React.FC<HelpSupportProps> = ({ onBack }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-[#1c1d15] text-white font-display w-full w-full overflow-hidden">
      <header className="sticky top-0 z-20 bg-[#1c1d15]/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-white/5 no-print header-safe-pt">
        <button 
          onClick={onBack}
          className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl leading-none font-bold">arrow_back_ios_new</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight">Help & Support</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 pb-32 overflow-y-auto no-scrollbar">
        <section className="px-4 py-8">
          <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 shadow-lg text-center">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-6">About the Creator</h3>
            <div className="flex flex-col items-center">
              <img 
                src="https://res.cloudinary.com/dwf0blscr/image/upload/v1769885869/PXL_20241102_144217922_1_r6zvs5.jpg" 
                referrerPolicy="no-referrer" 
                style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '20px auto' }} 
              />
              <h2 className="text-2xl font-black mb-2 tracking-tight">Maddie Mae</h2>
              <p className="text-[#b6baa1] text-sm leading-relaxed mb-6 max-w-[280px] font-medium">
                I am Maddie and I am honestly really ridiculous and a little bizarre. I like to talk, cook, and waste time on spreadsheets.
              </p>
              <div className="bg-primary/10 border border-primary/20 rounded-[1.5rem] p-5 w-full">
                <p className="text-primary font-bold italic text-sm leading-relaxed">
                  "I built this app because I wanted to and the Wegmans app drives me nuts."
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 mb-8">
          <h3 className="text-lg font-black px-2 mb-4 tracking-tight">Frequently Asked Questions</h3>
          <div className="bg-white/5 rounded-[2rem] overflow-hidden border border-white/5 divide-y divide-white/5 shadow-lg">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="flex flex-col">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="p-5 flex items-center justify-between group active:bg-white/5 transition-all text-left"
                >
                  <p className="text-sm font-bold tracking-tight pr-4">{item.question}</p>
                  <span className={`material-symbols-outlined text-[#b6baa1] text-xl transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-primary' : ''}`}>
                    expand_more
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-40 border-t border-white/5' : 'max-h-0'}`}>
                  <div className="p-5 bg-white/[0.02]">
                    <p className="text-xs text-[#b6baa1] leading-relaxed font-medium">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 mb-12 text-center opacity-40">
          <p className="text-[9px] font-black uppercase tracking-[0.4em]">Personal Build 2.8.0 • SYSTEM ACTIVE</p>
        </section>
      </main>
    </div>
  );
};

export default HelpSupport;