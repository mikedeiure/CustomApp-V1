'use client'

import { useState, useMemo } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import type { SearchTermMetric, TabData } from '@/lib/types'
import { calculateAllSearchTermMetrics, type CalculatedSearchTermMetric } from '@/lib/metrics'
import { getDateRangeFromData, getDefaultDateRange } from '@/lib/dateUtils'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
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

type SortField = keyof CalculatedSearchTermMetric
type SortDirection = 'asc' | 'desc'

const ROWS_PER_PAGE = 50

export default function TermsPage() {
    const { settings, fetchedData, dataError, isDataLoading } = useSettings()
    const [sortField, setSortField] = useState<SortField>('cost')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [currentPage, setCurrentPage] = useState(1)

    // --- Hooks called unconditionally at the top --- 
    const searchTermsRaw = useMemo(() => (fetchedData?.searchTerms || []) as SearchTermMetric[], [fetchedData]);

    // Calculate date range from daily data
    const dateRange = useMemo(() => {
        const dailyData = fetchedData?.daily || []
        const range = getDateRangeFromData(dailyData)
        return range ? range.display : getDefaultDateRange()
    }, [fetchedData])

    // Calculate derived metrics for all terms using useMemo
    const calculatedSearchTerms = useMemo(() => {
        return calculateAllSearchTermMetrics(searchTermsRaw)
    }, [searchTermsRaw])

    // Calculate totals across all search terms
    const totalsRow = useMemo(() => {
        if (!calculatedSearchTerms.length) return null

        const totals = calculatedSearchTerms.reduce((acc, term) => ({
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

        return {
            search_term: 'Total',
            campaign: '',
            ad_group: '',
            ...totals,
            CTR,
            CPC,
            CvR,
            CPA,
            ROAS,
        } as CalculatedSearchTermMetric
    }, [calculatedSearchTerms])

    // Sort data (now using calculated terms)
    const sortedTerms = useMemo(() => {
        return [...calculatedSearchTerms].sort((a, b) => {
            const aVal = a[sortField]
            const bVal = b[sortField]
            // Handle potential string sorting for non-numeric fields if necessary
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return aVal.localeCompare(bVal) * (sortDirection === 'asc' ? 1 : -1);
            }
            return (Number(aVal) - Number(bVal)) * (sortDirection === 'asc' ? 1 : -1)
        })
    }, [calculatedSearchTerms, sortField, sortDirection])

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

    return (
        <div className="container mx-auto px-4 py-12 mt-16">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Search Terms</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Showing {startIndex + 1}-{Math.min(endIndex, totalRows)} of {totalRows} search terms
                    </p>
                </div>
                <DownloadButton 
                    data={sortedTerms} 
                    filename="search-terms-export"
                    disabled={isDataLoading || !!dataError}
                    dateRange={dateRange}
                />
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
                        {currentPageData.map((term, i) => (
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
                        ))}
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