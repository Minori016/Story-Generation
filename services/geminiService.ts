import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { ChapterOutline, StoryPage } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const CHAPTER_COUNT = 12; // Controls the approximate length, leading to ~30 pages.

const splitTextIntoPages = (text: string, wordsPerPage: number): string[] => {
  const words = text.split(/\s+/);
  const pages = [];
  let currentPageWords: string[] = [];

  for (const word of words) {
    currentPageWords.push(word);
    if (currentPageWords.length >= wordsPerPage) {
      pages.push(currentPageWords.join(' '));
      currentPageWords = [];
    }
  }

  if (currentPageWords.length > 0) {
    pages.push(currentPageWords.join(' '));
  }
  
  if (pages.length === 0 && text.length > 0) {
     pages.push(text);
  }

  return pages;
};

const generateCharacterDescription = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `Based on the following story idea, create a detailed and consistent physical description of the main character. This description will be used to generate images, so be specific about hair color, eye color, clothing style, build, and any unique features. Keep it concise, like a character sheet entry.

            Story Idea: "${prompt}"`,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating character description:", error);
        // Return a default to avoid breaking the flow, though image generation will be less consistent.
        return "A brave adventurer with a determined look.";
    }
}


const generateImage = async (prompt: string, characterDescription: string): Promise<string> => {
    try {
        const fullPrompt = `A cinematic, atmospheric, and beautiful illustration for a fantasy story. The main character's appearance must be consistent across all images, strictly following this description: "${characterDescription}". Scene: ${prompt}. Style: digital painting, high detail, epic.`
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: fullPrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error('No image data found in Gemini API response.');
    } catch (error) {
        console.error('Error generating image:', error);
        throw new Error('Failed to generate a chapter image.');
    }
}


export const generateStory = async (
  prompt: string,
  onProgress: (message: string) => void
): Promise<StoryPage[]> => {
  try {
    // Step 0: Generate a consistent character description
    onProgress('Creating a consistent character profile...');
    const characterDescription = await generateCharacterDescription(prompt);

    // Step 1: Generate the outline
    onProgress(`Generating story outline for ${CHAPTER_COUNT} chapters...`);
    const outlineResponse = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Based on the following idea, generate a detailed chapter-by-chapter outline for a long story with exactly ${CHAPTER_COUNT} chapters. The story should be engaging and well-structured. \n\nStory Idea: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  chapter: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                },
                required: ["chapter", "title", "summary"]
              },
            },
          },
           required: ["chapters"]
        },
      },
    });

    const outlineResult = JSON.parse(outlineResponse.text);
    const outline: ChapterOutline[] = outlineResult.chapters;
    
    if (!outline || outline.length === 0) {
        throw new Error("Failed to generate a valid story outline.");
    }

    // Step 2: Generate each chapter and its image
    let allStoryPages: StoryPage[] = [];
    let previousChapterContent = "This is the beginning of the story.";

    for (const chapter of outline) {
      onProgress(`Writing Chapter ${chapter.chapter} of ${outline.length}: ${chapter.title}`);
      
      const chapterPrompt = `You are a master storyteller. Continue writing the story based on the initial idea and the outline. Write Chapter ${chapter.chapter}: "${chapter.title}". 
      
      Initial story idea: "${prompt}"
      Chapter Summary: "${chapter.summary}"
      
      Ensure the chapter flows logically from the previous one. The last few sentences of the previous chapter were: "${previousChapterContent.slice(-500)}".
      
      Write a detailed and immersive chapter of about 600-800 words. Do not repeat the chapter title in the text.`;

      const chapterResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: chapterPrompt,
      });

      const chapterText = chapterResponse.text;

      // Generate image for the chapter using the consistent description
      onProgress(`Creating image for Chapter ${chapter.chapter}: ${chapter.title}`);
      const imagePrompt = `${chapter.title}. ${chapter.summary}`;
      const imageUrl = await generateImage(imagePrompt, characterDescription);
      
      previousChapterContent = chapterText;

      // Split chapter text into pages and associate the image with each page
      const WORDS_PER_PAGE = 250;
      const pagesOfChapterText = splitTextIntoPages(chapterText, WORDS_PER_PAGE);

      const chapterPages: StoryPage[] = pagesOfChapterText.map((pageText, index) => ({
          text: (index === 0 ? `## ${chapter.title}\n\n` : '') + pageText,
          imageUrl: imageUrl,
      }));

      allStoryPages.push(...chapterPages);
    }
    
    onProgress("Formatting story into pages...");

    // Ensure we have at least 30 pages by padding if necessary
    while(allStoryPages.length > 0 && allStoryPages.length < 30) {
        const lastPage = allStoryPages[allStoryPages.length - 1];
        allStoryPages.push({
            text: "The story continues on the next page...",
            imageUrl: lastPage.imageUrl, // Reuse the last image for padded pages
        });
    }

    return allStoryPages;

  } catch (error) {
    console.error("Error generating story:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate story: ${error.message}`);
    }
    throw new Error("An unknown error occurred during story generation.");
  }
};