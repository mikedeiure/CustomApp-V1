'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { fetchAllTabsData } from '../sheetsData'

export interface AdGroupAnalyzerSettings {
  sheetUrl: string
  currency: string
}

export type AdGroupAnalyzerContextType = {
  settings: AdGroupAnalyzerSettings
  setSheetUrl: (url: string) => void
  setCurrency: (currency: string) => void
  fetchedData: any | undefined
  dataError: any
  isDataLoading: boolean
  refreshData: () => void
  updateSettings: (newSettings: Partial<AdGroupAnalyzerSettings>) => void
}

const defaultSettings: AdGroupAnalyzerSettings = {
  sheetUrl: '',
  currency: '$',
}

const AdGroupAnalyzerContext = createContext<AdGroupAnalyzerContextType | undefined>(undefined)

export function AdGroupAnalyzerProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdGroupAnalyzerSettings>(defaultSettings)
  const [fetchedData, setFetchedData] = useState<any | undefined>(undefined)
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [dataError, setDataError] = useState<any>(null)

  // Function to fetch data
  const fetchData = async (url: string) => {
    if (!url.trim()) {
      setFetchedData(undefined)
      setIsDataLoading(false)
      setDataError(null)
      return
    }

    try {
      setIsDataLoading(true)
      setDataError(null)
      console.log('Fetching Ad Group Analyzer data from:', url)
      
      const data = await fetchAllTabsData(url)
      console.log('Successfully fetched Ad Group Analyzer data:', data)
      
      setFetchedData(data)
      setIsDataLoading(false)
    } catch (error) {
      console.error('Error fetching Ad Group Analyzer data:', error)
      setDataError(error)
      setIsDataLoading(false)
    }
  }

  // Fetch data when sheet URL changes
  useEffect(() => {
    if (settings.sheetUrl) {
      fetchData(settings.sheetUrl)
    }
  }, [settings.sheetUrl])

  const updateSettings = (newSettings: Partial<AdGroupAnalyzerSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const setSheetUrl = (url: string) => {
    updateSettings({ sheetUrl: url })
  }

  const setCurrency = (currency: string) => {
    updateSettings({ currency })
  }

  const refreshData = () => {
    if (settings.sheetUrl) {
      fetchData(settings.sheetUrl)
    }
  }

  const value: AdGroupAnalyzerContextType = {
    settings,
    setSheetUrl,
    setCurrency,
    fetchedData,
    dataError,
    isDataLoading,
    refreshData,
    updateSettings,
  }

  return (
    <AdGroupAnalyzerContext.Provider value={value}>
      {children}
    </AdGroupAnalyzerContext.Provider>
  )
}

export function useAdGroupAnalyzer() {
  const context = useContext(AdGroupAnalyzerContext)
  if (context === undefined) {
    throw new Error('useAdGroupAnalyzer must be used within an AdGroupAnalyzerProvider')
  }
  return context
} 