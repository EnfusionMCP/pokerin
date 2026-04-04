/** Auth store — JWT storage, decode, login/logout */

import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userId: number | null;
  characterId: number | null;
  characterName: string | null;
  portraitUrl: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;

  setToken: (token: string) => void;
  logout: () => void;
  init: () => void;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  characterId: null,
  characterName: null,
  portraitUrl: null,
  isAuthenticated: false,
  isAdmin: false,

  setToken: (token: string) => {
    const payload = decodeJwtPayload(token);
    if (!payload) return;

    const userId = Number(payload.sub);
    const characterId = payload.cid as number;
    const characterName = payload.name as string;
    const portraitUrl = `https://images.evetech.net/characters/${characterId}/portrait?size=128`;
    const isAdmin = !!payload.adm;

    localStorage.setItem('pokerin_token', token);

    set({
      token,
      userId,
      characterId,
      characterName,
      portraitUrl,
      isAuthenticated: true,
      isAdmin,
    });
  },

  logout: () => {
    localStorage.removeItem('pokerin_token');
    set({
      token: null,
      userId: null,
      characterId: null,
      characterName: null,
      portraitUrl: null,
      isAuthenticated: false,
      isAdmin: false,
    });
  },

  init: () => {
    const token = localStorage.getItem('pokerin_token');
    if (!token) return;

    const payload = decodeJwtPayload(token);
    if (!payload) {
      localStorage.removeItem('pokerin_token');
      return;
    }

    // Check expiry
    const exp = payload.exp as number;
    if (exp && exp * 1000 < Date.now()) {
      localStorage.removeItem('pokerin_token');
      return;
    }

    const userId = Number(payload.sub);
    const characterId = payload.cid as number;
    const characterName = payload.name as string;

    set({
      token,
      userId,
      characterId,
      characterName,
      portraitUrl: `https://images.evetech.net/characters/${characterId}/portrait?size=128`,
      isAuthenticated: true,
      isAdmin: !!payload.adm,
    });
  },
}));
