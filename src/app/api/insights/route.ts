import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

interface InsightRequest {
  prompt: string
  data: any[]
  context: {
    dataSource: string
    level: string
    currency: string
    rowCount: number
    filters?: any[]
  }
  provider: 'openai' | 'gemini' | 'claude'
  apiKey: string
}

interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost?: number
}

interface InsightResponse {
  insights: string
  tokenUsage?: TokenUsage
  error?: string
}

// OpenAI pricing per 1K tokens (as of 2024)
const OPENAI_PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
}

const CLAUDE_PRICING = {
  'claude-4': { input: 0.003, output: 0.015 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 }
}

export async function POST(request: NextRequest) {
  try {
    const body: InsightRequest = await request.json()
    const { prompt, data, context, provider, apiKey } = body

    if (!prompt || !data || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, data, or apiKey' },
        { status: 400 }
      )
    }

    if (!['openai', 'claude'].includes(provider)) {
      return NextResponse.json(
        { error: 'Currently supported providers: OpenAI, Claude' },
        { status: 400 }
      )
    }

    // Prepare the data summary for the AI
    const dataSummary = prepareDataSummary(data, context)
    
    // Construct the full prompt
    const fullPrompt = constructPrompt(prompt, dataSummary, context)

    let insights: string = ''
    let tokenUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }

    if (provider === 'openai') {
      const result = await generateOpenAIInsights(apiKey, fullPrompt)
      insights = result.insights
      tokenUsage = result.tokenUsage
    } else if (provider === 'claude') {
      const result = await generateClaudeInsights(apiKey, fullPrompt)
      insights = result.insights
      tokenUsage = result.tokenUsage
    }

    const response: InsightResponse = {
      insights,
      tokenUsage
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error generating insights:', error)
    
    let errorMessage = 'Failed to generate insights'
    
    if (error.status === 401) {
      errorMessage = 'Invalid API key. Please check your API key.'
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.'
    } else if (error.status === 400) {
      errorMessage = 'Invalid request. Please check your data and try again.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 }
    )
  }
}

async function generateOpenAIInsights(apiKey: string, fullPrompt: string) {
  const openai = new OpenAI({
    apiKey: apiKey,
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a Google Ads optimization expert with deep knowledge of PPC campaign management, keyword analysis, and performance optimization. Provide specific, actionable recommendations based on the data provided.'
      },
      {
        role: 'user',
        content: fullPrompt
      }
    ],
    max_tokens: 2000,
    temperature: 0.7,
  })

  const insights = response.choices[0]?.message?.content || 'No insights generated'
  
  // Calculate token usage and cost
  const tokenUsage: TokenUsage = {
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
    totalTokens: response.usage?.total_tokens || 0,
  }

  // Calculate cost (approximate)
  if (response.usage) {
    const pricing = OPENAI_PRICING['gpt-4-turbo']
    tokenUsage.cost = 
      (response.usage.prompt_tokens / 1000) * pricing.input +
      (response.usage.completion_tokens / 1000) * pricing.output
  }

  return { insights, tokenUsage }
}

async function generateClaudeInsights(apiKey: string, fullPrompt: string) {
  const anthropic = new Anthropic({
    apiKey: apiKey,
  })

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    temperature: 0.7,
    system: 'You are a Google Ads optimization expert with deep knowledge of PPC campaign management, keyword analysis, and performance optimization. Provide specific, actionable recommendations based on the data provided.',
    messages: [
      {
        role: 'user',
        content: fullPrompt
      }
    ]
  })

  const insights = response.content[0]?.type === 'text' ? response.content[0].text : 'No insights generated'
  
  // Calculate token usage and cost
  const tokenUsage: TokenUsage = {
    inputTokens: response.usage.input_tokens || 0,
    outputTokens: response.usage.output_tokens || 0,
    totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
  }

  // Calculate cost (approximate)
  const pricing = CLAUDE_PRICING['claude-4']
  tokenUsage.cost = 
    (tokenUsage.inputTokens / 1000) * pricing.input +
    (tokenUsage.outputTokens / 1000) * pricing.output

  return { insights, tokenUsage }
}

