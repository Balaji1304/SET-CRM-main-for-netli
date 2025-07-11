import { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from '../services/apiConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Initial user and token check
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setToken(null);
      }
    }
    if (storedToken) {
        setToken(storedToken);
    }

    // If there's a token but no user object, or vice-versa, consider it a logout state
    if ((storedToken && !storedUser) || (!storedToken && storedUser)) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
    }
    setLoading(false);
  }, []);

  // Listen for storage events (logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout' || (e.key === 'user' && !e.newValue) || (e.key === 'token' && !e.newValue)) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } else if (e.key === 'user' && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue));
        } catch (error) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } else if (e.key === 'token' && e.newValue) {
        setToken(e.newValue);
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
        let errorMessage = 'Login failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        localStorage.setItem('lastActivity', Date.now());
        setUser(data.user);
        setToken(data.token);
        return true;
      } else {
        throw new Error(data.message || 'Login failed');
      }
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
    setToken(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token,
      login,
      logout: handleLogout,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 