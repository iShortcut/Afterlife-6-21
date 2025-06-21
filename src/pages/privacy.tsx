import { motion } from 'framer-motion';

const Privacy = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8"
      >
        <h1 className="text-3xl font-serif text-slate-800 mb-6">Privacy Policy</h1>
        
        <div className="prose max-w-none text-slate-700">
          <p className="lead">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          
          <h2>1. Introduction</h2>
          <p>
            Welcome to Memoriam ("we," "our," or "us"). We are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
          </p>
          
          <h2>2. Information We Collect</h2>
          <p>We collect information that you provide directly to us, including:</p>
          <ul>
            <li>Account information (name, email, password)</li>
            <li>Profile information (biography, profile picture)</li>
            <li>Memorial content (text, images, videos)</li>
            <li>Payment information (processed securely through our payment processors)</li>
            <li>Communications with us</li>
          </ul>
          
          <p>We also automatically collect certain information when you use our services:</p>
          <ul>
            <li>Log data (IP address, browser type, pages visited)</li>
            <li>Device information</li>
            <li>Cookies and similar technologies</li>
            <li>Usage information</li>
          </ul>
          
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions</li>
            <li>Send you technical notices, updates, and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Develop new products and services</li>
            <li>Monitor and analyze trends and usage</li>
            <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
            <li>Personalize your experience</li>
          </ul>
          
          <h2>4. Sharing Your Information</h2>
          <p>We may share your information with:</p>
          <ul>
            <li>Service providers who perform services on our behalf</li>
            <li>Other users, based on your privacy settings</li>
            <li>Legal authorities when required by law</li>
            <li>Business partners with your consent</li>
          </ul>
          
          <h2>5. Your Choices</h2>
          <p>You have several choices regarding the information you provide to us:</p>
          <ul>
            <li>Account Information: You can update your account information through your profile settings</li>
            <li>Memorial Privacy: You can control the visibility of your memorials</li>
            <li>Communications: You can opt out of receiving promotional emails</li>
            <li>Cookies: You can manage cookies through your browser settings</li>
          </ul>
          
          <h2>6. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, so we cannot guarantee absolute security.
          </p>
          
          <h2>7. Children's Privacy</h2>
          <p>
            Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected personal information from a child under 13, we will delete that information.
          </p>
          
          <h2>8. International Data Transfers</h2>
          <p>
            Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ.
          </p>
          
          <h2>9. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
          
          <h2>10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
            <br />
            <a href="mailto:privacy@memoriam.com" className="text-indigo-600 hover:text-indigo-800">privacy@memoriam.com</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Privacy;