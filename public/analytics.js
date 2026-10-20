/**
 * LUCKYLY PRODUCTION CLIENT-SIDE CLICKSTREAM & BEHAVIORAL TRACKING ENGINE
 * Lightweight, non-blocking vanilla JavaScript tracking script.
 * Features:
 * - Persistent session tracking via localStorage
 * - Global document click listener for [data-track] elements
 * - Unload-resilient event dispatch via navigator.sendBeacon
 * - Viewport, URL, referrer, and user-agent metadata capturing
 */
(function() {
  'use strict';

  // 1. Session Initialization
  var SESSION_STORAGE_KEY = 'luckyly_analytics_session_id';
  var USER_STORAGE_KEY = 'luckyly_analytics_user_id';

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getOrCreateSessionId() {
    var sessionId = null;
    try {
      sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionId) {
        sessionId = 'sess_' + generateUUID();
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      }
    } catch (e) {
      sessionId = 'sess_mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }
    return sessionId;
  }

  function getStoredUserId() {
    try {
      return localStorage.getItem(USER_STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  var currentSessionId = getOrCreateSessionId();
  var currentUserId = getStoredUserId();

  // 2. Dispatch Function using navigator.sendBeacon with fetch fallback
  function sendEvent(eventName, elementId, customMetadata) {
    if (!eventName) return;

    var payload = {
      session_id: currentSessionId,
      user_id: currentUserId,
      event_name: eventName,
      element_id: elementId || null,
      metadata: Object.assign(
        {
          path: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          referrer: document.referrer || '',
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        customMetadata || {}
      )
    };

    var endpoint = '/api/analytics/event';
    var payloadString = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      var blob = new Blob([payloadString], { type: 'application/json' });
      var sent = navigator.sendBeacon(endpoint, blob);
      if (!sent) {
        fallbackFetch(endpoint, payloadString);
      }
    } else {
      fallbackFetch(endpoint, payloadString);
    }
  }

  function fallbackFetch(endpoint, payloadString) {
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString,
        keepalive: true
      }).catch(function() {});
    } catch (err) {}
  }

  // 3. Global Click Delegation for [data-track] Elements
  document.addEventListener('click', function(event) {
    var target = event.target;
    var trackable = target.closest ? target.closest('[data-track]') : null;
    if (trackable) {
      var eventName = trackable.getAttribute('data-track');
      var elementId =
        trackable.getAttribute('data-element-id') ||
        trackable.id ||
        trackable.name ||
        trackable.getAttribute('aria-label') ||
        eventName;

      sendEvent(eventName, elementId, {
        tag_name: trackable.tagName.toLowerCase(),
        text_preview: (trackable.innerText || '').substring(0, 50).trim()
      });
    }
  }, true);

  // 4. Initial Page View
  sendEvent('page_view', 'document', {
    title: document.title
  });

  // 5. Public API on window
  window.LuckylyAnalytics = {
    track: sendEvent,
    setUserId: function(userId) {
      currentUserId = userId;
      try {
        if (userId) {
          localStorage.setItem(USER_STORAGE_KEY, userId);
        } else {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch (e) {}
    },
    getSessionId: function() {
      return currentSessionId;
    }
  };
})();
