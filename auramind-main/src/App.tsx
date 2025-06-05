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
import { ThemeProvider } from './components/ThemeProvider';

function App() {
  return (
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
      </div>
    </ThemeProvider>
  );
}

export default App;