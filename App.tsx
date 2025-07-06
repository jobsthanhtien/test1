
import React, { useState, useEffect } from 'react';
import { User, Role } from './types';
import LoginPage from './pages/LoginPage';
import MainApp from './pages/MainApp';
import * as dataService from './services/dataService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for a logged-in user in session storage on initial load
    const storedUser = sessionStorage.getItem('cnc_current_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (username: string, password: string):boolean => {
    const users = dataService.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      // In a real app, you wouldn't store the password in the session.
      const userToStore = { ...user };
      delete userToStore.password;
      
      setCurrentUser(userToStore);
      sessionStorage.setItem('cnc_current_user', JSON.stringify(userToStore));
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('cnc_current_user');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-xl text-text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {currentUser ? (
        <MainApp user={currentUser} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;
