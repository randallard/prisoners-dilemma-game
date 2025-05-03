declare global {
    const describe: (name: string, fn: () => void) => void;
    const it: (name: string, fn: (done?: any) => any) => void;
    const beforeEach: (fn: (done?: any) => any) => void;
    const afterEach: (fn: (done?: any) => any) => void;
  }
  
  export {}; // This is necessary to make the file a module