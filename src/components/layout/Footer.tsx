import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-800 text-slate-300 py-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <h3 className="text-lg font-serif mb-4 text-white">Afterlife</h3>
            <p className="text-sm mb-4">
              A respectful place to create and share tribute pages for your loved ones.
              Honor their memory and celebrate their life with a beautiful digital memorial.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-serif mb-4 text-white">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Home</Link></li>
              <li><Link to="/dashboard" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Dashboard</Link></li>
              <li><Link to="/create-memorial" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Create Memorial</Link></li>
              <li><Link to="/products" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Products</Link></li>
              <li><Link to="/groups" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Community Groups</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-serif mb-4 text-white">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/help" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Help Center</Link></li>
              <li><Link to="/privacy" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Terms of Service</Link></li>
              <li><Link to="/contact" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Contact Us</Link></li>
              <li><Link to="/accessibility" className="hover:text-indigo-300 transition-colors focus:outline-none focus:underline">Accessibility</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-700 text-center text-sm">
          <p className="flex items-center justify-center gap-1">
            Created with <Heart size={16} className="text-rose-500" aria-hidden="true" /> &copy; {currentYear} Afterlife
          </p>
          <p className="mt-2 text-xs text-slate-400">
            All rights reserved. Afterlife is a platform for creating and sharing memorial pages.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;