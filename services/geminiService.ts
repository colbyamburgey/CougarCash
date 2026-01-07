import { GoogleGenAI, Type } from "@google/genai";
import { StoreItem, CalendarEvent } from "../types";

export const generateStoreItems = async (theme: string): Promise<StoreItem[]> => {
  // Always use process.env.API_KEY directly as per guidelines
  const apiKey = process.env.API_KEY;
  if (!apiKey) return [];

  // Create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 creative high school store items based on the theme: ${theme}. 
      Crucially, include at least 2 "Voucher" items for local businesses (e.g., Pizza places, Coffee shops, Movie theaters).
      Include a mix of physical items, privileges (like front of line), and these vouchers.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              cost: { type: Type.NUMBER },
              category: { type: Type.STRING }
            },
            required: ["name", "description", "cost", "category"]
          }
        }
      }
    });

    const rawItems = JSON.parse(response.text || "[]");
    
    // Enrich with IDs and placeholder images
    return rawItems.map((item: any, index: number) => ({
      ...item,
      id: `gen-${Date.now()}-${index}`,
      image: `https://picsum.photos/seed/${item.name.replace(/\s/g, '')}/300/300`
    }));
  } catch (error) {
    console.error("Failed to generate store items:", error);
    return [];
  }
};

export const suggestCalendarEvents = async (month: string): Promise<CalendarEvent[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3 fun "Spirit Week" or special school days for the month of ${month}. These should be days where attendance points might be doubled. Return specific dates for the current year.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "YYYY-MM-DD format" },
              title: { type: Type.STRING },
              bonusPoints: { type: Type.NUMBER, description: "Suggest a bonus amount between 5 and 20" }
            },
            required: ["date", "title", "bonusPoints"]
          }
        }
      }
    });

    const rawEvents = JSON.parse(response.text || "[]");
    return rawEvents.map((evt: any) => ({
      ...evt,
      eventType: 'special',
      pointMultiplier: 1
    }));
  } catch (error) {
    console.error("Failed to generate events:", error);
    return [];
  }
};