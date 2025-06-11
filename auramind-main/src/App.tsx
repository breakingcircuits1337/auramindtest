import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import UserStories from './components/UserStories';
import Technology from './components/Technology';
import Roadmap from './components/Roadmap';
import Pricing from './components/Pricing';
import Challenges from './components/Challenges';
import CTA from './components/CTA';
import Footer from './components/Footer';
import AIAssistant from './components/AIAssistant';
import ReminderSystem from './components/ReminderNotification';
import { ThemeProvider } from './components/ThemeProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { ENV_CONFIG } from './lib/env';

function App() {
  // Log environment warnings in development
  if (import.meta.env.DEV && ENV_CONFIG.warnings.length > 0) {
    console.warn('App initialized with environment warnings:', ENV_CONFIG.warnings);
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="font-sans dark:bg-gray-900">
          <Navbar />
          <Hero />
          <Features />
          <UserStories />
          <Technology />
          <Roadmap />
          <Pricing />
          <Challenges />
          <CTA />
          <Footer />
          <AIAssistant />
          <ReminderSystem />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;