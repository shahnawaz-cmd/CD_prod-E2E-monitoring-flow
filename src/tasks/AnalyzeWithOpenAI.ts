import { Actor } from '../actors/Actor';
import { Task } from './Task';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import * as dotenv from 'dotenv';

// Load environmental variables from .env
dotenv.config();

export class AnalyzeWithOpenAI implements Task {
  private constructor(
    private readonly url: string,
    private readonly instruction: string
  ) {}

  static at(url: string, instruction: string): AnalyzeWithOpenAI {
    return new AnalyzeWithOpenAI(url, instruction);
  }

  async performAs(actor: Actor): Promise<void> {
    // 1. Navigate to the page
    await actor.page.goto(this.url);

    // 2. Extract DOM/Text content of the page
    const pageText = await actor.page.evaluate(() => document.body.innerText);

    // 3. Initialize OpenAI Chat Model
    const chat = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
    });

    // 4. Send instructions and content to OpenAI
    const response = await chat.invoke([
      new SystemMessage(
        'You are an automated QA / Ops assistant analyzing a deployment dashboard.'
      ),
      new HumanMessage(
        `Page Text:\n${pageText}\n\nTask instruction: ${this.instruction}`
      ),
    ]);

    console.log(`\n--- OpenAI Analysis Output ---\n${response.content}\n`);
  }
}
