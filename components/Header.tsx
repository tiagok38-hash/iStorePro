import React from 'react';
import { Link } from 'react-router-dom';
import { MenuIcon, LogoIcon } from './icons.tsx';

const Logo: React.FC = () => (
    <Link to="/" className="flex items-center gap-2">
      <LogoIcon className="text-primary h-7 w-7" />
      <span className="font-bold text-xl">iStore</span>
    </Link>
);

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    return (
        <header className="bg-surface h-16 flex items-center justify-between px-4 border-b border-border lg:hidden sticky top-0 z-30">
             <button onClick={onMenuClick} className="text-primary p-2 -ml-2" aria-label="Abrir menu">
                <MenuIcon className="h-6 w-6" />
             </button>
             <Logo />
             <div className="w-8"></div> {/* Spacer to balance the layout */}
        </header>
    );
};

export default Header;