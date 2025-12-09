import { useState, useCallback } from 'react';
import { useBackendConfig } from '@/contexts/BackendConfigContext';

interface MLLoadPrediction {
  method: 'rf' | 'lstm';
  prediction: number;
  error?: string;
}

interface MLFaultPrediction {
  predicted_class: string;
  probabilities: number[];
  error?: string;
}

interface MLFeatures {
  total_solar: number;
  hour: number;
  lag_1: number;
  lag_2: number;
  lag_3: number;
  lag_24: number;
  lag_48: number;
}

export function useMLPredictions() {
  const { config } = useBackendConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Predict load using RandomForest model
  const predictLoadRF = useCallback(async (features: MLFeatures): Promise<MLLoadPrediction | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${config.apiUrl}/api/ai/load-flow-predict/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'rf', features }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return null;
      }
      return data as MLLoadPrediction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get RF prediction';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [config.apiUrl]);

  // Predict load using LSTM model
  const predictLoadLSTM = useCallback(async (sequence: number[]): Promise<MLLoadPrediction | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${config.apiUrl}/api/ai/load-flow-predict/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'lstm', seq: sequence }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return null;
      }
      return data as MLLoadPrediction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get LSTM prediction';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [config.apiUrl]);

  // Predict fault from waveform data
  const predictFault = useCallback(async (waveform: number[][] | number[]): Promise<MLFaultPrediction | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${config.apiUrl}/api/ai/fault-predict/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waveform }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return null;
      }
      return data as MLFaultPrediction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get fault prediction';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [config.apiUrl]);

  // Get nanogrid status with predictions from backend
  const getNanogridPredictions = useCallback(async () => {
    try {
      const response = await fetch(`${config.apiUrl}/nanogrids`);
      return await response.json();
    } catch {
      return null;
    }
  }, [config.apiUrl]);

  return {
    predictLoadRF,
    predictLoadLSTM,
    predictFault,
    getNanogridPredictions,
    loading,
    error,
  };
}
