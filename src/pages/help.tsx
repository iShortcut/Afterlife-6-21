import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, BookOpen, MessageSquare, HelpCircle, FileText, Mail } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Help = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl font-serif text-slate-800 mb-4">Help Center</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Find answers to common questions and learn how to make the most of Memoriam.
          </p>
          
          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative">
              <Input
                placeholder="Search for help topics..."
                icon={<Search size={18} className="text-slate-400" />}
              />
              <Button
                className="absolute right-1 top-1"
              >
                Search
              </Button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <BookOpen className="text-indigo-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-medium text-slate-800 mb-2">Getting Started</h2>
                <p className="text-slate-600 mb-4">Learn the basics of creating and managing memorials.</p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/help/creating-memorial" className="text-indigo-600 hover:text-indigo-800">
                      How to create a memorial
                    </Link>
                  </li>
                  <li>
                    <Link to="/help/adding-content" className="text-indigo-600 hover:text-indigo-800">
                      Adding photos and videos
                    </Link>
                  </li>
                  <li>
                    <Link to="/help/sharing" className="text-indigo-600 hover:text-indigo-800">
                      Sharing your memorial with others
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <MessageSquare className="text-indigo-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-medium text-slate-800 mb-2">Community Features</h2>
                <p className="text-slate-600 mb-4">Learn about tributes, comments, and community groups.</p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/help/tributes" className="text-indigo-600 hover:text-indigo-800">
                      Adding tributes and memories
                    </Link>
                  </li>
                  <li>
                    <Link to="/help/groups" className="text-indigo-600 hover:text-indigo-800">
                      Joining and creating groups
                    </Link>
                  </li>
                  <li>
                    <Link to="/help/events" className="text-indigo-600 hover:text-indigo-800">
                      Creating and managing events
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <HelpCircle className="text-indigo-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-medium text-slate-800 mb-2">Troubleshooting</h2>
                <p className="text-slate-600 mb-4">Solutions to common issues and problems.</p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/help/account-issues" className="text-indigo-600 hover:text-indigo-800">
                      Account and login issues
                    </Link>
                  </li>
                  <li>
                    <Link to="/help/upload-problems" className="text-indigo-600 hover:text-indigo-800">
                      Problems uploading media
                    </Link>
                  </li>
                  <li>
                    <Link to="/help/payment-issues" className="text-indigo-600 hover:text-indigo-800">
                      Payment and subscription issues
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <FileText className="text-indigo-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-medium text-slate-800 mb-2">Policies & Guidelines</h2>
                <p className="text-slate-600 mb-4">Important information about using our platform.</p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/privacy" className="text-indigo-600 hover:text-indigo-800">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-indigo-600 hover:text-indigo-800">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link to="/help/community-guidelines" className="text-indigo-600 hover:text-indigo-800">
                      Community Guidelines
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-indigo-50 rounded-lg p-8 text-center">
          <Mail className="mx-auto text-indigo-600 mb-4" size={32} />
          <h2 className="text-xl font-medium text-slate-800 mb-2">Still Need Help?</h2>
          <p className="text-slate-600 mb-4">
            Our support team is here to assist you with any questions or issues.
          </p>
          <Link to="/contact">
            <Button>Contact Support</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Help;