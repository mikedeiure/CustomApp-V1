'use client'

import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, 
  Plus, 
  X, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Info,
  TrendingUp
} from 'lucide-react'

// Types for our Data Insights page
type LLMProvider = 'gemini' | 'openai' | 'claude'

interface DataSource {
  id: string
  name: string
  description: string
  dataKey: 'daily' | 'searchTerms' | 'adGroups'
}

interface SmartFilter {
  id: string
  name: string
  description: string
  dataSource: string[]
  conditions: any[] // Will be defined later based on actual filtering logic
}

interface OptimizationTemplate {
  id: string
  name: string
  description: string
  dataSource: string[]
  prompt: string
}

// Configuration constants
const DATA_SOURCES: DataSource[] = [
  {
    id: 'campaign-stats',
    name: 'Google Campaign Stats',
    description: 'Daily campaign performance metrics from the main dashboard',
    dataKey: 'daily'
  },
  {
    id: 'search-terms',
    name: 'Search Terms',
    description: 'Search term and keyword performance analysis',
    dataKey: 'searchTerms'
  },
  {
    id: 'ad-group-analyzer',
    name: 'Ad Group Analyzer',
    description: 'Ad group level performance and optimization insights',
    dataKey: 'daily' // Using daily data filtered for ad groups for now
  }
]

const SMART_FILTERS: SmartFilter[] = [
  // Campaign Stats Filters
  {
    id: 'high-budget-low-roas',
    name: 'High Budget, Low ROAS',
    description: 'Campaigns with high spending but poor return on ad spend',
    dataSource: ['campaign-stats'],
    conditions: []
  },
  {
    id: 'underperforming-campaigns',
    name: 'Underperforming Campaigns',
    description: 'Campaigns below account average performance',
    dataSource: ['campaign-stats'],
    conditions: []
  },
  // Search Terms Filters
  {
    id: 'wasted-spend-keywords',
    name: 'Wasted Spend Keywords',
    description: 'Keywords with high cost but zero conversions',
    dataSource: ['search-terms'],
    conditions: []
  },
  {
    id: 'high-volume-low-quality',
    name: 'High Volume, Low Quality Keywords',
    description: 'Keywords with high impressions but low CTR',
    dataSource: ['search-terms'],
    conditions: []
  },
  {
    id: 'top-performing-keywords',
    name: 'Top Performing Keywords',
    description: 'Keywords with high ROAS and good CTR',
    dataSource: ['search-terms'],
    conditions: []
  },
  // Ad Group Analyzer Filters
  {
    id: 'high-cost-low-performance-adgroups',
    name: 'High Cost, Low Performance Ad Groups',
    description: 'Ad groups with high CPA and low conversion rates',
    dataSource: ['ad-group-analyzer'],
    conditions: []
  },
  {
    id: 'adgroups-high-cpa',
    name: 'Ad Groups with High CPA',
    description: 'Ad groups exceeding target cost per acquisition',
    dataSource: ['ad-group-analyzer'],
    conditions: []
  }
]

const OPTIMIZATION_TEMPLATES: OptimizationTemplate[] = [
  // Campaign Stats Templates
  {
    id: 'campaign-budget-optimization',
    name: 'Campaign Budget Optimization',
    description: 'Analyze budget allocation and spending efficiency',
    dataSource: ['campaign-stats'],
    prompt: 'Analyze the campaign budget allocation and spending patterns. Identify opportunities to reallocate budget from underperforming campaigns to high-performing ones. Focus on ROAS, cost efficiency, and growth potential.'
  },
  {
    id: 'campaign-structure-analysis',
    name: 'Campaign Structure Analysis', 
    description: 'Review overall campaign organization and strategy',
    dataSource: ['campaign-stats'],
    prompt: 'Review the campaign structure and organization. Identify opportunities to consolidate, restructure, or create new campaigns based on performance patterns and business objectives.'
  },
  // Search Terms Templates
  {
    id: 'keyword-expansion',
    name: 'Keyword Expansion Opportunities',
    description: 'Find new keyword opportunities',
    dataSource: ['search-terms'],
    prompt: 'Analyze search term performance to identify keyword expansion opportunities. Find high-performing search queries that should be added as keywords and recommend match types.'
  },
  {
    id: 'negative-keyword-recommendations',
    name: 'Negative Keyword Recommendations',
    description: 'Identify negative keyword opportunities',
    dataSource: ['search-terms'],
    prompt: 'Identify search terms that are generating clicks but not conversions. Recommend negative keywords to add at campaign and ad group levels to reduce wasted spend.'
  },
  {
    id: 'match-type-optimization',
    name: 'Match Type Optimization',
    description: 'Optimize keyword match types',
    dataSource: ['search-terms'],
    prompt: 'Analyze keyword performance by match type. Recommend match type changes to improve targeting precision and reduce costs while maintaining reach.'
  },
  // Ad Group Templates
  {
    id: 'adgroup-restructuring',
    name: 'Ad Group Restructuring Opportunities',
    description: 'Identify ad group optimization opportunities',
    dataSource: ['ad-group-analyzer'],
    prompt: 'Analyze ad group performance and structure. Identify opportunities to reorganize ad groups, adjust targeting, and optimize bid strategies for better performance and cost efficiency.'
  },
  {
    id: 'adgroup-bid-optimization',
    name: 'Ad Group Bid Strategy Optimization',
    description: 'Optimize bidding strategies at ad group level',
    dataSource: ['ad-group-analyzer'],
    prompt: 'Review ad group bid strategies and performance. Recommend bid adjustments, strategy changes, and target CPA optimizations based on conversion data and competition.'
  },
  // Universal Templates
  {
    id: 'general-performance-analysis',
    name: 'General Performance Analysis',
    description: 'Comprehensive performance review and optimization',
    dataSource: ['campaign-stats', 'search-terms', 'ad-group-analyzer'],
    prompt: 'Perform a comprehensive analysis of the selected data. Identify performance patterns, optimization opportunities, and provide specific recommendations to improve overall campaign performance and ROI.'
  },
  {
    id: 'custom-analysis',
    name: 'Custom Analysis',
    description: 'Define your own analysis prompt',
    dataSource: ['campaign-stats', 'search-terms', 'ad-group-analyzer'],
    prompt: 'Analyze the Google Ads data and provide actionable insights. Focus on identifying optimization opportunities, cost reduction strategies, and performance improvement recommendations.'
  }
]

