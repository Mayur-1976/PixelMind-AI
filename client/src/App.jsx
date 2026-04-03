import { SignedIn, SignedOut, SignIn, SignUp } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";
import Dashboard from "./pages/Dashboard";

function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];
    let mouse = { x: null, y: null };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouse);

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.life = Math.random() * 200 + 100;
        this.maxLife = this.life;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;

        // Mouse interaction — gentle repel
        if (mouse.x !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120;
            this.x += (dx / dist) * force * 0.8;
            this.y += (dy / dist) * force * 0.8;
          }
        }

        if (this.life <= 0 || this.x < -10 || this.x > canvas.width + 10 || this.y < -10 || this.y > canvas.height + 10) {
          this.reset();
        }
      }
      draw() {
        const lifeRatio = this.life / this.maxLife;
        const computedStyle = getComputedStyle(document.documentElement);
        const color = computedStyle.getPropertyValue('--pm-particle-color').trim() || 'rgba(139, 92, 246, 0.5)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(/[\d.]+\)$/, `${this.opacity * lifeRatio})`);
        ctx.fill();
      }
    }

    // Create particles
    const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 100);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }

    // Draw connections between close particles
    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const computedStyle = getComputedStyle(document.documentElement);
            const color = computedStyle.getPropertyValue('--pm-particle-color').trim() || 'rgba(139, 92, 246, 0.5)';
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = color.replace(/[\d.]+\)$/, `${0.06 * (1 - dist / 100)})`);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      drawConnections();
      animId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return <canvas ref={canvasRef} id="particle-canvas" />;
}

export { ParticleBackground };

export default function App() {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center font-sans relative" style={{ background: 'var(--pm-bg-base)', color: 'var(--pm-text-primary)' }}>
      {/* Particle system */}
      <ParticleBackground />

      {/* Aurora blobs */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* Grid overlay */}
      <div className="grid-overlay" />

      <SignedOut>
        <div className="relative z-10 flex flex-col items-center animate-scale-in w-full max-w-md mx-4">
          {/* Floating orbs behind the card */}
          <div className="auth-floating-orb orb-1" />
          <div className="auth-floating-orb orb-2" />

          <div className="glass-card auth-card p-8 sm:p-10 rounded-3xl w-full">
            {/* Animated gradient border */}
            <div className="gradient-border absolute inset-0 rounded-3xl pointer-events-none" style={{ zIndex: -1 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'var(--pm-glass-bg)', borderRadius: 'inherit' }} />
            </div>

            {/* Branding */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse-glow" style={{ background: 'linear-gradient(135deg, var(--pm-gradient-start), var(--pm-gradient-end))' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
                </div>
                {/* Orbital ring */}
                <div className="orbital-ring">
                  <div className="orbital-dot" />
                </div>
              </div>
              <h1 className="text-2xl font-bold font-heading tracking-tight gradient-text">
                PixelMind AI
              </h1>
              <p className="text-xs mt-2" style={{ color: 'var(--pm-text-muted)' }}>
                Transform words into stunning visuals
              </p>
            </div>

            {showSignUp ? (
              <div className="flex flex-col items-center">
                <SignUp routing="hash" />
                <button 
                  className="mt-6 text-sm font-medium transition-all cursor-pointer hover:opacity-80"
                  style={{ color: 'var(--pm-primary)' }}
                  onClick={() => setShowSignUp(false)}
                >
                  Already have an account? <span className="underline">Sign In</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <SignIn routing="hash" />
                <button 
                  className="mt-6 text-sm font-medium transition-all cursor-pointer hover:opacity-80"
                  style={{ color: 'var(--pm-primary)' }}
                  onClick={() => setShowSignUp(true)}
                >
                  Don't have an account? <span className="underline">Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <Dashboard />
      </SignedIn>
    </div>
  );
}
