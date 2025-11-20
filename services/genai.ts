
import { GoogleGenAI, Modality, Type, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { ExamQuestion, Flashcard, MathStep } from "../types";
import { API_KEY } from "../config";

const getAiClient = () => new GoogleGenAI({ apiKey: API_KEY });

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Helper function to handle Rate Limits (429) with exponential backoff
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 429 or "RESOURCE_EXHAUSTED"
    const isRateLimit = error.status === 429 || 
                        error.code === 429 || 
                        error.message?.includes('429') || 
                        error.message?.includes('RESOURCE_EXHAUSTED');
    
    if (retries > 0 && isRateLimit) {
      console.warn(`Quota exceeded. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const extractTextFromMedia = async (file: File): Promise<string> => {
  const ai = getAiClient();
  
  if (file.type === 'text/plain') {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
      });
  }

  const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
  });

  try {
      const response = await callWithRetry(() => ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
              {
                  inlineData: {
                      mimeType: file.type,
                      data: base64
                  }
              },
              {
                  text: `Extract all the text content from this file strictly verbatim. 
                  Do not summarize. Do not add introductory text. 
                  If it is an image, transcribe the visible text.
                  If it is a PDF, extract the text body.`
              }
          ],
          config: {
            safetySettings: safetySettings
          }
      })) as GenerateContentResponse;
      return response.text || "";
  } catch (e: any) {
      console.error("Extraction failed", e);
      let msg = e.message || e.toString();
      if (msg.includes("413")) msg = "File too large (Max 10MB) or too many pages.";
      if (msg.includes("403")) msg = "API Key invalid or unauthorized domain.";
      if (msg.includes("400")) msg = "Bad Request. File format might not be supported.";
      if (msg.includes("429")) msg = "Server busy (Rate Limit). Please try again in a moment.";
      return `[Error extracting text from ${file.name}: ${msg}]`;
  }
}

export const analyzeSyllabus = async (studyMaterial: string): Promise<{ minQuestions: number, recommendedQuestions: number, topics: string[] }> => {
    const ai = getAiClient();
    const prompt = `
    You are an expert curriculum developer.
    TASK: Identify ALL distinct concepts, facts, or sections in the provided text that necessitate a dedicated exam question to ensure full mastery.
    CRITERIA:
    1. Break down the syllabus into granular topics.
    2. Output MUST be a list of strings.
    3. Order the list by IMPORTANCE (Most critical concepts first).
    4. Be comprehensive.
    SYLLABUS: """${studyMaterial.substring(0, 90000)}"""
    OUTPUT: JSON object with a 'topics' property (array of strings).
    `;

    try {
        const response = await callWithRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.0,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        topics: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                        }
                    }
                }
            }
        })) as GenerateContentResponse;
        const json = JSON.parse(response.text || "{}");
        const topics = json.topics || [];
        const count = topics.length;
        
        if (count === 0) return { minQuestions: 5, recommendedQuestions: 10, topics: ["General Knowledge"] };

        return { 
            minQuestions: Math.ceil(count * 0.6), 
            recommendedQuestions: count,          
            topics: topics 
        };
    } catch (e) {
        console.error("Analysis failed", e);
        return { minQuestions: 5, recommendedQuestions: 10, topics: [] };
    }
}

export const generateExamQuestion = async (
    studyMaterial: string, 
    difficulty: string, 
    language: string, 
    examFormat: 'open' | 'test',
    currentQuestionIndex?: number,
    totalQuestions?: number,
    specificTopic?: string
): Promise<ExamQuestion> => {
  const ai = getAiClient();
  
  let topicInstruction = "";
  if (specificTopic) {
      topicInstruction = `CRITICAL INSTRUCTION: You MUST generate the question SPECIFICALLY about this topic: "${specificTopic}". Do not ask about anything else.`;
  } else if (currentQuestionIndex !== undefined && totalQuestions !== undefined) {
      topicInstruction = `CONTEXT: Question ${currentQuestionIndex + 1} of ${totalQuestions}. Select a topic appropriate for this stage of the exam.`;
  }

  const prompt = `
  You are an academic examiner.
  SYLLABUS: """${studyMaterial.substring(0, 100000)}"""
  DIFFICULTY: ${difficulty}
  LANGUAGE: ${language}
  FORMAT: ${examFormat === 'test' ? 'Multiple Choice (4 options: A, B, C, D)' : 'Written Essay Question'}
  ${topicInstruction}
  Task: Generate ONE exam question.
  `;

  const config = examFormat === 'test' ? {
      responseMimeType: "application/json",
      responseSchema: {
          type: Type.OBJECT,
          properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
              contextSnippet: { type: Type.STRING },
              topic: { type: Type.STRING }
          }
      }
  } : {};

  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        ...config,
        safetySettings: safetySettings,
      },
    })) as GenerateContentResponse;

    if (examFormat === 'test') {
        return JSON.parse(response.text || "{}") as ExamQuestion;
    } else {
        const text = response.text || "";
        return {
            question: text,
            contextSnippet: "",
            topic: specificTopic || "General"
        };
    }
  } catch (error) {
    console.error("Error generating exam question:", error);
    return {
      question: "Error generating question (Rate Limit or Network Error).",
    };
  }
};

export const validateExamAnswer = async (
    question: string, 
    userAnswer: string, 
    studyMaterial: string, 
    language: string, 
    imageFile?: File
): Promise<{correct: boolean, feedback: string, score: number}> => {
  const ai = getAiClient();
  
  let imagePart = null;
  if (imageFile) {
      const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(imageFile);
      });
      imagePart = {
          inlineData: {
              mimeType: imageFile.type,
              data: base64
          }
      };
  }

  const textPrompt = `
    You are grading an exam answer.
    SYLLABUS CONTEXT: ${studyMaterial.substring(0, 50000)}... (truncated)
    Question: ${question}
    Student Text Answer: ${userAnswer}
    ${imageFile ? "Note: The student also provided an image/diagram answer." : ""}
    Language: ${language}
    
    IMPORTANT GRADING INSTRUCTION: 
    - Be LENIENT. Focus on CONCEPTUAL UNDERSTANDING.
    - Do NOT require verbatim/exact matching of the syllabus text.
    - If the student explains the core idea correctly using their own words, mark it as correct.
    - Only mark incorrect if the answer is factually wrong or completely irrelevant.
    
    Task: Determine if the answer (text + image if present) is correct based on the syllabus. Return score 0-100.
  `;

  const contents = imagePart ? [imagePart, { text: textPrompt }] : [{ text: textPrompt }];

  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        safetySettings: safetySettings,
        responseSchema: {
           type: Type.OBJECT,
           properties: {
             correct: { type: Type.BOOLEAN },
             score: { type: Type.INTEGER },
             feedback: { type: Type.STRING }
           }
        }
      }
    })) as GenerateContentResponse;
    
    const json = JSON.parse(response.text || "{}");
    return {
        correct: !!json.correct,
        score: json.score || 0,
        feedback: json.feedback || "No feedback provided."
    };
  } catch (e) {
    console.error("Validation error", e);
    return { correct: false, score: 0, feedback: "Error grading answer (Try again)." };
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<AudioBuffer | null> => {
    if (!text) return null;
    const ai = getAiClient();

    try {
        const response = await callWithRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        })) as GenerateContentResponse;

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) return null;
        return decodeBase64Audio(base64Audio);

    } catch (e) {
        console.error("TTS Error", e);
        return null;
    }
}

// Helper for decoding
async function decodeBase64Audio(base64Audio: string) {
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for(let i=0; i<dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
}

export const generateStudyContent = async (
  studyMaterial: string, 
  type: 'summary' | 'outline' | 'mindmap', 
  language: string,
  density: 'dense' | 'medium' | 'concise' = 'medium'
): Promise<string> => {
  const ai = getAiClient();
  let prompt = "";
  
  const densityInstructions = {
      dense: "Create a highly detailed, comprehensive output. Retain 80% of the source details.",
      medium: "Create a balanced output. Retain key concepts and major supporting details (60%).",
      concise: "Create a very brief, high-level overview. Focus only on the most critical core concepts (35%)."
  };

  const instruction = densityInstructions[density];

  if (type === 'summary') {
    prompt = `ROLE: Expert Academic Tutor. TASK: Create a SUMMARY of the syllabus. ${instruction} FORMAT: Markdown. Do not use code blocks. Use #, ##, **bold**, - list. LANGUAGE: ${language}. SYLLABUS: """${studyMaterial.substring(0, 90000)}"""`;
  } else if (type === 'outline') {
    prompt = `ROLE: Curriculum Designer. TASK: Create a hierarchical OUTLINE. ${instruction} FORMAT: Markdown. Do not use code blocks. Use #, ##, ###, -. LANGUAGE: ${language}. SYLLABUS: """${studyMaterial.substring(0, 90000)}"""`;
  } else if (type === 'mindmap') {
    prompt = `ROLE: Visual Thinker. TASK: Generate MERMAID.JS graph TD syntax. RULES: 'graph TD;', short labels, no special chars in IDs. LANGUAGE: ${language}. SYLLABUS: """${studyMaterial.substring(0, 90000)}"""`;
  }

  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { safetySettings: safetySettings }
    })) as GenerateContentResponse;
    let text = response.text || "";
    if (type === 'mindmap') {
       text = text.replace(/```mermaid/g, '').replace(/```/g, '').trim();
    }
    return text;
  } catch (e) {
    return "Error generating content.";
  }
};

