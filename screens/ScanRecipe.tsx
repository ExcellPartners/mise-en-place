import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Recipe } from '../types';

interface ScanRecipeProps {
  onClose: () => void;
  onRecipeFound: (recipe: Recipe) => void;
}

const VALID_UNITS = ['tsp', 'tbsp', 'lb', 'cup', 'oz', 'g', 'kg', 'ml', 'l', 'pinch', 'clove', 'unit', 'slice', 'bag', 'pack', 'can'];

const toSentenceCase = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const ScanRecipe: React.FC<ScanRecipeProps> = ({ onClose, onRecipeFound }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [flashOn, setFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isShutterFlash, setIsShutterFlash] = useState(false);
  const [statusText, setStatusText] = useState('Starting camera…');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Multi-page stacking
  const [stagedImages, setStagedImages] = useState<string[]>([]); // base64 array
  const [showStack, setShowStack] = useState(false);

  // ── Camera startup ──────────────────────────────────────────────────────────
  // Uses multiple readiness signals since onCanPlay is unreliable on Android Chrome
  const markReady = useCallback(() => {
    if (!cameraReady) {
      setCameraReady(true);
      setStatusText('Align page in vertical frame');
    }
  }, [cameraReady]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let readinessTimer: ReturnType<typeof setInterval> | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (err) {
          setErrorText('Camera access denied. Allow camera access in your browser settings.');
          return;
        }
      }

      streamRef.current = stream;
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const capabilities = track.getCapabilities() as any;
        if (capabilities?.torch) setHasTorch(true);

        try { await videoRef.current.play(); } catch (e) { console.warn('autoplay blocked:', e); }

        // Poll videoWidth — most reliable readiness signal on Android Chrome
        readinessTimer = setInterval(() => {
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            if (readinessTimer) clearInterval(readinessTimer);
            markReady();
          }
        }, 200);

        // Fallback: force-ready after 4s regardless
        setTimeout(() => {
          if (readinessTimer) clearInterval(readinessTimer);
          markReady();
        }, 4000);
      }
    }

    startCamera();
    return () => {
      if (readinessTimer) clearInterval(readinessTimer);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleFlash = async () => {
    if (!trackRef.current || !hasTorch) return;
    const next = !flashOn;
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: next }] } as any);
      setFlashOn(next);
    } catch (err) { console.error('Flash error:', err); }
  };

  // ── Process images (single or multi-page stack) ─────────────────────────────
  const processImages = async (pages: string[], previewUrl: string) => {
    setIsScanning(true);
    setErrorText(null);
    setStatusText(pages.length > 1 ? `Processing ${pages.length} pages…` : 'Reading recipe with Claude…');

    try {
      const content: any[] = [];

      // Add all pages as image blocks
      pages.forEach((b64, i) => {
        if (pages.length > 1) {
          content.push({ type: 'text', text: `Page ${i + 1} of ${pages.length}:` });
        }
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
        });
      });

      content.push({
        type: 'text',
        text: `Extract the complete recipe from ${pages.length > 1 ? 'these pages' : 'this image'}.

CRITICAL INGREDIENT RULES:
- Strip ALL processing descriptors from ingredient names: minced, chopped, diced, sliced, halved, melted, crushed, grated, shredded, peeled, trimmed, softened, room temperature, beaten, sifted, packed, heaping
- "4 cloves garlic minced" → name: "Garlic", amount: 4, unit: "clove"  
- "2 cups onion diced" → name: "Onion", amount: 2, unit: "cup"
- Ingredient name must be just the food item in Title Case — no adjectives, no prep verbs
- If stripping descriptors, collect them into a prepWork array

Return ONLY valid JSON, no markdown:
{
  "title": "Recipe Name",
  "description": "one sentence, sentence case",
  "prepTime": 15,
  "cookTime": 30,
  "baseServings": 4,
  "category": "Main",
  "difficulty": "Easy",
  "chefTip": "one tip, sentence case",
  "ingredients": [{"name": "Garlic", "amount": 4, "unit": "clove"}],
  "prepWork": ["Mince the garlic", "Dice the onion"],
  "instructions": ["Step 1 text", "Step 2 text"]
}

Rules:
- category: Main | Side | Appetizer | Dessert | Beverage | Breakfast
- difficulty: Easy | Medium | Hard
- unit: tsp | tbsp | cup | oz | lb | g | kg | ml | l | pinch | clove | unit | slice | can | bag | pack
- description and chefTip must be sentence case (capitalize first word only)
- prepWork: array of prep actions stripped from ingredients — empty [] if none needed
- instructions: original recipe steps only (prepWork will be prepended automatically)`
      });

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{ role: 'user', content }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `API error ${response.status}`);
      }

      const data = await response.json();
      const rawText = (data.content as { type: string; text?: string }[])
        ?.map(b => (b.type === 'text' ? b.text : '')).join('') || '';

      const clean = rawText.replace(/```json|```/g, '').trim();
      const jsonStart = clean.indexOf('{');
      const jsonEnd = clean.lastIndexOf('}');
      if (jsonStart === -1) throw new Error('Could not parse recipe data from image');

      const result = JSON.parse(clean.slice(jsonStart, jsonEnd + 1));

      // Build instructions: inject prep work as Step 1 if any
      const prepWork: string[] = result.prepWork || [];
      const originalSteps: string[] = Array.isArray(result.instructions) ? result.instructions : [];
      const finalInstructions = prepWork.length > 0
        ? [`Prep work: ${prepWork.join(', ')}.`, ...originalSteps]
        : originalSteps;

      const extractedRecipe: Recipe = {
        id: `scanned-${Date.now()}`,
        title: result.title || 'Scanned Recipe',
        description: toSentenceCase(result.description || 'A scanned recipe.'),
        prepTime: result.prepTime || 10,
        cookTime: result.cookTime || 20,
        baseServings: result.baseServings || 4,
        category: result.category || 'Main',
        difficulty: result.difficulty || 'Medium',
        chefTip: toSentenceCase(result.chefTip || 'Review extracted ingredients for accuracy.'),
        ingredients: (result.ingredients || []).map((ing: any) => ({
          name: ing.name,
          amount: Number(ing.amount) || 1,
          unit: VALID_UNITS.includes((ing.unit || '').toLowerCase()) ? ing.unit.toLowerCase() : 'unit',
        })),
        instructions: finalInstructions,
        imageUrl: previewUrl,
      };

      setStagedImages([]);
      onRecipeFound(extractedRecipe);

    } catch (err: any) {
      console.error('Scan failed:', err);
      if (err.message?.includes('busy') || err.message?.includes('529') || err.message?.includes('503')) {
        setErrorText('Claude is busy right now. Wait a moment and try again.');
      } else {
        setErrorText(`Scan failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsScanning(false);
      setStatusText('Align page in vertical frame');
    }
  };

  // ── Capture from live camera ────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!videoRef.current) return;

    // videoWidth > 0 is the most reliable check — more reliable than readyState or cameraReady state
    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    if (vw === 0 || vh === 0) {
      setErrorText('Camera not ready yet — wait a moment and try again.');
      return;
    }

    setIsShutterFlash(true);
    setTimeout(() => setIsShutterFlash(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    const previewUrl = canvas.toDataURL('image/jpeg', 0.4);

    if (stagedImages.length > 0 || showStack) {
      // Add to stack
      setStagedImages(prev => [...prev, base64]);
      setShowStack(true);
      setStatusText(`Page ${stagedImages.length + 1} captured — add more or process`);
    } else {
      // Single page — process immediately
      await processImages([base64], previewUrl);
    }
  };

  // ── File/gallery picker ─────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let processed = 0;
    const newPages: string[] = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 1600;
          const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          newPages.push(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
          processed++;
          if (processed === files.length) {
            const allPages = [...stagedImages, ...newPages];
            if (allPages.length === 1) {
              processImages(allPages, dataUrl);
            } else {
              setStagedImages(allPages);
              setShowStack(true);
              setStatusText(`${allPages.length} pages ready — tap Process All`);
            }
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleProcessStack = async () => {
    if (stagedImages.length === 0) return;
    await processImages(stagedImages, '');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#1c1d15] text-white h-screen flex flex-col w-full overflow-hidden relative">

      {/* File inputs */}
      {/* Gallery: no capture attr → opens photo library; multiple for multi-page */}
      <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" multiple className="hidden" />

      {/* Header */}
      <div className="relative z-20 flex items-center bg-[#1c1d15] p-4 pb-2 justify-between header-safe-pt">
        <button onClick={onClose} className="text-white flex size-12 shrink-0 items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-3xl font-bold">close</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">Scan Recipe</h2>
        <button onClick={() => setShowHelp(true)}
          className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white active:scale-90 transition-transform">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>

      {/* Error banner */}
      {errorText && (
        <div className="mx-4 mb-2 p-4 rounded-2xl bg-red-500/20 border border-red-500/30 flex gap-3 items-start z-30">
          <span className="material-symbols-outlined text-red-400 text-xl shrink-0">error</span>
          <div className="flex-1">
            <p className="text-red-300 text-xs font-bold leading-relaxed">{errorText}</p>
            <button onClick={() => setErrorText(null)} className="text-red-400/60 text-[10px] font-black uppercase tracking-widest mt-2">Dismiss</button>
          </div>
        </div>
      )}

      {/* Multi-page stack banner */}
      {showStack && stagedImages.length > 0 && (
        <div className="mx-4 mb-2 p-4 rounded-2xl bg-[#636b2f]/20 border border-[#636b2f]/30 flex items-center gap-3 z-30">
          <span className="material-symbols-outlined text-[#636b2f] text-xl">layers</span>
          <div className="flex-1">
            <p className="text-white text-xs font-bold">{stagedImages.length} page{stagedImages.length > 1 ? 's' : ''} captured</p>
            <p className="text-[#b6baa1] text-[10px] mt-0.5">Capture more pages or tap Process All</p>
          </div>
          <button
            onClick={handleProcessStack}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl bg-[#636b2f] text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform shrink-0"
          >
            Process All
          </button>
          <button onClick={() => { setStagedImages([]); setShowStack(false); setStatusText('Align page in vertical frame'); }}
            className="text-white/30 active:scale-90">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Camera view — pointer-events-none only on overlays, not the whole view */}
      <div className="relative flex-1 w-full bg-[#12130d] overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onLoadedData={markReady}
          onCanPlay={markReady}
          onTimeUpdate={markReady}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          style={{ zIndex: 0 }}
        />

        {/* Shutter flash overlay — pointer-events-none so it doesn't block taps */}
        {isShutterFlash && (
          <div className="absolute inset-0 bg-white animate-out fade-out duration-150 pointer-events-none" style={{ zIndex: 5 }} />
        )}

        {/* Scan frame — pointer-events-none so it doesn't block taps on the shutter */}
        <div className="pointer-events-none relative w-[82%] max-h-[85%] aspect-[8.5/11] border-2 border-[#626a2f] rounded-2xl shadow-[0_0_150px_rgba(0,0,0,0.9)] bg-black/10" style={{ zIndex: 2 }}>
          <div className="absolute -top-1 -left-1 w-16 h-16 border-t-4 border-l-4 border-[#626a2f] rounded-tl-xl" />
          <div className="absolute -top-1 -right-1 w-16 h-16 border-t-4 border-r-4 border-[#626a2f] rounded-tr-xl" />
          <div className="absolute -bottom-1 -left-1 w-16 h-16 border-b-4 border-l-4 border-[#626a2f] rounded-bl-xl" />
          <div className="absolute -bottom-1 -right-1 w-16 h-16 border-b-4 border-r-4 border-[#626a2f] rounded-br-xl" />
          <div className={`absolute left-0 w-full h-[3px] bg-[#626a2f] shadow-[0_0_20px_rgba(98,106,47,1)] ${isScanning ? 'animate-[scan_2.5s_linear_infinite]' : 'top-1/2 opacity-30 h-[1px]'}`} />
        </div>

        {/* Status pill — pointer-events-none */}
        <div className="pointer-events-none absolute bottom-8 left-0 right-0 flex justify-center px-6" style={{ zIndex: 3 }}>
          <div className="bg-black/60 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/10 text-center">
            <p className="text-white text-sm font-bold tracking-wide uppercase">{statusText}</p>
          </div>
        </div>
      </div>

      {/* Controls — sits above camera, high z-index */}
      <div className="relative bg-[#1c1d15] pb-12 pt-6 border-t border-white/5" style={{ zIndex: 20 }}>
        <div className="flex justify-center mb-8">
          <div className="flex bg-white/5 p-1 rounded-full gap-1">
            <button onClick={toggleFlash} disabled={!hasTorch}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${flashOn ? 'bg-[#626a2f] text-white shadow-lg' : 'text-white/50'} ${!hasTorch ? 'opacity-20' : ''}`}>
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
          <button onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <div className="w-14 h-14 rounded-xl bg-white/5 border-2 border-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl">photo_library</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Gallery</span>
          </button>

          {/* Shutter — NO disabled state based on cameraReady; always tappable */}
          <div className="relative flex items-center justify-center">
            <div className={`absolute size-24 border-2 border-white/20 rounded-full ${isScanning ? 'animate-spin border-t-[#626a2f]' : 'animate-pulse'}`} />
            <button
              onClick={handleCapture}
              disabled={isScanning}
              className={`size-20 bg-[#626a2f] rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all ${isScanning ? 'opacity-50' : 'opacity-100'}`}
            >
              <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isScanning ? 'sync' : stagedImages.length > 0 ? 'add_a_photo' : 'photo_camera'}
              </span>
            </button>
          </div>

          {/* Files */}
          <button onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
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
                  {[
                    'Align the cookbook page vertically within the green frame.',
                    'Tap the shutter. For multi-page recipes, keep tapping to stack pages — a banner will appear.',
                    'Tap "Process All" when all pages are captured. Claude reads everything at once.',
                    'Gallery and Files also support multiple selections for multi-page stacking.',
                  ].map((tip, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-[#626a2f] font-black shrink-0">0{i + 1}</span>
                      <p className="text-[#b6baa1] text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowHelp(false)}
                className="w-full h-14 bg-[#626a2f] text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">
                Got it, Chef
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%   { top: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ScanRecipe;
