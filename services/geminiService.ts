import { GoogleGenAI } from "@google/genai";

// Ensure API key is available
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const generateContent = async (
  model: string,
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  maxTokens: number = 4000
) => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: temperature,
        maxOutputTokens: maxTokens,
      },
    });
    
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(`Gemini API failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generatePrediction = async (dataSummary: string) => {
    const prompt = `Based on this medical supply data summary, predict the next month's potential volume trend and identify one category likely to surge. Keep it very brief (max 50 words). Data: ${dataSummary}`;
    return generateContent("gemini-3-flash-preview", prompt, "You are a predictive analytics engine.", 0.2, 200);
}

export const generateInsight = async (dataSummary: string) => {
     const prompt = `Give me one "Wow" insight about this dataset that isn't immediately obvious. Focus on supplier concentration or unusual category pairings. Max 1 sentence. Data: ${dataSummary}`;
     return generateContent("gemini-3-flash-preview", prompt, "You are an insightful data scientist.", 0.7, 100);
}
