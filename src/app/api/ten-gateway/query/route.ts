import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const address = searchParams.get('a')
    
    if (!token || !address) {
      return NextResponse.json({ error: 'Missing token or address' }, { status: 400 })
    }
    
    const response = await fetch(`https://testnet.ten.xyz/v1/query/?token=${token}&a=${address}`)

    
    if (!response.ok) {
      return NextResponse.json({ error: 'Query failed' }, { status: response.status })
    }
    
    const data = await response.json()
    console.log("response is here: ", data)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}