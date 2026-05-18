/**
 * SentinelAI Chrome Extension - Background Service Worker
 * Intercepts tab navigations, coordinates high-performance ML security audits,
 * and maintains active analyst JWT synchronization.
 */

const GATEWAY_URL = 'http://localhost:5000/api/v1';

// In-memory cache for audited URLs to eliminate redundant backend scans
const auditedUrlsCache = new Map();

// Helper to check if URL is a browser system utility or local dev workspace
const isSystemUrl = (url) => {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('about:') ||
    lower.startsWith('view-source:') ||
    lower.startsWith('localhost:5173') || // Dashboard page
    lower.startsWith('http://localhost:5173')
  );
};

// Auto-scan address bar commits
chrome.webNavigation.onCommitted.addListener((details) => {
  // Avoid frame navigations (only audit top-level browser tab updates)
  if (details.frameId !== 0) return;

  const url = details.url;
  if (isSystemUrl(url)) return;

  console.log(`[background] intercepting navigation commit: ${url}`);
  triggerUrlAudit(details.tabId, url);
});

// Trigger scan audits via backend REST
const triggerUrlAudit = async (tabId, url) => {
  // Check memory cache first
  if (auditedUrlsCache.has(url)) {
    const cached = auditedUrlsCache.get(url);
    if (cached.isPhishing) {
      triggerBlockOverlay(tabId, url, cached.riskScore);
    }
    return;
  }

  try {
    // 1. Retrieve stored JWT token
    const store = await chrome.storage.local.get(['token', 'blockedUrls']);
    const token = store.token;
    const blockedUrls = store.blockedUrls || {};

    if (!token) {
      console.warn('[background] No active analyst JWT token synced. Awaiting synchronization...');
      return;
    }

    // 2. Query Gateway URL threat classifier
    const response = await fetch(`${GATEWAY_URL}/scan/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`REST gateway responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.scan) {
      const riskScore = data.scan.riskScore || 0;
      const isPhishing = data.scan.isPhishing || false;

      // Cache the result
      auditedUrlsCache.set(url, { isPhishing, riskScore });

      if (isPhishing) {
        console.warn(`[background] Alert: Phishing domain blocked! Score: ${riskScore}`);
        
        // Save to persisted blocked list
        blockedUrls[url] = riskScore;
        await chrome.storage.local.set({ blockedUrls });

        triggerBlockOverlay(tabId, url, riskScore);
      }
    }
  } catch (err) {
    console.error('[background] URL audit endpoint query failed:', err.message);
  }
};

// Dispatch message to active tab's content script to inject shield overlay
const triggerBlockOverlay = (tabId, url, riskScore) => {
  chrome.tabs.sendMessage(tabId, {
    type: 'PHISHING_ALERT',
    url,
    riskScore
  }, () => {
    // Catch silent chrome messaging errors if page is not fully ready
    if (chrome.runtime.lastError) {
      // Retrying in 250ms
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          type: 'PHISHING_ALERT',
          url,
          riskScore
        });
      }, 250);
    }
  });
};

// Listen for message communications (Token synchronization & manual popup scans)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_TOKEN') {
    chrome.storage.local.set({ token: message.token });
    console.log('[background] Successfully synchronized active analyst JWT session token.');
    sendResponse({ success: true });
  }

  if (message.type === 'MANUAL_SCAN') {
    const url = message.url;
    // Perform manual ad-hoc scan and report back to popup
    chrome.storage.local.get(['token']).then(async (store) => {
      try {
        const response = await fetch(`${GATEWAY_URL}/scan/url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${store.token}`
          },
          body: JSON.stringify({ url })
        });
        const data = await response.json();
        sendResponse({ success: data.success, scan: data.scan });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true; // Keep channel open for async response
  }
});
