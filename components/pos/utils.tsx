
import React from 'react';
import { PixIcon, CashIcon, CreditCardIcon } from '../icons.tsx';

export const getPaymentIcon = (name: string, type: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('pix')) return <PixIcon />;
    if (lower.includes('dinheiro') || lower.includes('espécie')) return <CashIcon />;
    if (type === 'card' || lower.includes('cartão') || lower.includes('cre')) return <CreditCardIcon />;
    return <CashIcon />;
};
