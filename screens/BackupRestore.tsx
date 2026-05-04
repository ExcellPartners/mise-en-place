
import React, { useState } from 'react';

interface BackupRestoreProps {
  onBack: () => void;
}

const BackupRestore: React.FC<BackupRestoreProps> = ({ onBack }) => {
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);

  const handleBackupNow = () => {
    alert('Initiating cloud backup... Data is being encrypted and uploaded to your secure storage.');
  };

  const handleExportFile = () => {
    alert('Generating encrypted database export... Your .sra-backup file will be ready in seconds.');
  };

  return (
    <div className="bg-[#0f110c] text-[#f5f5f5] min-h-screen flex flex-col font-sans max-w-[480px] mx-auto border-x border-white/5 shadow-2xl">
      {/* Header */}
      <header className="flex items-center p-6 pb-4 justify-between sticky top-0 z-10 backdrop-blur-xl bg-[#0f110c]/80 border-b border-white/5">
        <button 
          onClick={onBack}
          className="text-[#f5f5f5] flex size-10 shrink-0 items-center justify-start cursor-pointer active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined !text-2xl">chevron_left</span>
        </button>
        <h1 className="text-[#f5f5f5] text-lg font-bold tracking-tight flex-1 text-center pr-10 font-display">Backup & Restore</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        {/* Cloud Backup Section */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-[#f5f5f5] text-xl font-extrabold tracking-tight font-display">Cloud Backup</h2>
        </div>
        
        <div className="px-6 py-4">
          <div className="bg-[#1a1d14] rounded-2xl p-5 flex flex-col gap-5 border border-white/5 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="text-primary flex items-center justify-center rounded-xl bg-primary/10 shrink-0 size-12 border border-primary/20">
                  <span className="material-symbols-outlined !text-3xl fill-1">cloud_sync</span>
                </div>
                <div className="flex flex-col">
                  <p className="text-[#f5f5f5] text-base font-bold">Cloud Sync</p>
                  <p className="text-[#a0a0a0] text-xs mt-0.5 font-medium">Last synced: Today at 10:45 AM</p>
                </div>
              </div>
              
              <label className="relative flex h-[30px] w-[54px] cursor-pointer items-center rounded-full bg-white/10 p-1 transition-colors has-[:checked]:bg-primary">
                <input 
                  type="checkbox" 
                  checked={cloudSyncEnabled} 
                  onChange={() => setCloudSyncEnabled(!cloudSyncEnabled)}
                  className="sr-only peer" 
                />
                <div className="h-5.5 w-5.5 rounded-full bg-white shadow-lg transition-transform peer-checked:translate-x-[24px]"></div>
              </label>
            </div>
            
            <p className="text-[#a0a0a0] text-sm leading-relaxed font-medium">
              Automatically sync your recipes and shopping lists to your secure cloud account to access them on any device.
            </p>
            
            <button 
              onClick={handleBackupNow}
              className="w-full flex items-center justify-center h-14 rounded-2xl bg-primary text-white font-bold text-sm tracking-widest uppercase transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined mr-2 !text-xl">backup</span>
              Backup Now
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="h-px bg-white/5"></div>
        </div>

        {/* Local Backup Section */}
        <div className="px-6 pt-2 pb-2">
          <h2 className="text-[#f5f5f5] text-xl font-extrabold tracking-tight font-display">Local Backup</h2>
        </div>

        <div className="px-6 py-4">
          <div className="bg-[#1a1d14] rounded-2xl p-5 flex flex-col gap-5 border border-white/5 shadow-xl">
            <div className="flex gap-4">
              <div className="text-primary flex items-center justify-center rounded-xl bg-primary/10 shrink-0 size-12 border border-primary/20">
                <span className="material-symbols-outlined !text-3xl">folder_zip</span>
              </div>
              <div className="flex flex-col">
                <p className="text-[#f5f5f5] text-base font-bold">Export Data File</p>
                <p className="text-[#a0a0a0] text-xs mt-0.5 font-medium">Last export: 2 days ago</p>
              </div>
            </div>
            
            <p className="text-[#a0a0a0] text-sm leading-relaxed font-medium">
              Export your entire database as a encrypted file for manual storage or offline safekeeping.
            </p>
            
            <button 
              onClick={handleExportFile}
              className="w-full flex items-center justify-center h-14 rounded-2xl border border-white/10 bg-white/5 text-white font-bold text-sm tracking-widest uppercase transition-all active:scale-95"
            >
              <span className="material-symbols-outlined mr-2 !text-xl">download</span>
              Export File
            </button>
          </div>
        </div>

        {/* Restore Section */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-[#f5f5f5] text-xl font-extrabold tracking-tight font-display">Restore Data</h2>
        </div>

        <div className="px-6 pb-12">
          <div className="bg-amber-900/10 border border-amber-900/20 rounded-2xl p-4 mb-6 flex gap-4">
            <span className="material-symbols-outlined text-amber-500 !text-2xl shrink-0">report_problem</span>
            <p className="text-amber-200/80 text-xs leading-relaxed font-medium">
              Restoring data will overwrite your current local database. This action is permanent and cannot be undone.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col gap-4 items-center justify-center p-6 rounded-3xl bg-[#1a1d14] border border-white/5 text-[#f5f5f5] transition-all active:scale-95 shadow-xl group">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center group-active:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined !text-3xl text-primary">cloud_download</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Pull Cloud</span>
            </button>
            <button className="flex flex-col gap-4 items-center justify-center p-6 rounded-3xl bg-[#1a1d14] border border-white/5 text-[#f5f5f5] transition-all active:scale-95 shadow-xl group">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center group-active:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined !text-3xl text-primary">upload_file</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Upload File</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BackupRestore;
