'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'
import type { AdMetric, DailyMetrics, TabData, Campaign } from '@/lib/types'
import { calculateDailyMetrics } from '@/lib/metrics'
import { MetricCard } from '@/components/MetricCard'
import { MetricsChart } from '@/components/MetricsChart'
import { CampaignSelect } from '@/components/CampaignSelect'
import { formatCurrency, formatConversions } from '@/lib/utils'
import { COLORS } from '@/lib/config'
import { Settings, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdGroupAnalyzerProvider, useAdGroupAnalyzer } from '@/lib/contexts/AdGroupAnalyzerContext'
import { CURRENCY_OPTIONS } from '@/lib/utils'

type DisplayMetric = 'cost' | 'cost_per_conversion' | 'target_cpa'

const metricConfig = {
    cost: { label: 'Cost', format: (v: number, currency: string) => formatCurrency(v, currency) },
    cost_per_conversion: { label: 'Cost Per Conversion', format: (v: number, currency: string) => formatCurrency(v, currency) },
    target_cpa: { label: 'Target CPA', format: (v: number, currency: string) => formatCurrency(v, currency) }
} as const

type DateRangeOption = 'all' | 'last7' | 'last14' | 'last30' | 'last90' | 'last180' | 'custom'

interface CustomDateRange {
    startDate: string
    endDate: string
}

const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last14', label: 'Last 14 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'last90', label: 'Last 90 Days' },
    { value: 'last180', label: 'Last 180 Days' },
    { value: 'custom', label: 'Custom Range' }
] as const

// Function to extract campaigns from ad group data
function getCampaignsFromAdGroupData(data: AdMetric[]): Campaign[] {
    const campaignMap = new Map<string, { name: string; totalCost: number }>()
    
    data.forEach(metric => {
        const campaignName = metric.campaign
        if (campaignName) {
            const existing = campaignMap.get(campaignName)
            campaignMap.set(campaignName, {
                name: campaignName,
                totalCost: (existing?.totalCost || 0) + metric.cost
            })
        }
    })

    return Array.from(campaignMap.entries())
        .map(([name, { totalCost }]) => ({ 
            id: name, // Use campaign name as ID for ad group data
            name, 
            totalCost 
        }))
        .sort((a, b) => b.totalCost - a.totalCost) // Sort by cost descending
}

