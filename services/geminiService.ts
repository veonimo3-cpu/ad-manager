
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { AdInputData, GeneratedAd, AdFormat, ResearchSource, COLOR_PALETTES } from "../types";

const getSystemInstruction = (useProMode: boolean) => `
  Act as a world-class Creative Director & Direct Response Copywriter.
  ${useProMode ? 'You are in PRO MODE. Be distinct, polarized, and psychologically penetrating.' : ''}
  
  GOAL: Generate 5 HIGH-CONVERTING ad scripts (Spanish) and 1 HIGHly SPECIFIC image prompt (English).

  *** CRITICAL SCRIPT RULES (HOOK & CTA) ***
  1. **THE HOOK MUST STOP THE SCROLL**:
     - It must be readable in **UNDER 3 SECONDS**.
     - Start with a shocking statement, a question that triggers FOMO, or a counter-intuitive fact.
     - **BAD:** "Descubre nuestro nuevo café que te ayuda a despertar." (Boring)
     - **GOOD:** "¿Sigues bebiendo agua sucia por la mañana?" (Provocative)
  
  2. **THE CTA MUST BE IMPERATIVE**:
     - Tell the user EXACTLY what to do. Do not be passive.
     - **BAD:** "Visita nuestra web si quieres."
     - **GOOD:** "Pide el tuyo antes de que se agote." or "Haz clic aquí."

  *** CRITICAL VISUAL STYLE RULES ***
  1. **NO GENERIC AI TROPES**: Do NOT use "glowing blue brains", "flying holograms", "abstract cyber tunnels", or "futuristic lab settings" UNLESS the product is literally high-tech software or sci-fi related.
  2. **REALISM FIRST**: If the product is coffee, the setting is a cozy kitchen or cafe. If it's a cleaning product, show a messy vs clean living room. Ground the visual in the USER'S REALITY.
  3. **TEXT IN IMAGE**: If the image contains text (signage, packaging, overlays), it MUST BE IN SPANISH. Describe the text explicitly in the prompt (e.g., "A sign that says 'OFERTA'").
  4. **ASPECT RATIO**: Respect the composition required by the format.

  *** ARCHETYPE VISUAL GUIDELINES (ADAPT TO PRODUCT NICHE) ***
  
  - "Us vs. Them" (COMPARISON): 
    * DO NOT DEFAULT TO "OLD TECH VS NEW TECH".
    * Focus on the *Result* or the *Vibe*. 
    * Left side (Them): Dull lighting, messy, stressful, gray filters. 
    * Right side (Us): Golden hour lighting, organized, relieved, saturated colors.
    * Example: If product is a pillow -> Left: Person tossing in gray bed. Right: Person sleeping peacefully in warm light.

  - "The Skeptic (UGC)": 
    * Style: Amateur "iPhone photo", flash photography, slightly imperfect framing. 
    * Visual: A real person holding the product close to the lens, looking unsure or surprised. 
    * Avoid "stock photo" perfect smiles.

  - "Aesthetic / ASMR": 
    * Style: Macro photography, depth of field (bokeh), sensory details (droplets, texture, steam). 
    * Minimalist background. Luxury vibes.

  - "The Ugly Ad": 
    * Style: Brutalist, MS Paint aesthetic, clashing bright colors, massive yellow/red text overlays. 
    * Looks like a meme or a shitpost. High CTR strategy.

  - "Founder Story": 
    * Style: Warm, cinematic documentary style. 
    * Visual: A person working in a garage/office/kitchen, authentic, "behind the scenes" look.

  *** FORMAT SPECIFICS ***
  - **CAROUSEL**: You MUST generate a prompt for a "CONTINUOUS PANORAMIC IMAGE" (16:9 ratio) that tells a story from left to right. It must not be 4 disconnected images. It is one wide scene sliced into 4.
`;

// Helper to prevent hanging requests
const withTimeout = <T>(promise: Promise<T>, ms: number = 30000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout: Request took too long")), ms)
    )
  ]);
};

