import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

interface CookieConsentProps {
  className?: string;
}

const CookieConsent = ({ className = '' }: CookieConsentProps) => {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem('cookie-consent');
    if (!hasConsented) {
      // Show consent banner after a short delay
      const timer = setTimeout(() => {
        setShowConsent(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setShowConsent(false);
    
    // Initialize analytics if consent is given
    if (window.gtag && import.meta.env.VITE_GA_MEASUREMENT_ID) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'false');
    setShowConsent(false);
    
    // Disable analytics if consent is declined
    if (window.gtag && import.meta.env.VITE_GA_MEASUREMENT_ID) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied'
      });
    }
  };

  return (
    <AnimatePresence>
      {showConsent && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white shadow-lg border-t border-slate-200 p-4 ${className}`}
        >
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-700">
              <p>
                We use cookies to enhance your experience on our website. By continuing to browse, you agree to our{' '}
                <a href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
              >
                Accept
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;