const LLM_PROVIDERS = [
  { id: 'openai', name: 'OpenAI GPT-4 Turbo', description: 'Advanced language model with excellent analysis capabilities' },
  { id: 'claude', name: 'Anthropic Claude 4', description: 'Latest Claude model optimized for detailed insights and analysis' },
  { id: 'gemini', name: 'Google Gemini Pro', description: 'Coming soon - Google\'s multimodal AI model' }
]

const ROW_COUNT_OPTIONS = [5, 10, 30, 50, 100]

// Add interface for token usage
interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost?: number
}

export default function DataInsightsPage() {
  const { fetchedData, isDataLoading, dataError, settings } = useSettings()
  
  // State management
  const [selectedDataSource, setSelectedDataSource] = useState<string>('campaign-stats')
  const [previewRowCount, setPreviewRowCount] = useState(10)
  const [selectedLLM, setSelectedLLM] = useState<LLMProvider>('openai') // Changed default to OpenAI
  const [apiKey, setApiKey] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('general-performance-analysis')
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [insights, setInsights] = useState<string>('')
  const [insightsError, setInsightsError] = useState<string>('')
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null)

  // Derived data
  const currentDataSource = DATA_SOURCES.find(ds => ds.id === selectedDataSource)
  const currentTemplate = OPTIMIZATION_TEMPLATES.find(t => t.id === selectedTemplate)
  const availableSmartFilters = SMART_FILTERS.filter(filter => 
    filter.dataSource.includes(selectedDataSource)
  )
  const availableTemplates = OPTIMIZATION_TEMPLATES.filter(template =>
    template.dataSource.includes(selectedDataSource)
  )

  // Mock data for preview (will be replaced with actual data processing)
  const previewData = useMemo(() => {
    if (!fetchedData || !currentDataSource) return []
    
    const data = currentDataSource.dataKey === 'daily' ? fetchedData.daily : 
                 currentDataSource.dataKey === 'searchTerms' ? fetchedData.searchTerms : []
    
    return data.slice(0, previewRowCount)
  }, [fetchedData, currentDataSource, previewRowCount])

  const handleGenerateInsights = async () => {
    const promptToUse = selectedTemplate === 'custom-analysis' ? customPrompt : currentTemplate?.prompt
    if (!promptToUse?.trim()) return
    
    setIsGeneratingInsights(true)
    setInsightsError('')
    setTokenUsage(null)
    
    try {
      // Prepare the request payload
      const requestPayload = {
        prompt: promptToUse,
        data: previewData,
        context: {
          dataSource: currentDataSource?.name || selectedDataSource,
          rowCount: previewData.length,
          filters: [] // TODO: Add actual filters when implemented
        },
        provider: selectedLLM,
        apiKey: apiKey
      }

      // Call the insights API
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate insights')
      }

      setInsights(result.insights)
      if (result.tokenUsage) {
        setTokenUsage(result.tokenUsage)
      }

    } catch (error: any) {
      console.error('Error generating insights:', error)
      setInsightsError(error.message || 'Failed to generate insights. Please try again.')
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  if (isDataLoading) {
    return (
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading Google Ads data...</span>
        </div>
      </div>
    )
  }

  if (dataError || !fetchedData) {
    return (
      <div className="container mx-auto px-4 pt-20 pb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-red-600">
                {dataError ? 'Error loading data' : 'No data available'}
              </div>
              <p className="text-sm text-muted-foreground">
                Please check your Google Sheet URL in settings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-20 pb-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Insights</h1>
          <p className="text-muted-foreground">
            AI-powered optimization analysis for Google Ads campaigns, ad groups, and keywords
          </p>
        </div>
      </div>

      {/* Data Source Selection */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Data Source</h2>
          <p className="text-muted-foreground">Select the dataset you want to analyze</p>
        </div>
        <div className="max-w-xs">
          <Select value={selectedDataSource} onValueChange={setSelectedDataSource}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATA_SOURCES.map(source => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
          <CardDescription>
            Preview of your filtered dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Label>Rows to display:</Label>
              <Select value={previewRowCount.toString()} onValueChange={(value) => setPreviewRowCount(Number(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROW_COUNT_OPTIONS.map(count => (
                    <SelectItem key={count} value={count.toString()}>
                      {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary">
              {previewData.length} rows shown
            </Badge>
          </div>

          {previewData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data matches your current filters
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="text-sm text-muted-foreground p-4 bg-muted/50">
                🚧 Data preview table will be implemented here with proper formatting and sorting
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Filters</CardTitle>
          <CardDescription>
            Pre-configured filters for common optimization scenarios in {currentDataSource?.name || 'selected section'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableSmartFilters.map(filter => (
              <Button 
                key={filter.id}
                variant="outline" 
                className="h-auto p-4 justify-start text-left"
                onClick={() => {
                  // TODO: Apply smart filter logic
                  console.log('Applying smart filter:', filter.id)
                }}
              >
                <div>
                  <div className="font-medium">{filter.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{filter.description}</div>
                </div>
              </Button>
            ))}
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Custom Filters</Label>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              🚧 Custom filtering interface will be implemented here
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Generation */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Optimization Insights</CardTitle>
          <CardDescription>
            Generate intelligent recommendations using advanced AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Optimization Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTemplate === 'custom-analysis' ? (
              <div className="space-y-2">
                <Label>Custom Analysis Prompt</Label>
                <Textarea 
                  placeholder="Describe what specific insights you want to generate from your Google Ads data..."
                  value={customPrompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
                  rows={4}
                />
              </div>
            ) : currentTemplate ? (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Template Prompt:</p>
                <p className="text-sm mt-1">{currentTemplate.prompt}</p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select value={selectedLLM} onValueChange={(value: LLMProvider) => setSelectedLLM(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex flex-col">
                        <span>{provider.name}</span>
                        <span className="text-xs text-muted-foreground">{provider.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder={
                  selectedLLM === 'openai' ? 'sk-...' : 
                  selectedLLM === 'claude' ? 'sk-ant-...' : 
                  'API Key (Coming Soon)'
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={selectedLLM === 'gemini'}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateInsights}
              disabled={
                isGeneratingInsights || 
                previewData.length === 0 || 
                !apiKey.trim() ||
                selectedLLM === 'gemini' ||
                (selectedTemplate === 'custom-analysis' && !customPrompt.trim()) ||
                (selectedTemplate !== 'custom-analysis' && !currentTemplate)
              }
            >
              {isGeneratingInsights ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Insights...
                </>
              ) : (
                'Generate Optimization Insights'
              )}
            </Button>
            
            {insights && (
              <Button variant="outline" onClick={() => {
                setInsights('')
                setTokenUsage(null)
              }}>
                Clear
              </Button>
            )}
          </div>

          {insightsError && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
              {insightsError}
            </div>
          )}

          {insights && (
            <div className="space-y-4">
              <Separator />
              <div className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Optimization Insights
                </h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{insights}</ReactMarkdown>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground border rounded-lg p-4 bg-muted/30">
                <div>
                  <span className="font-medium">Data Source:</span> {currentDataSource?.name || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Provider:</span> {selectedLLM.toUpperCase()}
                </div>
                <div>
                  <span className="font-medium">Rows Analyzed:</span> {previewData.length}
                </div>
                <div>
                  <span className="font-medium">Template:</span> {currentTemplate?.name || 'Custom'}
                </div>
                
                {tokenUsage && (
                  <>
                    <div>
                      <span className="font-medium">Input Tokens:</span> {tokenUsage.inputTokens.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Output Tokens:</span> {tokenUsage.outputTokens.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Total Tokens:</span> {tokenUsage.totalTokens.toLocaleString()}
                    </div>
                    {tokenUsage.cost && (
                      <div>
                        <span className="font-medium">Estimated Cost:</span> ${tokenUsage.cost.toFixed(4)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export & Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Actions</CardTitle>
          <CardDescription>
            Export your analysis and insights for further use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" disabled>
              Export Data (CSV)
            </Button>
            <Button variant="outline" disabled>
              Export Insights (PDF)
            </Button>
            <Button variant="outline" disabled>
              Save Analysis
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            🚧 Export functionality will be implemented in a future update
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 