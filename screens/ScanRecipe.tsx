import React, { useRef, useEffect, useState } from 'react';
import { Recipe } from '../types';

interface ScanRecipeProps {
  onClose: () => void;
  onRecipeFound: (recipe: Recipe) => void;
}

const VALID_UNITS = ['tsp', 'tbsp', 'lb', 'cup', 'oz', 'g', 'kg', 'ml', 'l', 'pinch', 'clove', 'unit', 'slice', 'bag', 'pack', 'can'];

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
  const [statusText, setStatusText] = useState('Align page in vertical frame');

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (err) {
          console.error('Camera access denied', err);
          return;
        }
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) setHasTorch(true);
        try { await videoRef.current.play(); } catch (e) { console.error('Video play blocked:', e); }
      }
    }

    startCamera();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  const toggleFlash = async () => {
    if (!trackRef.current || !hasTorch) return;
    const next = !flashOn;
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: next }] } as any);
      setFlashOn(next);
    } catch (err) { console.error('Flash error:', err); }
  };

  const processImage = async (base64Data: string, previewUrl: string) => {
    setIsScanning(true);
    setStatusText('Reading recipe...');

    try {
      const prompt = `You are a recipe extraction assistant. Analyze this image of a recipe page and extract all recipe information.

Return ONLY valid JSON with no other text, no markdown fences:
{
  "title": "Recipe name",
  "description": "One sentence description",
  "prepTime": 15,
  "cookTime": 30,
  "baseServings": 4,
  "category": "Main",
  "difficulty": "Medium",
  "chefTip": "Optional tip from the recipe",
  "ingredients": [
    { "name": "ingredient name in Title Case", "amount": 1.5, "unit": "cup" }
  ],
  "instructions": [
    "Step 1 text",
    "Step 2 text"
  ]
}

Rules:
- category must be one of: Main, Side, Appetizer, Dessert, Beverage, Breakfast
- difficulty must be one of: Easy, Medium, Hard
- unit must be one of: ${VALID_UNITS.join(', ')}
- Estimate prep/cook times in minutes if not stated
- Convert all ingredient names to Title Case
- Split instructions into individual steps`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const rawText = (data.content as { type: string; text?: string }[])
        ?.map(b => (b.type === 'text' ? b.text : ''))
        .join('') || '';

      // Strip any accidental markdown fences
      const clean = rawText.replace(/```json|```/g, '').trim();
      const jsonStart = clean.indexOf('{');
      const jsonEnd = clean.lastIndexOf('}');
      if (jsonStart === -1) throw new Error('No JSON in response');

      const result = JSON.parse(clean.slice(jsonStart, jsonEnd + 1));

      const extractedRecipe: Recipe = {
        id: `scanned-${Date.now()}`,
        title: result.title || 'Scanned Recipe',
        description: result.description || 'Extracted via Mise en Place scanner.',
        prepTime: result.prepTime || 10,
        cookTime: result.cookTime || 20,
        baseServings: result.baseServings || 4,
        category: result.category || 'Main',
        difficulty: result.difficulty || 'Medium',
        chefTip: result.chefTip || 'Review extracted ingredients for accuracy.',
        ingredients: (result.ingredients || []).map((ing: any) => ({
          name: ing.name,
          amount: Number(ing.amount) || 1,
          unit: VALID_UNITS.includes((ing.unit || '').toLowerCase())
            ? ing.unit.toLowerCase()
            : 'unit',
        })),
        instructions: Array.isArray(result.instructions) ? result.instructions : [],
        imageUrl: previewUrl,
      };

      onRecipeFound(extractedRecipe);
    } catch (err: any) {
      console.error('Scan failed:', err);
      const msg = err.message?.includes('API error 401')
        ? 'API key error — check your VITE_ANTHROPIC_API_KEY in .env'
        : err.message?.includes('API error 529') || err.message?.includes('overloaded')
          ? 'Claude is busy — wait a moment and try again.'
          : 'Could not read the recipe. Make sure the text is clear and well-lit.';
      alert(msg);
    } finally {
      setIsScanning(false);
      setStatusText('Align page in vertical frame');
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;

    setIsShutterFlash(true);
    setTimeout(() => setIsShutterFlash(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
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
      // Ensure it's jpeg for Claude
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const base64Data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        await processImage(base64Data, result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    // Reset so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="bg-[#1c1d15] text-white h-screen flex flex-col w-full overflow-hidden relative">
      {/* Hidden file inputs */}
      <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />

      {/* Header */}
      <div className="relative z-20 flex items-center bg-transparent p-4 pb-2 justify-between header-safe-pt">
        <button onClick={onClose} className="text-white flex size-12 shrink-0 items-center justify-center active:scale-90">
          <span className="material-symbols-outlined text-3xl font-bold">close</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">Scan Recipe</h2>
        <button
          onClick={() => setShowHelp(true)}
          className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>

      {/* Camera view */}
      <div className="relative flex-1 w-full bg-[#12130d] overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />

        {isShutterFlash && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-150" />}

        {/* Scan frame */}
        <div className="relative z-10 w-[82%] max-h-[85%] aspect-[8.5/11] border-2 border-[#626a2f] rounded-2xl shadow-[0_0_150px_rgba(0,0,0,0.9)] bg-black/10">
          <div className="absolute -top-1 -left-1 w-16 h-16 border-t-4 border-l-4 border-[#626a2f] rounded-tl-xl" />
          <div className="absolute -top-1 -right-1 w-16 h-16 border-t-4 border-r-4 border-[#626a2f] rounded-tr-xl" />
          <div className="absolute -bottom-1 -left-1 w-16 h-16 border-b-4 border-l-4 border-[#626a2f] rounded-bl-xl" />
          <div className="absolute -bottom-1 -right-1 w-16 h-16 border-b-4 border-r-4 border-[#626a2f] rounded-br-xl" />
          <div className={`absolute left-0 w-full h-[3px] bg-[#626a2f] shadow-[0_0_20px_rgba(98,106,47,1)] ${isScanning ? 'animate-[scan_2.5s_linear_infinite]' : 'top-1/2 opacity-30 h-[1px]'}`} />
        </div>

        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center px-6">
          <div className="bg-black/60 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/10 text-center">
            <p className="text-white text-sm font-bold tracking-wide uppercase">
              {isScanning ? 'Reading with Claude Vision...' : statusText}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-20 bg-[#1c1d15] pb-12 pt-6 border-t border-white/5">
        <div className="flex justify-center mb-8">
          <div className="flex bg-white/5 p-1 rounded-full gap-1">
            <button
              onClick={toggleFlash}
              disabled={!hasTorch}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${flashOn ? 'bg-[#626a2f] text-white shadow-lg' : 'text-white/50'} ${!hasTorch ? 'opacity-20' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">{flashOn ? 'bolt' : 'flash_off'}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{flashOn ? 'Flash On' : 'Flash Off'}</span>
            </button>
            <div className="flex items-center gap-2 px-6 py-2 rounded-full text-white/20">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Claude Vision</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-around px-8">
          {/* Gallery */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-1 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/20 relative shadow-inner bg-white/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl">photo_library</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Gallery</span>
          </button>

          {/* Shutter */}
          <div className="relative flex items-center justify-center">
            <div className={`absolute size-24 border-2 border-white/20 rounded-full ${isScanning ? 'animate-spin border-t-[#626a2f]' : 'animate-pulse'}`} />
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

          {/* Files */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-white/70 active:scale-95 transition-transform"
          >
            <div className="size-14 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-2xl">folder_open</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Files</span>
          </button>
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
          <div className="w-full max-w-[340px] bg-[#2a2c21] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#626a2f]/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="flex flex-col items-center text-center gap-6 relative z-10">
              <div className="size-20 rounded-3xl bg-[#626a2f]/20 flex items-center justify-center border border-[#626a2f]/30">
                <span className="material-symbols-outlined text-[#626a2f] text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white mb-3">How to Scan</h3>
                <div className="space-y-4 text-left">
                  <div className="flex gap-4">
                    <span className="text-[#626a2f] font-black">01</span>
                    <p className="text-[#b6baa1] text-sm leading-relaxed">Align the cookbook page or recipe card vertically within the green frame.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[#626a2f] font-black">02</span>
                    <p className="text-[#b6baa1] text-sm leading-relaxed">Good lighting helps — tap Flash if needed. Make sure all text is readable.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[#626a2f] font-black">03</span>
                    <p className="text-[#b6baa1] text-sm leading-relaxed">Tap the shutter. Claude Vision reads the recipe and extracts ingredients and steps automatically.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[#626a2f] font-black">04</span>
                    <p className="text-[#b6baa1] text-sm leading-relaxed">You can also tap Gallery or Files to scan a photo or PDF instead of using the live camera.</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowHelp(false)}
                className="w-full h-14 bg-[#626a2f] text-white font-black rounded-2xl shadow-xl shadow-[#626a2f]/20 active:scale-95 transition-transform">
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
