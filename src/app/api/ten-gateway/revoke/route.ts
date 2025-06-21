import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }
    
    const response = await fetch(`https://testnet.ten.xyz/v1/revoke/?token=${token}`)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Revoke failed' }, { status: response.status })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}