
import React, { useState } from 'react';
import { Theme, User } from '../types';
import { AuthService } from '../services/auth';
import { t } from '../utils/translations';
import { GOOGLE_CLIENT_ID } from '../config';

interface AuthProps {
    onLogin: (user: User) => void;
    systemLanguage: string;
    theme: Theme;
}

const Auth: React.FC<AuthProps> = ({ onLogin, systemLanguage, theme }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); 
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            let user: User;
            if (isRegistering) {
                if (!name || !email || !password) throw new Error("All fields required");
                user = await AuthService.register(name, email);
            } else {
                if (!email || !password) throw new Error("All fields required");
                user = await AuthService.login(email);
            }
            onLogin(user);
        } catch (err: any) {
            setError(err.message || "Authentication failed");
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        if (GOOGLE_CLIENT_ID.includes("YOUR_CLIENT_ID")) {
            alert("CONFIGURATION ERROR: You must add your Google Client ID to src/config.ts for this button to work.");
            return;
        }

        setError('');
        setLoading(true);
        
        try {
            // Real Google Login Flow
            const user = await AuthService.loginWithGoogle();
            onLogin(user);
        } catch (err: any) {
            console.error(err);
            // Handle "popup_closed_by_user" gracefully
            if (err?.type === 'popup_closed_by_user') {
                setError("Login cancelled.");
            } else {
                setError("Google Login Failed. Check console/config.");
            }
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md mx-auto px-4 animate-fadeIn">
            <div className={`p-8 rounded-2xl shadow-2xl ${theme.cardBg} ${theme.cardBorder}`}>
                <div className="text-center mb-8">
                    <h2 className={`text-3xl font-bold ${theme.textMain}`}>
                        {isRegistering ? t('registerTitle', systemLanguage) : t('loginTitle', systemLanguage)}
                    </h2>
                    <p className={`mt-2 ${theme.textSecondary}`}>
                        {t('subtitle', systemLanguage)}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-500 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {isRegistering && (
                        <div>
                            <label className={`block text-sm font-bold mb-1 ${theme.textMain}`}>{t('nameLabel', systemLanguage)}</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className={`w-full px-4 py-3 rounded-lg outline-none border-2 transition-colors ${theme.inputBg}`}
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label className={`block text-sm font-bold mb-1 ${theme.textMain}`}>{t('emailLabel', systemLanguage)}</label>
                        <input 
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg outline-none border-2 transition-colors ${theme.inputBg}`}
                            placeholder="student@example.com"
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-bold mb-1 ${theme.textMain}`}>{t('passwordLabel', systemLanguage)}</label>
                        <input 
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg outline-none border-2 transition-colors ${theme.inputBg}`}
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg transform transition-transform active:scale-95 ${theme.primaryBtn} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {loading 
                           ? t('processing', systemLanguage) 
                           : (isRegistering ? t('registerBtn', systemLanguage) : t('loginBtn', systemLanguage))
                        }
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-between">
                    <div className="h-px bg-slate-500/30 flex-1"></div>
                    <span className={`px-3 text-xs uppercase ${theme.textSecondary}`}>OR</span>
                    <div className="h-px bg-slate-500/30 flex-1"></div>
                </div>

                <button 
                    type="button"
                    onClick={handleGoogle}
                    disabled={loading}
                    className={`w-full mt-6 py-3 rounded-xl font-bold border flex items-center justify-center transition-colors hover:bg-slate-500/10 bg-white text-slate-700 ${theme.cardBorder}`}
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" color="#4285F4"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" color="#34A853"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" color="#FBBC05"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" color="#EA4335"/>
                        </svg>
                    )}
                    {t('googleBtn', systemLanguage)}
                </button>

                <div className="mt-6 text-center">
                    <button 
                        type="button"
                        onClick={() => setIsRegistering(!isRegistering)}
                        className={`text-sm font-bold hover:underline ${theme.accentColor}`}
                    >
                        {isRegistering ? t('switchLogin', systemLanguage) : t('switchRegister', systemLanguage)}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