// 1. Research Phase (Search Grounding)
async function researchProduct(data: AdInputData, apiKey: string): Promise<{ text: string; sources: ResearchSource[] }> {
  if (!data.useResearch) {
    return { text: "Research disabled by user. Relying on internal knowledge.", sources: [] };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Use standard Flash model for research with search tool
  const response = await withTimeout(ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Find current trends, competitor angles, and specific viral hooks for a product named "${data.productName}" targeting "${data.targetAudience}" with pain point "${data.painPoint}". Summarize key insights for a marketing campaign.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  })) as GenerateContentResponse;

  const sources: ResearchSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

  if (chunks) {
    chunks.forEach(chunk => {
      if (chunk.web) {
        sources.push({
          title: chunk.web.title || "Source",
          uri: chunk.web.uri || "#"
        });
      }
    });
  }

  return {
    text: response.text || "No research data available.",
    sources: sources
  };
}

// 2. Image Generation (Nanobanana)
export async function generateImage(prompt: string, apiKey: string, format: AdFormat): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  // Determine Aspect Ratio
  let aspectRatio = '1:1';
  if (format === AdFormat.LANDSCAPE) aspectRatio = '16:9';
  if (format === AdFormat.STORY) aspectRatio = '9:16';
  if (format === AdFormat.CAROUSEL) aspectRatio = '16:9'; // Generate wide pano for carousel slicing

  try {
     // Attempt high-quality generation first
     const imageResponse = await withTimeout(ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio as any,
        },
     })) as any;

     const base64ImageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
     if (base64ImageBytes) {
        return `data:image/png;base64,${base64ImageBytes}`;
     }
  } catch (e) {
     console.warn("Imagen 4.0 failed, falling back to Flash Image", e);
  }

  // Fallback to Flash Image if Imagen 4 fails
  const fallbackResponse = await withTimeout(ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { responseModalities: [Modality.IMAGE] },
  })) as GenerateContentResponse;
  
  const part = fallbackResponse.candidates?.[0]?.content?.parts?.[0];
  if (part?.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }

  throw new Error("Failed to generate image data.");
}

// 2.5 Image Editing / Enhancement (Flash Image - Image-to-Image)
export async function editProductImage(
  originalImageBase64: string, 
  prompt: string, 
  apiKey: string,
  format?: AdFormat,
  logoBase64?: string // New optional parameter for Logo
): Promise<string> {
  if (!originalImageBase64) throw new Error("No input image provided");
  const ai = new GoogleGenAI({ apiKey });

  // Clean base64 if it has header. Ensure we handle non-string inputs.
  const cleanBase64 = (str: string) => {
      if (typeof str !== 'string') return '';
      return str.includes('base64,') ? str.split('base64,')[1] : str;
  };

  const base64Data = cleanBase64(originalImageBase64);
  const logoData = logoBase64 ? cleanBase64(logoBase64) : null;

  // Validate base64 integrity basics
  if (base64Data.length < 100) throw new Error("Invalid image data (too short)");

  // Determine target format text
  let formatText = "Square (1:1)";
  if (format === AdFormat.STORY) formatText = "Vertical (9:16)";
  if (format === AdFormat.LANDSCAPE || format === AdFormat.CAROUSEL) formatText = "Horizontal (16:9)";

  // STRICT REVERSION PROMPT to prevent losing the product
  let enhancementPrompt = `
    CRITICAL INSTRUCTION: YOU ARE AN IMAGE EDITOR.
    Input Image 1: Contains a specific product.
    ${logoData ? 'Input Image 2: Contains a BRAND LOGO.' : ''}
    
    Task: Keep the EXACT product from Input Image 1. Isolate it. Composite it into a new background described as: "${prompt}".
    
    ${logoData ? 'SUB-TASK: You MUST PLACE the Logo (Input Image 2) clearly on the product packaging or as a watermark overlay in a corner. It must be visible.' : ''}

    - DO NOT redraw the product.
    - DO NOT change the product's shape, label, or details.
    - ONLY change the background and lighting environment.
    - Output Aspect Ratio: ${formatText}.
  `;

  // Prepare content parts
  const parts: any[] = [
    {
      inlineData: {
        data: base64Data,
        mimeType: 'image/png', 
      },
    }
  ];

  // If logo exists, add it as second image part
  if (logoData) {
      parts.push({
          inlineData: {
            data: logoData,
            mimeType: 'image/png',
          }
      });
  }

  // Add text prompt last
  parts.push({ text: enhancementPrompt });

  const response = await withTimeout(ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  })) as GenerateContentResponse;

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part?.inlineData?.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }

  throw new Error("Failed to generate variation (Model returned empty)");
}

