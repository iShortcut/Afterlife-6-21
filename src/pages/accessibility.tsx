import { motion } from 'framer-motion';

const Accessibility = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8"
      >
        <h1 className="text-3xl font-serif text-slate-800 mb-6">Accessibility Statement</h1>
        
        <div className="prose max-w-none text-slate-700">
          <p className="lead">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          
          <h2>Our Commitment</h2>
          <p>
            Memoriam is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone, and applying the relevant accessibility standards.
          </p>
          
          <h2>Conformance Status</h2>
          <p>
            The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA.
          </p>
          <p>
            Memoriam is partially conformant with WCAG 2.1 level AA. Partially conformant means that some parts of the content do not fully conform to the accessibility standard.
          </p>
          
          <h2>Accessibility Features</h2>
          <p>Memoriam includes the following accessibility features:</p>
          <ul>
            <li>Semantic HTML structure</li>
            <li>Keyboard navigation support</li>
            <li>Text alternatives for non-text content</li>
            <li>Sufficient color contrast</li>
            <li>Resizable text without loss of content or functionality</li>
            <li>ARIA landmarks and roles</li>
            <li>Focus indicators</li>
          </ul>
          
          <h2>Known Limitations</h2>
          <p>Despite our best efforts, there may be some aspects of our website that are not fully accessible:</p>
          <ul>
            <li>Some older content may not be fully accessible</li>
            <li>Some third-party content may not be fully accessible</li>
            <li>Some interactive elements may not be fully keyboard accessible</li>
          </ul>
          
          <h2>Feedback</h2>
          <p>
            We welcome your feedback on the accessibility of Memoriam. Please let us know if you encounter accessibility barriers:
          </p>
          <ul>
            <li>Email: <a href="mailto:accessibility@memoriam.com" className="text-indigo-600 hover:text-indigo-800">accessibility@memoriam.com</a></li>
            <li>Phone: +1 (800) 123-4567</li>
            <li>Feedback form: Available on our <a href="/contact" className="text-indigo-600 hover:text-indigo-800">Contact page</a></li>
          </ul>
          <p>
            We try to respond to feedback within 3 business days.
          </p>
          
          <h2>Assessment Approach</h2>
          <p>
            Memoriam assessed the accessibility of our website by the following approaches:
          </p>
          <ul>
            <li>Self-evaluation</li>
            <li>External evaluation</li>
            <li>User testing</li>
          </ul>
          
          <h2>Formal Approval</h2>
          <p>
            This accessibility statement was created on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} using the <a href="https://www.w3.org/WAI/planning/statements/" className="text-indigo-600 hover:text-indigo-800">W3C Accessibility Statement Generator Tool</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Accessibility;