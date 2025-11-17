
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  public error = signal<string | null>(null);

  constructor() {
    // IMPORTANT: This uses a placeholder for the API key.
    // In a real Applet environment, process.env.API_KEY would be available.
    const apiKey = (process.env as any).API_KEY;
    if (!apiKey) {
      console.error('API_KEY environment variable not set.');
      this.error.set('API key is not configured. AI features are disabled.');
      return;
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateProductDescription(productName: string): Promise<string> {
    if (!this.ai) {
      return 'AI service is not available.';
    }
    this.error.set(null);

    const prompt = `Generate a short, compelling sales description for a product called '${productName}'. Focus on its key benefits for a customer in a retail store. Keep it under 50 words and use a friendly, inviting tone.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (e) {
      console.error('Error generating content:', e);
      this.error.set('Could not generate AI description. Please try again later.');
      return 'Failed to generate description.';
    }
  }
}
