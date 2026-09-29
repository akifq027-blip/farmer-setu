/// <reference types="vite/client" />
import rawVapi from '@vapi-ai/web';

const VapiClass: any = (rawVapi as any).default || rawVapi;

// Read Vapi credentials from Vite environment variables with fallback
const metaEnv = (import.meta as any).env || {};
const VAPI_PUBLIC_KEY = metaEnv.VITE_VAPI_PUBLIC_KEY || 'fa84c428-a843-48bb-9cb0-5c542592b178';
const VAPI_ASSISTANT_ID = metaEnv.VITE_VAPI_ASSISTANT_ID || '3cecc13e-8776-4723-a10b-213416d7b12d';

let vapiInstance: any = null;

export function getVapiInstance(): any {
  if (!vapiInstance && typeof window !== 'undefined') {
    vapiInstance = new VapiClass(VAPI_PUBLIC_KEY);
  }
  return vapiInstance;
}

export async function startKisanMitrCall(assistantOverrides?: Record<string, any>): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Vapi client is not available in non-browser environment.');
  }

  // Pre-check microphone permission to avoid Daily room join timeout
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      console.warn('Microphone permission check failed:', err);
    }
  }

  // Destroy previous session to ensure clean Daily connection
  if (vapiInstance) {
    try {
      await vapiInstance.stop();
    } catch (e) {}
    vapiInstance = null;
  }

  vapiInstance = new VapiClass(VAPI_PUBLIC_KEY);
  return await vapiInstance.start(VAPI_ASSISTANT_ID, assistantOverrides);
}

export async function stopKisanMitrCall(): Promise<void> {
  if (vapiInstance) {
    const inst = vapiInstance;
    vapiInstance = null;
    try {
      await inst.stop();
    } catch (e) {
      console.warn('Notice stopping Vapi call:', e);
    }
  }
}

export { VAPI_PUBLIC_KEY, VAPI_ASSISTANT_ID };
export default VapiClass;
