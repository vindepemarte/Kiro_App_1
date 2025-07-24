// Ambient module declarations to resolve missing type definitions

declare module 'cacheable-request' {
    const cacheableRequest: any;
    export = cacheableRequest;
}

// Catch-all for any other missing modules
declare module '*' {
    const value: any;
    export = value;
    export default value;
}

// Global ambient declarations
declare global {
    var cacheableRequest: any;
}