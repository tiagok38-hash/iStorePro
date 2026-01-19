
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.tsx';
import { SpinnerIcon } from '../components/icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';

const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, isAuthenticated } = useUser();
    const navigate = useNavigate();
    const { showToast } = useToast();

    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    // Verificação de administrador existente removida para permitir testes livres

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showToast('As senhas não coincidem.', 'error');
            return;
        }
        setLoading(true);
        try {
            await register(name, email, password);
            showToast(`Cadastro realizado com sucesso!`, 'success');
            navigate('/');
        } catch (error: any) {
            showToast(error.message || 'Falha no cadastro.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full px-4 py-2 border rounded-md bg-transparent border-border focus:ring-2 focus:ring-accent focus:border-transparent transition";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-center text-primary">Crie sua conta de Admin</h2>
                <p className="text-sm text-center text-muted mt-1">
                    Já possui uma conta?{' '}
                    <Link to="/login" className="font-medium text-accent hover:underline">
                        Faça o login
                    </Link>
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-primary mb-1">Nome Completo</label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} required />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-primary mb-1">Email</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} required />
                </div>
                <div>
                    <label htmlFor="password-register" className="block text-sm font-medium text-primary mb-1">Senha</label>
                    <input id="password-register" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClasses} required />
                </div>
                <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-primary mb-1">Confirme a Senha</label>
                    <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClasses} required />
                </div>
                <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-primary text-on-primary rounded-md font-semibold hover:bg-opacity-90 transition disabled:bg-muted flex items-center justify-center">
                    {loading ? <SpinnerIcon className="h-5 w-5" /> : 'Cadastrar'}
                </button>
            </form>
        </div>
    );
};

export default Register;
