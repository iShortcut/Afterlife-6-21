import { motion } from 'framer-motion';

const Terms = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8"
      >
        <h1 className="text-3xl font-serif text-slate-800 mb-6">Terms of Service</h1>
        
        <div className="prose max-w-none text-slate-700">
          <p className="lead">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using Memoriam's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services.
          </p>
          
          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily use our services for personal, non-commercial purposes only. This license does not include:
          </p>
          <ul>
            <li>Modifying or copying our materials</li>
            <li>Using the materials for any commercial purpose</li>
            <li>Attempting to decompile or reverse engineer any software contained on our website</li>
            <li>Removing any copyright or other proprietary notations</li>
            <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
          </ul>
          
          <h2>3. User Accounts</h2>
          <p>
            When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding the password and for all activities that occur under your account.
          </p>
          
          <h2>4. User Content</h2>
          <p>
            Our services allow you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content you post and its legality.
          </p>
          
          <h2>5. Prohibited Uses</h2>
          <p>You may use our services only for lawful purposes and in accordance with these Terms. You agree not to use our services:</p>
          <ul>
            <li>In any way that violates any applicable law or regulation</li>
            <li>To harass, abuse, or harm another person</li>
            <li>To impersonate or attempt to impersonate Memoriam, a Memoriam employee, another user, or any other person</li>
            <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the services</li>
          </ul>
          
          <h2>6. Intellectual Property</h2>
          <p>
            The services and their original content, features, and functionality are and will remain the exclusive property of Memoriam and its licensors. The services are protected by copyright, trademark, and other laws.
          </p>
          
          <h2>7. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
          
          <h2>8. Limitation of Liability</h2>
          <p>
            In no event shall Memoriam, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
          </p>
          
          <h2>9. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws, without regard to its conflict of law provisions.
          </p>
          
          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our services after those revisions become effective, you agree to be bound by the revised terms.
          </p>
          
          <h2>11. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
            <br />
            <a href="mailto:terms@memoriam.com" className="text-indigo-600 hover:text-indigo-800">terms@memoriam.com</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Terms;