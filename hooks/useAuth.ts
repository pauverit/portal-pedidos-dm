import { useState } from 'react';
import { User } from '../types';

export function useAuth() {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = sessionStorage.getItem('dm_portal_current_user');
        return saved ? JSON.parse(saved) : null;
    });

    const login = (user: User) => {
        setCurrentUser(user);
        sessionStorage.setItem('dm_portal_current_user', JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('dm_portal_current_user');
    };

    const updateCurrentUser = (updates: Partial<User>) => {
        setCurrentUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...updates };
            sessionStorage.setItem('dm_portal_current_user', JSON.stringify(updated));
            return updated;
        });
    };

    return {
        currentUser,
        setCurrentUser,
        login,
        logout,
        updateCurrentUser
    };
}