// 3. Video Generation (Veo)
export const generateVideo = async (imageUrl: string, format: AdFormat): Promise<string> {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Clean base64 string (remove header)
  const base64Data = imageUrl.includes('base64,') ? imageUrl.split('base64,')[1] : imageUrl;

  // Map App Format to Veo Format (16:9 or 9:16 only)
  let veoAspectRatio = '9:16'; // Default for mobile
  if (format === AdFormat.LANDSCAPE) {
    veoAspectRatio = '16:9';
  } else if (format === AdFormat.SQUARE) {
    veoAspectRatio = '9:16'; // Fallback for square to vertical
  } else if (format === AdFormat.CAROUSEL) {
    veoAspectRatio = '16:9'; // Carousel usually uses wide source, but video might need 16:9
  }

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    image: {
      imageBytes: base64Data,
      mimeType: 'image/png', 
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p', // Fast preview
      aspectRatio: veoAspectRatio
    }
  });

  // Polling loop
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed.");

  // Fetch the actual video bytes using the key
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const videoBlob = await response.blob();
  
  // Create a local URL for the video
  return URL.createObjectURL(videoBlob);
};

// --- MAIN SERVICES ---

export const generateAdContent = async (data: AdInputData): Promise<Omit<GeneratedAd, 'id' | 'timestamp'>> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Step 1: Research (if enabled)
  const { text: researchContext, sources } = await researchProduct(data, process.env.API_KEY);

  // Get Color Palette Details
  let colorInstruction = "";
  if (data.colorPalette === 'custom' && data.customColors) {
     colorInstruction = `Use a CUSTOM COLOR PALETTE with these HEX codes: ${data.customColors.join(', ')}. Use these exact colors for text overlays, backgrounds, or clothing.`;
  } else {
    const selectedPalette = COLOR_PALETTES.find(p => p.id === data.colorPalette) || COLOR_PALETTES[0];
    colorInstruction = `Use a color palette inspired by: "${selectedPalette.name}" (${selectedPalette.colors.join(', ')}). Ensure these colors guide the lighting and mood.`;
  }

  // Construct the prompt
  const userPrompt = `
    CONTEXT FROM MARKET RESEARCH:
    ${researchContext}

    --- CAMPAIGN DETAILS ---
    Product: ${data.productName}
    Pain Point: ${data.painPoint}
    Audience: ${data.targetAudience}
    Archetype: ${data.archetype}
    Format: ${data.format}
    Tone: ${data.tone || 'Persuasive'} 
    ${colorInstruction}

    --- TASK ---
    1. Analyze the "Real World Setting" for this product. Where is the user when they feel the pain point? (e.g., Kitchen, Gym, Office, Car, Bathroom?).
    2. Generate 5 distinct ad scripts in Spanish with the specified TONE (${data.tone}).
    3. Generate 1 Image Prompt (English) that follows the "Real World Setting" logic.

    --- IMAGE PROMPT INSTRUCTIONS ---
    - **Do NOT** describe the image prompt as "A high quality image of...". Just describe the scene directly.
    - **Do NOT** use generic "futuristic" backgrounds if the product is mundane.
    - **Specifics:** Mention lighting (e.g., "harsh fluorescent office light" vs "soft morning sun"), textures, and specific props related to the niche.
    - **Composition:** Ensure the composition fits the ${data.format}.
    ${data.format === AdFormat.CAROUSEL ? 
      '- **CAROUSEL SPECIAL**: The image prompt must describe a WIDE (16:9) PANORAMIC scene. Imagine a continuous timeline or a before-and-after transformation spread across a wide canvas. Do not center a single object. Spread the action.' : ''
    }
    ${data.logoImage ? '- **LOGO INSTRUCTION**: The prompt must explicitly mention that the BRAND LOGO should be visible on the product or as a graphic element.' : ''}

    Output JSON only.
  `;

  // Step 2: Generate Scripts & Prompt
  const textResponse = await withTimeout(ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: {
      systemInstruction: getSystemInstruction(data.useProMode),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scripts: {
             type: Type.ARRAY,
             items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  hook: { type: Type.STRING },
                  body: { type: Type.STRING },
                  cta: { type: Type.STRING },
                  slides: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        slideNumber: { type: Type.INTEGER },
                        visualDescription: { type: Type.STRING },
                        headline: { type: Type.STRING },
                        body: { type: Type.STRING },
                      },
                      required: ["slideNumber", "headline", "body"]
                    }
                  }
                },
                required: ["title", "hook", "body", "cta"],
             }
          },
          imagePrompt: { type: Type.STRING },
        },
        required: ["scripts", "imagePrompt"],
      },
    },
  })) as GenerateContentResponse;

  const resultText = textResponse.text;
  if (!resultText) throw new Error("No response from Gemini Text Model");
  let parsed = JSON.parse(resultText);

  // FORCE FIX: Ensure Carousel always has 4 slides if model forgets
  if (data.format === AdFormat.CAROUSEL && parsed.scripts) {
    parsed.scripts = parsed.scripts.map((script: any) => {
      if (!script.slides || script.slides.length < 4) {
        const slides = [];
        // Try to use existing content to fill slides
        slides.push({ slideNumber: 1, headline: script.title || "Atención", body: script.hook || "Mira esto", visualDescription: "Section 1 of panorama" });
        slides.push({ slideNumber: 2, headline: "El Problema", body: script.body ? script.body.substring(0, 50) + "..." : "Te identificas?", visualDescription: "Section 2 of panorama" });
        slides.push({ slideNumber: 3, headline: "La Solución", body: script.body ? script.body.substring(50) : "Aquí está la solución", visualDescription: "Section 3 of panorama" });
        slides.push({ slideNumber: 4, headline: "Únete", body: script.cta || "Compra ahora", visualDescription: "Section 4 of panorama" });
        return { ...script, slides };
      }
      return script;
    });
  }

  // Step 3: Generate Image
  let imageUrl;
  
  // If we have a reference image OR a logo, we prefer the multi-modal editor flow
  if (data.referenceImage) {
     try {
       // Use Reference + Optional Logo
       imageUrl = await editProductImage(data.referenceImage, parsed.imagePrompt, process.env.API_KEY, data.format, data.logoImage);
     } catch (e) {
       console.warn("Initial Image-to-Image failed, falling back to standard generation", e);
       imageUrl = await generateImage(parsed.imagePrompt, process.env.API_KEY, data.format);
     }
  } else if (data.logoImage) {
    // No product reference, BUT we have a logo. 
    // We use the logo as the "input" image but instruct the model to place it on a generated scene.
     try {
       // We pass the Logo as the 'original' image, but prompt carefully to treat it as an overlay/element.
       imageUrl = await editProductImage(data.logoImage, `Create a scene: ${parsed.imagePrompt}. The Input Image is a LOGO. Place this logo naturally in the scene (on a product or floating).`, process.env.API_KEY, data.format);
     } catch (e) {
        // Fallback to text-only generation if logo placement fails
        imageUrl = await generateImage(parsed.imagePrompt, process.env.API_KEY, data.format);
     }
  } else {
     // Standard Text-to-Image (Imagen 4)
     imageUrl = await generateImage(parsed.imagePrompt, process.env.API_KEY, data.format);
  }

  return {
    scripts: parsed.scripts, // Array of 5
    imagePrompt: parsed.imagePrompt,
    imageUrl: imageUrl,
    userRequest: "Initial Generation",
    researchSources: sources
  };
};

