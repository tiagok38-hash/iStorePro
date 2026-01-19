import React, { useState, useEffect } from 'react';

interface PercentageInputProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
}

const PercentageInput: React.FC<PercentageInputProps> = ({ value, onChange, className }) => {
    const [displayValue, setDisplayValue] = useState<string>('0');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(value.toString().replace('.', ','));
        }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        // Permitir digitos e uma virgula
        val = val.replace(/[^0-9,]/g, '');
        if ((val.match(/,/g) || []).length > 1) return; // Ignore se tentar segunda virgula

        setDisplayValue(val);
        const numberValue = parseFloat(val.replace(',', '.')) || 0;
        onChange(numberValue);
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Formata clean ao sair
        setDisplayValue(value.toString().replace('.', ','));
    };

    return (
        <div className="relative w-full">
            <input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                className={className}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-sm">%</span>
        </div>
    );
};

export default PercentageInput;
