import { User, Role, Assignment } from '../types';

// In production, REACT_APP_API_URL will be set. Locally it falls back to localhost.
const API_BASE_URL = process.env.REACT_APP_API_URL 

export const db = {
  // Initialization is now handled by the server connection
  init: () => {},

  users: {
    findOne: async (query: { email?: string; id?: string }): Promise<User | null> => {
      try {
        const params = new URLSearchParams();
        if (query.email) params.append('email', query.email);
        if (query.id) params.append('id', query.id);
        
        const res = await fetch(`${API_BASE_URL}/users?${params.toString()}`);
        if (!res.ok) return null;
        
        const users = await res.json();
        return users.length > 0 ? users[0] : null;
      } catch (error) {
        console.error("DB Error:", error);
        return null;
      }
    },
    findAll: async (role?: Role): Promise<User[]> => {
      try {
        const url = role ? `${API_BASE_URL}/users?role=${role}` : `${API_BASE_URL}/users`;
        const res = await fetch(url);
        return await res.json();
      } catch (error) {
        console.error("DB Error:", error);
        return [];
      }
    },
    create: async (user: Partial<User>): Promise<User | null> => {
      try {
        const res = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
        return await res.json();
      } catch (error) {
        console.error("DB Create Error:", error);
        return null;
      }
    },
    update: async (id: string, updates: Partial<User>): Promise<User | null> => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        return await res.json();
      } catch (error) {
         console.error("DB Update Error:", error);
         return null;
      }
    },
    delete: async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${id}`, {
          method: 'DELETE'
        });
        return res.ok;
      } catch (error) {
        console.error("DB Delete Error:", error);
        return false;
      }
    }
  },

  assignments: {
    find: async (query?: { assignedTo?: string }): Promise<Assignment[]> => {
      try {
        const url = query?.assignedTo 
          ? `${API_BASE_URL}/assignments?assignedTo=${query.assignedTo}` 
          : `${API_BASE_URL}/assignments`;
          
        const res = await fetch(url);
        return await res.json();
      } catch (error) {
        console.error("DB Error:", error);
        return [];
      }
    },
    
    insertOne: async (assignment: Assignment): Promise<Assignment> => {
      const res = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment),
      });
      return await res.json();
    },

    updateOne: async (id: string, update: Partial<Assignment>): Promise<Assignment | null> => {
      const res = await fetch(`${API_BASE_URL}/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!res.ok) return null;
      return await res.json();
    },

    delete: async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE_URL}/assignments/${id}`, {
          method: 'DELETE'
        });
        return res.ok;
      } catch (error) {
        console.error("DB Delete Error:", error);
        return false;
      }
    }
  }
};