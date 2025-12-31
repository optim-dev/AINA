// Language-specific prompt templates for LLM
export type Language = "ca" | "es" | "en"

export const languageInstructions = {
  ca: "IDIOMA DE LA RESPOSTA: Català (SEMPRE en català).",
  es: "IDIOMA DE LA RESPUESTA: Español (SIEMPRE en español).",
  en: "RESPONSE LANGUAGE: English (ALWAYS in English).",
};

export const getLanguageInstruction = (language: Language): string => {
  return languageInstructions[language] || languageInstructions.ca;
};

export const responseLanguageNote = {
  ca: "Respon SEMPRE en català.",
  es: "Responde SIEMPRE en español.",
  en: "Always respond in English.",
};

export const getResponseLanguageNote = (language: Language): string => {
  return responseLanguageNote[language] || responseLanguageNote.ca;
};
