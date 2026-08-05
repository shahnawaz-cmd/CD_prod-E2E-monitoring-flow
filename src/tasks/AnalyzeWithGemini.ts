import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import * as dotenv from 'dotenv';

// Load environmental variables from .env
dotenv.config();

export class AnalyzeWithGemini implements Task {
  private constructor(
    private readonly url: string,
    private readonly instruction: string
  ) {}

  static at(url: string, instruction: string): AnalyzeWithGemini {
    return new AnalyzeWithGemini(url, instruction);
  }

  async performAs(actor: Actor): Promise<void> {
    // 1. Navigate to the page
    await actor.page.goto(this.url);

    // 2. Extract DOM/Text content of the page
    const pageText = await actor.page.evaluate(() => document.body.innerText);

    // 3. Initialize Gemini Chat Model
    const chat = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0,
    });

    // 4. Send instructions and content to Gemini
    const response = await chat.invoke([
      new SystemMessage(
        'You are an automated QA / Ops assistant analyzing a deployment dashboard.'
      ),
      new HumanMessage(
        `Page Text:\n${pageText}\n\nTask instruction: ${this.instruction}`
      ),
    ]);

    console.log(`\n--- Gemini Analysis Output ---\n${response.content}\n`);
  }
}
