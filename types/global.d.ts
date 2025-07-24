// Global type declarations to suppress missing type definition errors

declare module 'cacheable-request';
declare module '@types/cacheable-request';

// Suppress any other potential missing type definition errors
declare module '*' {
  const content: any;
  export default content;
}