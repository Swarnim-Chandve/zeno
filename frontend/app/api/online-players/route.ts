import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory store for demo purposes
// In production, this would be connected to your WebSocket server
let onlinePlayers = 0
let waitingPlayers: Array<{ address: string; joinedAt: number }> = []

export async function GET(request: NextRequest) {
  try {
    // For demo purposes, simulate some online players
    // In production, this would fetch from your WebSocket server
    const mockData = {
      totalOnline: Math.max(1, onlinePlayers), // At least 1 (current user)
      waitingPlayers: waitingPlayers.slice(0, 5) // Show up to 5 waiting players
    }

    return NextResponse.json(mockData)
  } catch (error) {
    console.error('Error fetching online players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch online players' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, playerAddress } = body

    if (action === 'join') {
      onlinePlayers += 1
      waitingPlayers.push({
        address: playerAddress || 'Anonymous',
        joinedAt: Date.now()
      })
    } else if (action === 'leave') {
      onlinePlayers = Math.max(0, onlinePlayers - 1)
      waitingPlayers = waitingPlayers.filter(p => p.address !== playerAddress)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating online players:', error)
    return NextResponse.json(
      { error: 'Failed to update online players' },
      { status: 500 }
    )
  }
}
