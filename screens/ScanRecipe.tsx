import React, { useRef, useEffect, useState } from 'react';
import { Recipe } from '../types';

interface ScanRecipeProps {
  onClose: () => void;
  onRecipeFound: (recipe: Recipe) => void;
}

const VALID_UNITS = ['tsp', 'tsps', 'tbsp', 'tbsps', 'lb', 'lbs', 'cup', 'cups', 'oz', 'g', 'kg', 'ml', 'l', 'pinch', 'clove', 'cloves', 'unit', 'units', 'slice', 'slices', 'bag', 'bags', 'pack', 'packs', 'can', 'cans'];

const ScanRecipe: React.FC<ScanRecipeProps> = ({ onClose, onRecipeFound }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  
  const [flashOn, setFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isShutterFlash, setIsShutterFlash] = useState(false);
  const [lastPickedImage, setLastPickedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    async function startCamera() {
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if (!isSecure || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera requires HTTPS. On Vercel it works automatically. Use the Roll button to pick a photo instead.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, 
          audio: false 
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (err: any) {
          setCameraError(err.name === 'NotAllowedError'
            ? 'Camera permission denied. Check your browser settings.'
            : 'Camera unavailable. Use the Roll button to pick a photo.');
          return;
        }
      }
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const capabilities = track.getCapabilities() as any;
        if (capabilities?.torch) setHasTorch(true);
        try { await videoRef.current.play(); } catch {}
      }
    }
    
    startCamera();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  const toggleFlash = async () => {
    if (!trackRef.current || !hasTorch) return;
    
    const nextFlashState = !flashOn;
    try {
      await trackRef.current.applyConstraints({
        advanced: [{ torch: nextFlashState }]
      } as any);
      setFlashOn(nextFlashState);
    } catch (err) {
      console.error("Flash control error:", err);
    }
  };

  const processImage = async (base64Data: string, previewUrl: string) => {
    setIsScanning(true);
    setScanError(null);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: base64Data }
              },
              {
                type: 'text',
                text: `Analyze this recipe photo and extract the recipe. Return ONLY valid JSON with no markdown, no explanation, just the JSON object.

Schema: { "title": string, "description": string, "prepTime": number, "cookTime": number, "baseServings": number, "category": string, "difficulty": string, "ingredients": [{"name": string, "amount": number, "unit": string}], "instructions": [string] }

Rules:
- category must be one of: Main, Side, Appetizer, Breakfast, Dessert, Cocktail, Whole Meal
- difficulty must be one of: Easy, Medium, Hard
- units must be one of: ${VALID_UNITS.join(', ')}
- Convert ingredient names to Title Case
- Estimate times if not shown`
              }
            ]
          }]
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const text = data.content?.[0]?.text || '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      const extractedRecipe: Recipe = {
        id: `scanned-${Date.now()}`,
        title: result.title || 'Scanned Recipe',
        description: result.description || 'Extracted via camera scan.',
        prepTime: result.prepTime || 10,
        cookTime: result.cookTime || 20,
        baseServings: result.baseServings || 4,
        category: result.category || 'Whole Meal',
        difficulty: result.difficulty || 'Medium',
        chefTip: 'Review extracted ingredients for accuracy.',
        ingredients: (result.ingredients || []).map((ing: any) => ({
          name: ing.name,
          amount: ing.amount,
          unit: VALID_UNITS.includes((ing.unit || '').toLowerCase()) ? ing.unit.toLowerCase() : 'unit'
        })),
        instructions: result.instructions || [],
        imageUrl: previewUrl
      };
      
      onRecipeFound(extractedRecipe);
    } catch (err) {
      console.error('Scanning failed:', err);
      setScanError('Scan failed — make sure text is clear and well-lit, then try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    // readyState >= 2 means we have at least current frame data (more reliable than === 4)
    if (videoRef.current.readyState < 2) {
      setScanError('Camera not ready yet — wait a moment and try again.');
      return;
    }

    setIsShutterFlash(true);
    setTimeout(() => setIsShutterFlash(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const fullResBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    const previewUrl = canvas.toDataURL('image/jpeg', 0.5);
    
    await processImage(fullResBase64, previewUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      setLastPickedImage(result);
      const base64Data = result.split(',')[1];
      await processImage(base64Data, result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-[#1c1d15] text-white flex flex-col w-full overflow-hidden z-[100]"
      style={{ touchAction: 'none' }}
    >
      <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />

      <div className="relative z-20 flex items-center bg-transparent p-4 pb-2 justify-between header-safe-pt">
        <button 
          onClick={onClose}
          className="text-white flex size-12 shrink-0 items-center justify-center active:scale-90"
        >
          <span className="material-symbols-outlined text-3xl font-bold">close</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center font-display">Scan Recipe</h2>
        <div className="flex w-12 items-center justify-end">
          <button 
            onClick={() => setShowHelp(true)}
            className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
          >
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
      </div>

      <div className="relative flex-1 w-full bg-[#12130d] overflow-hidden flex items-center justify-center">
        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-90" />
        
        {/* Camera unavailable error */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center z-20 bg-[#12130d]">
            <div className="size-20 rounded-[2rem] bg-[#2a2c21] border border-white/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-[#636b2f]">no_photography</span>
            </div>
            <p className="text-white font-bold text-base mb-2">Camera Unavailable</p>
            <p className="text-[#b6baa1] text-sm leading-relaxed mb-8 max-w-xs">{cameraError}</p>
            <button onClick={() => galleryInputRef.current?.click()}
              className="flex items-center gap-2 bg-[#636b2f] text-white font-bold px-6 py-3 rounded-2xl active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">photo_library</span>
              Pick from Camera Roll
            </button>
          </div>
        )}

        {/* Scan error banner */}
        {scanError && !isScanning && (
          <div className="absolute top-4 left-4 right-4 z-30 bg-red-500/20 border border-red-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-400 shrink-0">error</span>
            <p className="text-white text-sm font-medium flex-1">{scanError}</p>
            <button onClick={() => setScanError(null)} className="text-white/50 active:scale-90">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}
        
        {isShutterFlash && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-150"></div>}
        
        <div className="relative z-10 w-[82%] max-h-[85%] aspect-[8.5/11] border-2 border-[#626a2f] rounded-2xl shadow-[0_0_150px_rgba(0,0,0,0.9)] bg-black/10">
          <div className="absolute -top-1 -left-1 w-16 h-16 border-t-4 border-l-4 border-[#626a2f] rounded-tl-xl"></div>
          <div className="absolute -top-1 -right-1 w-16 h-16 border-t-4 border-r-4 border-[#626a2f] rounded-tr-xl"></div>
          <div className="absolute -bottom-1 -left-1 w-16 h-16 border-b-4 border-l-4 border-[#626a2f] rounded-bl-xl"></div>
          <div className="absolute -bottom-1 -right-1 w-16 h-16 border-b-4 border-r-4 border-[#626a2f] rounded-br-xl"></div>
          
          <div className={`absolute left-0 w-full h-[3px] bg-[#626a2f] shadow-[0_0_20px_rgba(98,106,47,1)] ${isScanning ? 'animate-[scan_2.5s_linear_infinite]' : 'top-1/2 opacity-30 h-[1px]'}`}></div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center px-6">
           <div className="bg-black/60 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/10 text-center">
            <p className="text-white text-sm font-bold font-display tracking-wide uppercase">
              {isScanning ? 'Milling Scanned Data...' : 'Align page in vertical frame'}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-20 bg-[#1c1d15] pb-12 pt-6 border-t border-white/5">
        <div className="flex justify-center mb-8">
          <div className="flex bg-white/5 p-1 rounded-full gap-1">
            <button 
              onClick={toggleFlash}
              disabled={!hasTorch}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${flashOn ? 'bg-[#626a2f] text-white shadow-lg' : 'text-white/50'} ${!hasTorch ? 'opacity-20' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">{flashOn ? 'bolt' : 'flash_off'}</span>
              <span className="text-[10px] font-bold font-display uppercase tracking-wider">{flashOn ? 'Flash On' : 'Flash Off'}</span>
            </button>
            <button 
              onClick={async () => {
                if (!trackRef.current) return;
                try {
                  await trackRef.current.applyConstraints({ advanced: [{ focusMode: 'auto' } as any] });
                } catch {}
              }}
              className="flex items-center gap-2 px-6 py-2 rounded-full text-white/50 active:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
              <span className="text-[10px] font-bold font-display uppercase tracking-wider">Auto-Focus</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-around px-8">
          {/* Camera Roll Trigger */}
          <button onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/20 bg-[#2a2c21] flex items-center justify-center">
              {lastPickedImage
                ? <img className="w-full h-full object-cover" src={lastPickedImage} alt="last picked" />
                : <span className="material-symbols-outlined text-white/40 text-2xl">photo_library</span>
              }
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Roll</span>
          </button>

          {/* Shutter Button */}
          <div className="relative flex items-center justify-center">
            <div className={`absolute size-24 border-2 border-white/20 rounded-full ${isScanning ? 'animate-spin border-t-primary' : 'animate-pulse'}`}></div>
            <button 
              onClick={handleCapture}
              disabled={isScanning}
              className={`size-20 bg-[#626a2f] rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all ${isScanning ? 'opacity-50' : ''}`}
            >
              <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isScanning ? 'sync' : 'photo_camera'}
              </span>
            </button>
          </div>

          {/* File Explorer Trigger */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-white/70 active:scale-95 transition-transform"
          >
            <div className="size-14 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-2xl">folder_open</span>
            </div>
            <span className="text-[9px] font-bold font-display uppercase tracking-widest text-white/40">Files</span>
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
          <div className="w-full max-w-[340px] bg-[#2a2c21] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="flex flex-col items-center text-center gap-6 relative z-10">
              <div className="size-20 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-inner">
                <span className="material-symbols-outlined text-primary text-5xl fill-1">auto_fix_high</span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white mb-3 font-display">How to Scan</h3>
                <div className="space-y-4 text-left">
                  <div className="flex gap-4">
                    <span className="text-primary font-black">01</span>
                    <p className="text-slate-300 text-sm leading-relaxed">Align the cookbook page vertically within the central green frame.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-primary font-black">02</span>
                    <p className="text-slate-300 text-sm leading-relaxed">Ensure good lighting. Use the <span className="text-primary font-bold">Bolt</span> icon to toggle the flash if needed.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-primary font-black">03</span>
                    <p className="text-slate-300 text-sm leading-relaxed">Tap the camera to "Mill" the data. We'll automatically identify ingredients and steps.</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-transform"
              >
                Got it, Chef
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ScanRecipe;