import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBackendConfig } from '@/contexts/BackendConfigContext';
import { Brain, TreeDeciduous, Network, Cpu, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ModelStatus {
  rf: { loaded: boolean; description: string };
  lstm: { loaded: boolean; description: string };
  cnn: { loaded: boolean; description: string };
  backendConnected: boolean;
}

export function MLModelStatus() {
  const { config } = useBackendConfig();
  const [status, setStatus] = useState<ModelStatus>({
    rf: { loaded: false, description: 'RandomForest - Load Flow Prediction' },
    lstm: { loaded: false, description: 'LSTM - Sequential Load Forecasting' },
    cnn: { loaded: false, description: 'CNN - Fault Detection from Waveforms' },
    backendConnected: false,
  });
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkModelStatus = async () => {
    setChecking(true);
    try {
      // Check backend connection first
      const statusRes = await fetch(`${config.apiUrl}/status`, {
        signal: AbortSignal.timeout(config.timeout),
      });
      
      if (!statusRes.ok) throw new Error('Backend not responding');
      
      const statusData = await statusRes.json();
      
      // Check RF model by trying a prediction
      let rfLoaded = false;
      try {
        const rfRes = await fetch(`${config.apiUrl}/api/ai/load-flow-predict/model`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'rf',
            features: {
              total_solar: 5,
              hour: 12,
              lag_1: 5,
              lag_2: 5,
              lag_3: 5,
              lag_24: 5,
              lag_48: 5,
            },
          }),
          signal: AbortSignal.timeout(config.timeout),
        });
        const rfData = await rfRes.json();
        rfLoaded = !rfData.error && rfData.prediction !== undefined;
      } catch {
        rfLoaded = false;
      }

      // Check LSTM model
      let lstmLoaded = false;
      try {
        const lstmRes = await fetch(`${config.apiUrl}/api/ai/load-flow-predict/model`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'lstm',
            seq: Array(24).fill(5),
          }),
          signal: AbortSignal.timeout(config.timeout),
        });
        const lstmData = await lstmRes.json();
        lstmLoaded = !lstmData.error && lstmData.prediction !== undefined;
      } catch {
        lstmLoaded = false;
      }

      // Check CNN model by getting nanogrid status with fault data
      let cnnLoaded = false;
      try {
        const nanogridsRes = await fetch(`${config.apiUrl}/nanogrids`, {
          signal: AbortSignal.timeout(config.timeout),
        });
        const nanogridsData = await nanogridsRes.json();
        // CNN is loaded if any nanogrid has fault detection data
        cnnLoaded = Object.values(nanogridsData).some(
          (ng: any) => ng.last_fault !== null
        );
        // If no fault data yet, try direct fault prediction
        if (!cnnLoaded) {
          const faultRes = await fetch(`${config.apiUrl}/api/ai/fault-predict/model`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              waveform: Array(6).fill(Array(400).fill(0)),
            }),
            signal: AbortSignal.timeout(config.timeout),
          });
          const faultData = await faultRes.json();
          cnnLoaded = !faultData.error && faultData.predicted_class !== undefined;
        }
      } catch {
        cnnLoaded = false;
      }

      setStatus({
        rf: { loaded: rfLoaded, description: 'RandomForest - Load Flow Prediction' },
        lstm: { loaded: lstmLoaded, description: 'LSTM - Sequential Load Forecasting' },
        cnn: { loaded: cnnLoaded, description: 'CNN - Fault Detection from Waveforms' },
        backendConnected: true,
      });
      setLastCheck(new Date());
    } catch (error) {
      setStatus({
        rf: { loaded: false, description: 'RandomForest - Load Flow Prediction' },
        lstm: { loaded: false, description: 'LSTM - Sequential Load Forecasting' },
        cnn: { loaded: false, description: 'CNN - Fault Detection from Waveforms' },
        backendConnected: false,
      });
      setLastCheck(new Date());
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkModelStatus();
    const interval = setInterval(checkModelStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [config.apiUrl]);

  const getStatusIcon = (loaded: boolean) => {
    return loaded ? (
      <CheckCircle2 className="h-4 w-4 text-energy-generation" />
    ) : (
      <AlertCircle className="h-4 w-4 text-muted-foreground" />
    );
  };

  const getStatusBadge = (loaded: boolean) => {
    return loaded ? (
      <Badge variant="default" className="bg-energy-generation/20 text-energy-generation border-energy-generation/30">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-muted text-muted-foreground">
        Inactive
      </Badge>
    );
  };

  const activeModels = [status.rf.loaded, status.lstm.loaded, status.cnn.loaded].filter(Boolean).length;

  return (
    <Card className="bg-gradient-card border-2 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            ML Model Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={status.backendConnected ? "default" : "destructive"}
              className={status.backendConnected 
                ? "bg-energy-generation/20 text-energy-generation border-energy-generation/30" 
                : ""}
            >
              {status.backendConnected ? 'Backend Connected' : 'Backend Offline'}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={checkModelStatus}
                    disabled={checking}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh model status</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {activeModels}/3 models active
          {lastCheck && (
            <span className="ml-2">
              · Last checked: {lastCheck.toLocaleTimeString()}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* RandomForest Model */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TreeDeciduous className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">RandomForest (RF)</p>
              <p className="text-xs text-muted-foreground">Load Flow Prediction</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(status.rf.loaded)}
            {getStatusBadge(status.rf.loaded)}
          </div>
        </div>

        {/* LSTM Model */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-energy-trading/10">
              <Network className="h-5 w-5 text-energy-trading" />
            </div>
            <div>
              <p className="font-medium text-sm">LSTM Network</p>
              <p className="text-xs text-muted-foreground">Sequential Load Forecasting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(status.lstm.loaded)}
            {getStatusBadge(status.lstm.loaded)}
          </div>
        </div>

        {/* CNN Model */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Cpu className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-sm">Conv1D CNN</p>
              <p className="text-xs text-muted-foreground">Fault Detection from Waveforms</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(status.cnn.loaded)}
            {getStatusBadge(status.cnn.loaded)}
          </div>
        </div>

        {!status.backendConnected && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive">
              ML backend is offline. Start the backend server at <code className="bg-destructive/20 px-1 rounded">{config.apiUrl}</code> to enable ML predictions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
