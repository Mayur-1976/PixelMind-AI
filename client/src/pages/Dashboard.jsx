import { useState, useEffect } from "react";
import { useUser, useAuth, UserButton } from "@clerk/clerk-react";
import { Sparkles, Download, RefreshCw, Trash2, Image as ImageIcon, Calendar, User, X } from "lucide-react";

const STYLES = ["Photorealistic", "Anime", "Oil Painting", "Pixel Art", "Watercolor", "Cinematic"];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

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

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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

  useEffect(() => {
    fetchGenerations();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      
      setGeneratedImage(data);
      showToast("✨ Image generated!", "success");
      fetchGenerations(); // Refresh gallery
    } catch (err) {
      console.error(err);
      showToast(err.message || "❌ Error generating image", "error");
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
    } catch (err) {
      showToast("Failed to download", "error");
    }
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
      if (generatedImage?.generation?.id === id) {
        setGeneratedImage(null);
      }
      showToast("🗑 Deleted", "neutral");
    } catch (err) {
      showToast("Failed to delete", "error");
    }
  };

  const thisMonthCount = generations.filter(g => {
    const date = new Date(g.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9] w-full flex flex-col items-center">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 transition-all 
          ${toast.type === 'error' ? 'bg-[#ef4444] text-white' : 
            toast.type === 'neutral' ? 'bg-[#64748b] text-white' : 
            'bg-[#10b981] text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#7c3aed]" />
          <h1 className="text-xl font-bold font-heading tracking-tight">PixelMind AI</h1>
        </div>
        <UserButton appearance={{ elements: { avatarBox: "w-10 h-10 border-2 border-[#1e1e2e]" } }} />
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-12">
        
        {/* Usage Stats (Top) */}
        <section className="flex flex-wrap gap-4 text-sm text-[#64748b]">
          <div className="flex items-center gap-2 bg-[#13131a] px-4 py-2 rounded-full border border-[#1e1e2e]">
            <ImageIcon className="w-4 h-4 text-[#06b6d4]" />
            <span>Total Images: {generations.length}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#13131a] px-4 py-2 rounded-full border border-[#1e1e2e]">
            <Calendar className="w-4 h-4 text-[#7c3aed]" />
            <span>Generated This Month: {thisMonthCount}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#13131a] px-4 py-2 rounded-full border border-[#1e1e2e]">
            <User className="w-4 h-4 text-[#f1f5f9]" />
            <span>{user?.primaryEmailAddress?.emailAddress}</span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Generator Section */}
          <section className="flex flex-col gap-6 bg-[#13131a] p-6 lg:p-8 rounded-2xl border border-[#1e1e2e] shadow-lg">
            <div>
              <h2 className="text-2xl font-heading font-semibold mb-2">Create an Image</h2>
              <p className="text-[#64748b] text-sm">Describe what you want to see, and AI will generate it for you.</p>
            </div>
            
            <div className="relative">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                maxLength={1000}
                placeholder="A futuristic cyber city bathed in neon pink and cyan lights, highly detailed..."
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl p-4 text-[#f1f5f9] resize-none h-40 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
              />
              <span className="absolute bottom-3 right-3 text-xs text-[#64748b]">
                {prompt.length}/1000
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm text-[#64748b] font-medium">Style Presets</span>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(style => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style === selectedStyle ? "" : style)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                      selectedStyle === style 
                        ? "bg-[#7c3aed] text-white shadow-[0_0_10px_rgba(124,58,237,0.5)]" 
                        : "bg-[#0a0a0f] border border-[#1e1e2e] text-[#64748b] hover:border-[#7c3aed] hover:text-[#f1f5f9]"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="mt-2 w-full py-3.5 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Image
                </>
              )}
            </button>
          </section>

          {/* Image Output Area */}
          <section className="flex flex-col bg-[#13131a] p-6 lg:p-8 rounded-2xl border border-[#1e1e2e] shadow-lg min-h-[400px]">
            <h2 className="text-2xl font-heading font-semibold mb-6">Result</h2>
            
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#1e1e2e] rounded-xl overflow-hidden bg-[#0a0a0f] relative group">
              {isGenerating ? (
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#1e1e2e] to-[#0a0a0f] bg-[length:200%_100%] animate-pulse" />
              ) : generatedImage ? (
                <img 
                  src={generatedImage.imageUrl} 
                  alt="Generated result" 
                  className="w-full h-full object-contain animate-in fade-in duration-700"
                />
              ) : (
                <div className="flex flex-col items-center text-[#64748b] gap-3">
                  <ImageIcon className="w-12 h-12 opacity-50" />
                  <p className="text-sm">Your generation will appear here</p>
                </div>
              )}
            </div>

            {generatedImage && !isGenerating && (
              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => handleDownload(generatedImage.imageUrl, `generation-${generatedImage.generation?.id}.png`)}
                  className="flex-1 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] hover:border-[#7c3aed] hover:text-[#7c3aed] rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button 
                  onClick={handleGenerate}
                  className="flex-1 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] hover:border-[#06b6d4] hover:text-[#06b6d4] rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
                <button 
                  onClick={() => handleDelete(generatedImage.generation?.id)}
                  className="flex-1 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] hover:border-[#ef4444] hover:text-[#ef4444] rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </section>
        </div>

        {/* My Gallery */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-heading font-bold">My Gallery</h2>
          </div>
          
          {isLoadingGallery ? (
            <div className="flex gap-4 h-32 items-center justify-center text-[#64748b]">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Loading gallery...</span>
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center py-16 bg-[#13131a] rounded-2xl border border-[#1e1e2e] text-[#64748b]">
              <p>No images generated yet. Start creating!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {generations.map(gen => (
                <div 
                  key={gen.id} 
                  className="group relative aspect-square bg-[#13131a] rounded-xl overflow-hidden border border-[#1e1e2e] cursor-pointer"
                  onClick={() => setFullScreenImage(gen.image_url)}
                >
                  <img src={gen.image_url} alt={gen.prompt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                    <div className="flex justify-end pt-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(gen.id); }}
                        className="p-1.5 bg-[#ef4444]/20 text-[#ef4444] rounded-md hover:bg-[#ef4444] hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-[#f1f5f9] line-clamp-3 mb-2">{gen.prompt}</p>
                      <div className="flex items-center justify-between text-[10px] text-[#64748b]">
                        <span>{new Date(gen.created_at).toLocaleDateString()}</span>
                        {gen.style && <span className="px-2 py-0.5 bg-[#7c3aed]/20 text-[#7c3aed] rounded-full">{gen.style}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Lightbox Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setFullScreenImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setFullScreenImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={fullScreenImage} 
            alt="Full screen view" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
