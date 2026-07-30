import { GoogleGenAI } from '@google/genai';

export async function generateGeminiContent(
  ai: GoogleGenAI,
  params: {
    model?: string;
    contents: any;
    config?: any;
  },
  maxRetries = 2
) {
  const preferredModel = params.model || 'gemini-3.6-flash';
  
  // List of fallback models to try if 503/UNAVAILABLE or rate limited
  const modelsToTry = [
    preferredModel,
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-pro-preview'
  ].filter((v, i, a) => a.indexOf(v) === i); // unique

  let lastError: any = null;

  for (const modelToTry of modelsToTry) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model: modelToTry,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err || '');
        const isUnavailable = errStr.includes('503') || 
                            errStr.includes('UNAVAILABLE') || 
                            errStr.includes('high demand') || 
                            errStr.includes('RESOURCE_EXHAUSTED') || 
                            errStr.includes('429');
        
        if (isUnavailable) {
          console.warn(`[Gemini Helper] Model ${modelToTry} attempt ${attempt + 1} failed (503/UNAVAILABLE).`);
          if (attempt < maxRetries - 1) {
            // Wait briefly before retrying same model
            await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
            continue;
          }
          // Switch to next model in the fallback array
          break;
        }

        // For non-transient errors, throw immediately
        throw err;
      }
    }
  }

  throw lastError;
}
