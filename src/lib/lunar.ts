 import { Lunar, Solar } from "lunar-javascript"
 
 /**
  * Get the next occurrence of a lunar date (month, day) as a Solar date.
  * If this year's occurrence has passed, returns next year's.
  */
 export function getNextLunarSolar(lunarMonth: number, lunarDay: number): Date {
   const today = new Date()
   today.setHours(0, 0, 0, 0)
 
   // Try this year
   const thisYear = today.getFullYear()
   const solarThisYear = Lunar.fromYmd(thisYear, lunarMonth, lunarDay).getSolar()
   const dateThisYear = new Date(solarThisYear.toYmd())
   dateThisYear.setHours(0, 0, 0, 0)
 
   if (dateThisYear >= today) return dateThisYear
 
   // Fall back to next year
   const nextYear = thisYear + 1
   const solarNextYear = Lunar.fromYmd(nextYear, lunarMonth, lunarDay).getSolar()
   const dateNextYear = new Date(solarNextYear.toYmd())
   dateNextYear.setHours(0, 0, 0, 0)
   return dateNextYear
 }
 
 /**
  * Get the next occurrence of a solar date for a recurring event (e.g. birthday).
  * If this year's date has passed, returns next year's.
  */
 export function getNextSolarOccurrence(dateStr: string): Date {
   const original = new Date(dateStr)
   const today = new Date()
   today.setHours(0, 0, 0, 0)
 
   // This year's occurrence
   const thisYear = new Date(original)
   thisYear.setFullYear(today.getFullYear())
   thisYear.setHours(0, 0, 0, 0)
 
   if (thisYear >= today) return thisYear
 
   // Next year
   const nextYear = new Date(original)
   nextYear.setFullYear(today.getFullYear() + 1)
   nextYear.setHours(0, 0, 0, 0)
   return nextYear
 }
 
 /**
  * Format a lunar date (month, day) as a Chinese string, e.g. "六月初十"
  */
 export function formatLunarDate(month: number, day: number): string {
   const lunarMonths = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"]
   const lunarDays = [
     "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
     "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
     "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
   ]
   return `${lunarMonths[month - 1]}月${lunarDays[day - 1]}`
 }
