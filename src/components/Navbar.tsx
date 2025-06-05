import React, { useState, useEffect } from 'react';
import { Brain, Menu, X, Sun, Moon, LogIn } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { supabase } from '../lib/supabase';

const navLinks = [
  { name: 'Features', href: '#features' },
  { name: 'User Stories', href: '#user-stories' },
  { name: 'Technology', href: '#technology' },
  { name: 'Roadmap', href: '#roadmap' },
  { name: 'Pricing', href: '#pricing' },
];

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      setShowLoginModal(false);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm py-3' 
          : 'bg-transparent py-5'
      }`}>
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
          <a href="#" className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-xl">
            <Brain size={28} />
            <span>AuraMind</span>
          </a>
          
          <div className="hidden md:flex items-center gap-8">
            <div className="flex space-x-8">
              {navLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href}
                  className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-gray-300" />
              ) : (
                <Moon size={20} className="text-gray-700" />
              )}
            </button>
            <button 
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-5 py-2 rounded-md font-medium transition-colors"
            >
              <LogIn size={18} />
              Sign In
            </button>
          </div>
          
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-gray-300" />
              ) : (
                <Moon size={20} className="text-gray-700" />
              )}
            </button>
            <button 
              className="text-gray-700 dark:text-gray-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-gray-900 shadow-md">
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              {navLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href}
                  className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium py-2 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <button 
                onClick={() => {
                  setShowLoginModal(true);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-5 py-2 rounded-md font-medium transition-colors"
              >
                <LogIn size={18} />
                Sign In
              </button>
            </div>
          </div>
        )}
      </nav>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sign In</h2>
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;