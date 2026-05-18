import React, { useState, useMemo } from 'react';

interface Book {
  id: string;
  title: string;
  author: string;
  theme: string;
}

interface CookbookLibraryProps {
  books: Book[];
  onBack: () => void;
}

const ALL_THEMES = [
  'African','American','Asian','Baking & Dessert','Bar & Cocktails',
  'Caribbean & Latin','Chinese','Entertaining','French','Indian','Italian',
  'Japanese','Korean','Mediterranean','Mexican','Middle Eastern','Seafood',
  'Southeast Asian','Spanish & Basque','Vegetable-Forward','World',
];

const THEME_ICONS: Record<string, string> = {
  'African':          'public',
  'American':         'local_dining',
  'Asian':            'ramen_dining',
  'Baking & Dessert': 'cake',
  'Bar & Cocktails':  'local_bar',
  'Caribbean & Latin':'travel_explore',
  'Chinese':          'ramen_dining',
  'Entertaining':     'celebration',
  'French':           'restaurant',
  'Indian':           'local_fire_department',
  'Italian':          'local_pizza',
  'Japanese':         'ramen_dining',
  'Korean':           'ramen_dining',
  'Mediterranean':    'water',
  'Mexican':          'outdoor_grill',
  'Middle Eastern':   'mosque',
  'Seafood':          'set_meal',
  'Southeast Asian':  'travel_explore',
  'Spanish & Basque': 'tapas',
  'Vegetable-Forward':'eco',
  'World':            'language',
};

// ── Book Card ─────────────────────────────────────────────────────────────────

const BookCard: React.FC<{ book: Book }> = ({ book }) => (
  <div className="bg-[#1a1d14] border border-white/5 rounded-2xl p-4 flex items-start gap-3">
    <div className="size-10 rounded-xl bg-[#636b2f]/10 border border-[#636b2f]/20 flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-[#636b2f] text-lg">
        {THEME_ICONS[book.theme] || 'menu_book'}
      </span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white text-sm font-black leading-snug">{book.title}</p>
      <p className="text-[#636b2f] text-[10px] font-bold mt-0.5">{book.author}</p>
      <span className="inline-block mt-1.5 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#636b2f]/10 text-[#636b2f] border border-[#636b2f]/15">
        {book.theme}
      </span>
    </div>
  </div>
);

// ── Quiz Mode ─────────────────────────────────────────────────────────────────

