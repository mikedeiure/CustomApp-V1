// src/lib/sheetsData.ts
import type { AdMetric, SearchTermMetric, TabData, Campaign } from './types'
import { TAB_CONFIGS, type SheetTab } from './config'

async function fetchTabData(sheetUrl: string, tab: SheetTab): Promise<AdMetric[] | SearchTermMetric[]> {
  try {
    const urlWithTab = `${sheetUrl}?tab=${tab}`
    console.log(`Fetching ${tab} data from:`, urlWithTab)
    
    const response = await fetch(urlWithTab)
    console.log(`Response for ${tab}:`, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch data for tab ${tab}: ${response.status} ${response.statusText}`)
    }

    const rawData = await response.json()
    console.log(`Raw data for ${tab}:`, Array.isArray(rawData) ? `Array with ${rawData.length} items` : rawData)

    if (!Array.isArray(rawData)) {
      throw new Error(`Expected array but got ${typeof rawData} for tab ${tab}`)
    }

    return rawData
  } catch (error) {
    console.error(`Error fetching ${tab} data:`, error)
    throw error
  }
}

// New function specifically for Ad Group Analyzer data
export async function fetchAdGroupData(sheetUrl: string): Promise<AdMetric[]> {
  try {
    const urlWithTab = `${sheetUrl}?tab=AdGroupDaily`
    console.log('Fetching Ad Group data from:', urlWithTab)
    
    const response = await fetch(urlWithTab)
    console.log('Response for AdGroupDaily:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Ad Group data: ${response.status} ${response.statusText}`)
    }

    const rawData = await response.json()
    console.log('Raw Ad Group data:', Array.isArray(rawData) ? `Array with ${rawData.length} items` : rawData)

    if (!Array.isArray(rawData)) {
      throw new Error(`Expected array but got ${typeof rawData} for Ad Group data`)
    }

    // Map the ad group data to AdMetric format
    // Google Ads script headers: ["ad_group", "campaign", "date", "cost", "conv", "cost_per_conv", "adgroup_target_cpa"]
    const mappedData: AdMetric[] = rawData.map((item: any) => ({
      campaign: item.campaign || '',
      campaignId: item.campaign || '', // Use campaign name as ID for ad group data
      clicks: 0, // Not available in ad group data
      value: 0, // Not available in ad group data
      conv: item.conv || 0,
      conversions: item.conv || 0, // Map conv to conversions for consistency
      cost: item.cost || 0,
      cost_per_conversion: item.cost_per_conv || 0, // Map cost_per_conv to cost_per_conversion
      impr: 0, // Not available in ad group data
      date: item.date || '',
      ad_group: item.ad_group || '',
      adgroup_target_cpa: item.adgroup_target_cpa || 0 // Map adgroup_target_cpa
    }))

    console.log('Mapped Ad Group data:', mappedData.length, 'items')
    return mappedData
  } catch (error) {
    console.error('Error fetching Ad Group data:', error)
    throw error
  }
}

export async function fetchAllTabsData(sheetUrl: string): Promise<TabData> {
  try {
    console.log('Fetching all tabs data from:', sheetUrl)
    
    const [dailyData, searchTermsData] = await Promise.all([
      fetchTabData(sheetUrl, 'daily'),
      fetchTabData(sheetUrl, 'searchTerms')
    ])

    const tabData: TabData = {
      daily: dailyData as AdMetric[],
      searchTerms: searchTermsData as SearchTermMetric[]
    }

    console.log('Successfully fetched all data:', {
      daily: tabData.daily.length,
      searchTerms: tabData.searchTerms.length
    })

    return tabData
  } catch (error) {
    console.error('Failed to fetch all tabs data:', error)
    throw error
  }
}

export function getCampaigns(daily: AdMetric[]): Campaign[] {
  const campaignMap = new Map<string, { name: string; totalCost: number }>()
  
  daily.forEach(metric => {
    if (metric.campaignId && metric.campaign) {
      const campaignId = String(metric.campaignId) // Ensure string conversion
      const existing = campaignMap.get(campaignId)
      campaignMap.set(campaignId, {
        name: metric.campaign,
        totalCost: (existing?.totalCost || 0) + metric.cost
      })
    }
  })

  return Array.from(campaignMap.entries())
    .map(([id, { name, totalCost }]) => ({ id, name, totalCost }))
    .sort((a, b) => b.totalCost - a.totalCost) // Sort by cost descending
}

export function getMetricsByDate(data: AdMetric[], campaignId: string): AdMetric[] {
  return data
    .filter(metric => String(metric.campaignId) === String(campaignId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function getMetricOptions(activeTab: SheetTab = 'daily') {
  return TAB_CONFIGS[activeTab]?.metrics || {}
}

// SWR configuration
export const swrConfig = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000
} 