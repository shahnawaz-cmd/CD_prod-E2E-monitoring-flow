export const MAPPED_VIN_POOL = [
  '965215GH85',
  'GHLS30001195',
  '1Q87L5N599745',
  '2W87S5N521178',
] as const;

const ALPHANUMERIC = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';

export class MappedVinGenerator {
  static getVin(): string {
    const base = MAPPED_VIN_POOL[Math.floor(Math.random() * MAPPED_VIN_POOL.length)];
    const randomChar = ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
    return base.slice(0, -1) + randomChar;
  }
}

export class UnmappedVinGenerator {
  static getVin(length: number = 6): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let vin = '';
    for (let i = 0; i < length; i++) {
      vin += chars[Math.floor(Math.random() * chars.length)];
    }
    return vin;
  }
}
