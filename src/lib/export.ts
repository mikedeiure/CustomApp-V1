import type { CalculatedSearchTermMetric } from './metrics'

export type MatchType = 'broad' | 'phrase' | 'exact'

// Function to format search term based on match type
function formatSearchTermByMatchType(searchTerm: string, matchType: MatchType): string {
  switch (matchType) {
    case 'phrase':
      return `"${searchTerm}"`
    case 'exact':
      return `[${searchTerm}]`
    case 'broad':
    default:
      return searchTerm
  }
}

// Function to convert search terms data to CSV format
export function exportSearchTermsToCSV(
  data: CalculatedSearchTermMetric[], 
  filename: string = 'search-terms-export.csv',
  matchType: MatchType = 'broad'
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // CSV headers
  const headers = [
    'Search Term',
    'Campaign', 
    'Ad Group',
    'Impressions',
    'Clicks',
    'Cost',
    'Conversions',
    'Conversion Value',
    'CTR (%)',
    'CPC',
    'Conversion Rate (%)',
    'CPA',
    'ROAS'
  ]

  // Convert data to CSV rows with match type formatting
  const csvRows = data.map(term => [
    formatSearchTermByMatchType(term.search_term, matchType),
    term.campaign,
    term.ad_group,
    term.impr,
    term.clicks,
    term.cost.toFixed(2),
    term.conv.toFixed(1),
    term.value.toFixed(2),
    term.CTR.toFixed(2),
    term.CPC.toFixed(2),
    term.CvR.toFixed(2),
    term.CPA.toFixed(2),
    isFinite(term.ROAS) ? term.ROAS.toFixed(2) : '0.00'
  ])

  // Combine headers and data
  const allRows = [headers, ...csvRows]

  // Convert to CSV string
  const csvContent = allRows.map(row => 
    row.map(field => {
      // Escape fields that contain commas, quotes, or newlines
      const stringField = String(field)
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`
      }
      return stringField
    }).join(',')
  ).join('\n')

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// Function to prepare data for Google Sheets import
export function prepareForGoogleSheets(data: CalculatedSearchTermMetric[], matchType: MatchType = 'broad'): string {
  if (!data || data.length === 0) {
    return ''
  }

  // Headers for Google Sheets
  const headers = [
    'Search Term',
    'Campaign', 
    'Ad Group',
    'Impressions',
    'Clicks',
    'Cost',
    'Conversions',
    'Conversion Value',
    'CTR (%)',
    'CPC',
    'Conversion Rate (%)',
    'CPA',
    'ROAS'
  ]

  // Convert data to tab-separated values (TSV) for better Google Sheets compatibility
  const tsvRows = data.map(term => [
    formatSearchTermByMatchType(term.search_term, matchType),
    term.campaign,
    term.ad_group,
    term.impr,
    term.clicks,
    term.cost.toFixed(2),
    term.conv.toFixed(1),
    term.value.toFixed(2),
    term.CTR.toFixed(2),
    term.CPC.toFixed(2),
    term.CvR.toFixed(2),
    term.CPA.toFixed(2),
    isFinite(term.ROAS) ? term.ROAS.toFixed(2) : '0.00'
  ])

  // Combine headers and data with tab separators
  const allRows = [headers, ...tsvRows]
  return allRows.map(row => row.join('\t')).join('\n')
}

// Function to copy data to clipboard for Google Sheets paste
export async function copyToClipboardForGoogleSheets(data: CalculatedSearchTermMetric[], matchType: MatchType = 'broad'): Promise<boolean> {
  try {
    const tsvContent = prepareForGoogleSheets(data, matchType)
    await navigator.clipboard.writeText(tsvContent)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// Function to create a Google Sheets URL with the data
export function createGoogleSheetsUrl(data: CalculatedSearchTermMetric[]): string {
  const baseUrl = 'https://docs.google.com/spreadsheets/create'
  return baseUrl
}

// Helper function to get match type label for filenames
export function getMatchTypeLabel(matchType: MatchType): string {
  switch (matchType) {
    case 'phrase':
      return 'phrase-match'
    case 'exact':
      return 'exact-match'
    case 'broad':
    default:
      return 'broad-match'
  }
}

// Helper function to get match type display name
export function getMatchTypeDisplayName(matchType: MatchType): string {
  switch (matchType) {
    case 'phrase':
      return 'Phrase Match'
    case 'exact':
      return 'Exact Match'
    case 'broad':
    default:
      return 'Broad Match'
  }
} 