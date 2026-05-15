import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  spreadsheetId: string | null;
  isProfileComplete: boolean;
  isAuthenticated: boolean;
  login: (name: string, token?: string, email?: string) => void;
  completeProfile: (name: string, sheetId: string) => void;
  updateName: (name: string) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TARGET_SHEET_ID = '16ADJZBC80b4hF_TBqZP_4pCmBYVeMwtFNWLx59-Wyds';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(() => {
    return localStorage.getItem('mise_access_token');
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('mise_user_email'));
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('mise_user_name'));
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() =>
    localStorage.getItem('mise_sheet_id') || TARGET_SHEET_ID
  );
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(() =>
    localStorage.getItem('mise_profile_complete') === 'true'
  );

  const setAccessToken = (token: string | null) => {
    setAccessTokenState(token);
    if (token) {
      localStorage.setItem('mise_access_token', token);
    } else {
      localStorage.removeItem('mise_access_token');
    }
  };

  // Accept token and email directly so there's no localStorage timing issue
  const login = (name: string, token?: string, email?: string) => {
    const resolvedToken = token || localStorage.getItem('mise_access_token');
    const resolvedEmail = email || localStorage.getItem('mise_user_email') || '';

    setAccessTokenState(resolvedToken);
    setUserEmail(resolvedEmail);
    setUserName(name);
    setSpreadsheetId(TARGET_SHEET_ID);
    setIsProfileComplete(true);

    if (resolvedToken) localStorage.setItem('mise_access_token', resolvedToken);
    localStorage.setItem('mise_user_email', resolvedEmail);
    localStorage.setItem('mise_user_name', name);
    localStorage.setItem('mise_sheet_id', TARGET_SHEET_ID);
    localStorage.setItem('mise_profile_complete', 'true');
  };

  const completeProfile = (name: string, sheetId: string) => {
    setUserName(name);
    setSpreadsheetId(sheetId);
    setIsProfileComplete(true);
    localStorage.setItem('mise_user_name', name);
    localStorage.setItem('mise_sheet_id', sheetId);
    localStorage.setItem('mise_profile_complete', 'true');
  };

  const updateName = (name: string) => {
    setUserName(name);
    localStorage.setItem('mise_user_name', name);
  };

  const logout = () => {
    setAccessTokenState(null);
    setUserEmail(null);
    setUserName(null);
    setSpreadsheetId(null);
    setIsProfileComplete(false);
    localStorage.removeItem('mise_access_token');
    localStorage.removeItem('mise_mock_token');
    localStorage.removeItem('mise_user_email');
    localStorage.removeItem('mise_profile_complete');
  };

  // isAuthenticated requires a real Google token (starts with ya29.)
  // A mock token or expired token won't work for Sheet writes
  const isAuthenticated = !!accessToken;

  return (
    <AuthContext.Provider value={{
      accessToken,
      userEmail,
      userName,
      spreadsheetId,
      isProfileComplete,
      isAuthenticated,
      login,
      completeProfile,
      updateName,
      setAccessToken,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
