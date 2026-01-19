import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.tsx';
import { SpinnerIcon } from '../components/icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, isAuthenticated } = useUser();
    const navigate = useNavigate();
    const { showToast } = useToast();

    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const [isExiting, setIsExiting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            // Sucesso: Iniciar animação de saída e manter loading state
            setIsExiting(true);
            setTimeout(() => {
                navigate('/');
            }, 400);
        } catch (error: any) {
            setLoading(false);
            // Traduzir mensagens de erro comuns do Supabase
            let errorMessage = error.message || 'Falha no login.';
            if (errorMessage.includes('Invalid login credentials')) {
                errorMessage = 'Email ou senha incorretos.';
            } else if (errorMessage.includes('Email not confirmed')) {
                errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
            } else if (errorMessage.includes('Too many requests')) {
                errorMessage = 'Muitas tentativas. Aguarde alguns minutos.';
            } else if (errorMessage.includes('Network')) {
                errorMessage = 'Erro de conexão. Verifique sua internet.';
            }
            showToast(errorMessage, 'error');
        }
    };

    const inputClasses = "w-full px-4 py-2 border rounded-md bg-transparent border-border focus:ring-2 focus:ring-accent focus:border-transparent transition";

    return (
        <div className={`space-y-6 transition-all duration-500 ease-in-out transform ${isExiting ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
            <div>
                <h2 className="text-2xl font-bold text-center text-primary">Acessar sua conta</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-primary mb-1">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClasses}
                        required
                        placeholder="seu@email.com"
                    />
                </div>
                <div>
                    <label htmlFor="password-login" className="block text-sm font-medium text-primary mb-1">Senha</label>
                    <input
                        id="password-login"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClasses}
                        required
                        placeholder="••••••••"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || isExiting}
                    className="w-full px-4 py-2.5 bg-primary text-on-primary rounded-md font-semibold hover:bg-opacity-90 transition disabled:bg-muted flex items-center justify-center"
                >
                    {(loading || isExiting) ? <SpinnerIcon className="h-5 w-5" /> : 'Entrar'}
                </button>
            </form>
        </div>
    );
};

export default Login;
