import React, { createContext, useState, useContext, useEffect } from 'react';
import ApiService from '../utils/ApiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true); // Başlangıçta loading true
  const [error, setError] = useState(null);

  // Sayfa yüklendiğinde localStorage'dan kullanıcı bilgilerini yükle
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedIsLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (savedUser && savedIsLoggedIn === 'true') {
      try {
        setUser(JSON.parse(savedUser));
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.login(username, password);
      
      if (response.success) {
        setUser(response.user);
        setIsLoggedIn(true);
        // localStorage'a kullanıcı bilgilerini kaydet
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('isLoggedIn', 'true');
        return true;
      } else {
        setError(response.message || 'Giriş başarısız');
        return false;
      }
    } catch (err) {
      setError('Giriş sırasında bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setError(null);
    // localStorage'dan kullanıcı bilgilerini temizle
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
  };

  const value = {
    user,
    isLoggedIn,
    loading,
    error,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};