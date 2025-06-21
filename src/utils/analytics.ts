/**
 * Utility functions for tracking analytics events
 */

/**
 * Track a page view
 * @param title Page title
 * @param path Page path
 */
const trackPageView = (title: string, path: string) => {
  if (import.meta.env.PROD && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: title,
      page_location: window.location.href,
      page_path: path,
    });
  }
};

/**
 * Track a user action
 * @param category Event category
 * @param action Event action
 * @param label Event label (optional)
 * @param value Event value (optional)
 */
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
) => {
  if (import.meta.env.PROD && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

/**
 * Track an error
 * @param error Error object or message
 * @param context Additional context
 */
const trackError = (error: Error | string, context?: Record<string, any>) => {
  if (import.meta.env.PROD && window.gtag) {
    const errorMessage = error instanceof Error ? error.message : error;
    window.gtag('event', 'error', {
      event_category: 'Error',
      event_label: errorMessage,
      error_context: JSON.stringify(context || {}),
    });
  }
};