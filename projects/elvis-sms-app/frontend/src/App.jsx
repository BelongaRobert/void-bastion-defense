import React, { useState, useEffect } from 'react'
import Chat from './pages/chat';
import Campaign from './pages/campaign';

function App() {
  // load initial value from localStorage
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('activeView') || 'chat'
  });
  const DARK_MODE_KEY = "sms_chat_dark_mode";

  const [darkMode, setDarkMode] = useState(false);

  // save whenever tab changes
  useEffect(() => {
    localStorage.setItem('activeView', activeView)
  }, [activeView])

  const openChatView = () => setActiveView('chat');
  const openCampaignsView = () => setActiveView('campaigns');

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem(DARK_MODE_KEY);
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === "true");
    }
  }, []);

  // Initialize dark mode from localStorage
  useEffect(() => {
    console.log(localStorage.getItem(DARK_MODE_KEY));
    // Check for dark mode preference
    const isDark = localStorage.getItem(DARK_MODE_KEY) === 'true' ||
      (!localStorage.getItem(DARK_MODE_KEY) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    console.log(isDark);
    // Apply dark class to html element
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, darkMode.toString());
  }, [darkMode]);
  

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {activeView === 'chat' ? (
        <Chat
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onOpenCampaigns={openCampaignsView}
        />
      ) : (
        <Campaign
          darkMode={darkMode}
          onBackToChat={openChatView}
        />
      )}
    </div>
  )
}

export default App