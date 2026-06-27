 declare module "lunar-javascript" {
   export class Lunar {
     static fromYmd(year: number, month: number, day: number): Lunar
     getSolar(): Solar
   }
   export class Solar {
     static fromYmd(year: number, month: number, day: number): Solar
     toYmd(): string
     getYear(): number
     getMonth(): number
     getDay(): number
     getLunar(): Lunar
   }
 }
