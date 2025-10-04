declare module "pg" {
  export interface QueryResult<T = any> {
    rows: T[];
  }

  interface PoolConfig {
    connectionString: string;
  }

  export class Pool {
    constructor(config: PoolConfig);
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }

  export interface PoolClient {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    release(): void;
  }
}
