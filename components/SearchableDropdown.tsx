
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SearchIcon, XCircleIcon } from './icons.tsx';

interface SearchableDropdownProps {
    options: { value: string; label: string }[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ options, value, onChange, placeholder = "Buscar..." }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

    // Show dropdown only when focused AND has search term
    const showDropdown = isFocused && searchTerm.trim().length > 0;

    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) {
            return [];
        }
        return options.filter(option =>
            (option.label || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setSearchTerm('');
        setIsFocused(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
        setSearchTerm('');
        inputRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted pointer-events-none">
                    <SearchIcon className="w-4 h-4" />
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={selectedOption ? selectedOption.label : placeholder}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    className={`w-full p-2 pl-9 pr-8 border rounded bg-surface border-border focus:ring-accent focus:border-accent text-sm h-10 ${selectedOption && !searchTerm ? 'placeholder:text-primary' : ''}`}
                />
                {(value || searchTerm) && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 flex items-center pr-2"
                    >
                        <XCircleIcon className="h-4 w-4 text-muted hover:text-primary" />
                    </button>
                )}
            </div>

            {showDropdown && (
                <div className="absolute z-[100] w-full mt-1 bg-surface border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    <ul>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <li
                                    key={option.value}
                                    className={`p-2.5 text-sm cursor-pointer hover:bg-surface-secondary ${value === option.value ? 'bg-accent-light text-accent' : 'text-primary'}`}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    {option.label}
                                </li>
                            ))
                        ) : (
                            <li className="p-2.5 text-sm text-center text-muted">Nenhum resultado encontrado.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchableDropdown;
