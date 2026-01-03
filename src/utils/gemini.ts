// src/utils/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiLimiter } from './rateLimiter';
import { FEATURE_FLAGS } from './featureFlags';
import { logTokenEstimate, logUsage } from './tokenLogging';

export const GEMINI_OCR_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
];

// Vi definierar vad vi förväntar oss att få tillbaka
interface AIResult {
  text: string;
  description: string;
  tags: string[];
}

export const performOCR = async (
  imageBase64: string,
  apiKey: string,
  modelId: string = GEMINI_OCR_MODELS[0]
): Promise<AIResult> => {
  if (!apiKey) throw new Error("Ingen API-nyckel inställd");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const chosenModel = GEMINI_OCR_MODELS.includes(modelId) ? modelId : GEMINI_OCR_MODELS[0];
    const model = genAI.getGenerativeModel({
      model: chosenModel,
      generationConfig: { responseMimeType: "application/json" }
    });

    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const prompt = `
    Analysera denna bild noggrant. Gör följande tre saker:

    1. **Transkribera (OCR):** Läs av all text i bilden exakt. Om det är handstil, gör ditt bästa.
    
    2. **Beskriv (Bildanalys):**
       - Om bilden i princip bara är text på mestadels vitt papper (t.ex. anteckningslapp eller utskrift):
         **lämna "visualDescription" tom ("")**.
       - Om du hittar läsbar text (och bilden inte är nästan bara vit textyta): skriv en kort visuell beskrivning (1-2 meningar).
       - Om du INTE hittar text: skriv en utförlig beskrivning (3-6 meningar).
       - Fokusera på medium, layout, miljö och visuella detaljer.

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

    logTokenEstimate('gemini ocr', [{ label: 'prompt', text: prompt }]);
    if (FEATURE_FLAGS.logChatPayload) {
      console.groupCollapsed(`[OCR][prompt] gemini ${chosenModel}`);
      console.log(prompt.trim());
      console.groupEnd();
    }

    // Use rate limiter to prevent API overload
    const text = await geminiLimiter.enqueue(async () => {
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
      ]);

      const response = await result.response;
      logUsage('gemini ocr', (response as { usageMetadata?: unknown }).usageMetadata);
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