function prepareDataSummary(data: any[], context: any): string {
  if (!data || data.length === 0) {
    return 'No data available for analysis.'
  }

  const sampleSize = Math.min(data.length, 10) // Show first 10 rows as sample
  const sample = data.slice(0, sampleSize)
  
  // Get column names from the first row
  const columns = Object.keys(sample[0] || {})
  
  // Calculate basic statistics for numeric columns
  const stats = calculateBasicStats(data)
  
  return `
## Data Analysis Context

**Data Source:** ${context.dataSource}
**Total Rows:** ${context.rowCount}
**Sample Data (first ${sampleSize} rows):**

${formatDataTable(sample, columns)}

## Data Statistics:

${formatStatistics(stats, 'USD')}

## Data Summary:
- Total records analyzed: ${data.length}
- Data columns: ${columns.join(', ')}
- Applied filters: ${context.filters?.length || 0} filter(s)
`
}

function calculateBasicStats(data: any[]): Record<string, any> {
  if (!data || data.length === 0) return {}
  
  const stats: Record<string, any> = {}
  const columns = Object.keys(data[0] || {})
  
  columns.forEach(column => {
    const values = data.map(row => row[column]).filter(val => val != null && !isNaN(Number(val)))
    
    if (values.length > 0) {
      const numericValues = values.map(Number)
      stats[column] = {
        count: values.length,
        sum: numericValues.reduce((a, b) => a + b, 0),
        avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues)
      }
    }
  })
  
  return stats
}

function formatDataTable(data: any[], columns: string[]): string {
  if (!data || data.length === 0) return 'No data to display'
  
  const header = `| ${columns.join(' | ')} |`
  const separator = `| ${columns.map(() => '---').join(' | ')} |`
  const rows = data.map(row => 
    `| ${columns.map(col => String(row[col] || '').slice(0, 50)).join(' | ')} |`
  )
  
  return [header, separator, ...rows].join('\n')
}

function formatStatistics(stats: Record<string, any>, currency: string): string {
  if (!stats || Object.keys(stats).length === 0) {
    return 'No numeric data available for statistics.'
  }
  
  return Object.entries(stats)
    .map(([column, stat]) => {
      if (column.toLowerCase().includes('cost') || column.toLowerCase().includes('value')) {
        return `**${column}:** Total: ${currency}${stat.sum.toFixed(2)}, Avg: ${currency}${stat.avg.toFixed(2)}, Min: ${currency}${stat.min.toFixed(2)}, Max: ${currency}${stat.max.toFixed(2)}`
      } else if (column.toLowerCase().includes('rate') || column.toLowerCase().includes('ctr') || column.toLowerCase().includes('cvr')) {
        return `**${column}:** Avg: ${stat.avg.toFixed(2)}%, Min: ${stat.min.toFixed(2)}%, Max: ${stat.max.toFixed(2)}%`
      } else {
        return `**${column}:** Total: ${stat.sum.toLocaleString()}, Avg: ${stat.avg.toFixed(2)}, Min: ${stat.min}, Max: ${stat.max}`
      }
    })
    .join('\n')
}

function constructPrompt(userPrompt: string, dataSummary: string, context: any): string {
  return `
${dataSummary}

## Analysis Request:
${userPrompt}

## Instructions:
Please analyze the above Google Ads data and provide specific, actionable optimization recommendations. Structure your response as follows:

1. **Executive Summary**: A brief overview of the key findings
2. **Key Performance Insights**: Identify the most important patterns and trends
3. **Optimization Recommendations**: Specific, prioritized action items
4. **Implementation Steps**: How to apply these recommendations in Google Ads
5. **Expected Impact**: Estimated improvements from implementing the recommendations

Focus on practical, implementable strategies that can improve ROAS, reduce costs, and enhance overall campaign performance. Be specific with numbers and percentages where possible based on the data provided.
`
} 