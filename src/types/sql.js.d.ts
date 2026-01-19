declare module 'sql.js' {
  export class Database {
    run(sql: string, params?: any[]): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }
  export class Statement {
    bind(params: any[]): boolean;
    step(): boolean;
    getAsObject(): any;
    free(): void;
  }
  export default function initSqlJs(config?: { locateFile: (file: string) => string }): Promise<{ Database: typeof Database }>;
}
