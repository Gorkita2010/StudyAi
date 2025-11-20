
// En entornos Vite/Vercel, es CRÍTICO acceder a las variables de forma explícita
// (ej. import.meta.env.VITE_NOMBRE) para que el sistema de build las sustituya.
// El acceso dinámico (env[key]) suele fallar en producción.

const getMetaEnv = () => {
    try {
        return (import.meta as any).env || {};
    } catch {
        return {};
    }
};

const getProcessEnv = () => {
    try {
        return typeof process !== 'undefined' ? process.env : {};
    } catch {
        return {};
    }
}

const metaEnv = getMetaEnv();
const processEnv = getProcessEnv();

// Buscamos la API KEY en orden de prioridad, incluyendo tus nombres personalizados
export const API_KEY = 
    metaEnv.VITE_API_KEY || 
    metaEnv.API_KEY || 
    metaEnv.Vite_Clave_API || // Tu nombre personalizado de la captura
    processEnv.VITE_API_KEY || 
    processEnv.API_KEY || 
    "";

// Buscamos el Client ID, incluyendo la versión con la 'E' extra
export const GOOGLE_CLIENT_ID = 
    metaEnv.VITE_GOOGLE_CLIENT_ID || 
    metaEnv.GOOGLE_CLIENT_ID ||
    metaEnv.VITE_GOOGLE_CLIENTE_ID || // Tu nombre con error tipográfico de la captura
    processEnv.VITE_GOOGLE_CLIENT_ID || 
    processEnv.GOOGLE_CLIENT_ID || 
    "924240888788-vg1tujmq22a99ueaejsm74imb8shmfbc.apps.googleusercontent.com";
