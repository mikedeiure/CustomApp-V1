'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, Copy, CheckCircle } from 'lucide-react'
import { 
  exportSearchTermsToCSV, 
  copyToClipboardForGoogleSheets, 
  getMatchTypeLabel, 
  getMatchTypeDisplayName,
  type MatchType 
} from '@/lib/export'
import type { CalculatedSearchTermMetric } from '@/lib/metrics'

interface DownloadButtonProps {
  data: CalculatedSearchTermMetric[]
  filename?: string
  disabled?: boolean
  dateRange?: string
  matchType: MatchType
}

export function DownloadButton({ 
  data, 
  filename = 'search-terms-export', 
  disabled = false,
  dateRange,
  matchType 
}: DownloadButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCSVDownload = () => {
    const matchTypeLabel = getMatchTypeLabel(matchType)
    const fullFilename = `${filename}-${matchTypeLabel}.csv`
    exportSearchTermsToCSV(data, fullFilename, matchType)
  }

  const handleGoogleSheetsClipboard = async () => {
    const success = await copyToClipboardForGoogleSheets(data, matchType)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
    }
  }

  const openGoogleSheets = () => {
    window.open('https://docs.google.com/spreadsheets/create', '_blank')
  }

  if (disabled || !data || data.length === 0) {
    return (
      <div className="text-right">
        {dateRange && (
          <p className="text-xs text-gray-500 mb-1">Data: {dateRange}</p>
        )}
        <Button disabled variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    )
  }

  return (
    <div className="text-right">
      {dateRange && (
        <p className="text-xs text-gray-500 mb-1">Data: {dateRange}</p>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download ({data.length} rows)
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleCSVDownload}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGoogleSheetsClipboard}>
            {copied ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copied to clipboard!' : 'Copy for Google Sheets'}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={openGoogleSheets}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Open Google Sheets
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 