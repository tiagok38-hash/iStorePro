import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/login-bg.jpg')" }}>
            <div className="mb-8 flex flex-col items-center gap-3">
                <img src="/logo.png" alt="iStore" className="h-[119px] object-contain" />
            </div>
            <div className="w-full max-w-sm">
                <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/50">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
