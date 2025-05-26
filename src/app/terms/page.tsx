'use client'

import { useState, useMemo } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import type { SearchTermMetric, TabData } from '@/lib/types'
import { calculateAllSearchTermMetrics, type CalculatedSearchTermMetric } from '@/lib/metrics'
import { getDateRangeFromData, getDefaultDateRange } from '@/lib/dateUtils'
import { type MatchType } from '@/lib/export'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { MatchTypeSelector } from '@/components/MatchTypeSelector'
import { DownloadButton } from '@/components/DownloadButton'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Search, X } from 'lucide-react'

type SortField = keyof CalculatedSearchTermMetric
type SortDirection = 'asc' | 'desc'
type SearchMode = 'contains' | 'exact' | 'exclude'

const ROWS_PER_PAGE = 50

export default function TermsPage() {
    const { settings, fetchedData, dataError, isDataLoading } = useSettings()
    const [sortField, setSortField] = useState<SortField>('cost')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [currentPage, setCurrentPage] = useState(1)
    const [searchTerm, setSearchTerm] = useState('')
    const [searchMode, setSearchMode] = useState<SearchMode>('contains')
    const [matchType, setMatchType] = useState<MatchType>('broad')
    const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('')
    const [selectedAdGroupFilter, setSelectedAdGroupFilter] = useState<string>('')

    // --- Hooks called unconditionally at the top --- 
    const searchTermsRaw = useMemo(() => (fetchedData?.searchTerms || []) as SearchTermMetric[], [fetchedData]);

    // Extract unique campaigns from search terms data
    const campaignsFromSearchTerms = useMemo(() => {
        const campaignSet = new Set<string>()
        searchTermsRaw.forEach(term => {
            if (term.campaign && term.campaign.trim()) {
                campaignSet.add(term.campaign)
            }
        })
        return Array.from(campaignSet).sort()
    }, [searchTermsRaw])

    // Extract unique ad groups from search terms data (filtered by campaign if selected)
    const adGroupsFromSearchTerms = useMemo(() => {
        const adGroupSet = new Set<string>()
        const relevantTerms = selectedCampaignFilter 
            ? searchTermsRaw.filter(term => term.campaign === selectedCampaignFilter)
            : searchTermsRaw
            
        relevantTerms.forEach(term => {
            if (term.ad_group && term.ad_group.trim()) {
                adGroupSet.add(term.ad_group)
            }
        })
        return Array.from(adGroupSet).sort()
    }, [searchTermsRaw, selectedCampaignFilter])

    // Calculate date range from daily data
    const dateRange = useMemo(() => {
        const dailyData = fetchedData?.daily || []
        const range = getDateRangeFromData(dailyData)
        return range ? range.display : getDefaultDateRange()
    }, [fetchedData])

    // Filter search terms by campaign and ad group first, then calculate metrics
    const campaignAndAdGroupFilteredSearchTerms = useMemo(() => {
        let filtered = searchTermsRaw
        
        // Apply campaign filter if selected
        if (selectedCampaignFilter) {
            filtered = filtered.filter(term => term.campaign === selectedCampaignFilter)
        }
        
        // Apply ad group filter if selected
        if (selectedAdGroupFilter) {
            filtered = filtered.filter(term => term.ad_group === selectedAdGroupFilter)
        }
        
        return filtered
    }, [searchTermsRaw, selectedCampaignFilter, selectedAdGroupFilter])

    // Calculate derived metrics for filtered terms using useMemo
    const calculatedSearchTerms = useMemo(() => {
        return calculateAllSearchTermMetrics(campaignAndAdGroupFilteredSearchTerms)
    }, [campaignAndAdGroupFilteredSearchTerms])

    // Filter search terms based on search input and mode
    const filteredSearchTerms = useMemo(() => {
        if (!searchTerm.trim()) {
            return calculatedSearchTerms
        }

        const searchWords = searchTerm.toLowerCase().trim().split(/\s+/)
        
        return calculatedSearchTerms.filter(term => {
            const searchableText = `${term.search_term} ${term.campaign} ${term.ad_group}`.toLowerCase()
            
            switch (searchMode) {
                case 'contains':
                    return searchWords.every(word => searchableText.includes(word))
                
                case 'exact':
                    // For exact match, check if any of the individual fields exactly match the search term
                    const exactSearchTerm = searchTerm.toLowerCase().trim()
                    return term.search_term.toLowerCase() === exactSearchTerm ||
                           term.campaign.toLowerCase() === exactSearchTerm ||
                           term.ad_group.toLowerCase() === exactSearchTerm
                
                case 'exclude':
                    // For exclude, return items that do NOT contain any of the search words
                    return !searchWords.some(word => searchableText.includes(word))
                
                default:
                    return true
            }
        })
    }, [calculatedSearchTerms, searchTerm, searchMode])

    // Calculate totals across filtered search terms
    const totalsRow = useMemo(() => {
        if (!filteredSearchTerms.length) return null

        const totals = filteredSearchTerms.reduce((acc, term) => ({
            impr: acc.impr + term.impr,
            clicks: acc.clicks + term.clicks,
            cost: acc.cost + term.cost,
            conv: acc.conv + term.conv,
            value: acc.value + term.value,
        }), {
            impr: 0,
            clicks: 0,
            cost: 0,
            conv: 0,
            value: 0,
        })

        // Calculate derived metrics for totals
        const CTR = totals.impr > 0 ? (totals.clicks / totals.impr) * 100 : 0
        const CPC = totals.clicks > 0 ? totals.cost / totals.clicks : 0
        const CvR = totals.clicks > 0 ? (totals.conv / totals.clicks) * 100 : 0
        const CPA = totals.conv > 0 ? totals.cost / totals.conv : 0
        const ROAS = totals.cost > 0 ? totals.value / totals.cost : 0

        const getModeLabel = () => {
            switch (searchMode) {
                case 'contains': return 'filtered'
                case 'exact': return 'exact match'
                case 'exclude': return 'excluding'
                default: return 'filtered'
            }
        }

        const getTotalLabel = () => {
            const parts = []
            if (selectedCampaignFilter) parts.push('campaign filtered')
            if (selectedAdGroupFilter) parts.push('ad group filtered')
            if (searchTerm.trim()) parts.push(getModeLabel())
            return parts.length > 0 ? `Total (${parts.join(', ')})` : 'Total'
        }

        return {
            search_term: getTotalLabel(),
            campaign: '',
            ad_group: '',
            ...totals,
            CTR,
            CPC,
            CvR,
            CPA,
            ROAS,
        } as CalculatedSearchTermMetric
    }, [filteredSearchTerms, searchTerm, searchMode, selectedCampaignFilter, selectedAdGroupFilter])

    // Sort filtered data
    const sortedTerms = useMemo(() => {
        return [...filteredSearchTerms].sort((a, b) => {
            const aVal = a[sortField]
            const bVal = b[sortField]
            // Handle potential string sorting for non-numeric fields if necessary
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return aVal.localeCompare(bVal) * (sortDirection === 'asc' ? 1 : -1);
            }
            return (Number(aVal) - Number(bVal)) * (sortDirection === 'asc' ? 1 : -1)
        })
    }, [filteredSearchTerms, sortField, sortDirection])

    // Pagination calculations
    const totalRows = sortedTerms.length
    const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE)
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE
    const endIndex = startIndex + ROWS_PER_PAGE
    const currentPageData = sortedTerms.slice(startIndex, endIndex)

    // --- End of unconditional hooks ---

    // Handle loading and error states *after* hooks
    if (dataError) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-500 mb-4">Error loading data</div>
            </div>
        )
    }

    if (isDataLoading) {
        return <div className="p-8 text-center">Loading...</div>
    }

    const handleSort = (field: SortField) => {
        const isStringField = ['search_term', 'campaign', 'ad_group'].includes(field);
        const defaultDirection = isStringField ? 'asc' : 'desc';

        if (field === sortField) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection(defaultDirection)
        }
        // Reset to first page when sorting changes
        setCurrentPage(1)
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        // Scroll to top of table when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSearchChange = (value: string) => {
        setSearchTerm(value)
        setCurrentPage(1) // Reset to first page when search changes
    }

    const handleSearchModeChange = (mode: SearchMode) => {
        setSearchMode(mode)
        setCurrentPage(1) // Reset to first page when search mode changes
    }

    const clearSearch = () => {
        setSearchTerm('')
        setSearchMode('contains')
        setCurrentPage(1)
    }

    const handleCampaignFilterChange = (campaign: string) => {
        // Convert "all" back to empty string for our internal state
        setSelectedCampaignFilter(campaign === "all" ? "" : campaign)
        // Reset ad group filter when campaign changes
        setSelectedAdGroupFilter("")
        setCurrentPage(1) // Reset to first page when campaign filter changes
    }

    const handleAdGroupFilterChange = (adGroup: string) => {
        // Convert "all" back to empty string for our internal state
        setSelectedAdGroupFilter(adGroup === "all" ? "" : adGroup)
        setCurrentPage(1) // Reset to first page when ad group filter changes
    }

    const SortButton = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
        <Button
            variant="ghost"
            onClick={() => handleSort(field)}
            className="h-8 px-2 lg:px-3"
        >
            {children}
            {sortField === field && (
                <span className="ml-2">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
            )}
        </Button>
    )

    // Generate pagination items
    const renderPaginationItems = () => {
        const items = []
        const maxVisiblePages = 5

        if (totalPages <= maxVisiblePages) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                items.push(
                    <PaginationItem key={i}>
                        <PaginationLink
                            isActive={currentPage === i}
                            onClick={() => handlePageChange(i)}
                        >
                            {i}
                        </PaginationLink>
                    </PaginationItem>
                )
            }
        } else {
            // Show first page
            items.push(
                <PaginationItem key={1}>
                    <PaginationLink
                        isActive={currentPage === 1}
                        onClick={() => handlePageChange(1)}
                    >
                        1
                    </PaginationLink>
                </PaginationItem>
            )

            // Show ellipsis if needed
            if (currentPage > 3) {
                items.push(<PaginationEllipsis key="ellipsis1" />)
            }

            // Show pages around current page
            const startPage = Math.max(2, currentPage - 1)
            const endPage = Math.min(totalPages - 1, currentPage + 1)

            for (let i = startPage; i <= endPage; i++) {
                items.push(
                    <PaginationItem key={i}>
                        <PaginationLink
                            isActive={currentPage === i}
                            onClick={() => handlePageChange(i)}
                        >
                            {i}
                        </PaginationLink>
                    </PaginationItem>
                )
            }

            // Show ellipsis if needed
            if (currentPage < totalPages - 2) {
                items.push(<PaginationEllipsis key="ellipsis2" />)
            }

            // Show last page
            if (totalPages > 1) {
                items.push(
                    <PaginationItem key={totalPages}>
                        <PaginationLink
                            isActive={currentPage === totalPages}
                            onClick={() => handlePageChange(totalPages)}
                        >
                            {totalPages}
                        </PaginationLink>
                    </PaginationItem>
                )
            }
        }

        return items
    }

    const getResultsText = () => {
        const hasFilters = searchTerm.trim() || selectedCampaignFilter || selectedAdGroupFilter
        
        if (hasFilters) {
            const filters = []
            if (selectedCampaignFilter) {
                filters.push(`campaign "${selectedCampaignFilter}"`)
            }
            if (selectedAdGroupFilter) {
                filters.push(`ad group "${selectedAdGroupFilter}"`)
            }
            if (searchTerm.trim()) {
                const modeText = searchMode === 'contains' ? 'containing' : 
                               searchMode === 'exact' ? 'exactly matching' : 'excluding'
                filters.push(`${modeText} &quot;${searchTerm}&quot;`)
            }
            
            const originalCount = searchTermsRaw.length
            return `Showing ${startIndex + 1}-${Math.min(endIndex, totalRows)} of ${totalRows} search terms (${filters.join(', ')} from ${originalCount} total)`
        }
        return `Showing ${startIndex + 1}-${Math.min(endIndex, totalRows)} of ${totalRows} search terms`
    }

    const getSearchDescription = () => {
        switch (searchMode) {
            case 'contains':
                return `Searching for terms containing: &quot;${searchTerm}&quot;`
            case 'exact':
                return `Searching for exact matches of: &quot;${searchTerm}&quot;`
            case 'exclude':
                return `Excluding terms containing: &quot;${searchTerm}&quot;`
            default:
                return `Searching for: &quot;${searchTerm}&quot;`
        }
    }

    const getNoResultsMessage = () => {
        switch (searchMode) {
            case 'contains':
                return `No search terms found containing &quot;${searchTerm}&quot;`
            case 'exact':
                return `No search terms found exactly matching &quot;${searchTerm}&quot;`
            case 'exclude':
                return `All search terms contain &quot;${searchTerm}&quot; - no results to show`
            default:
                return 'No search terms found'
        }
    }

    return (
        <div className="container mx-auto px-4 py-12 mt-16">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Search Terms</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: getResultsText() }} />
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-sm text-gray-600">
                            Data for: <span className="font-medium">{dateRange}</span>
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <MatchTypeSelector 
                        value={matchType} 
                        onChange={setMatchType} 
                    />
                    <DownloadButton 
                        data={sortedTerms} 
                        filename={searchTerm.trim() ? `search-terms-${searchMode}-${searchTerm.replace(/\s+/g, '-')}` : 'search-terms-export'}
                        disabled={isDataLoading || !!dataError}
                        dateRange={dateRange}
                        matchType={matchType}
                    />
                </div>
            </div>

            {/* Campaign Filter */}
            <div className="mb-4">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Filter by Campaign:</label>
                    <Select value={selectedCampaignFilter || "all"} onValueChange={handleCampaignFilterChange}>
                        <SelectTrigger className="w-80">
                            <SelectValue placeholder="All Campaigns" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Campaigns</SelectItem>
                            {campaignsFromSearchTerms.map((campaign) => (
                                <SelectItem key={campaign} value={campaign}>
                                    {campaign}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedCampaignFilter && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCampaignFilterChange('all')}
                            className="text-xs"
                        >
                            Clear Filter
                        </Button>
                    )}
                </div>
            </div>

            {/* Ad Group Filter */}
            <div className="mb-4">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Filter by Ad Group:</label>
                    <Select value={selectedAdGroupFilter || "all"} onValueChange={handleAdGroupFilterChange}>
                        <SelectTrigger className="w-80">
                            <SelectValue placeholder="All Ad Groups" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Ad Groups</SelectItem>
                            {adGroupsFromSearchTerms.map((adGroup) => (
                                <SelectItem key={adGroup} value={adGroup}>
                                    {adGroup}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedAdGroupFilter && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdGroupFilterChange('all')}
                            className="text-xs"
                        >
                            Clear Filter
                        </Button>
                    )}
                </div>
            </div>

            {/* Search Input */}
            <div className="mb-6">
                <div className="flex gap-2 max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Filter search terms..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10 pr-10"
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearSearch}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-auto p-1 hover:bg-gray-100"
                            >
                                <X className="h-4 w-4 text-gray-400" />
                            </Button>
                        )}
                    </div>
                    <Select value={searchMode} onValueChange={handleSearchModeChange}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="exact">Exact</SelectItem>
                            <SelectItem value="exclude">Exclude</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {searchTerm.trim() && (
                    <p className="text-xs text-gray-500 mt-2" dangerouslySetInnerHTML={{ __html: getSearchDescription() }} />
                )}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">
                                <SortButton field="search_term">Search Term</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="campaign">Campaign</SortButton>
                            </TableHead>
                            <TableHead>
                                <SortButton field="ad_group">Ad Group</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="impr">Impr</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="clicks">Clicks</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="cost">Cost</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="conv">Conv</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="value">Value</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="CTR">CTR</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="CPC">CPC</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="CvR">CvR</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="CPA">CPA</SortButton>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortButton field="ROAS">ROAS</SortButton>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Totals Row */}
                        {totalsRow && (
                            <TableRow className="bg-gray-50 border-b-2 border-gray-200 font-semibold">
                                <TableCell className="font-bold text-gray-900">{totalsRow.search_term}</TableCell>
                                <TableCell className="text-gray-600">All Campaigns</TableCell>
                                <TableCell className="text-gray-600">All Ad Groups</TableCell>
                                <TableCell className="text-right">{formatNumber(totalsRow.impr)}</TableCell>
                                <TableCell className="text-right">{formatNumber(totalsRow.clicks)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totalsRow.cost, settings.currency)}</TableCell>
                                <TableCell className="text-right">{formatNumber(totalsRow.conv)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totalsRow.value, settings.currency)}</TableCell>
                                <TableCell className="text-right">{formatPercent(totalsRow.CTR)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totalsRow.CPC, settings.currency)}</TableCell>
                                <TableCell className="text-right">{formatPercent(totalsRow.CvR)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totalsRow.CPA, settings.currency)}</TableCell>
                                <TableCell className="text-right">
                                    {(totalsRow.ROAS && isFinite(totalsRow.ROAS)) ? `${totalsRow.ROAS.toFixed(2)}x` : '-'}
                                </TableCell>
                            </TableRow>
                        )}
                        
                        {/* Regular Data Rows */}
                        {currentPageData.length > 0 ? (
                            currentPageData.map((term, i) => (
                                <TableRow key={`${term.search_term}-${term.campaign}-${term.ad_group}-${startIndex + i}`}>
                                    <TableCell className="font-medium">{term.search_term}</TableCell>
                                    <TableCell>{term.campaign}</TableCell>
                                    <TableCell>{term.ad_group}</TableCell>
                                    <TableCell className="text-right">{formatNumber(term.impr)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(term.clicks)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(term.cost, settings.currency)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(term.conv)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(term.value, settings.currency)}</TableCell>
                                    <TableCell className="text-right">{formatPercent(term.CTR)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(term.CPC, settings.currency)}</TableCell>
                                    <TableCell className="text-right">{formatPercent(term.CvR)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(term.CPA, settings.currency)}</TableCell>
                                    <TableCell className="text-right">
                                        {(term.ROAS && isFinite(term.ROAS)) ? `${term.ROAS.toFixed(2)}x` : '-'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={13} className="text-center py-8 text-gray-500" dangerouslySetInnerHTML={{ __html: searchTerm.trim() ? getNoResultsMessage() : 'No search terms found' }} />
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-8">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious 
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                            {renderPaginationItems()}
                            <PaginationItem>
                                <PaginationNext 
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    )
} 