import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Recipe } from '../types';

interface ScanRecipeProps {
  onClose: () => void;
  onRecipeFound: (recipe: Recipe) => void;
}

const VALID_UNITS = ['tsp', 'tbsp', 'lb', 'cup', 'oz', 'g', 'kg', 'ml', 'l', 'pinch', 'clove', 'unit', 'slice', 'bag', 'pack', 'can'];

const toSentenceCase = (str: string): string => {
  if (!str) return str;
  const s = str.trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const ScanRecipe: React.FC<ScanRecipeProps> = ({ onClose, onRecipeFound }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const readinessTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [flashOn, setFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isShutterFlash, setIsShutterFlash] = useState(false);
  const [statusText, setStatusText] = useState('Starting camera…');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [stagedImages, setStagedImages] = useState<string[]>([]);
  const [showStack, setShowStack] = useState(false);

  const markReady = useCallback(() => {
    setCameraReady(true);
    setStatusText('Align page in frame — tap shutter');
    if (readinessTimerRef.current) {
      clearInterval(readinessTimerRef.current);
      readinessTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
          setErrorText('Camera access denied. Allow camera access in your browser settings.');
          return;
        }
      }

      if (!stream || !videoRef.current) return;

      videoRef.current.srcObject = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      const caps = track.getCapabilities() as any;
      if (caps?.torch) setHasTorch(true);

      try { await videoRef.current.play(); } catch (e) { console.warn('autoplay:', e); }

      // Poll videoWidth — most reliable on Android Chrome
      readinessTimerRef.current = setInterval(() => {
        if (videoRef.current && videoRef.current.videoWidth > 0) markReady();
      }, 150);

      // Hard fallback after 5s
      setTimeout(markReady, 5000);
    }

    startCamera();

    return () => {
      if (readinessTimerRef.current) clearInterval(readinessTimerRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [markReady]);

  const toggleFlash = async () => {
    if (!trackRef.current || !hasTorch) return;
    const next = !flashOn;
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: next }] } as any);
      setFlashOn(next);
    } catch (err) { console.error('Flash error:', err); }
  };

  const processImages = async (pages: string[], previewUrl: string) => {
    setIsScanning(true);
    setErrorText(null);
    setStatusText(pages.length > 1 ? `Processing ${pages.length} pages…` : 'Reading with Claude…');

    try {
      const content: any[] = [];
      pages.forEach((b64, i) => {
        if (pages.length > 1) content.push({ type: 'text', text: `Page ${i + 1} of ${pages.length}:` });
        content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
      });

      content.push({ type: 'text', text: `Extract the complete recipe from ${pages.length > 1 ? 'these pages' : 'this image'}.

CRITICAL INGREDIENT RULES:
- Strip ALL processing descriptors from ingredient names: minced, chopped, diced, sliced, halved, melted, crushed, grated, shredded, peeled, trimmed, softened, room temperature, beaten, sifted
- "4 cloves garlic minced" → name: "Garlic", amount: 4, unit: "clove"
- Ingredient name = just the food item in Title Case, no prep verbs
- Collect stripped descriptors into prepWork array

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
category: Main|Side|Appetizer|Dessert|Beverage|Breakfast
difficulty: Easy|Medium|Hard
unit: tsp|tbsp|cup|oz|lb|g|kg|ml|l|pinch|clove|unit|slice|can|bag|pack` });

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
      const s = clean.indexOf('{'); const e = clean.lastIndexOf('}');
      if (s === -1) throw new Error('Could not parse recipe data from image');

      const result = JSON.parse(clean.slice(s, e + 1));
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
        imageUrl: '', // Leave blank — add image URL manually after saving
      };

      setStagedImages([]);
      setShowStack(false);
      onRecipeFound(extractedRecipe);

    } catch (err: any) {
      console.error('Scan failed:', err);
      setErrorText(err.message?.includes('busy') || err.message?.includes('529')
        ? 'Claude is busy — wait a moment and try again.'
        : `Scan failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsScanning(false);
      setStatusText('Align page in frame — tap shutter');
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    if (vw === 0 || vh === 0) {
      setErrorText('Camera still loading — try again in a moment.');
      return;
    }

    setIsShutterFlash(true);
    setTimeout(() => setIsShutterFlash(false), 120);

    const canvas = document.createElement('canvas');
    canvas.width = vw; canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    const previewUrl = canvas.toDataURL('image/jpeg', 0.4);

    if (showStack) {
      setStagedImages(prev => [...prev, base64]);
      setStatusText(`${stagedImages.length + 1} pages — add more or Process All`);
    } else {
      processImages([base64], previewUrl);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let done = 0;
    const newPages: string[] = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
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
          done++;
          if (done === files.length) {
            const all = [...stagedImages, ...newPages];
            if (all.length === 1) {
              processImages(all, dataUrl);
            } else {
              setStagedImages(all);
              setShowStack(true);
              setStatusText(`${all.length} pages ready — tap Process All`);
            }
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // ── Layout: fixed bottom controls so video CANNOT overlap them ──────────────
  // The camera view uses position absolute and fills its container.
  // Controls are fixed to the bottom of the viewport — outside all stacking contexts.
  const CONTROLS_HEIGHT = 180; // px — controls panel height

  return (
    <div className="bg-[#1c1d15] text-white w-full overflow-hidden" style={{ height: '100dvh' }}>

      {/* Hidden file inputs */}
      <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" multiple className="hidden" />

      {/* Header — fixed top */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center bg-[#1c1d15] p-4 pb-2 justify-between header-safe-pt">
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
        <div className="absolute top-[72px] left-4 right-4 z-50 p-4 rounded-2xl bg-red-500/90 border border-red-400/50 flex gap-3 items-start backdrop-blur-md">
          <span className="material-symbols-outlined text-white text-xl shrink-0">error</span>
          <div className="flex-1">
            <p className="text-white text-xs font-bold leading-relaxed">{errorText}</p>
            <button onClick={() => setErrorText(null)} className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">Dismiss</button>
          </div>
        </div>
      )}

      {/* Multi-page stack banner */}
      {showStack && stagedImages.length > 0 && (
        <div className="absolute top-[72px] left-4 right-4 z-50 p-3 rounded-2xl bg-[#636b2f]/90 border border-[#636b2f]/50 flex items-center gap-3 backdrop-blur-md">
          <span className="material-symbols-outlined text-white text-xl">layers</span>
          <div className="flex-1">
            <p className="text-white text-xs font-bold">{stagedImages.length} page{stagedImages.length !== 1 ? 's' : ''} staged</p>
            <p className="text-white/70 text-[10px]">Tap shutter to add more, or Process All</p>
          </div>
          <button onClick={() => processImages(stagedImages, '')} disabled={isScanning}
            className="px-3 py-1.5 rounded-xl bg-white text-[#636b2f] text-[10px] font-black uppercase tracking-widest active:scale-95 shrink-0">
            Process All
          </button>
          <button onClick={() => { setStagedImages([]); setShowStack(false); setStatusText('Align page in frame — tap shutter'); }}
            className="text-white/50 active:scale-90 shrink-0">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Camera view — pointer-events-none so the native video element CANNOT intercept taps */}
      <div
        className="absolute inset-0 bg-[#12130d] pointer-events-none"
        style={{ bottom: `${CONTROLS_HEIGHT}px`, top: 0 }}
      >
        <video
          ref={videoRef}
          autoPlay muted playsInline
          onLoadedData={markReady}
          onCanPlay={markReady}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />

        {/* Shutter flash */}
        {isShutterFlash && <div className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: 0.8 }} />}

        {/* Scan frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[82%] aspect-[8.5/11] max-h-[90%] border-2 border-[#626a2f] rounded-2xl relative">
            <div className="absolute -top-1 -left-1 w-14 h-14 border-t-4 border-l-4 border-[#626a2f] rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-14 h-14 border-t-4 border-r-4 border-[#626a2f] rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-14 h-14 border-b-4 border-l-4 border-[#626a2f] rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-14 h-14 border-b-4 border-r-4 border-[#626a2f] rounded-br-xl" />
            {isScanning && (
              <div className="absolute left-0 w-full h-[3px] bg-[#626a2f] shadow-[0_0_20px_rgba(98,106,47,1)] animate-[scan_2.5s_linear_infinite]" />
            )}
          </div>
        </div>

        {/* Status */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6">
          <div className="bg-black/70 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-white/10">
            <p className="text-white text-sm font-bold tracking-wide uppercase text-center">{statusText}</p>
          </div>
        </div>
      </div>

      {/* Controls — fixed to bottom, ABOVE the video in every stacking context */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#1c1d15] border-t border-white/5"
        style={{ height: `${CONTROLS_HEIGHT}px`, zIndex: 100 }}
      >
        {/* Flash / model toggle */}
        <div className="flex justify-center pt-4 mb-5">
          <div className="flex bg-white/5 p-1 rounded-full gap-1">
            <button
              onClick={toggleFlash}
              disabled={!hasTorch}
              className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all text-[10px] font-bold uppercase tracking-wider ${flashOn ? 'bg-[#626a2f] text-white' : 'text-white/50'} ${!hasTorch ? 'opacity-20' : ''}`}
            >
              <span className="material-symbols-outlined text-[18px]">{flashOn ? 'bolt' : 'flash_off'}</span>
              {flashOn ? 'Flash On' : 'Flash'}
            </button>
            <div className="flex items-center gap-1.5 px-5 py-2 text-white/20 text-[10px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Claude Vision
            </div>
          </div>
        </div>

        {/* Shutter row */}
        <div className="flex items-center justify-around px-8">
          {/* Gallery */}
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
          >
            <div className="w-13 h-13 size-[52px] rounded-xl bg-white/5 border-2 border-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl">photo_library</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Gallery</span>
          </button>

          {/* Shutter button — this is the critical one */}
          <button
            onClick={handleCapture}
            disabled={isScanning}
            className={`size-[72px] rounded-full flex items-center justify-center shadow-xl transition-all ${
              isScanning ? 'bg-[#626a2f]/50' : 'bg-[#626a2f] active:scale-90'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span
              className={`material-symbols-outlined text-white text-4xl ${isScanning ? 'animate-spin' : ''}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isScanning ? 'sync' : showStack && stagedImages.length > 0 ? 'add_a_photo' : 'photo_camera'}
            </span>
          </button>

          {/* Files */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
          >
            <div className="size-[52px] rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-2xl">folder_open</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Files</span>
          </button>
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/70">
          <div className="w-full max-w-[340px] bg-[#2a2c21] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="size-20 rounded-3xl bg-[#626a2f]/20 flex items-center justify-center border border-[#626a2f]/30">
                <span className="material-symbols-outlined text-[#626a2f] text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white mb-3">How to Scan</h3>
                <div className="space-y-4 text-left">
                  {[
                    'Align the cookbook page vertically. The camera loads automatically.',
                    'Tap the shutter button. For multi-page recipes, tap once per page — a banner will appear.',
                    'Tap "Process All" when all pages are staged. Claude reads everything at once.',
                    'Gallery and Files also support multiple images for multi-page stacking.',
                  ].map((tip, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-[#626a2f] font-black shrink-0">0{i + 1}</span>
                      <p className="text-[#b6baa1] text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowHelp(false)}
                className="w-full h-14 bg-[#626a2f] text-white font-black rounded-2xl active:scale-95 transition-transform">
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
