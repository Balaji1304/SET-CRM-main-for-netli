import { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from '../services/apiConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial user check
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Listen for storage events (logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout') {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check for session timeout
  useEffect(() => {
    const activityCheck = setInterval(() => {
      const lastActivityTime = parseInt(localStorage.getItem('lastActivity') || Date.now());
      const currentTime = Date.now();
      
      // Auto logout after 30 minutes of inactivity
      if (currentTime - lastActivityTime > 30 * 60 * 1000) {
        handleLogout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(activityCheck);
  }, []);

  // Update last activity timestamp on user interaction with throttling
  useEffect(() => {
    let timeout;
    let lastUpdate = Date.now();
    
    const updateActivity = () => {
      const now = Date.now();
      // Only update if it's been more than 1 minute since the last update
      if (now - lastUpdate > 60000) {
        localStorage.setItem('lastActivity', now);
        lastUpdate = now;
      } else if (!timeout) {
        // Schedule an update for later if none is scheduled
        timeout = setTimeout(() => {
          localStorage.setItem('lastActivity', Date.now());
          lastUpdate = Date.now();
          timeout = null;
        }, 60000);
      }
    };

    // Use passive event listeners for better performance
    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        localStorage.setItem('lastActivity', Date.now());
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    // Broadcast logout event to other tabs
    localStorage.setItem('logout', Date.now().toString());
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login,
      logout: handleLogout,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 