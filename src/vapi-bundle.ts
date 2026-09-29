import rawVapi from '@vapi-ai/web';

const Vapi: any = (rawVapi as any).default || rawVapi;

declare global {
  interface Window {
    Vapi: any;
  }
}

if (typeof window !== 'undefined') {
  window.Vapi = Vapi;
}

export default Vapi;
