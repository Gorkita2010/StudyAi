
// Helper to safely read environment variables in Vite/Vercel/Node environments
export const getEnv = (key: string, fallback: string = ""): string => {
  // 1. Try import.meta.env (Vite standard)
  // Cast to any to avoid TS error about 'env' missing on ImportMeta
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env) {
     if (meta.env[`VITE_${key}`]) return meta.env[`VITE_${key}`];
     if (meta.env[key]) return meta.env[key];
  }
  
  // 2. Try process.env (Node/Vercel Serverless)
  try {
     if (typeof process !== 'undefined' && process.env) {
         if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
         if (process.env[key]) return process.env[key];
     }
  } catch(e) { 
      // Ignore reference errors if process is not defined
  }

  return fallback;
}

export const GOOGLE_CLIENT_ID = getEnv("GOOGLE_CLIENT_ID", "924240888788-vg1tujmq22a99ueaejsm74imb8shmfbc.apps.googleusercontent.com");
