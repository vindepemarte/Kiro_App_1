declare module 'cacheable-request' {
  import { RequestOptions } from 'http';
  import { URL } from 'url';
  import { EventEmitter } from 'events';

  interface CacheableRequestOptions extends RequestOptions {
    cache?: any;
    cacheOptions?: any;
  }

  interface CacheableRequest {
    (options: CacheableRequestOptions | string | URL): EventEmitter;
    RequestError: any;
    CacheError: any;
  }

  const cacheableRequest: CacheableRequest;
  export = cacheableRequest;
}

// Also declare it as a global type to catch any implicit references
declare global {
  namespace NodeJS {
    interface Global {
      'cacheable-request'?: any;
    }
  }
}