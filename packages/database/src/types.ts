export interface IDBClientOptions {
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  webhooksTableName: string;
  regexTableName: string;
  serversTableName: string;
}