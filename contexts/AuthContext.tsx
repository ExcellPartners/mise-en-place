import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  spreadsheetId: string | null;
  isProfileComplete: boolean;
  isAuthenticated: boolean;
  login: (name: string) => void;
  completeProfile: (name: string, sheetId: string) => void;
  updateName: (name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TARGET_SHEET_ID = '16ADJZBC80b4hF_TBqZP_4pCmBYVeMwtFNWLx59-Wyds';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Read real Google access token first, fall back to mock token only if present
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('mise_access_token') || localStorage.getItem('mise_mock_token');
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('mise_user_email'));
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('mise_user_name'));
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() =>
    localStorage.getItem('mise_sheet_id') || TARGET_SHEET_ID
  );
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(() =>
    localStorage.getItem('mise_profile_complete') === 'true'
  );

  // Called after Google OAuth — name and token already stored by Login.tsx
  const login = (name: string) => {
    const token = localStorage.getItem('mise_access_token') || localStorage.getItem('mise_mock_token');
    const email = localStorage.getItem('mise_user_email') || '';
    setAccessToken(token);
    setUserEmail(email);
    setUserName(name);
    setSpreadsheetId(TARGET_SHEET_ID);
    localStorage.setItem('mise_user_name', name);
    localStorage.setItem('mise_sheet_id', TARGET_SHEET_ID);
    localStorage.setItem('mise_profile_complete', 'true');
    setIsProfileComplete(true);
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
    setAccessToken(null);
    setUserEmail(null);
    setUserName(null);
    setSpreadsheetId(null);
    setIsProfileComplete(false);
    // Clear auth tokens but keep user preferences
    localStorage.removeItem('mise_access_token');
    localStorage.removeItem('mise_mock_token');
    localStorage.removeItem('mise_user_email');
    localStorage.removeItem('mise_profile_complete');
  };

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
