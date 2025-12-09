import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, currentBalance, timeframe = '24h' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare transaction data for analysis
    const transactionSummary = transactions.map((tx: any) => ({
      amount: parseFloat(tx.amountInKwh || 0),
      timestamp: new Date(parseInt(tx.timestamp) * 1000).toISOString(),
      sender: tx.sender.slice(0, 10) + '...',
      receiver: tx.receiver.slice(0, 10) + '...'
    }));

    const systemPrompt = `You are an energy trading AI analyst specializing in peer-to-peer energy markets. 
Analyze blockchain transaction patterns to predict optimal trading times and price trends.
Provide actionable insights for prosumers to maximize their trading profits.`;

    const userPrompt = `Analyze the following blockchain energy trading data:

Current Balance: ${currentBalance} kWh
Timeframe: ${timeframe}
Recent Transactions: ${JSON.stringify(transactionSummary, null, 2)}

Provide:
1. Price trend prediction (bullish/bearish/neutral) with confidence percentage
2. Optimal trading times (specific hours with reasoning)
3. Recommended action (buy/sell/hold) with amount suggestions
4. Risk assessment and market insights
5. Key patterns identified in the transaction history

Format your response as JSON with these exact keys:
{
  "trend": "bullish|bearish|neutral",
  "confidence": 75,
  "pricePredict": { "current": 0.12, "predicted": 0.13, "timeframe": "24h" },
  "optimalTimes": [{ "hour": "14:00", "action": "sell", "reason": "..." }],
  "recommendation": { "action": "sell", "amount": 50, "reasoning": "..." },
  "riskLevel": "low|medium|high",
  "insights": ["insight1", "insight2", "insight3"],
  "patterns": ["pattern1", "pattern2"]
}`;

    console.log('Calling Lovable AI for price prediction...');

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required. Please add credits to your Lovable AI workspace." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const prediction = JSON.parse(aiData.choices[0].message.content);

    console.log('Price prediction generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        prediction,
        generatedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Error in predict-trading-price function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
