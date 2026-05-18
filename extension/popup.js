/**
 * SentinelAI Chrome Extension - Popup UI Controller
 * Directs manual link audit submissions and coordinates active tab safety indicators.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statusRing = document.getElementById('status-ring');
  const statusTitle = document.getElementById('status-title');
  const statusDesc = document.getElementById('status-desc');
  
  const scanInput = document.getElementById('scan-input');
  const scanBtn = document.getElementById('scan-btn');
  const resultPanel = document.getElementById('result-panel');

  // 1. Audit active tab and load saved states
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs || tabs.length === 0) return;
    
    const activeTab = tabs[0];
    const url = activeTab.url;
    
    // Check local storage for synced analyst authorization tokens
    const store = await chrome.storage.local.get(['token', 'blockedUrls']);
    const token = store.token;
    const blockedUrls = store.blockedUrls || {};

    if (!token) {
      statusRing.innerHTML = '⚠';
      statusRing.className = 'status-ring danger';
      statusTitle.innerHTML = 'AUTH TOKEN MISSING';
      statusDesc.innerHTML = 'Please login on the main dashboard to sync analyst credentials.';
      return;
    }

    // Set page URL details
    if (blockedUrls[url]) {
      const score = blockedUrls[url];
      statusRing.innerHTML = '!';
      statusRing.className = 'status-ring danger';
      statusTitle.innerHTML = 'PHISHING THREAT BLOCKED';
      statusDesc.innerHTML = `${url}`;
    } else {
      statusRing.innerHTML = '✓';
      statusRing.className = 'status-ring';
      statusTitle.innerHTML = 'ACTIVE CHANNEL SECURE';
      
      try {
        const hostname = new URL(url).hostname;
        statusDesc.innerHTML = hostname || url;
      } catch (e) {
        statusDesc.innerHTML = url;
      }
    }
  });

  // 2. Coordinate manual URL threat inspection click handlers
  scanBtn.addEventListener('click', () => {
    const urlToScan = scanInput.value.trim();
    if (!urlToScan) return;

    // Trigger visual loading indicator states
    scanBtn.disabled = true;
    scanBtn.innerHTML = '...';
    resultPanel.style.display = 'none';

    // Dispatch audit requests directly to background coordinator threads
    chrome.runtime.sendMessage({ type: 'MANUAL_SCAN', url: urlToScan }, (response) => {
      scanBtn.disabled = false;
      scanBtn.innerHTML = 'SCAN';

      if (chrome.runtime.lastError) {
        resultPanel.innerHTML = `<span style="color: #dc2626;">Messaging channel error: Awaiting runtime activation.</span>`;
        resultPanel.style.display = 'block';
        return;
      }

      if (response && response.success && response.scan) {
        const scan = response.scan;
        const percentage = (scan.riskScore * 100).toFixed(0);
        const isPhishing = scan.isPhishing || false;

        resultPanel.innerHTML = `
          <div style="margin-bottom: 4px;"><strong style="color: #6b7280;">Audit:</strong> <span style="color: #fff; word-break: break-all;">${urlToScan}</span></div>
          <div style="margin-bottom: 4px;"><strong style="color: #6b7280;">Risk Indicator:</strong> <span style="color: ${isPhishing ? '#dc2626' : '#10b981'}; font-weight: bold;">${percentage}% Phishing</span></div>
          <div><strong style="color: #6b7280;">Verdict:</strong> <span style="color: ${isPhishing ? '#dc2626' : '#10b981'}; font-weight: bold; text-transform: uppercase;">${isPhishing ? 'MALICIOUS THREAT' : 'VERIFIED SAFE'}</span></div>
        `;
        resultPanel.style.display = 'block';
      } else {
        resultPanel.innerHTML = `<span style="color: #dc2626;">Scan Failed: ${response?.error || 'Unknown gateway anomaly.'}</span>`;
        resultPanel.style.display = 'block';
      }
    });
  });
});
