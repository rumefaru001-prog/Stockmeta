import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { getUpcomingEvents } from "../utils/events";
import { GenerationSettings, ImageMetadata } from "../types";
import { compressImage } from "../utils/image";
import { getFallbackKeywords } from "../utils/topKeywords";

export async function generateImagePrompt(
  file: File,
  apiKey: string,
  includeWhiteBackground: boolean
): Promise<string> {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set your Gemini API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const processedImage = await compressImage(file, 500, 500, 0.7);

  const promptParts = [
    "Analyze this image and generate a highly detailed, descriptive text prompt that can be used to recreate this image using an AI image generator (like Midjourney, DALL-E, or Stable Diffusion).",
    "CRITICAL INSTRUCTIONS:",
    "1. The prompt MUST be extremely detailed (at least 150-200 words), covering the subject, lighting, camera angle, colors, mood, style, and background in vivid detail.",
    "2. Describe textures, materials, and fine details (e.g., 'pores on skin', 'intricate embroidery', 'soft bokeh', 'dramatic chiaroscuro lighting').",
    "3. Make the prompt completely unique to avoid 'Similar Content' rejections on microstock sites.",
    "4. Ensure the prompt describes a high-quality, flawless image to avoid 'Quality Issue' rejections (e.g., mention 'sharp focus', 'high resolution', 'masterpiece', 'perfect composition', '8k resolution', 'highly detailed').",
    "5. Do NOT include any trademarked names, logos, or text in the prompt.",
    "6. Return ONLY the prompt text, nothing else."
  ];

  if (includeWhiteBackground) {
    promptParts.push("6. CRITICAL: You MUST include the phrase 'isolated on a pure white background' in the prompt, and ensure the description reflects a studio setting with a white background.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: processedImage.base64,
            mimeType: "image/jpeg",
          },
        },
        { text: promptParts.join("\n") },
      ],
    },
  });

  return response.text || "";
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  // Sanitize the key: trim whitespace and remove any non-printable characters
  const sanitizedKey = apiKey.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  
  if (!sanitizedKey || sanitizedKey.length < 10) {
    throw new Error("Invalid API Key format. Gemini API keys usually start with 'AIza'.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: sanitizedKey });
    
    // Use a timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Test request timed out. Please check your internet connection or try again.")), 20000);
    });

    const apiPromise = ai.models.generateContent({
      model: "gemini-3-flash-preview", // Use a valid model from the guidelines
      contents: "hi",
      config: { maxOutputTokens: 5 }
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    if (!response || !response.text) {
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error("API Key test failed:", error);
    
    // Check for specific header error
    if (error.message?.includes("ISO-8859-1")) {
      throw new Error("API Key contains invalid characters. Please make sure you copied it correctly without spaces or special characters.");
    }
    
    // Re-throw the error so the UI can catch it and show the message
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Gemini API Quota Exceeded. Please check your API key billing or wait for the quota to reset. If you are using a free key, consider upgrading to a paid plan.');
    }
    throw error;
  }
}

export interface PromptOptions {
  category: string;
  type: string;
  timeframe?: string;
  promptLength: number | 'Auto';
  numPrompts: number;
  style: string;
  lighting: string;
  additionalDirection: string;
  aiModel: string;
  whiteBackground: boolean;
}

export interface PromptResult {
  prompt: string;
}

export interface MediaItem {
  type: string;
  file: File;
  frames?: File[];
}

