import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return Response.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    url: request.url
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return Response.json({ 
      message: 'POST API is working!',
      received: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return Response.json({ 
      error: 'Invalid JSON',
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }
}