const QuizMode: React.FC<{ books: Book[]; onClose: () => void }> = ({ books, onClose }) => {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [result, setResult]               = useState<Book | null>(null);

  const themeBooks = useMemo(() =>
    selectedTheme ? books.filter(b => b.theme === selectedTheme) : [],
    [selectedTheme, books]
  );

  const pickRandom = () => {
    if (!themeBooks.length) return;
    setResult(themeBooks[Math.floor(Math.random() * themeBooks.length)]);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-[#0d0f0a] rounded-t-3xl border-t border-white/10 screen-fade max-h-[85vh] flex flex-col"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 shrink-0 flex items-center justify-between">
          <div>
            <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-0.5">What do you want to cook?</p>
            <h2 className="text-white text-lg font-black">Pick a cuisine</h2>
          </div>
          <button onClick={onClose} className="size-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 active:scale-90">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Theme grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {ALL_THEMES.filter(t => books.some(b => b.theme === t)).map(theme => (
              <button
                key={theme}
                onClick={() => { setSelectedTheme(theme); setResult(null); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95 ${
                  selectedTheme === theme
                    ? 'bg-[#636b2f]/15 border-[#636b2f]/40'
                    : 'bg-[#1a1d14] border-white/5'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${selectedTheme === theme ? 'text-[#636b2f]' : 'text-white/20'}`}>
                  {THEME_ICONS[theme] || 'menu_book'}
                </span>
                <span className={`text-[8px] font-black uppercase tracking-wider text-center leading-tight ${selectedTheme === theme ? 'text-[#636b2f]' : 'text-white/30'}`}>
                  {theme}
                </span>
                <span className="text-[8px] font-bold text-white/15">
                  {books.filter(b => b.theme === theme).length} books
                </span>
              </button>
            ))}
          </div>

          {/* Suggest button */}
          {selectedTheme && !result && (
            <button
              onClick={pickRandom}
              className="w-full py-4 bg-[#636b2f] text-white font-black text-sm uppercase tracking-widest rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-4"
            >
              <span className="material-symbols-outlined text-xl fill-1">auto_awesome</span>
              Suggest a book
            </button>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="bg-[#636b2f]/10 border border-[#636b2f]/30 rounded-2xl p-5">
                <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mb-2">Tonight, cook from:</p>
                <p className="text-white text-lg font-black leading-snug mb-1">{result.title}</p>
                <p className="text-[#b6baa1] text-sm font-bold">{result.author}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={pickRandom}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white/50 font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">shuffle</span>
                  Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-[#636b2f] text-white font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Library Screen ───────────────────────────────────────────────────────

const CookbookLibrary: React.FC<CookbookLibraryProps> = ({ books, onBack }) => {
  const [search,      setSearch]      = useState('');
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [showQuiz,    setShowQuiz]    = useState(false);

  const themes = useMemo(() =>
    ALL_THEMES.filter(t => books.some(b => b.theme === t)),
    [books]
  );

  const filtered = useMemo(() => {
    return books.filter(b => {
      const matchTheme  = !activeTheme || b.theme === activeTheme;
      const matchSearch = !search ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase()) ||
        b.theme.toLowerCase().includes(search.toLowerCase());
      return matchTheme && matchSearch;
    });
  }, [books, activeTheme, search]);

  // Group by theme
  const grouped = useMemo(() => {
    if (activeTheme) return [{ theme: activeTheme, books: filtered }];
    const map = new Map<string, Book[]>();
    filtered.forEach(b => {
      if (!map.has(b.theme)) map.set(b.theme, []);
      map.get(b.theme)!.push(b);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([theme, books]) => ({ theme, books }));
  }, [filtered, activeTheme]);

  return (
    <div className="w-full min-h-screen bg-[#000000]">
      {showQuiz && (
        <QuizMode books={books} onClose={() => setShowQuiz(false)} />
      )}

      {/* Header */}
      <div className="px-4 header-safe-pt pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="size-10 flex items-center justify-center rounded-full bg-[#1a1d14] border border-white/10 text-white active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back_ios_new</span>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight text-white leading-none">Cookbook Library</h1>
          <p className="text-[#636b2f] text-[9px] font-black uppercase tracking-widest mt-0.5">{books.length} books</p>
        </div>
        <button
          onClick={() => setShowQuiz(true)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#636b2f]/10 border border-[#636b2f]/30 text-[#636b2f] text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base fill-1">auto_awesome</span>
          Quiz
        </button>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="relative flex items-center group">
          <div className="absolute left-4 text-gray-500 group-focus-within:text-[#636b2f] transition-colors">
            <span className="material-symbols-outlined text-xl">search</span>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search books or authors..."
            className="w-full h-12 bg-[#1c1d15] border border-gray-800 rounded-2xl pl-12 pr-10 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#636b2f]/50 font-medium"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 text-white/30 active:scale-90">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Theme filter pills */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto no-scrollbar -mx-0 pb-1">
        <button
          onClick={() => setActiveTheme(null)}
          className={`shrink-0 h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
            !activeTheme ? 'bg-[#636b2f] text-white border-[#636b2f]' : 'bg-[#1a1d14] border-white/5 text-white/40'
          }`}
        >
          All ({books.length})
        </button>
        {themes.map(theme => (
          <button
            key={theme}
            onClick={() => setActiveTheme(activeTheme === theme ? null : theme)}
            className={`shrink-0 h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 ${
              activeTheme === theme ? 'bg-[#636b2f] text-white border-[#636b2f]' : 'bg-[#1a1d14] border-white/5 text-white/40'
            }`}
          >
            {theme} ({books.filter(b => b.theme === theme).length})
          </button>
        ))}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center px-8">
          <span className="material-symbols-outlined text-4xl text-white/10 mb-3">menu_book</span>
          <p className="text-white/20 text-sm font-black uppercase tracking-widest">No books found</p>
        </div>
      )}

      {/* Book list grouped by theme */}
      <div className="px-4 pb-32 space-y-6">
        {grouped.map(({ theme, books: themeBooks }) => (
          <div key={theme}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#636b2f] text-base">
                {THEME_ICONS[theme] || 'menu_book'}
              </span>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#636b2f]">{theme}</p>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[9px] font-black text-white/20">{themeBooks.length}</span>
            </div>
            <div className="space-y-2">
              {themeBooks.map(book => <BookCard key={book.id} book={book} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CookbookLibrary;
