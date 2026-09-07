import { state } from 'levelojs';
import './Mind.css';

function Mind() {
  const [count, setCount] = state(0);
  const [version, setVersion] = state("x.x.x");

  fetch('https://registry.npmjs.org/levelojs/latest')
    .then(res => res.json())
    .then(data => {setVersion(data.version); console.log(data.version)})
    .catch((e) => {setVersion("2.0.0"); console.log(e)})

  return (
    <div class="levelo-app">
      {/* Top Header / Navigation */}
      <header class="navbar">
        <div class="logo-group">
          <div class="logo-svg-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="1298 1320 476 396">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5b4fff"/>
                  <stop offset="100%" stopColor="#a78bfa"/>
                </linearGradient>
              </defs>
              <g fill="url(#logoGrad)">
                <path d="M1529.1 1338.8c-3.5 5.9-22.7 36.8-42.6 68.7-41.2 66.2-40.5 65-40.5 65.9 0 .3 13.5.6 30 .6h30l5.8-9c3.1-5 9.8-15.4 14.9-23.2l9.2-14.1 15.3 23.2 15.2 23.1h60.8l-1.8-2.8c-1-1.5-8.6-13.7-16.9-27.2s-21.9-35.3-30.1-48.5c-8.3-13.2-21.1-33.8-28.5-45.7-7.4-12-13.6-21.7-13.9-21.7s-3.4 4.8-6.9 10.7z"/>
                <path d="m1517.6 1488.7-18.6 27.8 9.7.5 9.8.5.3 67.2c.1 37-.1 67.3-.5 67.2-.5 0-3-2.8-5.8-6.2-2.7-3.4-25.2-29.8-50-58.7-24.7-28.9-50.2-58.7-56.5-66.3l-11.5-13.6-44.2-.1c-24.4 0-44.3.2-44.3.5 0 .6 30.2 36 112.5 131.9 29.7 34.6 55 64.2 56.3 65.8 2.9 3.5 4.8 3.5 7.6.1 1.1-1.5 7.7-9.6 14.6-17.8 6.9-8.3 22.3-27.3 34.3-42.2l21.7-27v-101.2l10-.3 10-.3-18-27.4c-9.9-15.1-18.2-27.6-18.4-27.8-.2-.3-8.8 12.1-19 27.4zm146.8 33.5c-7.1 8.4-19.6 23.2-27.9 32.9-51.1 60-125 148.3-126.6 151.1-.9 1.7 1.4 1.8 42.8 1.7h43.8l25.5-30.1c14-16.6 34.7-41 46-54.3 58.1-68.3 92.6-109.2 96.9-114.8 1.3-1.6-.9-1.7-43.1-1.7h-44.4z"/>
              </g>
            </svg>
          </div>
          <span class="logo-text heading-font">Levelo JS</span>
          <span class="version-badge">v{version()}</span>
        </div>
        <nav class="nav-links">
          <a href="https://levelojs.motionmind.me" target="_blank">Docs</a>
          <a href="https://github.com/MotionMind2007/Levelo-Js" target="_blank">GitHub</a>
        </nav>
      </header>

      {/* Main Container Layout */}
      <main class="main-container">
        
        {/* Upper Hero Section */}
        <section class="hero-split">
          {/* Left Hand: Hero Typography */}
          <div class="hero-content">
            <h1 class="hero-title heading-font">
              Levelo <span class="brand-gradient">JS</span>
            </h1>
            <p class="hero-subtitle">
              The TypeScript Rebirth. Build blazing-fast web interfaces with full reactive granularity and near-zero compilation overhead.
            </p>
            <div class="tagline-badges">
              LIGHTWEIGHT • ULTRA REACTIVE • DEVELOPER FIRST
            </div>
            
            <div class="action-group">
              <a href="https://levelojs.motionmind.me" target="_blank" class="btn-primary">
                Start Building ➔
              </a>
            </div>

            <p class="file-instruction">
              Get started by modifying <code class="code-highlight">src/Mind.jsx</code> to watch instant updates.
            </p>
          </div>

          {/* Right Hand: Interactive Counter Module */}
          <div class="interactive-zone">
            <div class="demo-card">
              <div class="card-glow"></div>
              <span class="demo-tag">Live Sandbox</span>
              <h2 class="live-counter heading-font">{count()}</h2>
              <button class="btn-action" onclick={() => setCount(count() + 1)}>
                Levelo Up 🚀
              </button>
            </div>
          </div>
        </section>

        {/* Industry Standard Features Section to Fill Up the Screen */}
        <section class="features-grid">
          <div class="feature-card">
            <div class="feat-icon">⚛️</div>
            <h3 class="heading-font">Fine-Grained Reactivity</h3>
            <p>No Virtual DOM overhead. Levelo JS tracks changes granularly and updates the real DOM nodes instantly on state modification.</p>
          </div>
          <div class="feature-card">
            <div class="feat-icon">🦾</div>
            <h3 class="heading-font">TypeScript Rebirth</h3>
            <p>Fully rewritten with strict type-safety and robust DX, giving you rich autocompletion and structural assurance out-of-the-box.</p>
          </div>
          <div class="feature-card">
            <div class="feat-icon">📦</div>
            <h3 class="heading-font">Vite-Optimized</h3>
            <p>Pre-configured with lightning fast Hot Module Replacement (HMR) ensuring a frictionless development ecosystem.</p>
          </div>
        </section>

      </main>

      {/* Bottom Footer */}
      <footer class="footer">
        <p>Built with passion under the <a class="brand-bold" href='https://lab.motionmind.me' target='blank' style={{ marginLeft: '5px', marginRight: '5px'}}>Motion Mind</a> Initiative</p>
      </footer>
    </div>
  );
}

export default Mind;