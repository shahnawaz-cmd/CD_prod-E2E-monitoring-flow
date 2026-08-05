# Skill: LangChain & AI-Driven Playwright Automation (Gemini Edition)

This document outlines how to integrate LangChain and Google Gemini models into the Playwright Screenplay framework inside the `CD Monitoring flow` codebase.

---

## 1. Installation & Setup

Install the LangChain core package and the official Google Gemini integration:

```bash
npm install @langchain/core @langchain/google-genai dotenv
```

Ensure your environment variables (like `GEMINI_API_KEY`) are configured in a `.env` file in the root of your project:

```env
GEMINI_API_KEY="your-gemini-api-key"
```

---

## 2. Architecture: Gemini as a Screenplay Task

In the Screenplay Pattern, tasks are actions performed by an `Actor`. We can create a specialized `AnalyzeWithGemini` task that accesses the Playwright `Page`, extracts content, and processes it through Gemini.

### Code Blueprint: `src/tasks/AnalyzeWithGemini.ts`

Create a new file under `src/tasks/AnalyzeWithGemini.ts`:

```typescript
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
      modelName: 'gemini-2.5-flash',
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
```

---

## 3. Usage in Test Specs

You can import and run this new task directly in your spec files:

```typescript
import { test } from '@playwright/test';
import { Actor } from '../src/actors/Actor';
import { AnalyzeWithGemini } from '../src/tasks/AnalyzeWithGemini';

test.describe('AI CD Monitoring Flow', () => {
  test('should analyze deployment status using Gemini', async ({ page }) => {
    const monitorActor = Actor.named('Ops Engineer', page);

    // Run the Gemini-powered check
    await monitorActor.attemptsTo(
      AnalyzeWithGemini.at(
        'https://cd-monitor.local/status',
        'Summarize the deployment health and list any errors if found.'
      )
    );
  });
});
```
