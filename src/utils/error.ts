export function parseGeminiError(error: any): string {
  if (!error) return "Unknown error occurred";
  
  let message = typeof error === 'string' ? error : error.message || "Unknown error";
  
  try {
    // Check if the message is a JSON string (common with Gemini SDK)
    if (message.includes('{') && message.includes('}')) {
      const jsonStart = message.indexOf('{');
      const jsonEnd = message.lastIndexOf('}') + 1;
      const jsonStr = message.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.error?.message) {
        message = parsed.error.message;
      } else if (parsed.message) {
        message = parsed.message;
      }
    }
  } catch (e) {
    // If parsing fails, keep the original message
  }

  // Further clean up the message
  // Remove long URLs and technical details
  message = message.replace(/For more information on this error, head to: https:\/\/ai\.google\.dev\/gemini-api\/docs\/rate-limits\./g, '');
  message = message.replace(/To monitor your current usage, head to: https:\/\/ai\.dev\/rate-limit\./g, '');
  message = message.replace(/\[.*?\]/g, ''); // Remove bracketed info
  
  // Handle common status codes/messages
  if (message.includes("RESOURCE_EXHAUSTED")) {
    return "Quota exceeded. Please check your plan and billing details.";
  }
  if (message.includes("API_KEY_INVALID")) {
    return "Invalid API Key. Please check the key and try again.";
  }
  if (message.includes("PERMISSION_DENIED")) {
    return "Permission denied. Your API key might not have access to this model.";
  }

  return message.trim() || "An error occurred with the API key.";
}
