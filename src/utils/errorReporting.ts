import * as Sentry from "@sentry/react";

/**
 * Report an error to Sentry
 * @param error Error object or message
 * @param context Additional context
 */
export const reportError = (error: Error | string, context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: context,
      });
    } else {
      Sentry.captureMessage(error, {
        level: "error",
        extra: context,
      });
    }
  } else {
    console.error("Error:", error, "Context:", context);
  }
};

/**
 * Set user context for error reporting
 * @param userId User ID
 * @param email User email
 * @param username User username
 */
export const setUserContext = (userId: string, email?: string, username?: string) => {
  if (import.meta.env.PROD) {
    Sentry.setUser({
      id: userId,
      email,
      username,
    });
  }
};

/**
 * Clear user context for error reporting
 */
export const clearUserContext = () => {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
};