import { Actor } from '../actors/Actor';
import { Task } from './Task';

/**
 * Class 1: PasswordGenerator
 * Generates dynamic unique passwords for signup flows.
 */
export class PasswordGenerator implements Task {
  private generatedPassword: string = '';

  constructor(private readonly basePassword: string = 'Pass321654') {}

  /**
   * Static helper method to generate a unique dynamic password per test run.
   */
  static generate(basePassword: string = 'Pass321654'): string {
    const timestampSuffix = Date.now().toString().slice(-4);
    const randomDigits = Math.floor(100 + Math.random() * 900);
    return `${basePassword}${randomDigits}${timestampSuffix}`;
  }

  static from(basePassword?: string): PasswordGenerator {
    return new PasswordGenerator(basePassword);
  }

  getGeneratedPassword(): string {
    return this.generatedPassword;
  }

  async performAs(actor: Actor): Promise<void> {
    this.generatedPassword = PasswordGenerator.generate(this.basePassword);
    console.log(`[PasswordGenerator] Generated unique password: ${this.generatedPassword}`);
  }
}

/**
 * Class 2: PhoneGenerator
 * Generates dynamic unique valid phone numbers for signup flows.
 */
export class PhoneGenerator implements Task {
  private generatedPhone: string = '';

  constructor(private readonly prefix: string = '0315') {}

  /**
   * Static helper method to generate a unique dynamic phone number per test run.
   */
  static generate(prefix: string = '0315'): string {
    const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
    return `${prefix}${randomSuffix}`;
  }

  static from(prefix?: string): PhoneGenerator {
    return new PhoneGenerator(prefix);
  }

  getGeneratedPhone(): string {
    return this.generatedPhone;
  }

  async performAs(actor: Actor): Promise<void> {
    this.generatedPhone = PhoneGenerator.generate(this.prefix);
    console.log(`[PhoneGenerator] Generated unique phone number: ${this.generatedPhone}`);
  }
}