export async function generatePrompt(
  items: MediaItem[],
  options: PromptOptions,
  apiKey: string,
  modelName: string = "gemini-3-flash-preview"
): Promise<PromptResult[]> {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set your Gemini API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const lengthInstruction = options.promptLength === 'Auto' 
    ? "Let the AI decide the optimal length for the best quality." 
    : `The prompt length should be approximately ${options.promptLength} characters.`;

  const modelInstruction = options.aiModel === 'General'
    ? "Generate prompts that are versatile and work well with any modern AI image generator (Midjourney, DALL-E, Flux, Stable Diffusion)."
    : `Target AI Model: ${options.aiModel}`;

  let researchInstruction = "";

  if (options.category === 'Trending & Upcoming Events (Auto)' && options.timeframe) {
    const upcomingEvents = getUpcomingEvents(options.timeframe);
    
    if (upcomingEvents.length > 0) {
      const eventList = upcomingEvents.map(e => e.name).join(', ');
      researchInstruction = `
CRITICAL TRENDING & RESEARCH REQUIREMENT:
The user wants prompts for events happening in ${options.timeframe}. 
Potential events for this period: ${eventList}.

STEP 1: INTERNAL KNOWLEDGE RESEARCH (MANDATORY)
Rely on your deep internal knowledge of microstock trends (Shutterstock, Adobe Stock, Getty Images) for these specific events and the upcoming season. 
Consider:
- Popular color palettes for the season.
- High-demand subjects and concepts.
- Modern visual styles (e.g., "minimalist organic", "vibrant maximalism", "authentic lifestyle").
- Specific technical requirements for microstock (e.g., copy space, high resolution, unbranded).

STEP 2: PROMPT DISTRIBUTION
You MUST distribute the ${options.numPrompts} requested prompts across the most important upcoming events.
- If there are 10 events and 5 prompts requested, pick the top 5 most commercially viable events and generate 1 prompt for each.
- If 20 prompts are requested for 10 events, generate exactly 2 unique prompts for each event.
- Ensure each prompt is distinct and covers a different aspect of the event (e.g., for 'Ramadan', one could be 'family dinner', another 'spiritual reflection', another 'festive decorations').

STEP 3: GENERATION
Based on your internal research and the distribution plan, generate the prompts. Each prompt must be a MASTERPIECE level description (150-200 words) that is unique, commercially viable, and strictly unbranded.`;
    } else {
      researchInstruction = `
CRITICAL TRENDING & RESEARCH REQUIREMENT:
The user wants prompts for events happening ${options.timeframe} from now.

STEP 1: INTERNAL KNOWLEDGE RESEARCH (MANDATORY)
Identify major global holidays, cultural events, and retail seasons happening ${options.timeframe} from now using your internal knowledge. Analyze the visual trends for these events on microstock sites.

STEP 2: PROMPT DISTRIBUTION
Pick the top 5-10 most important events found and distribute the ${options.numPrompts} requested prompts across them evenly.

STEP 3: GENERATION
Generate highly detailed, professional, and microstock-ready prompts based on your internal research.`;
    }
  } else {
    researchInstruction = `
CRITICAL MICROSTOCK RESEARCH REQUIREMENT:
You MUST use your expert internal knowledge to analyze the latest visual trends, high-demand subjects, and technical requirements for the category: "${options.category}".

STEP 1: INTERNAL KNOWLEDGE RESEARCH (MANDATORY)
Analyze what is currently selling best on microstock platforms (Shutterstock, Adobe Stock, Getty Images) for this specific niche. Consider:
- Trending color schemes and lighting styles.
- Compositional techniques that buyers prefer (e.g., copy space, rule of thirds).
- Specific subjects or concepts that are currently "trending" or "in-demand".
- Technical keywords that signal high quality (e.g., "8k resolution", "sharp focus", "masterpiece").

STEP 2: GENERATION
Based on your analysis, generate ${options.numPrompts} highly detailed, unique, and commercially optimized prompts. Each prompt must be a MASTERPIECE level description (150-200 words) designed for professional microstock use.`;
  }

  const isVideo = options.type.toLowerCase().includes('video');

  const systemInstruction = `You are an expert AI ${isVideo ? 'video' : 'image'} prompt engineer specializing in high-converting microstock ${isVideo ? 'videography' : 'photography and digital art'}. Your task is to generate ${items.length > 0 ? items.length : options.numPrompts} highly detailed, unique, and optimized prompts.

CRITICAL REQUIREMENT: The generated prompts MUST strictly adhere to the selected Category and Media Type. They must be incredibly detailed, professional, and designed to yield MASTERPIECE quality results from AI generators.
${!isVideo ? 'CRITICAL AND MANDATORY: Since the requested Media Type is an IMAGE, you are STRICTLY FORBIDDEN from using any video-related terminology. DO NOT use words like "video", "footage", "motion", "camera movement", "drone video", "pan", "tilt", "tracking shot", or "cinematic video". Describe a completely STATIC, frozen, perfectly captured moment in time. Any mention of video or motion will result in immediate failure.' : 'CRITICAL AND MANDATORY: Since the requested Media Type is a VIDEO, you MUST include specific video terminology. Describe camera movement (e.g., pan, tilt, tracking shot, drone reveal), motion, and subject action.'}
${researchInstruction}

${items.length > 0 ? `CRITICAL: I have provided ${items.length} reference media items. You MUST generate exactly ${items.length} prompts.
For each item, provide a MASTERPIECE level prompt (at least 150-200 words) that describes:
1. The main subject in extreme detail (textures, materials, expressions).
2. The environment, background, and atmosphere.
3. Precise lighting conditions (e.g., volumetric lighting, cinematic shadows, soft bokeh).
4. Camera settings (e.g., 85mm lens, f/1.8, low angle, wide shot).
5. Color palette and mood.
6. Fine technical details (e.g., "highly detailed", "8k resolution", "sharp focus").
${isVideo ? '7. FOR VIDEO ITEMS: Describe motion, camera movement, and subject action in detail.' : ''}` : `CRITICAL: You MUST generate exactly ${options.numPrompts} distinct and highly varied prompts.
To ensure maximum variety and commercial value, each prompt MUST feature completely different:
- Artistic Styles (e.g., photorealistic, cinematic, 3D render, digital illustration, watercolor, cyberpunk, minimalist).
- Camera Angles & Perspectives (e.g., extreme close-up, ${isVideo ? 'drone view' : 'aerial view'}, low angle, wide shot, Dutch angle, macro).
- Emotional Tones & Moods (e.g., melancholic, vibrant & energetic, mysterious, serene, dramatic, nostalgic).
- Lighting Setups (e.g., golden hour, neon glow, harsh studio strobe, soft diffused morning light).`}

${modelInstruction}
Category/Niche: ${options.category} (CRITICAL: The prompt MUST heavily feature elements, subjects, and concepts from this specific category. If it's trending, include popular, high-demand elements.)
Media Type: ${options.type} (CRITICAL: The prompt MUST be written specifically for this media type. ${!isVideo ? 'Since this is an IMAGE, it MUST describe a static scene with NO motion or video terminology.' : 'Since this is a VIDEO, describe motion and camera movement.'})
Prompt Length: ${lengthInstruction}
Style: ${options.style === 'Auto' ? 'DIVERSE (Use completely different artistic styles for each prompt)' : options.style}
Lighting: ${options.lighting === 'Auto' ? 'DIVERSE (Use completely different lighting setups for each prompt)' : options.lighting}
White Background: ${options.whiteBackground ? 'YES (Isolated on a pure white background, studio lighting)' : 'No specific requirement'}
Additional Direction: ${options.additionalDirection || 'Come up with highly creative, unique, and commercially viable concepts automatically based on the selected category and style. Ensure maximum diversity across the generated prompts.'}

CRITICAL SAFETY, COPYRIGHT & BRANDING RULES (MANDATORY & UNBREAKABLE):
1. You MUST append this exact phrase to the end of EVERY single prompt: ", unbranded, completely blank without logos, no text, no watermarks, generic design, no brand names, no trademarks, no typography, no letters, no numbers".
2. If a reference image is provided and it contains logos, text, or brand names, you MUST completely ignore them. Replace them with generic terms (e.g., "generic unbranded smartphone", "blank coffee cup").
3. NEVER use ANY company names, brand names, or trademarked products in the prompt.
4. Explicitly describe items as "unbranded" or "blank" where a logo might typically appear (e.g., "a person wearing a blank unbranded t-shirt").
5. The generated image MUST NOT contain any written text, letters, words, or numbers.
6. DO NOT describe any UI elements, app icons, or specific software interfaces that might imply a brand.

MICROSTOCK OPTIMIZATION & QUALITY:
- Ensure each prompt is UNIQUE and distinct from the others to avoid "Similar Content" rejections.
- Focus on high-quality, commercially viable subjects that are in demand on sites like Shutterstock, Adobe Stock, and Getty Images.
- Describe flawless, high-resolution details: "sharp focus", "masterpiece", "perfect composition", "professional photography", "intricate details".
- Make the prompts extremely descriptive. Do not just say "a car", say "a sleek, futuristic sports car with glossy metallic paint, reflecting neon city lights".
${isVideo ? `- FOR VIDEO PROMPTS: Keep the details extremely concise but high quality and unique. Focus heavily on camera movement (e.g., pan, tilt, tracking shot, drone reveal), lighting changes, and subject action. Do not overcomplicate the scene, keep it cinematic and focused.
- VIDEO PROMPT STRUCTURE: Start with the main subject and action, then describe the environment, lighting, and finally the specific camera movement and lens details.
- MOTION & PHYSICS: Describe the motion clearly (e.g., "Slow motion 120fps", "Timelapse of clouds moving", "Water splashing in hyper-detail").
- FOR DRONE / FPV PROMPTS: You MUST describe the flight path in detail. For example, "flying through a narrow gap between two buildings", "diving down a waterfall", "low-altitude high-speed flyover of a desert", or "smooth cinematic orbit around a mountain peak". Describe the speed, altitude, and environmental interaction (e.g., "dust kicking up", "water splashing", "reflections on the lens"). Ensure the scene is NOT empty; include relevant subjects like hikers, cars, wildlife, or architectural details to provide scale and interest. CRITICAL: Ensure the drone's own propellers, frame, or any part of the drone itself are NOT visible in the shot. The footage must be of professional microstock quality, clean, and artifact-free.` : ''}
- ALL PROMPTS MUST explicitly ensure the result has NO watermarks, NO logos, NO text, and NO company branding. Ensure extreme microstock quality details are present in every description, including textures, lighting, and technical specifications.

CRITICAL UNIQUENESS REQUIREMENT:
- EVERY single prompt MUST be completely unique, highly original, and distinct from any previously generated prompts.
- Do not use generic templates. Inject unique details, specific color palettes, distinct camera angles, and rare atmospheric conditions into every prompt.
- To ensure absolute randomness and uniqueness, incorporate this unique seed into your creative process: ${Date.now()}-${Math.random().toString(36).substring(7)}

Output the prompts as a JSON array of objects. Each object MUST have the following structure:
{
  "prompt": "The full, detailed AI image/video generation prompt"
}
`;

  const contents: any = {
    parts: []
  };

  if (items && items.length > 0) {
    for (const item of items) {
      if (item.type === 'video' && item.frames && item.frames.length > 0) {
        contents.parts.push({ text: `--- Video Item (Multiple Frames) ---` });
        for (const frame of item.frames) {
          const processedFrame = await compressImage(frame, 1024, 1024, 0.8);
          contents.parts.push({
            inlineData: {
              data: processedFrame.base64,
              mimeType: processedFrame.mimeType,
            },
          });
        }
      } else {
        const processedImage = await compressImage(item.file, 1024, 1024, 0.8);
        contents.parts.push({
          inlineData: {
            data: processedImage.base64,
            mimeType: processedImage.mimeType,
          },
        });
      }
    }
    contents.parts.push({ text: `Analyze these ${items.length} media items and generate exactly ${items.length} structured prompt objects.` });
  } else {
    contents.parts.push({ text: "Generate structured prompt objects based on the instructions." });
  }

  let retries = 3;
  let delay = 2000;
  let useTools = true;

  const isTrending = options.category === 'Trending & Upcoming Events (Auto)';
  const selectedModel = modelName;

  while (retries > 0) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out after 180 seconds")), 180000);
      });

      const config: any = {
        systemInstruction,
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              prompt: { type: Type.STRING }
            },
            required: ["prompt"]
          }
        }
      };

      if (selectedModel === 'gemini-3.1-pro-preview') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const apiPromise = ai.models.generateContent({
        model: selectedModel,
        contents,
        config,
      });

      const response: any = await Promise.race([apiPromise, timeoutPromise]);
      let text = response.text?.trim() || "";
      if (!text) throw new Error("Empty response from model");
      
      // Strip markdown code blocks if present
      if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0].trim();
      } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0].trim();
      }
      
      // Try to find a JSON array in the text if it's not already a clean JSON
      if (!text.startsWith("[") || !text.endsWith("]")) {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          text = match[0];
        }
      }
      
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map(item => {
            if (typeof item === 'string') return { prompt: item };
            if (item && typeof item === 'object') {
              if (item.prompt) return item;
              // If it's an object but missing 'prompt', try to find the first string value
              const firstStringKey = Object.keys(item).find(key => typeof item[key] === 'string');
              if (firstStringKey) return { prompt: item[firstStringKey] };
            }
            return { prompt: JSON.stringify(item) };
          });
        }
        if (parsed && typeof parsed === 'object') {
          if (parsed.prompt) return [parsed];
          const firstStringKey = Object.keys(parsed).find(key => typeof parsed[key] === 'string');
          if (firstStringKey) return [{ prompt: parsed[firstStringKey] }];
        }
        return [{ prompt: String(parsed) }];
      } catch (e) {
        console.error("Failed to parse JSON from response:", text);
        if (isTrending && useTools) {
          useTools = false; // Retry without tools if JSON parsing fails in tool mode
          continue;
        }
        throw new Error("Invalid JSON format in model response");
      }
    } catch (error: any) {
      console.error(`Error with key ${apiKey.substring(0, 5)}... model ${modelName} (Retries left: ${retries - 1}):`, error);
      const errMsg = (error.message || "").toLowerCase();

      // If tool call fails specifically, retry without tools
      if (isTrending && useTools && (errMsg.includes("tool") || errMsg.includes("search") || errMsg.includes("403") || errMsg.includes("permission"))) {
        useTools = false;
        continue;
      }

      if (errMsg.includes("503") || errMsg.includes("overloaded") || errMsg.includes("fetch failed") || errMsg.includes("network") || errMsg.includes("timed out") || errMsg.includes("json") || errMsg.includes("unexpected token")) {
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
      }

      // Propagate 429s and other errors up to the caller so it can handle rotation
      throw error;
    }
  }

  throw new Error("Failed to generate prompts after retries.");
}

export async function generateSpeech(text: string, apiKeyOverride?: string): Promise<string> {
  const apiKey = apiKeyOverride;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set your Gemini API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this prompt clearly: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO" as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received.");
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error: any) {
    console.error("Error generating speech:", error);
    throw new Error(error.message || "Failed to generate speech.");
  }
}

export interface MediaItem {
  type: string;
  file: File;
  frames?: File[];
}

export async function generateMetadata(
  items: MediaItem[],
  settings: GenerationSettings,
  modelName: string = "gemini-3-flash-preview"
): Promise<ImageMetadata[]> {
  const apiKey = settings.apiKey;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please set your Gemini API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = modelName;

  const isBatch = items.length > 1;

  const processedItems = await Promise.all(
    items.map(async (item) => {
      if (item.type === 'video' && item.frames && item.frames.length > 0) {
        const processedFrames = await Promise.all(
          item.frames.map(f => compressImage(f, 300, 300, 0.6))
        );
        return { type: 'video', frames: processedFrames };
      } else {
        const processedImage = await compressImage(item.file, 300, 300, 0.6);
        return { type: item.type, file: processedImage };
      }
    })
  );

  const promptParts = [];
  
  if (isBatch) {
    promptParts.push(
      `Analyze these ${items.length} media items and generate metadata for each one individually. Return an array of objects, where each object corresponds to an input item in the same order.`
    );
  } else {
    promptParts.push(
      `Analyze this media item and generate metadata for a stock photography/videography platform (${settings.platform.join(", ")}).`
    );
  }

  // Add festival instructions
  promptParts.push(
    `FESTIVAL KEYWORDS INSTRUCTION: When analyzing the items, if you detect any festival or cultural event (e.g., Eid, Christmas, Diwali, Halloween, etc.), you MUST include a rich set of keywords related to that specific festival to improve search performance and visibility.`
  );

  // Add video instructions
  const hasVideo = items.some(item => item.type === 'video');
  if (hasVideo) {
    promptParts.push(
      `VIDEO ANALYSIS INSTRUCTION: For video items, you are provided with two frames: one from the beginning and one from the middle of the video. You must analyze BOTH frames together to understand the full context, action, and progression of the video. Combine the insights from both frames to generate a comprehensive title and exactly ${settings.keywordsCount} highly relevant keywords.`
    );
  }

  if (settings.mediaTypeHint !== 'None / Auto-detect') {
    promptParts.push(`Hint: The media type is ${settings.mediaTypeHint}.`);
  }
  if (settings.customPrompt && settings.customPrompt.trim().length > 0) {
    promptParts.push(`CRITICAL ADDITIONAL CONTEXT: ${settings.customPrompt.trim()}. You MUST incorporate these specific details (like brand, model, price, location, or any other provided info) accurately into the title, description, and keywords where appropriate.`);
  }

  const properties: Record<string, any> = {};
  const required: string[] = [];

  promptParts.push(
    `- Title: A highly descriptive, commercial, and SEO-friendly title that perfectly matches the image. CRITICAL LENGTH REQUIREMENT: You MUST generate a title whose length is AT LEAST ${Math.max(10, settings.titleLength - 15)} characters and EXACTLY or NO MORE THAN ${settings.titleLength} characters. If the requested length is large, you MUST write a very long, verbose title describing every minor detail, background element, colors, style, texture, and atmospheric effect to fill the character quota. Do NOT generate a short title if a long length is requested. Focus on the main subject, action, setting, and mood. Use strong, searchable words. CRITICAL: You MUST NOT use any trailing punctuation or exclamation marks (!).`
  );
  if (settings.transparentBackground) {
    promptParts.push(`  - CRITICAL: You MUST include the exact phrase "transparent background" in the title. Do NOT use phrases like "white background", "black background", "isolated on white", or any other background color mentions.`);
  }
  
  promptParts.push(`CRITICAL ACCURACY REQUIREMENT: Do NOT hallucinate or blindly guess. Do NOT invent details, objects, text, or concepts not clearly visible in the media. Ensure 100% precise accuracy.`);
  
  properties.title = {
    type: Type.STRING,
    description: `A highly descriptive, commercial, and SEO-friendly title exactly between ${Math.max(10, settings.titleLength - 15)} and ${settings.titleLength} characters long. Accurate to image. NEVER use exclamation marks.`,
  };
  required.push("title");

  promptParts.push(
    `- Keywords: A comma-separated list of exactly ${settings.keywordsCount} highly relevant, professional-grade, and highconverting keywords optimized for microstock search engines.
    - TOP 10 DEEP RESEARCH RANKING (CRITICAL): The first 10 keywords MUST be the absolute most important, high search-volume, and deeply-researched terms that describe the core subject, action, primary objects, and commercial concept of the media. These top 10 keywords are used for ranking the media at the very top of microstock platforms (like Shutterstock, Adobe Stock, iStock, Getty Images). Ensure they are highly descriptive and premium quality.
    - KEYWORD MIXED STRATEGY (CRITICAL):
      * If Single Word Keywords is disabled (${!settings.singleWordKeywords}): You MUST generate a highly optimized mix of single words and double-word phrases (e.g., "coffee cup", "young woman", "vibrant color", "summer breeze"). This mixed structure drastically boosts ranking on modern search engines by matching both generic and long-tail buyer queries.
      * If Single Word Keywords is enabled (${settings.singleWordKeywords}): Ensure EVERY single keyword is exactly one word. No double-word phrases allowed.
    - CRITICAL RELEVANCE: Keywords must 100% accurately reflect what is visible in the media. Do not write generic or irrelevant tags.
    - CRITICAL FORMATTING: Each keyword/phrase must be separated by a comma. Do not use hyphens (-) or other symbols; use soft spaces if a keyword phrase consists of multiple words (no more than 3 words per phrase). Ensure there are absolutely NO duplicate keywords or redundant variations. MUST output EXACTLY ${settings.keywordsCount} comma-separated items.`
  );
  if (settings.singleWordKeywords) {
    promptParts.push(`  - IMPORTANT RESTRICTION: The user has selected Single Word Keywords. All generated keywords MUST be strictly single words. No multi-word phrases.`);
  }
  properties.keywords = {
    type: Type.STRING,
    description: `A comma-separated string containing EXACTLY ${settings.keywordsCount} highly relevant tags for the media. Do NOT output a single tag more or less than exactly ${settings.keywordsCount} items. ${
      settings.singleWordKeywords 
        ? "Each tag must be strictly one single word without spaces." 
        : "A mix of single words and multi-word phrases (each phrase max 3 words)."
    }`,
  };
  required.push("keywords");

  const defaultNegativeKeywords = "Apple, Nike, Disney, Marvel, Coca-Cola, Pepsi, Google, Instagram, Facebook, Twitter, TikTok, Porsche, Ferrari, BMW, Audi, Mercedes, Lego, Sony, Nintendo, Xbox, PlayStation, Mickey Mouse, Star Wars, Harry Potter, Batman, Superman, Spider-Man, Avengers, Pokemon, watermark, signature, logo, copyright, trademark, text, words, letters, brand name, specific company names";
  const allNegativeKeywords = settings.negativeKeywords && settings.negativeKeywords.trim().length > 0
    ? `${defaultNegativeKeywords}, ${settings.negativeKeywords}`
    : defaultNegativeKeywords;

  promptParts.push(
    `CRITICAL NEGATIVE KEYWORDS: You MUST NOT use any of the following words or any trademarked company names in the title, description, or keywords: ${allNegativeKeywords}`
  );

  if (settings.descriptionLength > 0) {
    promptParts.push(
      `- Description: A highly detailed description of the media content. CRITICAL LENGTH REQUIREMENT: You MUST generate a description whose length in characters is strictly between ${Math.max(10, settings.descriptionLength - 20)} and ${settings.descriptionLength + 20} characters. If the requested length is large (${settings.descriptionLength} characters), you MUST write a long, expansive description detailing lighting, textures, background, and mood. DO NOT use exclamation marks or excessive punctuation.`
    );
    properties.description = {
      type: Type.STRING,
      description: `A highly descriptive, human-grade paragraph detailing the media. Character length MUST be strictly between ${Math.max(10, settings.descriptionLength - 20)} and ${settings.descriptionLength + 20} characters. NEVER use exclamation marks (!).`,
    };
    required.push("description");
  }

  if (settings.platform.includes('shutterstock') || settings.platform.includes('general')) {
    const categories = [
      "Abstract", "Animals/Wildlife", "Arts", "Backgrounds/Textures", "Beauty/Fashion",
      "Buildings/Landmarks", "Business/Finance", "Celebrities", "Education", "Food and drink",
      "Healthcare/Medical", "Holidays", "Industrial", "Interiors", "Miscellaneous",
      "Nature", "Objects", "Parks/Outdoor", "People", "Religion", "Science",
      "Signs/Symbols", "Sports/Recreation", "Technology", "Transportation", "Vintage"
    ];
    promptParts.push(
      `- Category: Select the single most appropriate category for this media from the following list: ${categories.join(', ')}.`
    );
    properties.category = {
      type: Type.STRING,
      description: "The most appropriate category from the provided list.",
    };
    required.push("category");
  }

  let response;
  let retries = 3;
  let delay = 2000;

  const parts: any[] = [];
  
  processedItems.forEach((item, index) => {
    if (isBatch) {
      parts.push({ text: `--- Item ${index + 1} (${item.type}) ---` });
    }
    
    if (item.type === 'video' && item.frames) {
      parts.push({ text: `Frame 1 (Beginning of video):` });
      parts.push({
        inlineData: {
          data: item.frames[0].base64,
          mimeType: item.frames[0].mimeType,
        },
      });
      if (item.frames.length > 1) {
        parts.push({ text: `Frame 2 (Middle of video):` });
        parts.push({
          inlineData: {
            data: item.frames[1].base64,
            mimeType: item.frames[1].mimeType,
          },
        });
      }
    } else if (item.file) {
      parts.push({
        inlineData: {
          data: item.file.base64,
          mimeType: item.file.mimeType,
        },
      });
    }
  });
  
  parts.push({
    text: promptParts.join("\n"),
  });

  const responseSchema = isBatch ? {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties,
      required: required.length > 0 ? required : undefined,
    }
  } : {
    type: Type.OBJECT,
    properties,
    required: required.length > 0 ? required : undefined,
  };

  while (retries > 0) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out after 180 seconds")), 180000);
      });

      const apiPromise = ai.models.generateContent({
        model,
        contents: {
          parts,
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema as any,
        },
      });

      response = await Promise.race([apiPromise, timeoutPromise]);
      break;
    } catch (e: any) {
      console.error(`Gemini API Error (Retries left: ${retries - 1}):`, e);
      const errMsg = (e.message || "").toLowerCase();
      
      if (errMsg.includes("503") || errMsg.includes("overloaded") || errMsg.includes("experiencing") || errMsg.includes("fetch failed") || errMsg.includes("network") || errMsg.includes("timed out")) {
        retries--;
        if (retries === 0) {
          throw new Error("Network or server error after multiple retries. Please try again.");
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; 
      } else {
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("exhausted") || errMsg.includes("rate limit") || errMsg.includes("too many requests")) {
          throw new Error(`Rate limit or quota exhausted: ${e.message}`);
        }
        if (errMsg.includes("403") || errMsg.includes("api_key_invalid") || errMsg.includes("permission") || errMsg.includes("not found")) {
          throw new Error(`API key is invalid or lacks permission: ${e.message}`);
        }
        if (errMsg.includes("400")) {
          throw new Error(`Bad request. The image might be unsupported or too large: ${e.message}`);
        }
        throw new Error(e.message || "An unexpected error occurred during generation.");
      }
    }
  }

  if (!response) {
    throw new Error("Failed to generate metadata.");
  }
  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  try {
    const rawParsed = JSON.parse(text);
    const results = isBatch ? (Array.isArray(rawParsed) ? rawParsed : [rawParsed]) : [rawParsed];
    
    return results.map((parsed: ImageMetadata) => {
      if (parsed.keywords) {
        let rawKeywords = parsed.keywords.split(',').map(k => k.replace(/-/g, ' ').trim()).filter(k => k.length > 0);
        let processedKeywords: string[] = [];
        
        for (const kw of rawKeywords) {
          const words = kw.split(' ').filter(w => w.length > 0);
          if (settings.singleWordKeywords) {
            processedKeywords.push(...words);
          } else if (words.length > 3) {
            // If a keyword phrase is too long, it's likely a sentence or un-comma'd list. Split it.
            processedKeywords.push(...words);
          } else {
            processedKeywords.push(kw);
          }
        }
        
        let keywordsArray = [...new Set(processedKeywords)].filter(k => k.length > 0);
        const limit = settings.keywordsCount || 50;
        
        if (keywordsArray.length < limit) {
          const needed = limit - keywordsArray.length;
          const fallback = getFallbackKeywords(needed, keywordsArray, settings.singleWordKeywords);
          keywordsArray = [...keywordsArray, ...fallback];
        }
        
        if (keywordsArray.length > limit) {
          keywordsArray = keywordsArray.slice(0, limit);
        }
        
        parsed.keywords = keywordsArray.join(', ');
      }
      return parsed;
    });
  } catch (e) {
    console.error("Failed to parse JSON response:", text);
    throw new Error("Failed to parse metadata from Gemini");
  }
}
