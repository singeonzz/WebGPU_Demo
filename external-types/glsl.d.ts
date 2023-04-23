declare module '*.wgsl' {
    const value: string;
    export default value;
}

interface Window {

}

declare const windos: Window & typeof globalThis;
