import React, { useState, useRef, useEffect } from 'react';

interface EditProfileProps {
  onBack: () => void;
  onSave: (data: { name: string; bio: string; avatarUrl: string }) => void;
  initialName: string;
  initialBio: string;
  initialAvatar: string;
}

const ROLES = [
  "Chef",
  "Sous Chef",
  "Pastry Chef",
  "Bartender",
  "Mixologist",
  "Home Cook",
  "Line Cook",
  "Custom"
];

const EditProfile: React.FC<EditProfileProps> = ({ onBack, onSave, initialName, initialBio, initialAvatar }) => {
  // Parse initial name to separate Role from Name
  const parseName = (fullName: string) => {
    for (const r of ROLES.filter(r => r !== 'Custom')) {
      if (fullName.startsWith(r + ' ')) {
        return { role: r, realName: fullName.substring(r.length + 1) };
      }
    }
    // No matching role prefix — treat the whole thing as the name, no role
    return { role: 'Home Cook', realName: fullName };
  };

  const initialParsed = parseName(initialName);

  const [role, setRole] = useState(initialParsed.role);
  const [customRole, setCustomRole] = useState('');
  const [name, setName] = useState(initialParsed.realName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const finalRole = role === 'Custom' ? customRole.trim() : role;
    const finalName = finalRole ? `${finalRole} ${name}` : name;
    onSave({ name: finalName, bio, avatarUrl });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#1c1d15] text-white font-display max-w-[480px] mx-auto border-x border-white/5 overflow-hidden">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#1c1d15]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5 header-safe-pt">
        <button 
          onClick={onBack} 
          className="flex items-center gap-1 text-primary font-bold active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
          <span>Back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight">Edit Profile</h1>
        <div className="w-16"></div> 
      </header>

      <main className="flex-1 pb-32 overflow-y-auto no-scrollbar">
        {/* Profile Picture Section */}
        <section className="flex flex-col items-center py-10 px-4 gap-4">
          <div 
            onClick={handleAvatarClick}
            className="relative group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-32 h-32 rounded-full border-4 border-primary p-1 overflow-hidden">
              <div 
                className="w-full h-full rounded-full bg-cover bg-center transition-opacity group-hover:opacity-75" 
                style={{ backgroundImage: `url("${avatarUrl}")` }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white text-3xl">add_a_photo</span>
            </div>
            <div className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-4 border-[#1c1d15] shadow-lg">
              <span className="material-symbols-outlined text-white text-sm leading-none">edit</span>
            </div>
          </div>
          <p className="text-sm font-black text-primary uppercase tracking-widest">Tap to change photo</p>
        </section>

        {/* Input Fields */}
        <section className="px-6 space-y-6">
          <div className="flex flex-col gap-4">
            {/* Role Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-black text-slate-500 uppercase tracking-widest px-1">Role</label>
              <div className="relative">
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none font-bold"
                >
                  {ROLES.map(r => <option key={r} value={r} className="bg-[#1c1d15]">{r}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary">expand_more</span>
              </div>
            </div>

            {/* Custom Role Input */}
            {role === 'Custom' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-black text-slate-500 uppercase tracking-widest px-1">Your Title</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none font-bold" 
                  placeholder="e.g. Grill Master" 
                  type="text" 
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-black text-slate-500 uppercase tracking-widest px-1">Name</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none font-bold" 
                placeholder="Enter your name" 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-black text-slate-500 uppercase tracking-widest px-1">Bio/Tagline</label>
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none outline-none font-medium leading-relaxed" 
              placeholder="e.g., Home Cook since 2023" 
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </section>

        {/* Action Buttons */}
        <section className="px-6 mt-12 space-y-4">
          <button 
            onClick={handleSave}
            className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all text-lg"
          >
            Save Changes
          </button>
          <button 
            onClick={onBack}
            className="w-full py-4 text-slate-500 font-black uppercase tracking-[0.2em] text-sm hover:text-white transition-colors active:scale-95"
          >
            Cancel
          </button>
        </section>
      </main>
    </div>
  );
};

export default EditProfile;