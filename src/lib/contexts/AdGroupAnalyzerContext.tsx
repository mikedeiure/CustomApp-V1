'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { fetchAdGroupData } from '../sheetsData'
import type { AdMetric } from '../types'

export interface AdGroupAnalyzerSettings {
  sheetUrl: string
  currency: string
}

export type AdGroupAnalyzerContextType = {
  settings: AdGroupAnalyzerSettings
  setSheetUrl: (url: string) => void
  setCurrency: (currency: string) => void
  fetchedData: { daily: AdMetric[] } | undefined
  dataError: any
  isDataLoading: boolean
  refreshData: () => void
  updateSettings: (newSettings: Partial<AdGroupAnalyzerSettings>) => void
}

const defaultSettings: AdGroupAnalyzerSettings = {
  sheetUrl: '',
  currency: '$',
}

const STORAGE_KEY = 'adGroupAnalyzerSettings'
const DATA_STORAGE_KEY = 'adGroupAnalyzerData'

const AdGroupAnalyzerContext = createContext<AdGroupAnalyzerContextType | undefined>(undefined)

export function AdGroupAnalyzerProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdGroupAnalyzerSettings>(defaultSettings)
  const [fetchedData, setFetchedData] = useState<{ daily: AdMetric[] } | undefined>(undefined)
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [dataError, setDataError] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load settings and data from localStorage on mount
  useEffect(() => {
    console.log('AdGroupAnalyzer: Starting initialization...')
    try {
      // Load settings
      const savedSettings = localStorage.getItem(STORAGE_KEY)
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        console.log('AdGroupAnalyzer: Loaded settings from localStorage:', parsedSettings)
        setSettings(prev => ({ ...prev, ...parsedSettings }))
      } else {
        console.log('AdGroupAnalyzer: No saved settings found')
      }

      // Load cached data
      const savedData = localStorage.getItem(DATA_STORAGE_KEY)
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        console.log('AdGroupAnalyzer: Found cached data, checking timestamp...')
        // Check if the data has a timestamp and is not too old (e.g., 1 hour)
        const now = Date.now()
        const oneHour = 60 * 60 * 1000
        if (parsedData.timestamp && (now - parsedData.timestamp) < oneHour) {
          console.log('AdGroupAnalyzer: Using cached data (fresh)')
          setFetchedData(parsedData.data)
        } else {
          console.log('AdGroupAnalyzer: Cached data is stale, removing...')
          // Remove old data
          localStorage.removeItem(DATA_STORAGE_KEY)
        }
      } else {
        console.log('AdGroupAnalyzer: No cached data found')
      }
      
      console.log('AdGroupAnalyzer: Initialization complete')
      setIsInitialized(true)
    } catch (error) {
      console.error('Error loading Ad Group Analyzer data from localStorage:', error)
      setIsInitialized(true)
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      console.log('AdGroupAnalyzer: Saving settings to localStorage:', settings)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch (error) {
        console.error('Error saving Ad Group Analyzer settings to localStorage:', error)
      }
    }
  }, [settings, isInitialized])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (fetchedData && isInitialized) {
      console.log('AdGroupAnalyzer: Saving data to localStorage, data length:', fetchedData.daily?.length || 0)
      try {
        const dataToSave = {
          data: fetchedData,
          timestamp: Date.now()
        }
        localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(dataToSave))
        console.log('Saved Ad Group Analyzer data to localStorage')
      } catch (error) {
        console.error('Error saving Ad Group Analyzer data to localStorage:', error)
      }
    }
  }, [fetchedData, isInitialized])

  // Function to fetch data
  const fetchData = async (url: string) => {
    console.log('AdGroupAnalyzer: fetchData called with URL:', url)
    if (!url.trim()) {
      console.log('AdGroupAnalyzer: Empty URL, clearing data')
      setFetchedData(undefined)
      setIsDataLoading(false)
      setDataError(null)
      // Clear cached data when URL is empty
      localStorage.removeItem(DATA_STORAGE_KEY)
      return
    }

    try {
      console.log('AdGroupAnalyzer: Starting data fetch...')
      setIsDataLoading(true)
      setDataError(null)
      console.log('Fetching Ad Group Analyzer data from:', url)
      
      const adGroupData = await fetchAdGroupData(url)
      console.log('Successfully fetched Ad Group Analyzer data:', adGroupData)
      
      // Structure the data to match the expected format
      setFetchedData({ daily: adGroupData })
      setIsDataLoading(false)
      console.log('AdGroupAnalyzer: Data fetch completed successfully')
    } catch (error) {
      console.error('Error fetching Ad Group Analyzer data:', error)
      setDataError(error)
      setIsDataLoading(false)
      console.log('AdGroupAnalyzer: Data fetch failed')
    }
  }

  // Fetch data when initialized and sheet URL exists but no cached data
  useEffect(() => {
    console.log('AdGroupAnalyzer: Data fetch effect triggered', {
      isInitialized,
      hasSheetUrl: !!settings.sheetUrl,
      hasFetchedData: !!fetchedData,
      isDataLoading
    })
    
    if (isInitialized && settings.sheetUrl && !fetchedData && !isDataLoading) {
      console.log('No cached data found, fetching fresh data...')
      fetchData(settings.sheetUrl)
    }
  }, [isInitialized, settings.sheetUrl, fetchedData, isDataLoading])

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