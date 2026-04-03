import { useState, useEffect, useRef } from "react";
import { useUser, useAuth, UserButton } from "@clerk/clerk-react";
import { Sparkles, Download, RefreshCw, Trash2, Image as ImageIcon, Calendar, User, X, Zap, TrendingUp, Wand2, Eye } from "lucide-react";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { ParticleBackground } from "../App";

const STYLES = [
  { name: "Photorealistic", icon: "📸" },
  { name: "Anime", icon: "🎌" },
  { name: "Oil Painting", icon: "🎨" },
  { name: "Pixel Art", icon: "👾" },
  { name: "Watercolor", icon: "💧" },
  { name: "Cinematic", icon: "🎬" },
];

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001/api" : "/api");

/* ── Animated Counter Hook ── */
function useAnimatedCounter(target, duration = 800) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    prevTarget.current = target;
  }, [target, duration]);

  return count;
}

/* ── Typing Animation ── */
function TypingText({ texts, speed = 80, pause = 2000 }) {
  const [displayed, setDisplayed] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[textIndex];
    let timeout;

    if (!isDeleting && charIndex < currentText.length) {
      timeout = setTimeout(() => {
        setDisplayed(currentText.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, speed);
    } else if (!isDeleting && charIndex === currentText.length) {
      timeout = setTimeout(() => setIsDeleting(true), pause);
    } else if (isDeleting && charIndex > 0) {
      timeout = setTimeout(() => {
        setDisplayed(currentText.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      }, speed / 2);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setTextIndex((textIndex + 1) % texts.length);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex, texts, speed, pause]);

  return (
    <span>
      {displayed}
      <span className="inline-block w-[2px] h-[1em] ml-0.5 align-middle" style={{ background: 'var(--pm-primary)', animation: 'blink 1s step-end infinite' }} />
    </span>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  
  const [generations, setGenerations] = useState([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [toast, setToast] = useState(null);

  const totalCount = useAnimatedCounter(generations.length);

  const thisMonthCount = generations.filter(g => {
    const date = new Date(g.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const monthCount = useAnimatedCounter(thisMonthCount);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchGenerations = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/generations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setGenerations(data.generations || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load gallery", "error");
    } finally {
      setIsLoadingGallery(false);
    }
  };

  useEffect(() => { fetchGenerations(); }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ prompt, style: selectedStyle })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      
      if (data.imageUrl) {
        setGeneratedImage(data);
        showToast("✨ Image generated!", "success");
        fetchGenerations();
        return;
      }
      
      if (data.status === "processing" && data.inferenceId) {
        showToast("⏳ AI is painting...", "neutral");
        for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const pollRes = await fetch(`${API_URL}/generate-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ inferenceId: data.inferenceId, prompt, style: selectedStyle })
          });
          const pollData = await pollRes.json();
          if (pollData.status === "completed") {
            setGeneratedImage(pollData);
            showToast("✨ Image generated!", "success");
            fetchGenerations();
            return;
          }
          if (pollData.status === "failed") throw new Error("Image generation failed");
        }
        throw new Error("Timed out — try again");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "❌ Error generating", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || "pixelmind-art.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("📥 Downloaded!", "success");
    } catch { showToast("Failed to download", "error"); }
  };

  const handleDelete = async (id) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/generations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      setGenerations(prev => prev.filter(g => g.id !== id));
      if (generatedImage?.generation?.id === id) setGeneratedImage(null);
      showToast("🗑 Deleted", "neutral");
    } catch { showToast("Failed to delete", "error"); }
  };

  // Ripple effect handler for generate button
  const handleRipple = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.className = "ripple";
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: 'var(--pm-bg-base)', color: 'var(--pm-text-primary)' }}>
      {/* Particle system */}
      <ParticleBackground />

      {/* Aurora */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* Grid */}
      <div className="grid-overlay" />

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : toast.type === 'neutral' ? 'toast-neutral' : 'toast-success'}`}
          style={{ 
            position: 'fixed', top: '20px', right: '20px', padding: '12px 20px', borderRadius: '12px', zIndex: 100,
            display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500, fontSize: '0.875rem',
            color: toast.type === 'neutral' ? 'var(--pm-text-primary)' : 'white'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <header className="glass-header" style={{ position: 'sticky', top: 0, zIndex: 50, width: '100%' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <div className="animate-pulse-glow" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--pm-gradient-start), var(--pm-gradient-end))' }}>
                <Sparkles style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
            </div>
            <div>
              <h1 className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em' }}>
                PixelMind AI
              </h1>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ThemeSwitcher />
            <UserButton />
          </div>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ═══ HERO SECTION ═══ */}
        <section className="animate-slide-up" style={{ animationDelay: '0.05s', opacity: 0, animationFillMode: 'forwards', textAlign: 'center', padding: '8px 0' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '6px', fontFamily: "'Space Grotesk', sans-serif" }}>
            <span style={{ color: 'var(--pm-text-primary)' }}>Create </span>
            <span className="gradient-text">
              <TypingText texts={["Stunning Art", "Anime Worlds", "Dreamy Scenes", "Epic Visuals", "Pixel Magic"]} speed={90} pause={2500} />
            </span>
          </h2>
          <p style={{ color: 'var(--pm-text-muted)', fontSize: '0.8rem', maxWidth: '28rem', margin: '0 auto' }}>
            Transform your imagination into breathtaking visuals with AI
          </p>
        </section>

        {/* ═══ STATS ═══ */}
        <section className="animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          {[
            { icon: <ImageIcon className="w-4 h-4 text-white" />, label: "Total Created", value: totalCount, gradient: 'linear-gradient(135deg, var(--pm-accent), var(--pm-accent-light))' },
            { icon: <TrendingUp className="w-4 h-4 text-white" />, label: "This Month", value: monthCount, gradient: 'linear-gradient(135deg, var(--pm-primary), var(--pm-primary-light))' },
            { icon: <User className="w-4 h-4 text-white" />, label: "Account", value: null, gradient: 'linear-gradient(135deg, var(--pm-gradient-start), var(--pm-gradient-end))' },
          ].map((stat, i) => (
            <div key={i} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderRadius: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: stat.gradient }}>
                {stat.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pm-text-muted)' }}>{stat.label}</p>
                {stat.value !== null ? (
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--pm-text-primary)' }}>{stat.value}</p>
                ) : (
                  <p style={{ fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', color: 'var(--pm-text-secondary)' }}>{user?.primaryEmailAddress?.emailAddress}</p>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* ═══ MAIN GRID ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* ── Generator ── */}
          <section className="glass-card animate-slide-up" style={{ animationDelay: '0.15s', opacity: 0, animationFillMode: 'forwards', padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--pm-gradient-start), var(--pm-gradient-mid))' }}>
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--pm-text-primary)' }}>Create Magic</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--pm-text-muted)' }}>Describe your vision below</p>
              </div>
            </div>
            
            {/* Prompt */}
            <div style={{ position: 'relative' }}>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                maxLength={1000}
                placeholder="A futuristic cyber city bathed in neon pink and cyan lights, highly detailed, 8k resolution..."
                className="glow-input"
                id="prompt-input"
                style={{ width: '100%', borderRadius: '12px', padding: '12px', resize: 'none', height: '96px', fontSize: '0.875rem', lineHeight: '1.625' }}
              />
              <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', padding: '2px 8px', borderRadius: '12px', background: 'var(--pm-bg-elevated)', color: 'var(--pm-text-muted)' }}>
                  {prompt.length}/1000
                </span>
              </div>
            </div>

            {/* Styles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pm-text-muted)' }}>
                ✦ Style Preset
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {STYLES.map(style => (
                  <button
                    key={style.name}
                    onClick={() => setSelectedStyle(style.name === selectedStyle ? "" : style.name)}
                    className={`style-pill ${selectedStyle === style.name ? "active" : ""}`}
                    id={`style-${style.name.toLowerCase().replace(/\s/g, '-')}`}
                    style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '12px' }}>{style.icon}</span>
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate */}
            <button
              onClick={(e) => { handleRipple(e); handleGenerate(); }}
              disabled={isGenerating || !prompt.trim()}
              className="btn-primary"
              id="generate-btn"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI is creating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Masterpiece</span>
                </>
              )}
            </button>
          </section>

          {/* ── Result ── */}
          <section className="glass-card animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards', padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--pm-accent), var(--pm-accent-light))' }}>
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--pm-text-primary)' }}>Result</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--pm-text-muted)' }}>Your AI creation appears here</p>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', overflow: 'hidden', position: 'relative', minHeight: '200px', border: '2px dashed var(--pm-glass-border)', background: 'var(--pm-bg-base)' }}>
              {isGenerating ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="generating-orb">
                      <Sparkles style={{ width: '28px', height: '28px', color: 'white', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' }} />
                    </div>
                    <div className="generating-ring" />
                    <div className="generating-ring-2" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p className="gradient-text" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.875rem' }}>Creating your masterpiece...</p>
                    <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--pm-text-muted)' }}>AI is painting pixel by pixel</p>
                  </div>
                  <div style={{ width: '176px', height: '4px', borderRadius: '9999px', overflow: 'hidden', background: 'var(--pm-bg-elevated)' }}>
                    <div style={{ 
                      height: '100%', borderRadius: '9999px',
                      background: 'linear-gradient(90deg, var(--pm-gradient-start), var(--pm-gradient-mid), var(--pm-gradient-end), var(--pm-gradient-start))',
                      backgroundSize: '200% 100%',
                      width: '100%',
                      animation: 'shimmer 1.5s ease-in-out infinite'
                    }} />
                  </div>
                </div>
              ) : generatedImage ? (
                <img 
                  src={generatedImage.imageUrl} 
                  alt="Generated" 
                  className="animate-scale-in"
                  onClick={() => setFullScreenImage(generatedImage.imageUrl)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer', filter: 'drop-shadow(0 0 20px var(--pm-glow-primary))' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
                  <div className="animate-float" style={{ width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pm-bg-elevated)', border: '1px dashed var(--pm-glass-border)' }}>
                    <ImageIcon style={{ width: '28px', height: '28px', color: 'var(--pm-text-muted)', opacity: 0.4 }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: 'var(--pm-text-secondary)' }}>Ready to create</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '2px', color: 'var(--pm-text-muted)' }}>Enter a prompt and hit generate</p>
                  </div>
                </div>
              )}
            </div>

            {generatedImage && !isGenerating && (
              <div className="animate-slide-up" style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleDownload(generatedImage.imageUrl, `generation-${generatedImage.generation?.id}.png`)}
                  className="btn-ghost"
                  id="download-btn"
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Download style={{ width: '14px', height: '14px' }} /> Download
                </button>
                <button 
                  onClick={handleGenerate}
                  className="btn-ghost"
                  id="regenerate-btn"
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <RefreshCw style={{ width: '14px', height: '14px' }} /> Regenerate
                </button>
                <button 
                  onClick={() => handleDelete(generatedImage.generation?.id)}
                  className="btn-ghost"
                  id="delete-result-btn"
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Trash2 style={{ width: '14px', height: '14px' }} /> Delete
                </button>
              </div>
            )}
          </section>
        </div>

        {/* ═══ GALLERY ═══ */}
        <section className="glass-card animate-slide-up" style={{ animationDelay: '0.25s', opacity: 0, animationFillMode: 'forwards', padding: '28px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <ImageIcon style={{ width: '20px', height: '20px', color: 'var(--pm-primary)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--pm-text-primary)' }}>
              My Gallery
            </h2>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 10px', borderRadius: '9999px', background: 'linear-gradient(135deg, var(--pm-gradient-start), var(--pm-gradient-end))', color: 'white' }}>
              {generations.length}
            </span>
          </div>
          
          {isLoadingGallery ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="shimmer" style={{ aspectRatio: '1', borderRadius: '12px', animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          ) : generations.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', borderRadius: '12px', border: '2px dashed var(--pm-glass-border)', background: 'var(--pm-bg-base)' }}>
              <div className="animate-float" style={{ width: '48px', height: '48px', marginBottom: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pm-bg-elevated)', border: '1px dashed var(--pm-glass-border)' }}>
                <ImageIcon style={{ width: '24px', height: '24px', color: 'var(--pm-text-muted)', opacity: 0.4 }} />
              </div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: 'var(--pm-text-secondary)' }}>Your gallery awaits</p>
              <p style={{ fontSize: '0.75rem', marginTop: '4px', maxWidth: '280px', color: 'var(--pm-text-muted)' }}>
                Generate your first image and it will appear here
              </p>
            </div>
          ) : (
            <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {generations.map((gen) => (
                <div 
                  key={gen.id} 
                  className="gallery-card animate-slide-up"
                  onClick={() => setFullScreenImage(gen.image_url)}
                  style={{ aspectRatio: '1', borderRadius: '12px', cursor: 'pointer', overflow: 'hidden' }}
                >
                  <img src={gen.image_url} alt={gen.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  
                  <div className="gallery-overlay">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(gen.image_url, `pixelmind-${gen.id}.png`); }}
                        className="gallery-action-btn"
                      >
                        <Download style={{ width: '14px', height: '14px' }} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(gen.id); }}
                        className="gallery-action-btn delete"
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '8px' }}>{gen.prompt}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{new Date(gen.created_at).toLocaleDateString()}</span>
                        {gen.style && (
                          <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', background: 'linear-gradient(135deg, var(--pm-gradient-start), var(--pm-gradient-end))' }}>
                            {gen.style}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer style={{ textAlign: 'center', padding: '20px 0', marginTop: '8px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '1px', background: 'linear-gradient(to right, transparent, var(--pm-glass-border), var(--pm-primary), var(--pm-glass-border), transparent)' }} />
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--pm-text-muted)' }}>
            Built with <span className="gradient-text" style={{ fontWeight: 700 }}>✦ PixelMind AI</span> — Powered by advanced AI
          </p>
        </footer>
      </main>

      {/* ═══ LIGHTBOX ═══ */}
      {fullScreenImage && (
        <div 
          className="lightbox-backdrop"
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setFullScreenImage(null)}
        >
          <button 
            style={{ position: 'absolute', top: '24px', right: '24px', padding: '10px', borderRadius: '12px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => setFullScreenImage(null)}
            id="close-lightbox-btn"
          >
            <X style={{ width: '24px', height: '24px' }} />
          </button>
          
          <div className="lightbox-image" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }} onClick={e => e.stopPropagation()}>
            <img 
              src={fullScreenImage} 
              alt="Full screen" 
              style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 40px var(--pm-glow-primary)' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleDownload(fullScreenImage, 'pixelmind-art.png')}
                className="btn-ghost"
                style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'white', borderColor: 'rgba(255,255,255,0.15)', cursor: 'pointer' }}
                id="lightbox-download-btn"
              >
                <Download style={{ width: '16px', height: '16px' }} /> Download HD
              </button>
              <button
                onClick={() => setFullScreenImage(null)}
                className="btn-ghost"
                style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'white', borderColor: 'rgba(255,255,255,0.15)', cursor: 'pointer' }}
              >
                <X style={{ width: '16px', height: '16px' }} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
