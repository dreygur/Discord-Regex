import { useState, useEffect, useMemo } from 'react';

export interface Webhook {
  name: string;
  url: string;
  serverId: string;
  data?: string;
}

export interface UseWebhooksResult {
  data: Webhook[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWebhooks(filterByServerId?: string): UseWebhooksResult {
  const [data, setData] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/webhooks');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch webhooks: ${response.status}`);
      }
      
      const webhooks = await response.json();
      
      // Sort webhooks alphabetically by name
      const sortedWebhooks = webhooks.sort((a: Webhook, b: Webhook) => 
        a.name.localeCompare(b.name)
      );
      
      setData(sortedWebhooks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch webhooks';
      setError(errorMessage);
      console.error('Error fetching webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  // Filter webhooks by serverId if provided
  const filteredData = useMemo(() => {
    if (!filterByServerId) {
      return data;
    }
    return data.filter(webhook => webhook.serverId === filterByServerId);
  }, [data, filterByServerId]);

  return {
    data: filteredData,
    loading,
    error,
    refetch: fetchWebhooks
  };
}