export const refineAdContent = async (
  previousAd: GeneratedAd, 
  instruction: string,
  originalData: AdInputData
): Promise<Omit<GeneratedAd, 'id' | 'timestamp'>> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const refinementPrompt = `
    CONTEXT:
    Original Product: ${originalData.productName}
    Original Archetype: ${originalData.archetype}
    Original Format: ${originalData.format}
    Tone: ${originalData.tone}

    PREVIOUS IMAGE PROMPT: ${previousAd.imagePrompt}

    USER REFINEMENT REQUEST: "${instruction}"

    TASK:
    Regenerate the JSON.
    - If the user says "make it less generic" or "change the style", completely rewrite the 'imagePrompt' to be more specific to the niche (Realistic details, specific lighting, no AI tropes).
    - If the format is Carousel, ensure the imagePrompt describes a CONTINUOUS PANORAMIC scene (16:9).
    - Keep the scripts consistent with the new direction and the selected TONE.
  `;

  const textResponse = await withTimeout(ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: refinementPrompt,
    config: {
      systemInstruction: getSystemInstruction(originalData.useProMode),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scripts: {
             type: Type.ARRAY,
             items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  hook: { type: Type.STRING },
                  body: { type: Type.STRING },
                  cta: { type: Type.STRING },
                  slides: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        slideNumber: { type: Type.INTEGER },
                        visualDescription: { type: Type.STRING },
                        headline: { type: Type.STRING },
                        body: { type: Type.STRING },
                      },
                      required: ["slideNumber", "headline", "body"]
                    }
                  }
                },
                required: ["title", "hook", "body", "cta"],
             }
          },
          imagePrompt: { type: Type.STRING },
        },
        required: ["scripts", "imagePrompt"],
      },
    },
  })) as GenerateContentResponse;

  const resultText = textResponse.text;
  if (!resultText) throw new Error("No response from Gemini Text Model");
  let parsed = JSON.parse(resultText);

   // FORCE FIX: Ensure Carousel always has 4 slides on refine too
  if (originalData.format === AdFormat.CAROUSEL && parsed.scripts) {
    parsed.scripts = parsed.scripts.map((script: any) => {
      if (!script.slides || script.slides.length < 4) {
        const slides = [];
        slides.push({ slideNumber: 1, headline: script.title || "Atención", body: script.hook || "Mira esto", visualDescription: "Part 1" });
        slides.push({ slideNumber: 2, headline: "Info", body: script.body || "Detalles", visualDescription: "Part 2" });
        slides.push({ slideNumber: 3, headline: "Beneficio", body: script.body || "Mas info", visualDescription: "Part 3" });
        slides.push({ slideNumber: 4, headline: "Acción", body: script.cta || "Compra", visualDescription: "Part 4" });
        return { ...script, slides };
      }
      return script;
    });
  }

  // Generate Image
  let imageUrl;
  if (originalData.referenceImage) {
     try {
        imageUrl = await editProductImage(originalData.referenceImage, parsed.imagePrompt, process.env.API_KEY, originalData.format, originalData.logoImage);
     } catch (e) {
        console.warn("Refine Image-to-Image failed, falling back", e);
        imageUrl = await generateImage(parsed.imagePrompt, process.env.API_KEY, originalData.format);
     }
  } else if (originalData.logoImage) {
     try {
       imageUrl = await editProductImage(originalData.logoImage, `Create a scene: ${parsed.imagePrompt}. The Input Image is a LOGO. Place this logo naturally in the scene.`, process.env.API_KEY, originalData.format);
     } catch (e) {
        imageUrl = await generateImage(parsed.imagePrompt, process.env.API_KEY, originalData.format);
     }
  } else {
     imageUrl = await generateImage(parsed.imagePrompt, process.env.API_KEY, originalData.format);
  }

  return {
    scripts: parsed.scripts,
    imagePrompt: parsed.imagePrompt,
    imageUrl: imageUrl,
    userRequest: instruction,
    researchSources: previousAd.researchSources // Preserve original research sources
  };
};
