import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://testnet.ten.xyz/v1/join/')
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get encryption token' }, { status: response.status })
    }
    
    const encryptionToken = await response.text()
    return NextResponse.json({ encryptionToken })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}