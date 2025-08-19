import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Footer: React.FC = () => {
  const location = useLocation();
  const isPublicPage = location.pathname === '/' || location.pathname.startsWith('/auth');

  if (isPublicPage) {
    return null; // Public pages handle their own footer
  }

  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center text-sm text-gray-400">
            © 2025 PawPilot HQ. All rights reserved.
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              to="/help/privacy"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/help/terms"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Terms of Use
            </Link>
            <Link
              to="/help"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Help & Safety
            </Link>
            <Link
              to="/donations"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Donations
            </Link>
            <Link
              to="/help"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;