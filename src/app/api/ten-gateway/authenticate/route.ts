import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, address, signature } = body
    
    const response = await fetch(`https://testnet.ten.xyz/v1/authenticate/?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        signature
      })
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: response.status })
    }
    
    const data = await response.text()
    console.log("auth ka response ", data)
    return new NextResponse(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}