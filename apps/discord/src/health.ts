import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Client } from 'discord.js';
import { database } from './database';

export function createHealthCheckServer(client: Client, port: number = 8080) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health' && req.method === 'GET') {
      try {
        // Check Discord connection status
        const isDiscordConnected = client.isReady();
        
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

        // If both dependencies are healthy, return 200
        if (isDiscordConnected && isDynamoDBConnected) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'healthy',
            discord: 'connected',
            dynamodb: 'connected'
          }));
        } else {
          // If any dependency is unhealthy, return 503
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'unhealthy',
            discord: isDiscordConnected ? 'connected' : 'disconnected',
            dynamodb: isDynamoDBConnected ? 'connected' : 'disconnected'
          }));
        }
      } catch (error) {
        // If there's an unexpected error, return 503
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    } else {
      // Return 404 for any other route
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    console.log(`Health check server listening on port ${port}`);
  });

  return server;
}
