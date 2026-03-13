import React, { useState } from 'react';

interface LoginViewProps {
    onLogin: (username: string, password: string) => void;
    loginError: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, loginError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="DigitalMarket" className="h-16 w-auto mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-slate-900">Portal B2B</h1>
                    <p className="text-slate-500 text-sm mt-2">Introduce tus credenciales de acceso</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoCapitalize="none"
                            autoCorrect="off"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-900"
                            placeholder="Introduce tu usuario"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-900"
                            placeholder="••••••"
                        />
                    </div>

                    {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}

                    <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-lg transition-all active:scale-[0.98]">
                        ENTRAR
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">Digital Market Granada &copy; 2026</p>
                </div>
            </div>
        </div>
    );
};
