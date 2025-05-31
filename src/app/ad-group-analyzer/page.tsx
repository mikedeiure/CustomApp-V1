'use client'

import { useState } from 'react'
import { Settings, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdGroupAnalyzerProvider, useAdGroupAnalyzer } from '@/lib/contexts/AdGroupAnalyzerContext'
import { CURRENCY_OPTIONS } from '@/lib/utils'

function AdGroupAnalyzerContent() {
  const [showSettings, setShowSettings] = useState(false)
  const { 
    settings, 
    setSheetUrl, 
    setCurrency, 
    refreshData, 
    isDataLoading, 
    dataError,
    fetchedData 
  } = useAdGroupAnalyzer()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string>()

  const handleUpdate = async () => {
    if (!settings.sheetUrl.trim()) {
      setError('Please enter a Google Sheet URL')
      return
    }

    setIsUpdating(true)
    setError(undefined)

    try {
      await refreshData()
      setShowSettings(false) // Close settings panel after successful update
    } catch (err) {
      console.error('Error updating Ad Group Analyzer data:', err)
      setError('Failed to update data. Please check your Sheet URL or network connection.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 py-12 mt-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ad Group Analyzer</h1>
          
          {/* Ad Group Analyzer specific settings wheel */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="h-10 w-10"
          >
            <Settings size={20} />
          </Button>
        </div>

        {/* Settings Panel for Ad Group Analyzer */}
        {showSettings && (
          <Card className="p-6 mb-8 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Ad Group Analyzer Settings</h2>
            <div className="space-y-6">
              <div>
                <Label htmlFor="adGroupSheetUrl" className="text-base">
                  Google Sheet URL for Ad Group Data
                </Label>
                <div className="mt-2">
                  <Input
                    id="adGroupSheetUrl"
                    value={settings.sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="Enter your Google Sheet URL for ad group analysis"
                    className="h-12"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  This should be a different Google Sheet URL than your main campaign data.
                </p>
              </div>

              <div>
                <Label className="text-base">Currency</Label>
                <div className="mt-2">
                  <Select value={settings.currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-12 w-[200px]">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(error || dataError) && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                  {error || 'Error loading data. Check URL or network connection.'}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleUpdate}
                  disabled={isUpdating || isDataLoading || !settings.sheetUrl.trim()}
                  className="h-12 bg-[#ea580c] hover:bg-[#c2410c] text-white"
                >
                  {isUpdating || isDataLoading ? (
                    'Updating...'
                  ) : (
                    <span className="flex items-center gap-2">
                      Update Data
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                  className="h-12"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Main content area */}
        <Card className="p-8 bg-white shadow-sm">
          <div className="text-center">
            {!settings.sheetUrl ? (
              <div className="text-gray-500">
                <h2 className="text-xl font-medium mb-4">Configure Ad Group Analyzer</h2>
                <p className="mb-4">Click the settings wheel above to configure your Google Sheet URL for ad group analysis.</p>
                <Button 
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  className="mx-auto"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Open Settings
                </Button>
              </div>
            ) : isDataLoading ? (
              <div className="text-gray-500">
                <h2 className="text-xl font-medium mb-4">Loading Ad Group Data...</h2>
                <p>Fetching data from your Google Sheet...</p>
              </div>
            ) : dataError ? (
              <div className="text-red-500">
                <h2 className="text-xl font-medium mb-4">Error Loading Data</h2>
                <p className="mb-4">Failed to load ad group data. Please check your settings.</p>
                <Button 
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Check Settings
                </Button>
              </div>
            ) : fetchedData ? (
              <div className="text-gray-700">
                <h2 className="text-xl font-medium mb-4">Ad Group Data Loaded Successfully</h2>
                <p className="mb-4">Your ad group analysis data has been loaded. Analysis features coming soon!</p>
                <div className="text-sm text-gray-500">
                  <p>Data source: {settings.sheetUrl}</p>
                  <p>Currency: {settings.currency}</p>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                <h2 className="text-xl font-medium mb-4">Ad Group Analyzer</h2>
                <p>Configure your settings to get started with ad group analysis.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function AdGroupAnalyzerPage() {
  return (
    <AdGroupAnalyzerProvider>
      <AdGroupAnalyzerContent />
    </AdGroupAnalyzerProvider>
  )
} 