export const generateFlashcards = async (studyMaterial: string, language: string): Promise<Flashcard[]> => {
    const ai = getAiClient();
    const prompt = `
    Task: Create 10 flashcards from the syllabus.
    Format: JSON array of objects with 'front' (Question/Concept) and 'back' (Answer/Definition).
    Language: ${language}
    Syllabus: """${studyMaterial.substring(0, 90000)}"""
    `;
    try {
        const response = await callWithRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            front: { type: Type.STRING },
                            back: { type: Type.STRING }
                        }
                    }
                }
            }
        })) as GenerateContentResponse;
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Flashcard gen error", e);
        return [];
    }
};

export const generatePodcast = async (studyMaterial: string, language: string, coveragePercentage: number): Promise<AudioBuffer | null> => {
    const ai = getAiClient();
    
    // Step 1: Generate the Script using the text model
    const scriptPrompt = `
    You are a scriptwriter for an educational podcast.
    TASK: Generate a deep, comprehensive dialogue between two hosts: Puck (Professor) and Kore (Student).
    
    COVERAGE REQUIREMENT: The user wants to cover approximately ${coveragePercentage}% of the provided material.
    - If 100%: Cover every single detail, key date, and name.
    - If 80-90%: Cover all main topics and most details, omit minor trivia.
    - If 60-70%: Focus on main concepts and key supporting facts.
    - If 50%: Rapid fire summary of only the most crucial highlights.

    REQUIREMENTS:
    1. LENGTH: Appropriate for the requested coverage.
    2. CONTENT: 
       - Identify and explicitly mention IMPORTANT DATES, NAMES, and KEY FIGURES if relevant to the coverage.
       - Discuss complex topics clearly.
    3. STYLE: Engaging, conversational, yet highly educational.
    4. LANGUAGE: ${language}
    
    FORMAT:
    Puck: [Text]
    Kore: [Text]
    (Repeat as needed)

    SYLLABUS: """${studyMaterial.substring(0, 100000)}"""
    `;

    let script = "";
    try {
        const scriptResponse = await callWithRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: scriptPrompt,
            config: { safetySettings: safetySettings }
        })) as GenerateContentResponse;
        script = scriptResponse.text || "";
    } catch (e) {
        console.error("Podcast Script Generation Error", e);
        return null;
    }

    if (!script) return null;

    // Step 2: Send the generated script to the TTS model
    try {
         const response = await callWithRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: script }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            { speaker: 'Puck', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
                            { speaker: 'Kore', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                        ]
                    }
                }
            }
        })) as GenerateContentResponse;
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) return null;
        return decodeBase64Audio(base64Audio);
    } catch (e) {
        console.error("Podcast Audio Generation Error", e);
        return null;
    }
};

export const solveMathProblem = async (problemText: string, language: string, imageFile?: File): Promise<MathStep[]> => {
    const ai = getAiClient();
    let imagePart = null;

    if (imageFile) {
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(imageFile);
        });
        imagePart = {
            inlineData: {
                mimeType: imageFile.type,
                data: base64
            }
        };
    }

    const prompt = `
    ROLE: Expert Math Tutor.
    TASK: Solve this math problem step-by-step for a student.
    LANGUAGE: ${language}
    INPUT: "${problemText}" ${imageFile ? '(and attached image)' : ''}
    
    OUTPUT FORMAT: JSON Array.
    Each item in array:
    {
      "latex": "The mathematical formula for this step (LaTeX format without $ signs)",
      "explanation": "A short verbal explanation of what is happening in this step to be read aloud."
    }
    `;

    const contents = imagePart ? [imagePart, { text: prompt }] : [{ text: prompt }];

    try {
        const response = await callWithRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            latex: { type: Type.STRING },
                            explanation: { type: Type.STRING }
                        }
                    }
                }
            }
        })) as GenerateContentResponse;
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Math Tutor Error", e);
        return [{ latex: "Error", explanation: "Could not solve problem." }];
    }
};
