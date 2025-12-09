import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertCircle,
  Brain,
  RefreshCw,
  Activity,
  Zap,
  Shield
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface OptimalTime {
  hour: string;
  action: string;
  reason: string;
}

interface Prediction {
  trend: "bullish" | "bearish" | "neutral";
  confidence: number;
  pricePredict: {
    current: number;
    predicted: number;
    timeframe: string;
  };
  optimalTimes: OptimalTime[];
  recommendation: {
    action: string;
    amount: number;
    reasoning: string;
  };
  riskLevel: "low" | "medium" | "high";
  insights: string[];
  patterns: string[];
}

interface TradingPredictionsProps {
  transactions: any[];
  currentBalance: number;
  isConnected: boolean;
}

export function TradingPredictions({ 
  transactions, 
  currentBalance, 
  isConnected 
}: TradingPredictionsProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrediction = async () => {
    if (!isConnected || transactions.length === 0) {
      toast({
        title: "Insufficient Data",
        description: "Connect wallet and complete trades to get AI predictions",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predict-trading-price', {
        body: { 
          transactions: transactions.slice(0, 20), // Last 20 transactions
          currentBalance,
          timeframe: '24h'
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setPrediction(data.prediction);
      setLastUpdated(new Date());
      
      toast({
        title: "AI Analysis Complete",
        description: "Trading predictions updated successfully",
      });
    } catch (error: any) {
      console.error('Prediction error:', error);
      toast({
        title: "Prediction Failed",
        description: error.message || "Failed to generate predictions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && transactions.length > 0 && !prediction) {
      fetchPrediction();
    }
  }, [isConnected, transactions.length]);

  const getTrendIcon = () => {
    if (!prediction) return <Activity className="h-5 w-5" />;
    switch (prediction.trend) {
      case "bullish": return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "bearish": return <TrendingDown className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "text-green-500 border-green-500";
      case "medium": return "text-yellow-500 border-yellow-500";
      case "high": return "text-red-500 border-red-500";
      default: return "text-gray-500 border-gray-500";
    }
  };

  const priceChartData = prediction ? [
    { time: 'Now', price: prediction.pricePredict.current },
    { time: prediction.pricePredict.timeframe, price: prediction.pricePredict.predicted },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>AI Trading Intelligence</CardTitle>
                <CardDescription>
                  Blockchain-powered predictions and insights
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={fetchPrediction} 
              disabled={loading || !isConnected}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analyzing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        {lastUpdated && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </CardContent>
        )}
      </Card>

      {!isConnected && (
        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-muted-foreground">
                Connect your wallet and complete trades to unlock AI predictions
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {prediction && (
        <>
          {/* Trend & Price Prediction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getTrendIcon()}
                  Market Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Prediction</span>
                      <Badge variant="outline" className="capitalize">
                        {prediction.trend}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Confidence</span>
                      <span className="text-sm font-semibold">{prediction.confidence}%</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={priceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={['dataMin - 0.01', 'dataMax + 0.01']} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke={prediction.trend === "bullish" ? "#10b981" : "#ef4444"}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Current</p>
                      <p className="font-semibold">${prediction.pricePredict.current.toFixed(3)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Predicted</p>
                      <p className="font-semibold">${prediction.pricePredict.predicted.toFixed(3)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AI Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Action</span>
                      <Badge className="uppercase">{prediction.recommendation.action}</Badge>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Amount</span>
                      <span className="font-semibold">{prediction.recommendation.amount} kWh</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {prediction.recommendation.reasoning}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Risk Level</span>
                      <Badge variant="outline" className={getRiskColor(prediction.riskLevel)}>
                        {prediction.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Optimal Times */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Optimal Trading Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {prediction.optimalTimes.map((time, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">{time.hour}</span>
                      <Badge variant="outline" className="capitalize">
                        {time.action}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{time.reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insights & Patterns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {prediction.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detected Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {prediction.patterns.map((pattern, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Activity className="h-4 w-4 text-primary mt-0.5" />
                      <span>{pattern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
