// src/utils/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiLimiter } from './rateLimiter';

// Vi definierar vad vi förväntar oss att få tillbaka
interface AIResult {
  text: string;
  description: string;
  tags: string[];
}

export const performOCR = async (imageBase64: string, apiKey: string): Promise<AIResult> => {
  if (!apiKey) throw new Error("Ingen API-nyckel inställd");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Vi använder 2.0 Flash som är snabb och bra på JSON
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" } 
    });

    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const prompt = `
    Analysera denna bild noggrant. Gör följande tre saker:

    1. **Transkribera (OCR):** Läs av all text i bilden exakt. Om det är handstil, gör ditt bästa.
    
    2. **Beskriv (Bildanalys):** - Om bilden *endast* är text på vit/enfärgad bakgrund (som ett skannat dokument), lämna detta tomt.
       - MEN, om bilden innehåller annat (foton, ritningar, objekt, miljöer) eller är en specifik typ av fysisk anteckning (lapp på vägg, skrivbok på bord), beskriv själva bilden med 3-6 meningar. Beskriv stämning, motiv och sammanhang.

    3. **Tagga:** Generera 3-6 relevanta taggar på svenska.
       - Vad handlar texten/bilden om?
       - Vad är det för typ av medium? (t.ex. "post-it", "kvitto", "anteckningsblock", "whiteboard", "skiss").

    Svara med detta JSON-objekt:
    {
      "transcription": "...",
      "visualDescription": "...",
      "tags": ["tag1", "tag2"]
    }
    `;

    // Use rate limiter to prevent API overload
    const text = await geminiLimiter.enqueue(async () => {
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
      ]);

      const response = await result.response;
      return response.text();
    });
    
    // Parsa JSON-svaret
    const data = JSON.parse(text);

    return {
      text: data.transcription || "",
      description: data.visualDescription || "",
      tags: data.tags || []
    };
    
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      text: "Kunde inte analysera bilden. (Fel vid anrop till Gemini)",
      description: "",
      tags: ["fel"]
    };
  }
};