import { Page } from '@playwright/test';
import { Task } from '../tasks/Task';
import { SelfHealing } from '../utils/SelfHealing';

export class Actor {
  constructor(readonly name: string, readonly page: Page) {
    SelfHealing.attachHandlers(page);
  }

  static named(name: string, page: Page): Actor {
    return new Actor(name, page);
  }

  async attemptsTo(...tasks: Task[]): Promise<void> {
    SelfHealing.attachHandlers(this.page);
    for (const task of tasks) {
      await task.performAs(this);
    }
  }
}
