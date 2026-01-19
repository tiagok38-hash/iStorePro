import React from 'react';
import { SpinnerIcon } from './icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
}

const Button: React.FC<ButtonProps> = ({
    loading,
    children,
    icon,
    variant = 'primary',
    className = '',
    disabled,
    ...props
}) => {
    const variantClasses = {
        primary: 'bg-gray-800 text-white hover:bg-gray-900',
        secondary: 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50',
        danger: 'bg-danger text-white hover:bg-danger/90',
        success: 'bg-success text-white hover:bg-success/90',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100'
    };

    return (
        <button
            className={`
                flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm
                transition-all duration-200 active:scale-95 
                disabled:opacity-70 disabled:cursor-not-allowed
                ${variantClasses[variant]}
                ${className}
            `}
            disabled={loading || disabled}
            {...props}
        >
            {loading ? (
                <>
                    <SpinnerIcon className="w-4 h-4 text-current animate-spin" style={{ width: '1rem', height: '1rem' }} />
                    <span>{typeof children === 'string' ? 'Processando...' : children}</span>
                </>
            ) : (
                <>
                    {icon}
                    {children}
                </>
            )}
        </button>
    );
};

export default Button;
