import { GoogleGenAI, Type } from "@google/genai";
import { Vendor, UserType } from "../types";

// Lazy initialization to prevent crash on load if env is missing
const getAI = () => {
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
      console.warn("Gemini API Key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

// Function to generate realistic initial vendor data if the app is empty
export const generateMockVendors = async (locationName: string): Promise<Vendor[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a list of 6 realistic small local businesses or freelancers specifically in Campo Largo, Paraná, Brazil. 
      The location MUST be Campo Largo/PR.
      
      CRITICAL: You MUST provide realistic 'latitude' and 'longitude' coordinates for each business that are actually within Campo Largo (approx lat: -25.45 to -25.47, lng: -49.51 to -49.54).
      
      Include a mix of categories like 'Restaurante', 'Encanador', 'Salão de Beleza', 'Informática'.
      Return the data in Portuguese (Brazil).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              categories: { type: Type.ARRAY, items: { type: Type.STRING } },
              address: { type: Type.STRING },
              phone: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewCount: { type: Type.INTEGER },
              latitude: { type: Type.NUMBER },
              longitude: { type: Type.NUMBER }
            },
            required: ["name", "description", "categories", "address", "phone", "rating", "reviewCount", "latitude", "longitude"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    
    // Enrich with IDs and Placeholders
    return data.map((item: any, index: number) => ({
      ...item,
      id: `gen_${Date.now()}_${index}`,
      document: "00.000.000/0001-00", // Mock
      photoUrl: `https://picsum.photos/seed/${index + 500}/400/300`, // Changed seed for variety
      reviews: [],
      website: "https://example.com",
      type: UserType.VENDOR
    }));

  } catch (error) {
    console.error("Failed to generate vendors", error);
    return [];
  }
};

// Function to interpret natural language search queries
export const interpretSearchQuery = async (query: string): Promise<{ category?: string, keywords: string[] }> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the user search query: "${query}". 
      Return the most likely category from this list: [Restaurante, Mecânica, Salão de Beleza, Encanador, Eletricista, Padaria, Informática, Limpeza, Jardinagem, Costura, Aulas Particulares, Saúde].
      Also extract key search terms.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, nullable: true },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    return JSON.parse(response.text || '{"keywords": []}');
  } catch (error) {
    console.error("Failed to interpret search", error);
    return { keywords: [query] };
  }
};