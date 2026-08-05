import { Page } from '@playwright/test';
import { Task } from '../tasks/Task';

export class Actor {
  constructor(readonly name: string, readonly page: Page) {}

  static named(name: string, page: Page): Actor {
    return new Actor(name, page);
  }

  async attemptsTo(...tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await task.performAs(this);
    }
  }
}
