import { useState, useEffect } from 'react';

export interface Server {
  serverId: string;
  name: string;
  status: 'active' | 'disabled';
  totalUsers: number;
  email?: string;
}

export interface UseServersResult {
  data: Server[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useServers(): UseServersResult {
  const [data, setData] = useState<Server[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/server');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.status}`);
      }
      
      const servers = await response.json();
      
      // Sort servers alphabetically by name
      const sortedServers = servers.sort((a: Server, b: Server) => 
        a.name.localeCompare(b.name)
      );
      
      setData(sortedServers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch servers';
      setError(errorMessage);
      console.error('Error fetching servers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchServers
  };
}
