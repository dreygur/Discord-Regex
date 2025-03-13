export interface IDBClientOptions {
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  webhooksTableName: string;
  regexTableName: string;
  serversTableName: string;
}

export interface IWebhook {
  id: string;
  name: string;
  url: string;
  serverId: string;
}

export interface IRegex {
  id: string;
  serverId: string;
  regexPattern: string;
  webhookName: string;
}

export interface IServer {
  id: string;
  serverId: string;
  name: string;
  status: "active" | "disabled";
  totalUsers: number;
  email?: string;
}