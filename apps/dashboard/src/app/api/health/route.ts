import { NextResponse } from 'next/server';
import { database } from '@/lib/database';

export async function GET() {
  try {
    // Check DynamoDB connection status by attempting a simple operation
    let isDynamoDBConnected = false;
    try {
      // Try to list servers as a health check
      await database.getAllServers();
      isDynamoDBConnected = true;
    } catch (error) {
      console.error('DynamoDB health check failed:', error);
      isDynamoDBConnected = false;
    }

    // If DynamoDB is healthy, return 200
    if (isDynamoDBConnected) {
      return NextResponse.json(
        {
          status: 'healthy',
          dynamodb: 'connected'
        },
        { status: 200 }
      );
    } else {
      // If DynamoDB is unhealthy, return 503
      return NextResponse.json(
        {
          status: 'unhealthy',
          dynamodb: 'disconnected'
        },
        { status: 503 }
      );
    }
  } catch (error) {
    // If there's an unexpected error, return 503
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