function AdGroupAnalyzerContent() {
    const { 
        settings: agSettings, 
        setSheetUrl, 
        setCurrency, 
        refreshData, 
        isDataLoading: agIsDataLoading, 
        dataError: agDataError,
        fetchedData: agFetchedData 
    } = useAdGroupAnalyzer()
    
    const [showSettings, setShowSettings] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [error, setError] = useState<string>()
    
    const [selectedMetrics, setSelectedMetrics] = useState<[DisplayMetric, DisplayMetric]>(['cost', 'cost_per_conversion'])
    const [selectedCampaign, setSelectedCampaign] = useState<string>('')
    const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('last30')
    const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({ startDate: '', endDate: '' })
    const [sortOption, setSortOption] = useState<'cost' | 'alphabetical-desc' | 'alphabetical-asc'>('cost')

    // Use ad group analyzer data
    const activeData = agFetchedData?.daily || []
    const activeError = agDataError
    const activeLoading = agIsDataLoading

    // Extract campaigns from ad group data
    const adGroupCampaigns = useMemo(() => {
        if (!activeData || activeData.length === 0) return []
        return getCampaignsFromAdGroupData(activeData)
    }, [activeData])

    // Get the date range for the most recent data
    const getDataDateRange = (): { minDate: string, maxDate: string } => {
        if (!activeData || activeData.length === 0) {
            return { minDate: '', maxDate: '' }
        }
        
        const dates = activeData.map((d: AdMetric) => d.date).sort()
        return { minDate: dates[0], maxDate: dates[dates.length - 1] }
    }

    // Calculate date range based on selected option
    const getActiveDateRange = (): { startDate: string, endDate: string } => {
        const { minDate, maxDate } = getDataDateRange()
        
        if (!maxDate) return { startDate: '', endDate: '' }
        
        if (dateRangeOption === 'all') {
            return { startDate: minDate, endDate: maxDate }
        }
        
        if (dateRangeOption === 'custom') {
            return customDateRange
        }
        
        // Calculate preset ranges
        const endDate = new Date(maxDate)
        const startDate = new Date(endDate)
        
        switch (dateRangeOption) {
            case 'last7':
                startDate.setDate(endDate.getDate() - 6)
                break
            case 'last14':
                startDate.setDate(endDate.getDate() - 13)
                break
            case 'last30':
                startDate.setDate(endDate.getDate() - 29)
                break
            case 'last90':
                startDate.setDate(endDate.getDate() - 89)
                break
            case 'last180':
                startDate.setDate(endDate.getDate() - 179)
                break
            default:
                return { startDate: minDate, endDate: maxDate }
        }
        
        // Format dates as YYYY-MM-DD strings
        const formatDate = (date: Date) => date.toISOString().split('T')[0]
        
        return {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
        }
    }

    // Check if a date is within the selected range
    const isDateInRange = (date: string): boolean => {
        const { startDate, endDate } = getActiveDateRange()
        
        if (!startDate || !endDate) return true
        
        return date >= startDate && date <= endDate
    }

    // Get data for selected campaign and/or date range
    const getFilteredData = (): AdMetric[] => {
        if (!activeData) return []
        
        let filtered = activeData

        // Filter by date range
        filtered = filtered.filter((d: AdMetric) => isDateInRange(d.date))

        // Filter by campaign if selected
        if (selectedCampaign) {
            filtered = filtered.filter((d: AdMetric) => d.campaign === selectedCampaign)
        }
        
        return filtered
    }

    // Group data by ad group for display
    const getAdGroupsWithData = () => {
        if (!activeData) return []
        
        let dataToGroup = activeData

        // Filter by date range
        dataToGroup = dataToGroup.filter((d: AdMetric) => isDateInRange(d.date))

        // Filter by campaign if selected
        if (selectedCampaign) {
            dataToGroup = dataToGroup.filter((d: AdMetric) => d.campaign === selectedCampaign)
        }
        
        const adGroupsMap = new Map<string, { 
            adGroup: string, 
            campaign: string, 
            data: AdMetric[], 
            totals: { cost: number, conversions: number, cost_per_conversion: number, target_cpa: number } 
        }>()
        
        dataToGroup.forEach((metric: AdMetric) => {
            const adGroupName = metric.ad_group || 'Unknown Ad Group'
            if (!adGroupsMap.has(adGroupName)) {
                adGroupsMap.set(adGroupName, {
                    adGroup: adGroupName,
                    campaign: metric.campaign,
                    data: [],
                    totals: { cost: 0, conversions: 0, cost_per_conversion: 0, target_cpa: 0 }
                })
            }
            
            const group = adGroupsMap.get(adGroupName)!
            group.data.push(metric)
            group.totals.cost += metric.cost
            group.totals.conversions += metric.conversions || metric.conv || 0
        })
        
        // Calculate cost per conversion and target CPA for totals
        adGroupsMap.forEach(group => {
            group.totals.cost_per_conversion = group.totals.conversions > 0 ? 
                group.totals.cost / group.totals.conversions : 0
            
            // Get target CPA from the most recent date
            const sortedByDate = group.data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            group.totals.target_cpa = sortedByDate.length > 0 ? 
                (sortedByDate[0].adgroup_target_cpa || 0) : 0
        })
        
        const adGroupsArray = Array.from(adGroupsMap.values())
        
        // Sort based on selected option
        if (sortOption === 'cost') {
            return adGroupsArray.sort((a, b) => b.totals.cost - a.totals.cost) // Cost descending (high to low)
        } else if (sortOption === 'alphabetical-desc') {
            return adGroupsArray.sort((a, b) => b.adGroup.localeCompare(a.adGroup)) // Alphabetical descending (Z to A)
        } else {
            return adGroupsArray.sort((a, b) => a.adGroup.localeCompare(b.adGroup)) // Alphabetical ascending (A to Z)
        }
    }

    const dailyMetrics = calculateDailyMetrics(getFilteredData())
    const adGroupsWithData = getAdGroupsWithData()
    const { minDate, maxDate } = getDataDateRange()

    const handleMetricClick = (metric: DisplayMetric) => {
        setSelectedMetrics(prev => [prev[1], metric])
    }

    const handleDateRangeChange = (option: DateRangeOption) => {
        setDateRangeOption(option)
        if (option !== 'custom') {
            setCustomDateRange({ startDate: '', endDate: '' })
        }
    }

    // Format date range for display
    const formatDateRangeDisplay = (): string => {
        const { startDate, endDate } = getActiveDateRange()
        
        if (!startDate || !endDate) return ''
        
        const start = new Date(startDate).toLocaleDateString()
        const end = new Date(endDate).toLocaleDateString()
        
        return `${start} - ${end}`
    }

    const handleUpdate = async () => {
        if (!agSettings.sheetUrl.trim()) {
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
            <div className="max-w-[1400px] mx-auto px-4 py-6 mt-16">
                <div className="flex items-center justify-between mb-6">
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
                    <Card className="p-6 mb-6 bg-white shadow-sm">
                        <h2 className="text-xl font-semibold mb-6">Ad Group Analyzer Settings</h2>
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="adGroupSheetUrl" className="text-base">
                                    Google Sheet URL for Ad Group Data
                                </Label>
                                <div className="mt-2">
                                    <Input
                                        id="adGroupSheetUrl"
                                        value={agSettings.sheetUrl}
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
                                    <Select value={agSettings.currency} onValueChange={setCurrency}>
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

                            {(error || activeError) && (
                                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                                    {error || 'Error loading data. Check URL or network connection.'}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleUpdate}
                                    disabled={isUpdating || activeLoading || !agSettings.sheetUrl.trim()}
                                    className="h-12 bg-[#ea580c] hover:bg-[#c2410c] text-white"
                                >
                                    {isUpdating || activeLoading ? (
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
                {!agSettings.sheetUrl ? (
                    <Card className="p-8 bg-white shadow-sm">
                        <div className="text-center text-gray-500">
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
                    </Card>
                ) : activeLoading ? (
                    <Card className="p-8 bg-white shadow-sm">
                        <div className="text-center text-gray-500">
                            <h2 className="text-xl font-medium mb-4">Loading Ad Group Data...</h2>
                            <p>Fetching data from your Google Sheet...</p>
                        </div>
                    </Card>
                ) : activeError ? (
                    <Card className="p-8 bg-white shadow-sm">
                        <div className="text-center text-red-500">
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
                    </Card>
                ) : adGroupsWithData.length === 0 ? (
                    <Card className="p-8 bg-white shadow-sm">
                        <div className="text-center text-gray-500">
                            <h2 className="text-xl font-medium mb-4">No Ad Group Data Found</h2>
                            <p>No ad group data available for the selected filters.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {activeError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                                Failed to load data. Please check your Sheet URL.
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div>
                                <CampaignSelect
                                    campaigns={adGroupCampaigns}
                                    selectedId={selectedCampaign}
                                    onSelect={setSelectedCampaign}
                                />
                            </div>
                            <div>
                                <label htmlFor="date-range-filter-overview" className="block text-lg font-semibold text-gray-900 mb-3">
                                    Date Range
                                </label>
                                <select
                                    id="date-range-filter-overview"
                                    value={dateRangeOption}
                                    onChange={(e) => handleDateRangeChange(e.target.value as DateRangeOption)}
                                    className="block w-full px-4 py-3 text-base rounded-lg border border-gray-200 bg-white shadow-sm 
                                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                      hover:border-gray-300 transition-colors"
                                >
                                    {dateRangeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="sort-filter-overview" className="block text-lg font-semibold text-gray-900 mb-3">
                                    Sort By
                                </label>
                                <select
                                    id="sort-filter-overview"
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value as 'cost' | 'alphabetical-desc' | 'alphabetical-asc')}
                                    className="block w-full px-4 py-3 text-base rounded-lg border border-gray-200 bg-white shadow-sm 
                                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                      hover:border-gray-300 transition-colors"
                                >
                                    <option value="cost">Cost (High to Low)</option>
                                    <option value="alphabetical-desc">Alphabetical (Z to A)</option>
                                    <option value="alphabetical-asc">Alphabetical (A to Z)</option>
                                </select>
                            </div>
                        </div>

                        {dateRangeOption === 'custom' && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="start-date-overview" className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            id="start-date-overview"
                                            value={customDateRange.startDate}
                                            min={minDate}
                                            max={maxDate}
                                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                                              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="end-date-overview" className="block text-sm font-medium text-gray-700 mb-2">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            id="end-date-overview"
                                            value={customDateRange.endDate}
                                            min={customDateRange.startDate || minDate}
                                            max={maxDate}
                                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                                              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {dateRangeOption !== 'all' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-blue-800 font-medium">
                                    Showing data for: {formatDateRangeDisplay()}
                                </p>
                            </div>
                        )}

                        {selectedCampaign && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-800 font-medium">
                                    Showing {adGroupsWithData.length} ad groups for campaign: <span className="font-bold">{adGroupCampaigns.find(c => c.id === selectedCampaign)?.name || selectedCampaign}</span>
                                </p>
                            </div>
                        )}

                        <div className="grid gap-6">
                            {adGroupsWithData.map(({ adGroup, campaign, data, totals }) => (
                                <div 
                                    key={adGroup} 
                                    className="bg-white rounded-lg border border-gray-200 p-6"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{adGroup}</h3>
                                            <p className="text-sm text-gray-600">{campaign}</p>
                                        </div>
                                        <div className="flex gap-6 text-center">
                                            <div>
                                                <div className="text-xl font-bold text-gray-900">
                                                    {formatCurrency(totals.cost, agSettings.currency)}
                                                </div>
                                                <div className="text-xs text-gray-600">COST</div>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-gray-900">
                                                    {formatCurrency(totals.cost_per_conversion, agSettings.currency)}
                                                </div>
                                                <div className="text-xs text-gray-600">COST PER CONVERSION</div>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-gray-900">
                                                    {formatCurrency(totals.target_cpa, agSettings.currency)}
                                                </div>
                                                <div className="text-xs text-gray-600">TARGET CPA</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <MetricsChart
                                        data={data}
                                        metric1={{
                                            key: 'cost',
                                            label: 'Cost',
                                            color: COLORS.primary,
                                            format: (v: number) => formatCurrency(v, agSettings.currency)
                                        }}
                                        metric2={{
                                            key: 'cost_per_conversion',
                                            label: 'Cost Per Conversion',
                                            color: COLORS.secondary,
                                            format: (v: number) => formatCurrency(v, agSettings.currency)
                                        }}
                                        hideControls={true}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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