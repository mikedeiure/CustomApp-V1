import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sheetUrl = searchParams.get('url')
    const tab = searchParams.get('tab')

    if (!sheetUrl) {
      return NextResponse.json({ error: 'Sheet URL is required' }, { status: 400 })
    }

    if (!tab) {
      return NextResponse.json({ error: 'Tab parameter is required' }, { status: 400 })
    }

    const urlWithTab = `${sheetUrl}?tab=${tab}`
    console.log(`API: Fetching ${tab} data from:`, urlWithTab)
    
    const response = await fetch(urlWithTab, {
      headers: {
        'User-Agent': 'BTA-Dashboard/1.0',
      },
    })

    console.log(`API: Response for ${tab}:`, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch data for tab ${tab}: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`API: Successfully fetched ${tab} data:`, Array.isArray(data) ? `Array with ${data.length} items` : data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('API: Error fetching sheets data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 