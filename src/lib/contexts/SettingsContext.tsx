// src/lib/contexts/SettingsContext.tsx
'use client'
import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { Campaign, Settings, TabData } from '../types'
import { DEFAULT_SHEET_URL } from '../config'
import { fetchAllTabsData, getCampaigns } from '../sheetsData'

export type SettingsContextType = {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
  setSheetUrl: (url: string) => void
  setCurrency: (currency: string) => void
  setSelectedCampaign: (campaignId: string) => void
  fetchedData: TabData | undefined
  dataError: any
  isDataLoading: boolean
  refreshData: () => void
  campaigns: Campaign[]
}

const defaultSettings: Settings = {
  sheetUrl: DEFAULT_SHEET_URL,
  currency: '$',
  selectedCampaign: undefined,
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [fetchedData, setFetchedData] = useState<TabData | undefined>(undefined)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [dataError, setDataError] = useState<any>(null)

  // Function to fetch data
  const fetchData = async (url: string) => {
    try {
      setIsDataLoading(true)
      setDataError(null)
      console.log('Fetching data from:', url)
      
      const data = await fetchAllTabsData(url)
      console.log('Successfully fetched data:', data)
      
      setFetchedData(data)
      setIsDataLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setDataError(error)
      setIsDataLoading(false)
    }
  }

  // Fetch data when sheet URL changes
  useEffect(() => {
    fetchData(settings.sheetUrl)
  }, [settings.sheetUrl])

  const campaigns: Campaign[] = useMemo(() => {
    if (!fetchedData?.daily) return []
    return getCampaigns(fetchedData.daily)
  }, [fetchedData])

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const setSheetUrl = (url: string) => {
    updateSettings({ sheetUrl: url })
  }

  const setCurrency = (currency: string) => {
    updateSettings({ currency })
  }

  const setSelectedCampaign = (campaignId: string) => {
    updateSettings({ selectedCampaign: campaignId })
  }

  const refreshData = () => {
    fetchData(settings.sheetUrl)
  }

  const value: SettingsContextType = {
    settings,
    updateSettings,
    setSheetUrl,
    setCurrency,
    setSelectedCampaign,
    fetchedData,
    dataError,
    isDataLoading,
    refreshData,
    campaigns,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
} 