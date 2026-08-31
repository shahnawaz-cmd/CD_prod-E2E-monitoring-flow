import { Actor } from '../actors/Actor';
import { Task } from './Task';

// Helper function to generate a random 17-character VIN compliant with ISO 3779 standards
// (excludes I, O, and Q to prevent confusion with numbers)
function generateRandomVin(): string {
  const allowedChars = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    const randomIndex = Math.floor(Math.random() * allowedChars.length);
    vin += allowedChars[randomIndex];
  }
  return vin;
}

// Base VIN for mapped generator
const BASE_MAPPED_VIN = '242370B111346';

// Base VIN for unmapped generator (reverted to 111111111111)
const BASE_UNMAPPED_VIN = '111111111111';

// Class 1: Mapped VIN Generator
// Returns a VIN using the base VIN and randomizing the last numeric digit
export class MappedVinGenerator implements Task {
  private constructor(private readonly targetInputSelector?: string) {}

  static into(selector?: string): MappedVinGenerator {
    return new MappedVinGenerator(selector);
  }

  // Helper method to retrieve a mapped VIN (replaces the last character with a random digit 0-9)
  static getVin(): string {
    const base = BASE_MAPPED_VIN.slice(0, -1); // "242370B11134"
    const randomDigit = Math.floor(Math.random() * 10).toString(); // "0"-"9"
    return base + randomDigit;
  }

  async performAs(actor: Actor): Promise<void> {
    const vin = MappedVinGenerator.getVin();
    console.log(`[MappedVinGenerator] Generated mapped VIN: ${vin}`);
    
    // If a selector is provided, type it into the page input field
    if (this.targetInputSelector) {
      await actor.page.fill(this.targetInputSelector, vin);
    }
  }
}

// Class 2: Unmapped VIN Generator
// Generates an unmapped VIN using base VIN (111111111111) and randomizing the last character with an alphabet letter
export class UnmappedVinGenerator implements Task {
  private constructor(private readonly targetInputSelector?: string) {}

  static into(selector?: string): UnmappedVinGenerator {
    return new UnmappedVinGenerator(selector);
  }

  // Helper method to generate a new unmapped VIN (replaces the last character with a random letter A-Z)
  static getVin(): string {
    const base = BASE_UNMAPPED_VIN.slice(0, -1);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    return base + randomLetter;
  }

  async performAs(actor: Actor): Promise<void> {
    const vin = UnmappedVinGenerator.getVin();
    console.log(`[UnmappedVinGenerator] Generated unmapped VIN: ${vin}`);

    // If a selector is provided, type it into the page input field
    if (this.targetInputSelector) {
      await actor.page.fill(this.targetInputSelector, vin);
    }
  }
}
