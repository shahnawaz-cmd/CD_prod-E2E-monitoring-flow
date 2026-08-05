import { Actor } from '../actors/Actor';
import { Task } from './Task';

export class CheckDeployment implements Task {
  private constructor(private readonly url: string) {}

  static at(url: string): CheckDeployment {
    return new CheckDeployment(url);
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.goto(this.url);
  }
}
