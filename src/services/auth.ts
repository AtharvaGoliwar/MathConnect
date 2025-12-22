import { User } from '../types';
import { db } from './db';

const COOKIE_NAME = 'tuition_connect_session';

// Safely resolve the API URL
const getApiUrl = () => {
  const processEnv = (window as any).process?.env;
  const envUrl = processEnv?.REACT_APP_API_URL || processEnv?.VITE_API_URL || processEnv?.API_URL;
  
  if (envUrl && envUrl !== 'undefined') {
    return envUrl;
  }
  
  if (typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiUrl();

export const authService = {
  setSession: (userId: string) => {
    // 7 Days
    const d = new Date();
    d.setTime(d.getTime() + (7 * 24 * 60 * 60 * 1000));
    const expires = "expires="+ d.toUTCString();
    document.cookie = `${COOKIE_NAME}=${userId};${expires};path=/;SameSite=Strict`;
  },

  getSession: (): string | null => {
    const name = COOKIE_NAME + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  },

  clearSession: () => {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  },

  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (res.ok) {
        const user = await res.json();
        authService.setSession(user.id);
        return user;
      }
      return null;
    } catch (error) {
      console.error("Login Error:", error);
      return null;
    }
  },

  logout: () => {
    authService.clearSession();
  },

  getCurrentUser: async (): Promise<User | null> => {
    const userId = authService.getSession();
    if (!userId) return null;
    
    // Validate session against DB
    return await db.users.findOne({ id: userId });
  }
};