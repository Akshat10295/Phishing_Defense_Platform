/**
 * SentinelAI Chrome Extension - Content Script Heuristic Engine
 * Audits active webpage forms, binds JWT auth tokens, and injects protective block overlays.
 */

// 1. Analyst JWT Token Synchronization Pipeline
const syncAnalystToken = () => {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    const token = localStorage.getItem('sentinel_access') || localStorage.getItem('token');
    if (token) {
      console.log('[content] Syncing active analyst JWT session token to extension runtime...');
      chrome.runtime.sendMessage({ type: 'SYNC_TOKEN', token });
    }
  }
};

// Monitor token changes in local storage
window.addEventListener('storage', (e) => {
  if (e.key === 'sentinel_access' || e.key === 'token') {
    syncAnalystToken();
  }
});

// Run initial synchronization
syncAnalystToken();

// 2. Behavioral DOM Form Threat Heuristics
const auditDomHeuristics = () => {
  const forms = document.querySelectorAll('form');
  let crossDomainSubmits = 0;
  let insecurePasswordForms = 0;

  forms.forEach(form => {
    const action = form.getAttribute('action');
    if (action && action.startsWith('http') && !action.includes(window.location.hostname)) {
      crossDomainSubmits++;
    }

    const hasPassword = form.querySelector('input[type="password"]');
    if (hasPassword && window.location.protocol !== 'https:') {
      insecurePasswordForms++;
    }
  });

  if (crossDomainSubmits > 0 || insecurePasswordForms > 0) {
    console.warn(`[content] DOM Heuristic Warning: Found ${crossDomainSubmits} cross-domain submit forms & ${insecurePasswordForms} insecure password input fields.`);
  }
};

auditDomHeuristics();

// 3. Dynamic Protective Shield Warning Injection
const injectBlockOverlay = (riskScore) => {
  // If overlay is already active, do not double-inject
  if (document.getElementById('sentinel-block-shield')) return;

  // Halt active scrolling interactions
  document.body.style.overflow = 'hidden';

  // Build premium warning layout HTML
  const shield = document.createElement('div');
  shield.id = 'sentinel-block-shield';
  shield.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background-color: #0b0f19 !important;
    z-index: 2147483647 !important;
    font-family: 'Courier New', Courier, monospace !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: #f3f4f6 !important;
    padding: 24px !important;
    box-sizing: border-box !important;
  `;

  const container = document.createElement('div');
  container.style.cssText = `
    max-width: 600px !important;
    width: 100% !important;
    background-color: rgba(17, 24, 39, 0.8) !important;
    border: 1px solid #dc2626 !important;
    border-radius: 16px !important;
    padding: 40px !important;
    box-shadow: 0 0 35px rgba(220, 38, 38, 0.25) !important;
    text-align: center !important;
    backdrop-filter: blur(12px) !important;
    box-sizing: border-box !important;
  `;

  // Dynamic risk percentage color indicator
  const percentage = (riskScore * 100).toFixed(0);

  container.innerHTML = `
    <div style="width: 70px; height: 70px; border-radius: 50%; border: 2px dashed #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; color: #dc2626; font-size: 32px; font-weight: bold;">⚠</div>
    <h1 style="font-size: 24px; font-weight: 900; color: #f3f4f6; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: -0.5px;">MALICIOUS PORTAL BLOCKED</h1>
    <p style="font-size: 13px; color: #9ca3af; margin: 0 0 24px 0; line-height: 1.6;">
      SentinelAI deep learning models have intercepted this page load. Visual structure analysis indicates signature brand spoofing clone vectors.
    </p>
    
    <div style="background-color: #0b0f19; border: 1px solid #1f2937; padding: 16px; border-radius: 8px; margin-bottom: 30px; font-size: 11px; text-align: left; line-height: 1.5;">
      <div style="margin-bottom: 6px;"><strong style="color: #9ca3af;">Audited Link:</strong> <span style="color: #dc2626; word-break: break-all;">${window.location.href}</span></div>
      <div style="margin-bottom: 6px;"><strong style="color: #9ca3af;">AI Risk Factor:</strong> <span style="color: #dc2626; font-weight: bold;">${percentage}% Phishing Probability</span></div>
      <div><strong style="color: #9ca3af;">Core Core engines:</strong> <span style="color: #10b981;">PyTorch Siamese CNN + XGBoost</span></div>
    </div>
    
    <div style="display: flex; gap: 16px; justify-content: center;">
      <button id="sentinel-go-back" style="background-color: #dc2626; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; font-family: monospace; transition: all 0.2s;">RETURN TO SAFETY</button>
      <button id="sentinel-bypass" style="background-color: transparent; color: #6b7280; border: 1px solid #374151; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 11px; font-family: monospace; transition: all 0.2s;">PROCEED ANYWAY</button>
    </div>
  `;

  shield.appendChild(container);
  document.body.appendChild(shield);

  // Wire up button interaction listeners
  document.getElementById('sentinel-go-back').addEventListener('click', () => {
    window.location.href = 'http://localhost';
  });

  document.getElementById('sentinel-bypass').addEventListener('click', () => {
    // Unblock overflow and fade out the protective shield
    document.body.style.overflow = '';
    shield.remove();
  });
};

// Listen for alert messages from the background service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PHISHING_ALERT') {
    injectBlockOverlay(message.riskScore);
  }
});

// Check local storage on page loads to preserve block states on page refreshes
chrome.storage.local.get(['blockedUrls']).then((store) => {
  const blockedUrls = store.blockedUrls || {};
  const currentUrl = window.location.href;
  if (blockedUrls[currentUrl]) {
    injectBlockOverlay(blockedUrls[currentUrl]);
  }
});
