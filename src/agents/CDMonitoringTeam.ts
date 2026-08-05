import { Page } from '@playwright/test';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import * as dotenv from 'dotenv';

dotenv.config();

// 1. Define the shared State structure
export const MonitoringState = Annotation.Root({
  url: Annotation<string>(),
  pageText: Annotation<string>(),
  logs: Annotation<string>(),
  isFailed: Annotation<boolean>(),
  analysis: Annotation<string>(),
  recoveryAction: Annotation<'retry' | 'alert_human' | 'none'>(),
  recoverySuccess: Annotation<boolean>(),
});

export class CDMonitoringTeam {
  constructor(private readonly page: Page) {}

  // 2. Node A: The Watcher
  // Navigates and gathers information using Playwright
  async watcher(state: typeof MonitoringState.State) {
    console.log('[Watcher] Navigating to dashboard and extracting info...');
    await this.page.goto(state.url);
    
    const pageText = await this.page.evaluate(() => document.body.innerText);
    const hasFailedText = pageText.toLowerCase().includes('failed') || pageText.toLowerCase().includes('error');

    return {
      pageText: pageText,
      isFailed: hasFailedText,
    };
  }

  // 3. Node B: The Analyst
  // Uses Gemini to determine the root cause of failures
  async analyst(state: typeof MonitoringState.State) {
    if (!state.isFailed) {
      console.log('[Analyst] Pipeline is healthy. No action needed.');
      return { analysis: 'Pipeline status is successful.', recoveryAction: 'none' as const };
    }

    console.log('[Analyst] Pipeline failure detected! Querying Gemini for root cause...');
    const chat = new ChatGoogleGenerativeAI({ model: 'gemini-2.5-flash', temperature: 0 });
    
    const response = await chat.invoke([
      new HumanMessage(
        `Review this dashboard content and explain the cause of the failure:\n\n${state.pageText}`
      )
    ]);

    const analysisResult = response.content.toString();
    console.log(`[Analyst] Gemini Analysis: ${analysisResult}`);

    // If transient connection issue, let's try a retry, otherwise alert human
    const shouldRetry = analysisResult.toLowerCase().includes('timeout') || analysisResult.toLowerCase().includes('network');
    
    return {
      analysis: analysisResult,
      recoveryAction: shouldRetry ? ('retry' as const) : ('alert_human' as const),
    };
  }

  // 4. Node C: The Fixer
  // Attempts recovery actions in the browser or requests human aid
  async fixer(state: typeof MonitoringState.State) {
    if (state.recoveryAction === 'none') {
      return { recoverySuccess: true };
    }

    if (state.recoveryAction === 'retry') {
      console.log('[Fixer] Attempting auto-recovery by clicking the Retry button...');
      try {
        // Look for a retry button on the dashboard
        const retryBtn = this.page.locator('button:has-text("Retry"), button:has-text("Re-run")');
        if (await retryBtn.isVisible()) {
          await retryBtn.click();
          await this.page.waitForTimeout(3000); // wait for state to update
          console.log('[Fixer] Retry button clicked successfully!');
          return { recoverySuccess: true };
        } else {
          console.log('[Fixer] Retry button not found on the page.');
          return { recoverySuccess: false, recoveryAction: 'alert_human' as const };
        }
      } catch (err) {
        console.error('[Fixer] Failed to click retry:', err);
        return { recoverySuccess: false, recoveryAction: 'alert_human' as const };
      }
    }

    console.log('[Fixer] Critical non-recoverable failure. Alerting human developers on Slack/Console...');
    return { recoverySuccess: false };
  }

  // 5. Compile the Workflow Graph
  buildGraph() {
    const workflow = new StateGraph(MonitoringState)
      .addNode('watcher', (state) => this.watcher(state))
      .addNode('analyst', (state) => this.analyst(state))
      .addNode('fixer', (state) => this.fixer(state))
      
      // Define path connections
      .addEdge('__start__', 'watcher')
      .addEdge('watcher', 'analyst')
      .addEdge('analyst', 'fixer')
      .addEdge('fixer', '__end__');

    return workflow.compile();
  }
}
