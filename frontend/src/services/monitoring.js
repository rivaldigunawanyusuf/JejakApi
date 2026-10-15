/**
 * Monitoring and Error Tracking Service (Sentry Integration)
 * JEJAK API - Peatland Fire Risk Intelligence Platform
 *
 * Silently captures runtime errors, WebGL crashes, and performance issues,
 * sending diagnostic reports to Sentry while shielding end-users / judges
 * from raw technical error screens.
 */
import * as Sentry from '@sentry/react';

let isInitialized = false;

export function initMonitoring() {
  if (isInitialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'production';

  if (dsn) {
    try {
      Sentry.init({
        dsn,
        environment,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0,
        tracePropagationTargets: ['localhost', /^\//],
        // Session Replay on Error
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
      console.info('[Monitoring] Sentry tracking active in', environment);
    } catch (err) {
      console.warn('[Monitoring] Failed to initialize Sentry:', err);
    }
  } else {
    if (import.meta.env.DEV) {
      console.info('[Monitoring] Sentry DSN not provided in VITE_SENTRY_DSN. Running silent local monitoring.');
    }
  }

  // Global browser unhandled rejection fallback
  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason || new Error('Unhandled Promise Rejection'), {
      source: 'window.unhandledrejection',
    });
  });

  // Global uncaught error fallback
  window.addEventListener('error', (event) => {
    // Ignore benign script load errors
    if (!event.error && event.message === 'Script error.') return;
    captureError(event.error || new Error(event.message || 'Window uncaught error'), {
      source: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  isInitialized = true;

  // Expose global test trigger for testing Sentry integration in browser console
  if (typeof window !== 'undefined') {
    window.testSentry = () => {
      console.log('Sending test alert to Sentry...');
      captureMessage('Test alert from JEJAK API verification', 'info');
      captureError(new Error('Sentry Test Verification Error: Everything is connected!'), {
        source: 'manual_verification',
      });
      return 'Test sent to Sentry. Check your Sentry Issues dashboard!';
    };
  }
}

/**
 * Capture an exception and send to Sentry (or log silently)
 * @param {Error|any} error - The caught error
 * @param {Object} context - Additional metadata or component stack
 */
export function captureError(error, context = {}) {
  try {
    if (import.meta.env.DEV) {
      console.warn('[Monitoring Capture]', error, context);
    }

    if (import.meta.env.VITE_SENTRY_DSN && isInitialized) {
      Sentry.captureException(error, {
        extra: {
          ...context,
          timestamp: new Date().toISOString(),
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          url: window.location.href,
        },
      });
    }
  } catch (err) {
    console.warn('[Monitoring] Failed to capture error:', err);
  }
}

/**
 * Capture a message/event and send to Sentry
 * @param {string} message
 * @param {'info'|'warning'|'error'} level
 * @param {Object} context
 */
export function captureMessage(message, level = 'info', context = {}) {
  try {
    if (import.meta.env.DEV) {
      console.log(`[Monitoring Message - ${level}]`, message, context);
    }

    if (import.meta.env.VITE_SENTRY_DSN && isInitialized) {
      Sentry.captureMessage(message, {
        level,
        extra: {
          ...context,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (err) {
    console.warn('[Monitoring] Failed to capture message:', err);
  }
}
