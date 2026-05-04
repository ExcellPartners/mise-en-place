import { GoogleGenAI, Type, Schema } from "@google/genai";

export async function scrapeWithGemini(url: string) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Missing API_KEY in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      prepTime: { type: Type.INTEGER, description: "Prep time in minutes" },
      cookTime: { type: Type.INTEGER, description: "Cook time in minutes" },
      baseServings: { type: Type.INTEGER },
      category: { type: Type.STRING },
      difficulty: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
      chefTip: { type: Type.STRING },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            unit: { type: Type.STRING }
          },
          required: ["name"]
        }
      },
      instructions: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["title", "ingredients", "instructions"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Search for the recipe specifically at this URL: ${url}. 
    
    Extract the full details including title, ingredients, and instructions.
    
    Formatting Rules:
    1. Ingredient names should be Title Case.
    2. Normalize units to standard abbreviations (tsp, tbsp, cup, oz, lb, g, kg) where possible.
    3. If prep/cook times are missing, estimate them based on the instructions.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No data returned from Gemini");
  }

  return JSON.parse(text);
}