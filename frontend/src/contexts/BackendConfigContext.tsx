import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BackendConfig {
  apiUrl: string;
  timeout: number;
  retryAttempts: number;
}

interface BackendConfigContextType {
  config: BackendConfig;
  updateConfig: (newConfig: Partial<BackendConfig>) => void;
  resetToDefaults: () => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
}

const DEFAULT_CONFIG: BackendConfig = {
  apiUrl: 'http://localhost:8000',
  timeout: 5000,
  retryAttempts: 3,
};

const BackendConfigContext = createContext<BackendConfigContextType | undefined>(undefined);

export const BackendConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<BackendConfig>(() => {
    const saved = localStorage.getItem('backend-config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    localStorage.setItem('backend-config', JSON.stringify(config));
  }, [config]);

  const updateConfig = (newConfig: Partial<BackendConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('backend-config');
  };

  return (
    <BackendConfigContext.Provider value={{ config, updateConfig, resetToDefaults, isConnected, setIsConnected }}>
      {children}
    </BackendConfigContext.Provider>
  );
};

export const useBackendConfig = () => {
  const context = useContext(BackendConfigContext);
  if (!context) {
    throw new Error('useBackendConfig must be used within BackendConfigProvider');
  }
  return context;
};
