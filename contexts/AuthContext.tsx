import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  spreadsheetId: string | null;
  isProfileComplete: boolean;
  login: (name: string) => void;
  completeProfile: (name: string, sheetId: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// USER REQUESTED HARDCODED LEDGER ID
const TARGET_SHEET_ID = '16ADJZBC80b4hF_TBqZP_4pCmBYVeMwtFNWLx59-Wyds';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('mise_mock_token'));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('mise_user_email'));
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('mise_user_name'));
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => 
    localStorage.getItem('mise_sheet_id') || TARGET_SHEET_ID
  );
  
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(() => {
    return localStorage.getItem('mise_profile_complete') === 'true';
  });

  const login = (name: string) => {
    // Generate a persistent mock session token for the sandbox
    const mockToken = `mock_session_chef_${name.toLowerCase()}`;
    const mockEmail = `${name.toLowerCase().replace(/\s/g, '.')}@kitchen.local`;
    
    setAccessToken(mockToken);
    setUserEmail(mockEmail);
    // Updated: Accept name exactly as provided (e.g. "Bartender Maddie") without forcing "Chef"
    setUserName(name);
    setSpreadsheetId(TARGET_SHEET_ID);
    
    localStorage.setItem('mise_mock_token', mockToken);
    localStorage.setItem('mise_user_email', mockEmail);
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

  const logout = () => {
    setAccessToken(null);
    setUserEmail(null);
    setUserName(null);
    setSpreadsheetId(null);
    setIsProfileComplete(false);
    localStorage.clear();
  };

  const isAuthenticated = !!accessToken;

  return (
    <AuthContext.Provider value={{ 
      accessToken, 
      userEmail, 
      userName, 
      spreadsheetId,
      isProfileComplete, 
      login, 
      completeProfile,
      logout, 
      isAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};