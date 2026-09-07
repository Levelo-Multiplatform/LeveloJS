declare const h: any;
declare module 'levelojs/compiler';
declare module '*.css' {
  const content: any;
  export default content;
}
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}