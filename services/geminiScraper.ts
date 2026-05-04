import { GoogleGenAI, Type } from "@google/genai";

export async function scrapeRecipe(url: string) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Missing API_KEY configuration. Ensure process.env.API_KEY is set.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Step 1: Search/Grounding to get raw text
  // Using Flash for speed on the retrieval step
  const searchResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Visit this URL: ${url}. 
    
    Extract the full text content of the recipe found there, including the Title, Ingredients list, and Instructions.
    Return the content as plain text.`,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  const rawText = searchResponse.text;
  if (!rawText) {
    throw new Error("Gemini could not extract text from the URL. The page might be blocked or empty.");
  }

  // Step 2: High-Precision Data Formatting
  // Using Pro for complex logic and to ensure it processes the full list without truncating
  const formatResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
    Based on this text: "${rawText}"
    
    GOAL: Extract the COMPLETE recipe into a database-ready JSON format.
    
    CRITICAL: You must extract ALL ingredients listed in the text. Do not stop after the first one.
    
    STRICT RULES FOR INGREDIENTS:
    1. DECIMAL QUANTITIES: All fractions (1/2, 1/4) MUST be converted to decimals (0.5, 0.25). Quantity must be a NUMBER.
    2. CORE NAME ONLY: The 'name' field must ONLY contain the food item. 
       - DELETE adjectives like "freshly ground", "minced", "chopped", "diced", "organic".
       - Example: "2 tbsp freshly ground black pepper" -> quantity: 2, unit: "tbsp", name: "Black Pepper".
    3. PREP FIELD: Move those deleted adjectives (chopped, minced, etc.) into a 'prep' field.
    4. NO OPTIONS: If an ingredient says "A or B", ONLY use Option A. Delete everything after "or".
    5. UNIT ISOLATION: Units like 'Cans', 'Cups', 'tbsp' must be in the 'unit' field.
    
    Schema Structure:
    { 
      "title": "string", 
      "ingredients": [
        {
          "quantity": number, 
          "unit": "string", 
          "name": "string", 
          "prep": "string",
          "notes": "string"
        }
      ], 
      "instructions": ["string"] 
    }
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          ingredients: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                name: { type: Type.STRING },
                prep: { type: Type.STRING },
                notes: { type: Type.STRING }
              },
              required: ["quantity", "unit", "name"]
            } 
          },
          instructions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        },
        required: ["title", "ingredients", "instructions"]
      }
    }
  });

  const jsonText = formatResponse.text;
  if (!jsonText) {
    throw new Error("Gemini failed to format the recipe data.");
  }

  return JSON.parse(jsonText);
}