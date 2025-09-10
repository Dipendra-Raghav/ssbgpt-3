// OCR functionality removed - we now send images directly to OpenAI
export const useOCR = () => {
  return {
    extractTextFromImage: async () => { throw new Error('OCR disabled'); },
    extractTextFromImageUrl: async () => { throw new Error('OCR disabled'); },
    isProcessing: false,
    error: null
  };
};