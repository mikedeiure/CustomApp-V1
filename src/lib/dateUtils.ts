import type { AdMetric } from './types'

/**
 * Calculate the date range from daily data
 */
export function getDateRangeFromData(dailyData: AdMetric[]): { start: string; end: string; display: string } | null {
  if (!dailyData || dailyData.length === 0) {
    return null
  }

  // Extract all dates and sort them
  const dates = dailyData
    .map(item => item.date)
    .filter(date => date && date.trim() !== '')
    .sort()

  if (dates.length === 0) {
    return null
  }

  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  // Format dates for display
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      })
    } catch {
      return dateStr
    }
  }

  const formattedStart = formatDate(startDate)
  const formattedEnd = formatDate(endDate)

  // Create display string
  let display: string
  if (startDate === endDate) {
    display = formattedStart
  } else {
    display = `${formattedStart} - ${formattedEnd}`
  }

  return {
    start: startDate,
    end: endDate,
    display
  }
}

/**
 * Get a default date range description when no data is available
 */
export function getDefaultDateRange(): string {
  return "Last 30 days"
}

/**
 * Calculate the number of days in a date range
 */
export function getDaysInRange(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
    return diffDays
  } catch {
    return 30 // Default fallback
  }
} 