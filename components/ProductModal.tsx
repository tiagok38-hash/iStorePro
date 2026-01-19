
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Supplier, Brand, Category, ProductModel, Grade, GradeValue, ProductVariation, Customer, ProductConditionParameter, StorageLocationParameter, WarrantyParameter } from '../../types.ts';
import { getProductConditions, getStorageLocations, getWarranties } from '../services/mockApi.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { useUser } from '../contexts/UserContext.tsx';
import { XCircleIcon, SpinnerIcon, TrashIcon, PlusIcon, ArrowPathRoundedSquareIcon, ArchiveBoxIcon, PhotographIcon, CheckIcon } from './icons.tsx';
import CurrencyInput from './CurrencyInput.tsx';
import SearchableDropdown from './SearchableDropdown.tsx';
import CustomerModal from './CustomerModal.tsx';
import CameraModal from './CameraModal.tsx';
import Button from './Button.tsx';
import { formatCurrency } from '../services/mockApi.ts';

const appleProductHierarchy = {
    'Acessórios': {
        'Adaptador de energia USB-C de 20W': { 'Padrão': ['Branco'] },
        'Adaptador de energia USB-C de 35W com duas portas USB-C': { 'Padrão': ['Branco'] },
        'Adaptador de energia USB de 5W': { 'Padrão': ['Branco'] },
        'AirTag (1 un.)': { 'Padrão': ['Branco/Prata'] },
        'AirTag (Kit 4 un.)': { 'Padrão': ['Branco/Prata'] },
        'Apple Pencil 1 (2015, 1ª Geração) Lightning': { 'Padrão': ['Branco'] },
        'Apple Pencil 2 (2018, 2ª Geração)': { 'Padrão': ['Branco'] },
        'Apple Pencil Pro': { 'Padrão': ['Branco'] },
        'Apple Pencil USB-C (2023)': { 'Padrão': ['Branco'] },
        'Cabo carregador magnético para Apple Watch (1m) USB': { 'Padrão': ['Branco'] },
        'Cabo carregador magnético para Apple Watch (1m) USB-C': { 'Padrão': ['Branco'] },
        'Cabo de USB-C para Lightning (1m)': { 'Padrão': ['Branco'] },
        'Cabo de USB-C para Lightning (2m)': { 'Padrão': ['Branco'] },
        'Cabo de USB para Lightning (1m)': { 'Padrão': ['Branco'] },
        'Cabo de USB para Lightning (2m)': { 'Padrão': ['Branco'] },
        'Cabo USB-C 60W (1m)': { 'Padrão': ['Branco'] },
        'Cabo USB-C 60W (2m)': { 'Padrão': ['Branco'] },
        'Carregador MagSafe 20W': { 'Padrão': ['Branco'] },
        'Magic Keyboard com teclado numérico (USB-C) com Touch ID': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Keyboard com teclado numérico (USB-C) sem Touch ID': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Keyboard Folio para iPad (10ª geração)': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Keyboard para iPad Air M2 de 11" polegadas': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Keyboard para iPad Air M2 de 13" polegadas': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Keyboard para iPad Pro M4 de 11" polegadas': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Keyboard para iPad Pro M4 de 13" polegadas': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Keyboard (USB-C) com Touch ID': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Keyboard (USB-C) sem Touch ID': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Mouse 2': { 'Padrão': ['Branco', 'Preto'] },
        'Magic Trackpad': { 'Padrão': ['Branco', 'Preto'] },
        'Smart Keyboard para iPad 7/8/9': { 'Padrão': ['Cinza', 'Preto'] }
    },
    'AirPods': {
        'AirPods 2': { 'Padrão': ['Branco'] },
        'AirPods 3': { 'Padrão': ['Branco'] },
        'AirPods 4': { 'Padrão': ['Branco'] },
        'AirPods 4 com Cancelamento Ativo de Ruído': { 'Padrão': ['Branco'] },
        'AirPods Max': { 'Padrão': ['Green', 'Pink', 'Silver', 'Sky Blue', 'Space Gray'] },
        'AirPods Max (2024)': { 'Padrão': ['Green', 'Pink', 'Silver', 'Sky Blue', 'Space Gray'] },
        'AirPods Pro 1': { 'Padrão': ['Branco'] },
        'AirPods Pro 2': { 'Padrão': ['Branco'] },
        'AirPods Pro 3': { 'Padrão': ['Branco'] }
    },
    'EarPods': {
        'Conector Lightning': { 'Padrão': ['Branco'] },
        'Conector USB-C': { 'Padrão': ['Branco'] },
        'Conector de 3,5 mm': { 'Padrão': ['Branco'] }
    },
    'iPad': {
        'iPad 10 (2022) 10,9″ Wi-Fi': { '64GB': ['Azul', 'Rosa', 'Amarelo', 'Prata (Silver)'], '256GB': ['Azul', 'Rosa', 'Amarelo', 'Prata (Silver)'] },
        'iPad 10 (2022) 10,9″ Wi-Fi + Cellular': { '64GB': ['Azul', 'Rosa', 'Amarelo', 'Prata (Silver)'], '256GB': ['Azul', 'Rosa', 'Amarelo', 'Prata (Silver)'] },
        'iPad 11 (2025) 10,9″ Wi-Fi': { '128GB': ['Azul', 'Prata (Silver)', 'Rosa', 'Amarelo'], '256GB': ['Azul', 'Prata (Silver)', 'Rosa', 'Amarelo'], '512GB': ['Azul', 'Prata (Silver)', 'Rosa', 'Amarelo'] },
        'iPad 11 (2025) 10,9″ Wi-Fi + Cellular': { '128GB': ['Azul', 'Prata (Silver)', 'Rosa', 'Amarelo'], '256GB': ['Azul', 'Prata (Silver)', 'Rosa', 'Amarelo'], '512GB': ['Azul', 'Prata (Silver)', 'Rosa', 'Amarelo'] },
        'iPad 9 (2021) 10,2″ Wi-Fi': { '64GB': ['Cinza-espacial (Space Gray)', 'Prata (Silver)', 'Dourado (Gold)'], '256GB': ['Cinza-espacial (Space Gray)', 'Prata (Silver)', 'Dourado (Gold)'] },
        'iPad 9 (2021) 10,2″ Wi-Fi + Cellular': { '64GB': ['Cinza-espacial', 'Prata', 'Dourado'], '256GB': ['Cinza-espacial', 'Prata', 'Dourado'] },
        'iPad Air 4 (2020) 10,9″ Wi-Fi': { '64GB': ['Cinza-espacial (Space Gray)', 'Prata (Silver)', 'Verde (Green)', 'Ouro-rosa (Rose Gold)', 'Azul-céu (Sky Blue)'], '256GB': ['Cinza-espacial (Space Gray)', 'Prata (Silver)', 'Verde (Green)', 'Ouro-rosa (Rose Gold)', 'Azul-céu (Sky Blue)'] },
        'iPad Air 4 (2020) 10,9″ Wi-Fi + Cellular': { '64GB': ['Cinza-espacial', 'Prata', 'Verde', 'Ouro-rosa', 'Azul-céu'], '256GB': ['Cinza-espacial', 'Prata', 'Verde', 'Ouro-rosa', 'Azul-céu'] },
        'iPad Air 5 M1 (2022) 10,9″ Wi-Fi': { '64GB': ['Cinza-espacial (Space Gray)', 'Starlight', 'Midnight', 'Azul (Blue)'], '256GB': ['Cinza-espacial (Space Gray)', 'Starlight', 'Midnight', 'Azul (Blue)'] },
        'iPad Air 5 M1 (2022) 10,9″ Wi-Fi + Cellular': { '64GB': ['Cinza-espacial', 'Starlight', 'Midnight', 'Azul'], '256GB': ['Cinza-espacial', 'Starlight', 'Midnight', 'Azul'] },
        'iPad Air M2 (2024) 11″ Wi-Fi': { '128GB': ['Cinza-espacial (Space Gray)', 'Prata (Silver)', 'Azul (Blue)', 'Roxo (Purple)'], '256GB': ['Cinza-espacial (Space Gray)', 'Prata (Silver)', 'Azul (Blue)', 'Roxo (Purple)'], '512GB': ['Cinza-espacial (Space Gray)', 'Prata (Silver)', 'Azul (Blue)', 'Roxo (Purple)'], '1TB': ['Cinza-espacial (Space Gray)', 'Prata (Silver)', 'Azul (Blue)', 'Roxo (Purple)'] },
        'iPad Air M2 (2024) 11″ Wi-Fi + Cellular': { '128GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '256GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '512GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '1TB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'] },
        'iPad Air M2 (2024) 13″ Wi-Fi': { '128GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '256GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '512GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '1TB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'] },
        'iPad Air M2 (2024) 13″ Wi-Fi + Cellular': { '128GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '256GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '512GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '1TB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'] },
        'iPad Air M3 (2025) 11″ Wi-Fi': { '128GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '256GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '512GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '1TB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'] },
        'iPad Air M3 (2025) 11″ Wi-Fi + Cellular': { '128GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '256GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '512GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '1TB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'] },
        'iPad Air M3 (2025) 13″ Wi-Fi': { '128GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '256GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '512GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '1TB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'] },
        'iPad Air M3 (2025) 13″ Wi-Fi + Cellular': { '128GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '256GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '512GB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'], '1TB': ['Cinza-espacial', 'Prata', 'Azul', 'Roxo'] },
        'iPad mini 6 (2021) 8,3″': { '64GB': ['Azul', 'Roxo', 'Estelar (Starlight)', 'Cinza-espacial'], '256GB': ['Azul', 'Roxo', 'Estelar (Starlight)', 'Cinza-espacial'] },
        'iPad mini 7 (2024) 8,3″': { '128GB': ['Cinza-espacial', 'Estelar (Starlight)', 'Roxo (Purple)', 'Azul (Blue)'], '256GB': ['Cinza-espacial', 'Estelar (Starlight)', 'Roxo (Purple)', 'Azul (Blue)'], '512GB': ['Cinza-espacial', 'Estelar (Starlight)', 'Roxo (Purple)', 'Azul (Blue)'] },
        'iPad Pro 3 M1 (2021) 11″ Wi-Fi': { '128GB': ['Prata (Silver)', 'Cinza-espacial (Space Gray)'], '256GB': ['Prata (Silver)', 'Cinza-espacial (Space Gray)'], '512GB': ['Prata (Silver)', 'Cinza-espacial (Space Gray)'], '1TB': ['Prata (Silver)', 'Cinza-espacial (Space Gray)'], '2TB': ['Prata (Silver)', 'Cinza-espacial (Space Gray)'] },
        'iPad Pro 3 M1 (2021) 11″ Wi-Fi + Cellular': { '128GB': ['Prata', 'Cinza-espacial'], '256GB': ['Prata', 'Cinza-espacial'], '512GB': ['Prata', 'Cinza-espacial'], '1TB': ['Prata', 'Cinza-espacial'], '2TB': ['Prata', 'Cinza-espacial'] },
        'iPad Pro 4 M2 (2022) 11″ Wi-Fi': { '128GB': ['Prata', 'Cinza-espacial'], '256GB': ['Prata', 'Cinza-espacial'], '512GB': ['Prata', 'Cinza-espacial'], '1TB': ['Prata', 'Cinza-espacial'], '2TB': ['Prata', 'Cinza-espacial'] },
        'iPad Pro 4 M2 (2022) 11″ Wi-Fi + Cellular': { '128GB': ['Prata', 'Cinza-espacial'], '256GB': ['Prata', 'Cinza-espacial'], '512GB': ['Prata', 'Cinza-espacial'], '1TB': ['Prata', 'Cinza-espacial'], '2TB': ['Prata', 'Cinza-espacial'] },
        'iPad Pro 4 M2 (2022) 12,9″ Wi-Fi': { '128GB': ['Prata', 'Cinza-espacial'], '256GB': ['Prata', 'Cinza-espacial'], '512GB': ['Prata', 'Cinza-espacial'], '1TB': ['Prata', 'Cinza-espacial'], '2TB': ['Prata', 'Cinza-espacial'] },
        'iPad Pro 4 M2 (2022) 12,9″ Wi-Fi + Cellular': { '128GB': ['Prata', 'Cinza-espacial'], '256GB': ['Prata', 'Cinza-espacial'], '512GB': ['Prata', 'Cinza-espacial'], '1TB': ['Prata', 'Cinza-espacial'], '2TB': ['Prata', 'Cinza-espacial'] },
        'iPad Pro M4 (2024) 11″ Wi-Fi': { '256GB': ['Prata', 'Preto-espacial (Space Black)'], '512GB': ['Prata', 'Preto-espacial (Space Black)'], '1TB': ['Prata', 'Preto-espacial (Space Black)'], '2TB': ['Prata', 'Preto-espacial (Space Black)'] },
        'iPad Pro M4 (2024) 11″ Wi-Fi + Cellular': { '256GB': ['Prata', 'Preto-espacial'], '512GB': ['Prata', 'Preto-espacial'], '1TB': ['Prata', 'Preto-espacial'], '2TB': ['Prata', 'Preto-espacial'] },
        'iPad Pro M4 (2024) 13″ Wi-Fi': { '256GB': ['Prata', 'Preto-espacial'], '512GB': ['Prata', 'Preto-espacial'], '1TB': ['Prata', 'Preto-espacial'], '2TB': ['Prata', 'Preto-espacial'] },
        'iPad Pro M4 (2024) 13″ Wi-Fi + Cellular': { '256GB': ['Prata', 'Preto-espacial'], '512GB': ['Prata', 'Preto-espacial'], '1TB': ['Prata', 'Preto-espacial'], '2TB': ['Prata', 'Preto-espacial'] }
    },
    'iPhone': {
        'iPhone 6s': { '16GB': ['Cinza-espacial', 'Prata', 'Dourado', 'Ouro Rosa'], '32GB': ['Cinza-espacial', 'Prata', 'Dourado', 'Ouro Rosa'], '64GB': ['Cinza-espacial', 'Prata', 'Dourado', 'Ouro Rosa'], '128GB': ['Cinza-espacial', 'Prata', 'Dourado', 'Ouro Rosa'], },
        'iPhone 6s Plus': { '16GB': ['Cinza-espacial', 'Prata', 'Dourado', 'Ouro Rosa'], '32GB': ['Cinza-espacial', 'Prata', 'Dourado', 'Ouro Rosa'], '64GB': ['Cinza-espacial', 'Prata', 'Dourado', 'Ouro Rosa'], '128GB': ['Cinza-espacial', 'Prata', 'Dourado', 'Ouro Rosa'], },
        'iPhone 7': { '32GB': ['Preto (Matte)', 'Preto Brilhante (Jet Black)', 'Prata', 'Dourado', 'Ouro Rosa', '(PRODUCT)RED'], '128GB': ['Preto (Matte)', 'Preto Brilhante (Jet Black)', 'Prata', 'Dourado', 'Ouro Rosa', '(PRODUCT)RED'], '256GB': ['Preto (Matte)', 'Preto Brilhante (Jet Black)', 'Prata', 'Dourado', 'Ouro Rosa', '(PRODUCT)RED'], },
        'iPhone 7 Plus': { '32GB': ['Preto (Matte)', 'Preto Brilhante (Jet Black)', 'Prata', 'Dourado', 'Ouro Rosa', '(PRODUCT)RED'], '128GB': ['Preto (Matte)', 'Preto Brilhante (Jet Black)', 'Prata', 'Dourado', 'Ouro Rosa', '(PRODUCT)RED'], '256GB': ['Preto (Matte)', 'Preto Brilhante (Jet Black)', 'Prata', 'Dourado', 'Ouro Rosa', '(PRODUCT)RED'], },
        'iPhone 8': { '64GB': ['Cinza-espacial', 'Prata', 'Dourado', '(PRODUCT)RED'], '128GB': ['Cinza-espacial', 'Prata', 'Dourado', '(PRODUCT)RED'], '256GB': ['Cinza-espacial', 'Prata', 'Dourado', '(PRODUCT)RED'], },
        'iPhone 8 Plus': { '64GB': ['Cinza-espacial', 'Prata', 'Dourado', '(PRODUCT)RED'], '128GB': ['Cinza-espacial', 'Prata', 'Dourado', '(PRODUCT)RED'], '256GB': ['Cinza-espacial', 'Prata', 'Dourado', '(PRODUCT)RED'], },
        'iPhone X': { '64GB': ['Cinza-espacial', 'Prata'], '256GB': ['Cinza-espacial', 'Prata'], },
        'iPhone XR': { '64GB': ['Preto', 'Branco', 'Azul', 'Amarelo', 'Coral', '(PRODUCT)RED'], '128GB': ['Preto', 'Branco', 'Azul', 'Amarelo', 'Coral', '(PRODUCT)RED'], '256GB': ['Preto', 'Branco', 'Azul', 'Amarelo', 'Coral', '(PRODUCT)RED'], },
        'iPhone XS': { '64GB': ['Cinza-espacial', 'Prata', 'Dourado'], '256GB': ['Cinza-espacial', 'Prata', 'Dourado'], '512GB': ['Cinza-espacial', 'Prata', 'Dourado'], },
        'iPhone XS Max': { '64GB': ['Cinza-espacial', 'Prata', 'Dourado'], '256GB': ['Cinza-espacial', 'Prata', 'Dourado'], '512GB': ['Cinza-espacial', 'Prata', 'Dourado'], },
        'iPhone 11': { '64GB': ['Preto', 'Branco', 'Roxo', 'Verde', 'Amarelo', '(PRODUCT)RED'], '128GB': ['Preto', 'Branco', 'Roxo', 'Verde', 'Amarelo', '(PRODUCT)RED'], '256GB': ['Preto', 'Branco', 'Roxo', 'Verde', 'Amarelo', '(PRODUCT)RED'], },
        'iPhone 11 Pro': { '64GB': ['Verde Meia-Noite', 'Cinza-espacial', 'Prata', 'Dourado'], '256GB': ['Verde Meia-Noite', 'Cinza-espacial', 'Prata', 'Dourado'], '512GB': ['Verde Meia-Noite', 'Cinza-espacial', 'Prata', 'Dourado'], },
        'iPhone 11 Pro Max': { '64GB': ['Verde Meia-Noite', 'Cinza-espacial', 'Prata', 'Dourado'], '256GB': ['Verde Meia-Noite', 'Cinza-espacial', 'Prata', 'Dourado'], '512GB': ['Verde Meia-Noite', 'Cinza-espacial', 'Prata', 'Dourado'], },
        'iPhone 12 mini': { '64GB': ['Preto', 'Branco', 'Roxo', 'Azul', 'Verde', '(PRODUCT)RED'], '128GB': ['Preto', 'Branco', 'Roxo', 'Azul', 'Verde', '(PRODUCT)RED'], '256GB': ['Preto', 'Branco', 'Roxo', 'Azul', 'Verde', '(PRODUCT)RED'], },
        'iPhone 12': { '64GB': ['Preto', 'Branco', 'Roxo', 'Azul', 'Verde', '(PRODUCT)RED'], '128GB': ['Preto', 'Branco', 'Roxo', 'Azul', 'Verde', '(PRODUCT)RED'], '256GB': ['Preto', 'Branco', 'Roxo', 'Azul', 'Verde', '(PRODUCT)RED'], },
        'iPhone 12 Pro': { '128GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Pacífico'], '256GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Pacífico'], '512GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Pacífico'], },
        'iPhone 12 Pro Max': { '128GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Pacífico'], '256GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Pacífico'], '512GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Pacífico'], },
        'iPhone 13 mini': { '128GB': ['Meia-noite', 'Estelar', 'Rosa', 'Azul', 'Verde', '(PRODUCT)RED'], '256GB': ['Meia-noite', 'Estelar', 'Rosa', 'Azul', 'Verde', '(PRODUCT)RED'], '512GB': ['Meia-noite', 'Estelar', 'Rosa', 'Azul', 'Verde', '(PRODUCT)RED'], },
        'iPhone 13': { '128GB': ['Meia-noite', 'Estelar', 'Rosa', 'Azul', 'Verde', '(PRODUCT)RED'], '256GB': ['Meia-noite', 'Estelar', 'Rosa', 'Azul', 'Verde', '(PRODUCT)RED'], '512GB': ['Meia-noite', 'Estelar', 'Rosa', 'Azul', 'Verde', '(PRODUCT)RED'], },
        'iPhone 13 Pro': { '128GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Sierra', 'Verde-alpino'], '256GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Sierra', 'Verde-alpino'], '512GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Sierra', 'Verde-alpino'], '1TB': ['Grafite', 'Prata', 'Dourado', 'Azul-Sierra', 'Verde-alpino'], },
        'iPhone 13 Pro Max': { '128GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Sierra', 'Verde-alpino'], '256GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Sierra', 'Verde-alpino'], '512GB': ['Grafite', 'Prata', 'Dourado', 'Azul-Sierra', 'Verde-alpino'], '1TB': ['Grafite', 'Prata', 'Dourado', 'Azul-Sierra', 'Verde-alpino'], },
        'iPhone 14': { '128GB': ['Meia-noite', 'Roxo', 'Estelar', 'Azul', 'Amarelo', '(PRODUCT)RED'], '256GB': ['Meia-noite', 'Roxo', 'Estelar', 'Azul', 'Amarelo', '(PRODUCT)RED'], '512GB': ['Meia-noite', 'Roxo', 'Estelar', 'Azul', 'Amarelo', '(PRODUCT)RED'], },
        'iPhone 14 Plus': { '128GB': ['Meia-noite', 'Roxo', 'Estelar', 'Azul', 'Amarelo', '(PRODUCT)RED'], '256GB': ['Meia-noite', 'Roxo', 'Estelar', 'Azul', 'Amarelo', '(PRODUCT)RED'], '512GB': ['Meia-noite', 'Roxo', 'Estelar', 'Azul', 'Amarelo', '(PRODUCT)RED'], },
        'iPhone 14 Pro': { '128GB': ['Roxo-profundo', 'Preto-espacial', 'Prata', 'Dourado'], '256GB': ['Roxo-profundo', 'Preto-espacial', 'Prata', 'Dourado'], '512GB': ['Roxo-profundo', 'Preto-espacial', 'Prata', 'Dourado'], '1TB': ['Roxo-profundo', 'Preto-espacial', 'Prata', 'Dourado'], },
        'iPhone 14 Pro Max': { '128GB': ['Roxo-profundo', 'Preto-espacial', 'Prata', 'Dourado'], '256GB': ['Roxo-profundo', 'Preto-espacial', 'Prata', 'Dourado'], '512GB': ['Roxo-profundo', 'Preto-espacial', 'Prata', 'Dourado'], '1TB': ['Roxo-profundo', 'Preto-espacial', 'Prata', 'Dourado'], },
        'iPhone 15': { '128GB': ['Preto', 'Azul', 'Verde', 'Amarelo', 'Rosa'], '256GB': ['Preto', 'Azul', 'Verde', 'Amarelo', 'Rosa'], '512GB': ['Preto', 'Azul', 'Verde', 'Amarelo', 'Rosa'], },
        'iPhone 15 Plus': { '128GB': ['Preto', 'Azul', 'Verde', 'Amarelo', 'Rosa'], '256GB': ['Preto', 'Azul', 'Verde', 'Amarelo', 'Rosa'], '512GB': ['Preto', 'Azul', 'Verde', 'Amarelo', 'Rosa'], },
        'iPhone 15 Pro': { '128GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Azul', 'Titânio Natural'], '256GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Azul', 'Titânio Natural'], '512GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Azul', 'Titânio Natural'], '1TB': ['Titânio Preto', 'Titânio Branco', 'Titânio Azul', 'Titânio Natural'], },
        'iPhone 15 Pro Max': { '256GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Azul', 'Titânio Natural'], '512GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Azul', 'Titânio Natural'], '1TB': ['Titânio Preto', 'Titânio Branco', 'Titânio Azul', 'Titânio Natural'], },
        'iPhone 16': { '128GB': ['Preto', 'Branco', 'Rosa', 'Verde-azulado (Teal)', 'Ultramarino'], '256GB': ['Preto', 'Branco', 'Rosa', 'Verde-azulado (Teal)', 'Ultramarino'], '512GB': ['Preto', 'Branco', 'Rosa', 'Verde-azulado (Teal)', 'Ultramarino'], },
        'iPhone 16 Plus': { '128GB': ['Preto', 'Branco', 'Rosa', 'Verde-azulado (Teal)', 'Ultramarino'], '256GB': ['Preto', 'Branco', 'Rosa', 'Verde-azulado (Teal)', 'Ultramarino'], '512GB': ['Preto', 'Branco', 'Rosa', 'Verde-azulado (Teal)', 'Ultramarino'], },
        'iPhone 16 Pro': { '128GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Natural', 'Titânio Deserto'], '256GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Natural', 'Titânio Deserto'], '512GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Natural', 'Titânio Deserto'], '1TB': ['Titânio Preto', 'Titânio Branco', 'Titânio Natural', 'Titânio Deserto'], },
        'iPhone 16 Pro Max': { '256GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Natural', 'Titânio Deserto'], '512GB': ['Titânio Preto', 'Titânio Branco', 'Titânio Natural', 'Titânio Deserto'], '1TB': ['Titânio Preto', 'Titânio Branco', 'Titânio Natural', 'Titânio Deserto'], },
        'iPhone 17': { '256GB': ['Preto', 'Branco', 'Azul Névoa', 'Sálvia', 'Lavanda'], '512GB': ['Preto', 'Branco', 'Azul Névoa', 'Sálvia', 'Lavanda'], },
        'iPhone Air': { '256GB': ['Preto Espacial', 'Branco Nuvem', 'Dourado Claro', 'Azul Céu'], '512GB': ['Preto Espacial', 'Branco Nuvem', 'Dourado Claro', 'Azul Céu'], '1TB': ['Preto Espacial', 'Branco Nuvem', 'Dourado Claro', 'Azul Céu'], },
        'iPhone 17 Pro': { '256GB': ['Laranja Cósmico', 'Azul Profundo', 'Prateado'], '512GB': ['Laranja Cósmico', 'Azul Profundo', 'Prateado'], '1TB': ['Laranja Cósmico', 'Azul Profundo', 'Prateado'], '2TB': ['Laranja Cósmico', 'Azul Profundo', 'Prateado'], },
        'iPhone 17 Pro Max': { '256GB': ['Laranja Cósmico', 'Azul Profundo', 'Prateado'], '512GB': ['Laranja Cósmico', 'Azul Profundo', 'Prateado'], '1TB': ['Laranja Cósmico', 'Azul Profundo', 'Prateado'], '2TB': ['Laranja Cósmico', 'Azul Profundo', 'Prateado'], },
    },
    'Mac': {
        'MacBook Pro (2024, 14") M4 Max': {
            '36GB/1TB': ['Preto-espacial', 'Prateado'],
            '48GB/1TB': ['Preto-espacial', 'Prateado'],
            '64GB/2TB': ['Preto-espacial', 'Prateado'],
            '128GB/4TB': ['Preto-espacial', 'Prateado']
        },
        'MacBook Pro (2024, 16") M4 Max': {
            '36GB/1TB': ['Preto-espacial', 'Prateado'],
            '48GB/1TB': ['Preto-espacial', 'Prateado'],
            '64GB/2TB': ['Preto-espacial', 'Prateado'],
            '128GB/4TB': ['Preto-espacial', 'Prateado']
        },
        'MacBook Pro (2024, 16") M4 Pro': {
            '24GB/512GB': ['Preto-espacial', 'Prateado'],
            '24GB/1TB': ['Preto-espacial', 'Prateado'],
            '48GB/1TB': ['Preto-espacial', 'Prateado']
        },
        'Mac Mini M4 (2024)': {
            '16GB/256GB': ['Prateado'],
            '16GB/512GB': ['Prateado'],
            '24GB/512GB': ['Prateado']
        },
        'Mac Mini M4 Pro (2024)': {
            '24GB/512GB': ['Prateado'],
            '24GB/1TB': ['Prateado'],
            '32GB/1TB': ['Prateado']
        },
        'Mac Studio M2 Max (2023)': {
            '32GB/512GB': ['Prateado'],
            '64GB/1TB': ['Prateado']
        },
        'Mac Studio M2 Ultra (2023)': {
            '64GB/1TB': ['Prateado'],
            '96GB/2TB': ['Prateado'],
            '128GB/2TB': ['Prateado']
        },
        'MacBook Air (2017, 13") Intel': {
            '8GB/128GB': ['Prata'],
            '8GB/256GB': ['Prata']
        },
        'MacBook Air (2018, 13") Intel': {
            '8GB/128GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '8GB/256GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '16GB/256GB': ['Prata', 'Dourado', 'Cinza-espacial']
        },
        'MacBook Air (2019, 13") Intel': {
            '8GB/128GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '8GB/256GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '16GB/256GB': ['Prata', 'Dourado', 'Cinza-espacial']
        },
        'MacBook Air (2020, 13") Intel': {
            '8GB/256GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '8GB/512GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '16GB/256GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '16GB/512GB': ['Prata', 'Dourado', 'Cinza-espacial']
        },
        'MacBook Air (2020, 13.3") M1': {
            '8GB/256GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '8GB/512GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '16GB/256GB': ['Prata', 'Dourado', 'Cinza-espacial'],
            '16GB/512GB': ['Prata', 'Dourado', 'Cinza-espacial']
        },
        'MacBook Air (2022, 13.6") M2': {
            '8GB/256GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '8GB/512GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '16GB/256GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '16GB/512GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '24GB/512GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial']
        },
        'MacBook Air (2023, 15") M2': {
            '8GB/256GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '8GB/512GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '16GB/512GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '24GB/1TB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial']
        },
        'MacBook Air (2024, 13") M3 (8-core/10-core GPU)': {
            '8GB/256GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '8GB/512GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '16GB/512GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '24GB/1TB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial']
        },
        'MacBook Air (2024, 15") M3': {
            '8GB/256GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '8GB/512GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '16GB/512GB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial'],
            '24GB/1TB': ['Meia-noite', 'Estelar', 'Prateado', 'Cinza-espacial']
        },
        'MacBook Air (2025, 13.6") M4': {
            '16GB/256GB': ['Azul-céu', 'Prateado', 'Estelar', 'Meia-noite'],
            '16GB/512GB': ['Azul-céu', 'Prateado', 'Estelar', 'Meia-noite'],
            '24GB/512GB': ['Azul-céu', 'Prateado', 'Estelar', 'Meia-noite']
        },
        'MacBook Air (2025, 15.3") M4': {
            '16GB/256GB': ['Azul-céu', 'Prateado', 'Estelar', 'Meia-noite'],
            '16GB/512GB': ['Azul-céu', 'Prateado', 'Estelar', 'Meia-noite'],
            '24GB/512GB': ['Azul-céu', 'Prateado', 'Estelar', 'Meia-noite']
        },
        'MacBook Pro (2012, 13") i5 2.5GHz': {
            '8GB/500GB (HDD)': ['Prata'],
            '8GB/256GB (SSD)': ['Prata']
        },
        'MacBook Pro (2012, 13") i7 2.9GHz': {
            '8GB/750GB (HDD)': ['Prata'],
            '8GB/256GB (SSD)': ['Prata']
        },
        'MacBook Pro (2013, 13", Retina) i5 2.4GHz': {
            '8GB/128GB': ['Prata'],
            '8GB/256GB': ['Prata']
        },
        'MacBook Pro (2013, 13", Retina) i5 2.6GHz': {
            '8GB/256GB': ['Prata'],
            '8GB/512GB': ['Prata']
        },
        'MacBook Pro (2013, 15", Retina) i7 2.8GHz': {
            '16GB/512GB': ['Prata'],
            '16GB/1TB': ['Prata']
        },
        'MacBook Pro (2015, 15", Retina) i7 3.1GHz': {
            '16GB/256GB': ['Prata'],
            '16GB/512GB': ['Prata']
        },
        'MacBook Pro (2017, 13") i5 3.1GHz': {
            '8GB/256GB': ['Prata', 'Cinza-espacial'],
            '8GB/512GB': ['Prata', 'Cinza-espacial']
        },
        'MacBook Pro (2020, 13") M1': {
            '8GB/256GB': ['Prata', 'Cinza-espacial'],
            '8GB/512GB': ['Prata', 'Cinza-espacial'],
            '16GB/256GB': ['Prata', 'Cinza-espacial'],
            '16GB/512GB': ['Prata', 'Cinza-espacial']
        },
        'MacBook Pro (2021, 14") M1 Pro': {
            '16GB/512GB': ['Prata', 'Cinza-espacial'],
            '16GB/1TB': ['Prata', 'Cinza-espacial'],
            '32GB/1TB': ['Prata', 'Cinza-espacial']
        },
        'MacBook Pro (2021, 16") M1 Pro': {
            '16GB/512GB': ['Prata', 'Cinza-espacial'],
            '16GB/1TB': ['Prata', 'Cinza-espacial'],
            '32GB/1TB': ['Prata', 'Cinza-espacial']
        },
        'MacBook Pro (2022, 13") M2': {
            '8GB/256GB': ['Prata', 'Cinza-espacial'],
            '8GB/512GB': ['Prata', 'Cinza-espacial'],
            '16GB/512GB': ['Prata', 'Cinza-espacial'],
            '24GB/1TB': ['Prata', 'Cinza-espacial']
        },
        'MacBook Pro (2023, 14.2") M3 (8-core CPU, 10-core GPU)': {
            '8GB/512GB': ['Prata', 'Preto-espacial'],
            '16GB/512GB': ['Prata', 'Preto-espacial']
        },
        'MacBook Pro (2023, 14.2") M3 Max (14-core CPU, 30-core GPU)': {
            '36GB/1TB': ['Prata', 'Preto-espacial'],
            '48GB/1TB': ['Prata', 'Preto-espacial'],
            '64GB/2TB': ['Prata', 'Preto-espacial']
        },
        'MacBook Pro (2023, 14.2") M3 Pro (11-core CPU, 14-core GPU)': {
            '18GB/512GB': ['Prata', 'Preto-espacial'],
            '18GB/1TB': ['Prata', 'Preto-espacial'],
            '36GB/1TB': ['Prata', 'Preto-espacial']
        },
        'MacBook Pro (2023, 14") M2 Max (12-core CPU, 30-core GPU)': {
            '32GB/1TB': ['Prata', 'Cinza-espacial'],
            '64GB/1TB': ['Prata', 'Cinza-espacial']
        },
        'MacBook Pro (2023, 14") M2 Max (12-core CPU, 38-core GPU)': {
            '32GB/1TB': ['Prata', 'Cinza-espacial'],
            '64GB/1TB': ['Prata', 'Cinza-espacial']
        },
        'MacBook Pro (2023, 14") M2 Pro': {
            '16GB/512GB': ['Prata', 'Cinza-espacial'],
            '16GB/1TB': ['Prata', 'Cinza-espacial'],
            '32GB/1TB': ['Prata', 'Cinza-espacial']
        },
        'MacBook Pro (2023, 16.2") M3 Max (14-core CPU, 30-core GPU)': {
            '36GB/1TB': ['Prata', 'Preto-espacial'],
            '48GB/1TB': ['Prata', 'Preto-espacial'],
            '64GB/2TB': ['Prata', 'Preto-espacial']
        },
        'MacBook Pro (2023, 16.2") M3 Pro (12-core CPU, 18-core GPU)': {
            '18GB/512GB': ['Prata', 'Preto-espacial'],
            '18GB/1TB': ['Prata', 'Preto-espacial'],
            '36GB/1TB': ['Prata', 'Preto-espacial']
        },
        'MacBook Pro (2024, 14") M4': {
            '24GB/512GB': ['Preto-espacial', 'Prateado'],
            '36GB/1TB': ['Preto-espacial', 'Prateado'],
            '48GB/1TB': ['Preto-espacial', 'Prateado'],
            '64GB/2TB': ['Preto-espacial', 'Prateado'],
            '128GB/4TB': ['Preto-espacial', 'Prateado']
        },
        'iMac (2017, 21.5", Retina 4K) Intel': {
            '8GB/1TB (Fusion/HD)': ['Prata'],
            '16GB/1TB (config.)': ['Prata']
        },
        'iMac (2017, 27", Retina 5K) Intel': {
            '8GB/1TB (Fusion)': ['Prata'],
            '16GB/1TB (config.)': ['Prata']
        },
        'iMac (2019, 21.5", Retina 4K) Intel': {
            '8GB/1TB (Fusion/HD)': ['Prata'],
            '16GB/1TB (config.)': ['Prata']
        },
        'iMac (2019, 27", Retina 5K) Intel': {
            '8GB/1TB (Fusion/SSD)': ['Prata'],
            '16GB/1TB': ['Prata']
        },
        'iMac (2020, 27", Retina 5K) Intel': {
            '8GB/512GB': ['Prata'],
            '8GB/1TB': ['Prata'],
            '16GB/1TB': ['Prata']
        },
        'iMac (2021, 24") M1 (7-GPU)': {
            '8GB/256GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo'],
            '8GB/512GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo']
        },
        'iMac (2021, 24") M1 (8-GPU)': {
            '8GB/256GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo'],
            '8GB/512GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo'],
            '16GB/512GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo']
        },
        'iMac (2023, 24") M3': {
            '8GB/256GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo'],
            '8GB/512GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo'],
            '16GB/512GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo']
        },
        'iMac (2024, 24") M4': {
            '8GB/256GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo'],
            '8GB/512GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo'],
            '16GB/512GB': ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo']
        }
    },
    'Watch': {
        'Apple Watch SE (1ª Geração, 2020) 40mm (GPS)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)', 'Dourado (Gold)'] },
        'Apple Watch SE (1ª Geração, 2020) 44mm (GPS)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)', 'Dourado (Gold)'] },
        'Apple Watch SE (1ª Geração, 2020) 40mm (GPS + Cellular)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)', 'Dourado (Gold)'] },
        'Apple Watch SE (1ª Geração, 2020) 44mm (GPS + Cellular)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)', 'Dourado (Gold)'] },
        'Apple Watch SE (2ª Geração, 2022) 40mm (GPS)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)'] },
        'Apple Watch SE (2ª Geração, 2022) 44mm (GPS)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)'] },
        'Apple Watch SE (2ª Geração, 2022) 40mm (GPS + Cellular)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)'] },
        'Apple Watch SE (2ª Geração, 2022) 44mm (GPS + Cellular)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)'] },
        'Apple Watch SE (3ª Geração, 2025) 40mm (GPS)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Rosa (Pink)', 'Prata (Silver)'] },
        'Apple Watch SE (3ª Geração, 2025) 44mm (GPS)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Rosa (Pink)', 'Prata (Silver)'] },
        'Apple Watch SE (3ª Geração, 2025) 40mm (GPS + Cellular)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Rosa (Pink)', 'Prata (Silver)'] },
        'Apple Watch SE (3ª Geração, 2025) 44mm (GPS + Cellular)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Rosa (Pink)', 'Prata (Silver)'] },
        'Apple Watch Series 3 (2017) 38mm (GPS)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)'] },
        'Apple Watch Series 3 (2017) 42mm (GPS)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)'] },
        'Apple Watch Series 4 (2018) 40mm (GPS)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)', 'Dourado (Gold)'] },
        'Apple Watch Series 4 (2018) 44mm (GPS)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)', 'Dourado (Gold)'] },
        'Apple Watch Series 4 (2018) 40mm (GPS + Cellular)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)', 'Dourado (Gold)'] },
        'Apple Watch Series 4 (2018) 44mm (GPS + Cellular)': { 'Padrão': ['Prata (Silver)', 'Cinza-espacial (Space Gray)', 'Dourado (Gold)'] },
        'Apple Watch Series 5 (2019) 40mm (GPS) Alumínio': { 'Padrão': ['Prata', 'Cinza-espacial', 'Dourado'] },
        'Apple Watch Series 5 (2019) 44mm (GPS) Alumínio': { 'Padrão': ['Prata', 'Cinza-espacial', 'Dourado'] },
        'Apple Watch Series 5 (2019) 40mm (GPS + Cellular) Alumínio': { 'Padrão': ['Prata', 'Cinza-espacial', 'Dourado'] },
        'Apple Watch Series 5 (2019) 44mm (GPS + Cellular) Alumínio': { 'Padrão': ['Prata', 'Cinza-espacial', 'Dourado'] },
        'Apple Watch Series 5 (2019) 40mm (GPS + Cellular) Aço Inoxidável': { 'Padrão': ['Prata', 'Dourado', 'Preto-espacial'] },
        'Apple Watch Series 5 (2019) 44mm (GPS + Cellular) Aço Inoxidável': { 'Padrão': ['Prata', 'Dourado', 'Preto-espacial'] },
        'Apple Watch Series 5 (2019) 40mm (GPS + Cellular) Titânio': { 'Padrão': ['Natural', 'Preto-espacial'] },
        'Apple Watch Series 5 (2019) 44mm (GPS + Cellular) Titânio': { 'Padrão': ['Natural', 'Preto-espacial'] },
        'Apple Watch Series 6 (2020) 40mm (GPS)': { 'Padrão': ['Azul (Blue)', '(PRODUCT)RED', 'Prata (Silver)', 'Dourado (Gold)', 'Cinza-espacial (Space Gray)'] },
        'Apple Watch Series 6 (2020) 44mm (GPS)': { 'Padrão': ['Azul (Blue)', '(PRODUCT)RED', 'Prata (Silver)', 'Dourado (Gold)', 'Cinza-espacial (Space Gray)'] },
        'Apple Watch Series 6 (2020) 40mm (GPS + Cellular)': { 'Padrão': ['Azul (Blue)', '(PRODUCT)RED', 'Prata (Silver)', 'Dourado (Gold)', 'Cinza-espacial (Space Gray)'] },
        'Apple Watch Series 6 (2020) 44mm (GPS + Cellular)': { 'Padrão': ['Azul (Blue)', '(PRODUCT)RED', 'Prata (Silver)', 'Dourado (Gold)', 'Cinza-espacial (Space Gray)'] },
        'Apple Watch Series 7 (2021) 41mm (GPS)': { 'Padrão': ['Verde (Green)', 'Azul (Blue)', 'Meia-noite (Midnight)', 'Estelar (Starlight)', '(PRODUCT)RED'] },
        'Apple Watch Series 7 (2021) 45mm (GPS)': { 'Padrão': ['Verde (Green)', 'Azul (Blue)', 'Meia-noite (Midnight)', 'Estelar (Starlight)', '(PRODUCT)RED'] },
        'Apple Watch Series 7 (2021) 41mm (GPS + Cellular)': { 'Padrão': ['Verde (Green)', 'Azul (Blue)', 'Meia-noite (Midnight)', 'Estelar (Starlight)', '(PRODUCT)RED'] },
        'Apple Watch Series 7 (2021) 45mm (GPS + Cellular)': { 'Padrão': ['Verde (Green)', 'Azul (Blue)', 'Meia-noite (Midnight)', 'Estelar (Starlight)', '(PRODUCT)RED'] },
        'Apple Watch Series 8 (2022) 41mm (GPS)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)', '(PRODUCT)RED'] },
        'Apple Watch Series 8 (2022) 45mm (GPS)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)', '(PRODUCT)RED'] },
        'Apple Watch Series 8 (2022) 41mm (GPS + Cellular)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)', '(PRODUCT)RED'] },
        'Apple Watch Series 8 (2022) 45mm (GPS + Cellular)': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)', '(PRODUCT)RED'] },
        'Apple Watch Series 9 (2023) 41mm (GPS) Alumínio': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)', 'Rosa (Pink)', '(PRODUCT)RED'] },
        'Apple Watch Series 9 (2023) 45mm (GPS) Alumínio': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)', 'Rosa (Pink)', '(PRODUCT)RED'] },
        'Apple Watch Series 9 (2023) 41mm (GPS + Cellular) Alumínio': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)', 'Rosa (Pink)', '(PRODUCT)RED'] },
        'Apple Watch Series 9 (2023) 45mm (GPS + Cellular) Alumínio': { 'Padrão': ['Meia-noite (Midnight)', 'Estelar (Starlight)', 'Prata (Silver)', 'Rosa (Pink)', '(PRODUCT)RED'] },
        'Apple Watch Series 9 (2023) 41mm (GPS + Cellular) Titânio': { 'Padrão': ['Natural', 'Preto-espacial'] },
        'Apple Watch Series 9 (2023) 45mm (GPS + Cellular) Titânio': { 'Padrão': ['Natural', 'Preto-espacial'] },
        'Apple Watch Series 10 (2024) 42mm (GPS) Alumínio': { 'Padrão': ['Meia-noite', 'Estelar', 'Rosa', 'Azul-claro'] },
        'Apple Watch Series 10 (2024) 46mm (GPS) Alumínio': { 'Padrão': ['Meia-noite', 'Estelar', 'Rosa', 'Azul-claro'] },
        'Apple Watch Series 10 (2024) 42mm (GPS + Cellular) Alumínio': { 'Padrão': ['Meia-noite', 'Estelar', 'Rosa', 'Azul-claro'] },
        'Apple Watch Series 10 (2024) 46mm (GPS + Cellular) Alumínio': { 'Padrão': ['Meia-noite', 'Estelar', 'Rosa', 'Azul-claro'] },
        'Apple Watch Series 10 (2024) 42mm (GPS + Cellular) Titânio': { 'Padrão': ['Natural', 'Preto-espacial'] },
        'Apple Watch Series 10 (2024) 46mm (GPS + Cellular) Titânio': { 'Padrão': ['Natural', 'Preto-espacial'] },
        'Apple Watch Series 11 (2025) 42mm (GPS) Alumínio': { 'Padrão': ['Meia-noite', 'Estelar', 'Prata', 'Azul'] },
        'Apple Watch Series 11 (2025) 46mm (GPS) Alumínio': { 'Padrão': ['Meia-noite', 'Estelar', 'Prata', 'Azul'] },
        'Apple Watch Series 11 (2025) 42mm (GPS + Cellular) Alumínio': { 'Padrão': ['Meia-noite', 'Estelar', 'Prata', 'Azul'] },
        'Apple Watch Series 11 (2025) 46mm (GPS + Cellular) Alumínio': { 'Padrão': ['Meia-noite', 'Estelar', 'Prata', 'Azul'] },
        'Apple Watch Series 11 (2025) 42mm (GPS + Cellular) Titânio': { 'Padrão': ['Natural', 'Preto-espacial'] },
        'Apple Watch Series 11 (2025) 46mm (GPS + Cellular) Titânio': { 'Padrão': ['Natural', 'Preto-espacial'] },
        'Apple Watch Ultra (1ª Geração, 2022) 49mm (GPS + Cellular)': { 'Padrão': ['Natural (Titanium Natural)'] },
        'Apple Watch Ultra 2 (2ª Geração, 2024) 49mm (GPS + Cellular)': { 'Padrão': ['Natural (Titanium Natural)'] },
        'Apple Watch Ultra 3 (3ª Geração, 2025) 49mm (GPS + Cellular)': { 'Padrão': ['Natural (Titanium Natural)', 'Preto-espacial (Space Black Titanium)'] },
    }
};

interface ProductModalProps {
    product: Partial<Product> | null;
    suppliers: Supplier[];
    brands: Brand[];
    categories: Category[];
    productModels: ProductModel[];
    grades: Grade[];
    gradeValues: GradeValue[];
    customers: Customer[];
    onClose: () => void;
    onSave: (productData: any) => void;
    onAddNewSupplier: (supplierData: Omit<Supplier, 'id'>) => Promise<Supplier | null>;
    isTradeInMode?: boolean;
    isOpen?: boolean;
}

const parseAppleModelString = (modelStr: string, variations: ProductVariation[] = []) => {
    let category = '';
    let model = '';
    let storageString: string | undefined = undefined;
    let color = '';

    for (const cat of Object.keys(appleProductHierarchy)) {
        const modelsInCat = Object.keys(appleProductHierarchy[cat as keyof typeof appleProductHierarchy]);
        if (modelsInCat.some(m => modelStr.includes(m))) {
            category = cat;
            break;
        }
    }
    if (!category) return { category, model, storageString, color };

    let remainingStr = modelStr;
    const models = appleProductHierarchy[category as keyof typeof appleProductHierarchy];
    const sortedModels = Object.keys(models).sort((a, b) => b.length - a.length);
    for (const m of sortedModels) {
        const modelIndex = remainingStr.indexOf(m);
        if (modelIndex > -1) {
            model = m;
            remainingStr = remainingStr.substring(modelIndex + m.length).trim();
            break;
        }
    }
    if (!model) return { category, model, storageString, color };

    const storages = models[model as keyof typeof models];
    const sortedStorages = Object.keys(storages).sort((a, b) => b.length - a.length);
    for (const s of sortedStorages) {
        if (remainingStr.startsWith(s)) {
            storageString = s;
            remainingStr = remainingStr.substring(s.length).trim();
            break;
        }
    }

    // Try to match against known colors first to avoid capturing extra variation text (e.g. "Sim")
    let knownColors: readonly string[] = [];
    // Cast to any to assume structural access is safe given we validated model
    const storageKey = storageString || 'Padrão';
    const sMap = storages as any;
    if (sMap[storageKey]) {
        knownColors = sMap[storageKey];
    } else if (sMap['Padrão']) {
        knownColors = sMap['Padrão'];
    }

    const sortedColors = [...knownColors].sort((a, b) => b.length - a.length);
    let matchedColor = '';
    for (const c of sortedColors) {
        // Case insensitive match for safety, OR exact start match
        // Typically database formatting matches hierarchy formatting
        if (remainingStr.startsWith(c) || remainingStr.toLowerCase().startsWith(c.toLowerCase())) {
            matchedColor = c;
            break;
        }
    }

    if (matchedColor) {
        color = matchedColor;
    } else {
        const variationText = variations?.map(v => v.valueName).join(' ') || '';
        if (variationText && remainingStr.endsWith(variationText)) {
            color = remainingStr.substring(0, remainingStr.length - variationText.length).trim();
        } else {
            color = remainingStr;
        }
    }

    return { category, model, storageString, color };
};


const accessoryItems = [
    'Caixa Original', 'Carregador', 'Cabo USB', 'Fone de Ouvido', 'Nota Fiscal', 'Capa', 'Película', 'Manual'
];

const checklistItems = [
    'Alto Falante (Auricular)', 'Alto Falante (Viva Voz)', 'Aparelho não pode ser ligado', 'Bateria',
    'Biometria / Touch ID', 'Botão Power (Liga/Desliga)', 'Botão Volume (Aumentar/Diminuir)',
    'Câmera Frontal', 'Câmera Traseira', 'Carcaça / Gabinete', 'Chave Seletora (Silenciar)',
    'Conector de Carga', 'Display / Tela / Touch', 'Face ID', 'Microfone', 'Parafusos',
    'Sensor de Proximidade', 'Sinal de Rede (Operadora)', 'Wi-Fi / Bluetooth', 'Tampa Traseira'
];

const ProductModal: React.FC<ProductModalProps> = ({
    product, suppliers = [], brands = [], categories = [], productModels = [], grades = [], gradeValues = [], customers = [], onClose, onSave, onAddNewSupplier, isTradeInMode = false, isOpen = true
}) => {
    const initializedIdRef = useRef<string | null>(null);
    const [productType, setProductType] = useState<'Apple' | 'Produto'>('Apple');
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [appleStorage, setAppleStorage] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [savingSupplier, setSavingSupplier] = useState(false);
    const [isMinimumStockEnabled, setIsMinimumStockEnabled] = useState(false);
    const [showVariations, setShowVariations] = useState(false);
    const [currentGradeId, setCurrentGradeId] = useState('');
    const [currentValueId, setCurrentValueId] = useState('');
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const { showToast } = useToast();
    const { user } = useUser();

    // New States for Trade-In Tab
    const [activeTab, setActiveTab] = useState<'details' | 'extras' | 'checklist'>('details');
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const handleAddPhoto = (imageData: string) => {
        if ((formData.photos?.length || 0) >= 6) {
            showToast('Limite de 6 fotos atingido.', 'error');
            return;
        }
        setFormData(prev => ({
            ...prev,
            photos: [...(prev.photos || []), imageData]
        }));
        setIsCameraOpen(false);
    };

    const handleRemovePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            photos: (prev.photos || []).filter((_, i) => i !== index)
        }));
    };

    const handleAccessoryToggle = (item: string) => {
        setFormData(prev => {
            const current = prev.accessories || [];
            if (current.includes(item)) {
                return { ...prev, accessories: current.filter(i => i !== item) };
            } else {
                return { ...prev, accessories: [...current, item] };
            }
        });
    };

    const handleChecklistToggle = (item: string) => {
        setFormData(prev => {
            const currentChecklist = prev.checklist || {};
            return {
                ...prev,
                checklist: {
                    ...currentChecklist,
                    [item]: !currentChecklist[item]
                }
            };
        });
    };

    const handleChecklistChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            checklist: {
                ...(prev.checklist || {}),
                [field]: value
            }
        }));
    };

    // Updates both checklist repairCost and product additionalCostPrice
    const handleRepairCostChange = (value: number) => {
        setFormData(prev => ({
            ...prev,
            additionalCostPrice: value,
            checklist: {
                ...(prev.checklist || {}),
                repairCost: value
            }
        }));
    };

    // Dynamic parameters from Empresa > Parâmetros
    const [conditionOptions, setConditionOptions] = useState<ProductConditionParameter[]>([]);
    const [locationOptions, setLocationOptions] = useState<StorageLocationParameter[]>([]);
    const [warrantyOptions, setWarrantyOptions] = useState<WarrantyParameter[]>([]);

    // Animation visibility state
    const [visible, setVisible] = useState(isOpen);
    useEffect(() => {
        if (isOpen) {
            setVisible(true);
        } else {
            const timer = setTimeout(() => setVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // NOTE: Removed early return here - it was causing React hooks order violation
    // The visibility check is now done in the render return statement
    useEffect(() => {
        const fetchParameters = async () => {
            try {
                const [conditions, locations, warranties] = await Promise.all([
                    getProductConditions(),
                    getStorageLocations(),
                    getWarranties()
                ]);
                setConditionOptions(conditions);
                setLocationOptions(locations);
                setWarrantyOptions(warranties);
            } catch (error) {
                console.error('Error fetching product parameters:', error);
                showToast('Erro ao carregar parâmetros do produto.', 'error');
            }
        };
        fetchParameters();
    }, []);

    useEffect(() => {
        const currentId = product ? product.id : 'new';
        if (initializedIdRef.current === currentId) return;
        initializedIdRef.current = currentId;

        if (product) {
            const initialData: Partial<Product> = {
                stock: isTradeInMode ? 1 : (product.stock || 1), // Garante estoque 1 para trade-ins
                batteryHealth: product.batteryHealth ?? 100,
                condition: isTradeInMode ? 'Seminovo' : (product.condition || 'Novo'),
                ...product
            };

            if (product.brand === 'Apple' || isTradeInMode) {
                setProductType('Apple');
                if (product.brand === 'Apple') {
                    const { category, model, storageString, color } = parseAppleModelString(product.model || '', product.variations || []);
                    initialData.category = category;
                    initialData.model = model;
                    setAppleStorage(storageString || '');
                    if (storageString) {
                        const numericStorage = parseInt(storageString, 10);
                        initialData.storage = isNaN(numericStorage) ? undefined : numericStorage;
                    } else {
                        initialData.storage = undefined;
                    }
                    initialData.color = color;
                }
            } else {
                setProductType('Produto');
                // Safeguard against undefined arrays
                const brandObj = (brands || []).find(b => b.name === product.brand);
                console.log('[ProductModal] Non-Apple product:', product.model);
                console.log('[ProductModal] brandObj found:', brandObj?.name, brandObj?.id);
                if (brandObj) {
                    initialData.brand = brandObj.id;
                    // Try to find category - check both exact match and includes
                    const categoryObj = (categories || []).find(c =>
                        c.brandId === brandObj.id && (
                            c.name.toLowerCase() === (product.category || '').toLowerCase() ||
                            c.name.toLowerCase().includes((product.category || '').toLowerCase()) ||
                            (product.category || '').toLowerCase().includes(c.name.toLowerCase())
                        )
                    );
                    console.log('[ProductModal] categoryObj found:', categoryObj?.name, categoryObj?.id);
                    if (categoryObj) {
                        initialData.category = categoryObj.id;
                        const modelsForCategory = (productModels || []).filter(m => m.categoryId === categoryObj.id);
                        console.log('[ProductModal] modelsForCategory:', modelsForCategory.map(m => ({ name: m.name, id: m.id })));
                        console.log('[ProductModal] product.model to match:', product.model);
                        // Try multiple strategies to find the model
                        let modelObj = modelsForCategory.find(m => m.name === product.model); // Exact match first
                        if (!modelObj) {
                            // Then try if product.model contains the model name (most common case)
                            modelObj = modelsForCategory
                                .sort((a, b) => b.name.length - a.name.length) // Longer names first to avoid false positives
                                .find(m => (product.model || '').toLowerCase().includes(m.name.toLowerCase()));
                        }
                        if (!modelObj) {
                            // Finally try if model name contains product.model
                            modelObj = modelsForCategory.find(m => m.name.toLowerCase().includes((product.model || '').toLowerCase()));
                        }
                        console.log('[ProductModal] modelObj found:', modelObj?.name, modelObj?.id);
                        if (modelObj) {
                            initialData.model = modelObj.id;
                        }
                    }
                }
            }

            // Explicitly ensure supplierId is set in formData from the incoming product
            initialData.supplierId = product.supplierId;

            setFormData(initialData);
            setIsMinimumStockEnabled(!!(initialData.minimumStock && initialData.minimumStock > 0));
            setShowVariations(!!(product.variations && product.variations.length > 0));

        } else {
            const defaults = {
                stock: 1, batteryHealth: 100, condition: isTradeInMode ? 'Seminovo' : 'Novo', warranty: isTradeInMode ? '' : '1 ano', storageLocation: isTradeInMode ? '' : 'Loja', variations: [], barcodes: [], createdBy: user?.name || 'Keiler', origin: 'Compra'
            };
            setFormData(defaults);
            setProductType('Apple'); // Default for new - Always Apple for trade-in mode
            setIsMinimumStockEnabled(false);
            setShowVariations(false);
            setAppleStorage('');
        }
    }, [product, brands, categories, productModels, isTradeInMode, suppliers, user]);

    // Normalize data casing when options become available to avoid duplicates (e.g. "1 ano" vs "1 Ano")
    useEffect(() => {
        setFormData(prev => {
            let next = { ...prev };
            let changed = false;

            if (prev.condition) {
                const match = conditionOptions.find(o => o.name.toLowerCase() === prev.condition?.toLowerCase());
                if (match && match.name !== prev.condition) {
                    next.condition = match.name;
                    changed = true;
                }
            }
            if (prev.warranty) {
                const match = warrantyOptions.find(o => o.name.toLowerCase() === prev.warranty?.toLowerCase());
                if (match && match.name !== prev.warranty) {
                    next.warranty = match.name;
                    changed = true;
                }
            }
            if (prev.storageLocation) {
                const match = locationOptions.find(o => o.name.toLowerCase() === prev.storageLocation?.toLowerCase());
                if (match && match.name !== prev.storageLocation) {
                    next.storageLocation = match.name;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [conditionOptions, warrantyOptions, locationOptions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };

        if (productType === 'Apple') {
            if (name === 'category') {
                newFormData.model = '';
                newFormData.storage = undefined;
                setAppleStorage('');
                newFormData.color = '';
            } else if (name === 'model') {
                newFormData.storage = undefined;
                setAppleStorage('');
                newFormData.color = '';
            }
        } else {
            if (name === 'brand') {
                newFormData.category = '';
                newFormData.model = '';
            } else if (name === 'category') {
                newFormData.model = '';
            }
        }
        setFormData(newFormData);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseInt(value, 10) }));
    };

    const handleAppleStorageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const storageStr = e.target.value;
        setAppleStorage(storageStr);
        const numericStorage = parseInt(storageStr, 10);
        setFormData(prev => ({
            ...prev,
            storage: isNaN(numericStorage) ? undefined : numericStorage,
            color: ''
        }));
    };

    const handlePriceChange = (name: 'price' | 'costPrice' | 'additionalCostPrice') => (value: number | null) => {
        const newFormData = { ...formData, [name]: value || 0 };
        updateMarkupAndPrice(newFormData, name === 'price' ? 'price' : 'cost');
    };

    const updateMarkupAndPrice = (data: Partial<Product>, updatedField: 'markup' | 'price' | 'cost' = 'price') => {
        const cost = (data.costPrice || 0) + (data.additionalCostPrice || 0);
        if (cost > 0) {
            if (updatedField === 'markup' && typeof data.markup === 'number') {
                data.price = cost * (1 + data.markup / 100);
            } else if ((updatedField === 'price' || updatedField === 'cost') && typeof data.price === 'number') {
                const newMarkup = ((data.price / cost) - 1) * 100;
                data.markup = isFinite(newMarkup) ? parseFloat(newMarkup.toFixed(2)) : 0;
            }
        }
        setFormData(data);
    };

    const handleMarkupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const markup = e.target.value === '' ? undefined : parseFloat(e.target.value);
        const newFormData = { ...formData, markup };
        updateMarkupAndPrice(newFormData, 'markup');
    };

    const handleToggleMinimumStock = (checked: boolean) => {
        setIsMinimumStockEnabled(checked);
        if (!checked) {
            setFormData(prev => {
                const { minimumStock, ...rest } = prev;
                return rest;
            });
        } else {
            if (!formData.minimumStock || formData.minimumStock <= 0) {
                setFormData(prev => ({ ...prev, minimumStock: 1 }));
            }
        }
    };

    const handleAddVariation = () => {
        if (!currentGradeId) {
            showToast('Selecione uma grade.', 'warning');
            return;
        }
        const grade = grades.find(g => g.id === currentGradeId);
        // Allow adding variation without a value (valueId can be empty)
        const value = currentValueId ? gradeValues.find(v => v.id === currentValueId) : null;

        if (!grade) return;

        const newVariation: ProductVariation = {
            gradeId: currentGradeId,
            gradeName: grade.name,
            valueId: currentValueId || '',
            valueName: value ? value.name : ''
        };
        const existingVariations = formData.variations || [];

        const existingIndex = existingVariations.findIndex(v => v.gradeId === newVariation.gradeId);
        let newVariations = [];
        if (existingIndex > -1) {
            newVariations = [...existingVariations];
            newVariations[existingIndex] = newVariation;
        } else {
            newVariations = [...existingVariations, newVariation];
        }

        setFormData(prev => ({ ...prev, variations: newVariations }));
        setCurrentGradeId('');
        setCurrentValueId('');
    };

    const handleRemoveVariation = (index: number) => {
        setFormData(prev => ({ ...prev, variations: prev.variations?.filter((_, i) => i !== index) }));
    };

    const handleSaveNewSupplier = async (entityData: any, entityType: string, personType: string) => {
        setSavingSupplier(true);
        try {
            const supplierPayload: Omit<Supplier, 'id'> = {
                name: entityData.name,
                contactPerson: entityData.name,
                email: entityData.email,
                phone: entityData.phone,
                cnpj: entityData.cnpj || '',
                address: `${entityData.address?.street || ''}, ${entityData.address?.number || ''}`.trim()
            };
            const newSupplier = await onAddNewSupplier(supplierPayload);
            if (newSupplier) {
                setFormData(prev => ({ ...prev, supplierId: newSupplier.id }));
                setIsSupplierModalOpen(false);
            }
        } finally {
            setSavingSupplier(false);
        }
    };

    const supplierOptions = useMemo(() => suppliers.map(s => ({ value: s.id, label: s.name })), [suppliers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isTradeInMode) {
            if (!formData.costPrice || formData.costPrice <= 0) {
                showToast('O "Preço de Custo" (valor da troca) é obrigatório e deve ser maior que zero.', 'error');
                return;
            }
            if (!formData.price || formData.price <= 0) {
                showToast('O "Preço de Venda" é obrigatório e deve ser maior que zero.', 'error');
                return;
            }
            if (!formData.warranty) {
                showToast('Selecione o Tempo de Garantia.', 'error');
                return;
            }
            if (!formData.storageLocation) {
                showToast('Selecione o Local de Estoque.', 'error');
                return;
            }
        }

        let finalModel = '';
        let finalBrand = '';
        let finalCategory = '';
        const variationString = (formData.variations || []).map(v => v.valueName).join(' ');

        if (productType === 'Apple') {
            if (!formData.category || !formData.model) {
                showToast('Para produtos Apple, preencha Categoria e Modelo.', 'error');
                return;
            }
            finalBrand = 'Apple';
            finalCategory = formData.category;
            const storageText = isMemoryless ? '' : appleStorage;
            if (!isMemoryless && !storageText) {
                showToast('Para produtos Apple, a memória (ou "Padrão") é obrigatória.', 'error');
                return;
            }
            finalModel = `${formData.model} ${storageText} ${formData.color || ''} ${variationString}`.trim().replace(/\s+/g, ' ');
        } else {
            if (!formData.brand || !formData.category || !formData.model) {
                showToast('Preencha os campos Marca, Categoria e Modelo.', 'error');
                return;
            }
            const brandObj = brands.find(b => b.id === formData.brand);
            const categoryObj = categories.find(c => c.id === formData.category);
            const modelObj = productModels.find(m => m.id === formData.model);

            finalBrand = brandObj?.name || formData.brand;
            finalCategory = categoryObj?.name || formData.category;
            const baseModelName = modelObj?.name || formData.model || '';
            finalModel = `${modelObj ? `${finalCategory} ${finalBrand} ` : ''}${baseModelName} ${variationString}`.trim().replace(/\s+/g, ' ');
        }

        setIsSaving(true);
        try {
            // Call onSave - it may or may not be async
            const result = onSave({
                ...formData,
                brand: finalBrand,
                category: finalCategory,
                model: finalModel,
                stock: formData.stock || 1,
            } as Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'sku'>);

            // If onSave returns a Promise, await it
            if (result && typeof result.then === 'function') {
                await result;
            }
        } catch (error) {
            console.error('[ProductModal] Error in onSave:', error);
            showToast('Erro ao salvar o produto.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const availableAppleModels = useMemo(() => {
        const category = formData.category;
        if (category && appleProductHierarchy[category as keyof typeof appleProductHierarchy]) {
            return Object.keys(appleProductHierarchy[category as keyof typeof appleProductHierarchy]);
        }
        return [];
    }, [formData.category]);

    type Hierarchy = typeof appleProductHierarchy; type CategoryKey = keyof Hierarchy; type ModelKey<C extends CategoryKey> = keyof Hierarchy[C];

    const isMemoryless = useMemo(() => {
        const category = formData.category as CategoryKey;
        return category === 'AirPods' || category === 'EarPods' || category === 'Watch' || category === 'Acessórios';
    }, [formData.category]);

    const availableAppleMemories = useMemo(() => {
        if (isMemoryless) return [];
        const category = formData.category as CategoryKey;
        const model = formData.model as ModelKey<CategoryKey>;
        if (category && model && appleProductHierarchy[category]?.[model]) {
            return Object.keys(appleProductHierarchy[category][model]);
        }
        return [];
    }, [formData.category, formData.model, isMemoryless]);

    const availableAppleColors = useMemo(() => {
        const category = formData.category as CategoryKey;
        const model = formData.model as ModelKey<CategoryKey>;
        const storageKey = isMemoryless ? 'Padrão' : appleStorage;

        if (category && model && storageKey && appleProductHierarchy[category]?.[model]?.[storageKey as any]) {
            return appleProductHierarchy[category][model][storageKey as any] as readonly string[];
        }
        return [];
    }, [formData.category, formData.model, appleStorage, isMemoryless]);


    const filteredCategories = useMemo(() => {
        if (!formData.brand) return [];
        return categories.filter(c => c.brandId === formData.brand);
    }, [categories, formData.brand]);

    const filteredModels = useMemo(() => {
        if (!formData.category) return [];
        return productModels.filter(m => m.categoryId === formData.category);
    }, [productModels, formData.category]);

    const availableGradeValues = useMemo(() => {
        if (!currentGradeId) return [];
        return gradeValues.filter(v => v.gradeId === currentGradeId);
    }, [gradeValues, currentGradeId]);

    const totalCost = useMemo(() => (formData.costPrice || 0) + (formData.additionalCostPrice || 0), [formData.costPrice, formData.additionalCostPrice]);

    const labelClasses = "block text-xs font-medium text-muted mb-1";
    const inputClasses = "w-full p-2 border rounded bg-transparent border-border focus:ring-success focus:border-success text-sm";

    if (!visible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-sans p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}>
            <form onSubmit={handleSubmit} className="bg-white w-full max-w-4xl h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                {/* Header Premium */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
                    <div className="flex items-center gap-4 flex-grow">
                        <div className={`p-3 rounded-2xl ${isTradeInMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-primary/10 text-primary'} transform -rotate-2`}>
                            {isTradeInMode ? <ArrowPathRoundedSquareIcon className="h-6 w-6" /> : <ArchiveBoxIcon className="h-6 w-6" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-none">
                                {isTradeInMode ? 'Aparelho para Troca' : (product?.id ? 'Editar Produto' : 'Lançar Produto')}
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                {isTradeInMode ? 'Avaliação e entrada de mercadoria usada' : 'Cadastro detalhado de item no estoque'}
                                {!isTradeInMode && (
                                    <span className="p-1 px-2 bg-blue-50 border border-blue-100 rounded text-blue-600 normal-case tracking-normal text-sm">
                                        Para criar ou editar Marcas/Categorias, <a href="/#/company?tab=marcas" target="_blank" className="font-bold underline">clique aqui</a>.
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-3 bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all shadow-sm group"
                    >
                        <XCircleIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                <div className="flex-1 p-8 pt-6 space-y-6 overflow-y-auto custom-scrollbar pb-24">

                    {/* Tabs for Trade-In and Edit Mode */}
                    {(isTradeInMode || product?.id) && (
                        <div className="flex gap-4 border-b border-gray-100 pb-4 mb-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab('details')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'details' ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                                Detalhes do Aparelho
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('extras')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'extras' ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                                Fotos e Opcionais {formData.photos?.length ? `(${formData.photos.length})` : ''}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('checklist')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'checklist' ? 'bg-gray-900 text-white shadow-lg' : 'bg-red-50 text-red-400 hover:bg-red-100'}`}
                            >
                                Checklist
                            </button>
                        </div>
                    )}

                    {activeTab === 'checklist' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Seção de Checklist */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <PlusIcon className="h-6 w-6 text-gray-800" />
                                    <h3 className="text-xl font-bold text-gray-800">Checklist de produtos Seminovos</h3>
                                </div>
                                <div className="flex items-center gap-2 text-orange-500 bg-orange-50 p-3 rounded-lg border border-orange-100 mb-6">
                                    <span className="font-bold text-sm">⚠️ Marque as opções que apresentam defeito ou avaria.</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0 max-h-[240px] overflow-y-auto custom-scrollbar pr-2 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                    {checklistItems.map(item => (
                                        <label key={item} className="flex items-center gap-4 cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors group border border-transparent hover:border-gray-200">
                                            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors relative shrink-0 ${formData.checklist?.[item] ? 'bg-red-500' : 'bg-gray-300'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${formData.checklist?.[item] ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={!!formData.checklist?.[item]}
                                                onChange={() => handleChecklistToggle(item)}
                                                className="hidden"
                                            />
                                            <span className={`text-xs font-bold truncate ${formData.checklist?.[item] ? 'text-red-600' : 'text-gray-600'}`} title={item}>{item}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Data do Checklist:</label>
                                        <input
                                            type="date"
                                            value={(formData.checklist?.checklistDate as string) || ''}
                                            onChange={e => handleChecklistChange('checklistDate', e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Custo de Reparo:</label>
                                        <CurrencyInput
                                            value={formData.additionalCostPrice}
                                            onChange={handleRepairCostChange}
                                            className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder="R$ 0,00"
                                        />
                                        <p className="text-[10px] text-gray-500 leading-tight">Valor a ser abatido/somado ao custo.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Anotações / Defeitos:</label>
                                        <p className="text-[10px] text-gray-500 mb-1">Detalhes dos defeitos encontrados.</p>
                                        <textarea
                                            value={(formData.checklist?.notes as string) || ''}
                                            onChange={e => handleChecklistChange('notes', e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px] resize-none"
                                            placeholder="Descreva detalhes aqui..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Serviços / Consertos:</label>
                                        <p className="text-[10px] text-gray-500 mb-1">Serviços que serão executados.</p>
                                        <textarea
                                            value={(formData.checklist?.services as string) || ''}
                                            onChange={e => handleChecklistChange('services', e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px] resize-none"
                                            placeholder="Liste os reparos necessários..."
                                        />
                                    </div>
                                </div>






                            </div>
                        </div>
                    )}


                    {activeTab === 'details' && (
                        <>
                            {/* Seção Principal: Tipo e Identificação */}
                            <div className="space-y-5">
                                {/* Toggle Apple/Produto + Mensagem de Troca na mesma linha */}
                                <div className="flex flex-wrap items-center gap-4">
                                    {!product?.id && (
                                        <div className="flex justify-start items-center p-1 bg-gray-100 rounded-2xl border border-gray-200 w-fit">
                                            <button type="button" onClick={() => setProductType('Apple')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${productType === 'Apple' ? 'bg-white shadow-md text-primary' : 'text-gray-400'}`}>Apple</button>
                                            <button type="button" onClick={() => setProductType('Produto')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${productType === 'Produto' ? 'bg-white shadow-md text-primary' : 'text-gray-400'}`}>Produto</button>
                                        </div>
                                    )}
                                    {isTradeInMode && (
                                        <div className="flex-1 min-w-[300px] p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center">
                                            <span className="text-sm text-primary">
                                                Para cadastrar Marcas, Categorias, e Grades, <a href="/#/company?tab=marcas" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-blue-700">clique aqui</a>
                                            </span>
                                        </div>
                                    )}
                                </div>


                                {productType === 'Apple' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                        <div className="space-y-2">
                                            <label className={labelClasses}>Categoria*</label>
                                            <select name="category" value={formData.category || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm">
                                                <option value="">Selecione</option>
                                                {Object.keys(appleProductHierarchy).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClasses}>Modelo*</label>
                                            <select name="model" value={formData.model || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" disabled={!formData.category}>
                                                <option value="">Selecione</option>
                                                {availableAppleModels.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        {!isMemoryless && (
                                            <div className="space-y-2">
                                                <label className={labelClasses}>Memória*</label>
                                                <select value={appleStorage} onChange={handleAppleStorageChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" disabled={!formData.model}>
                                                    <option value="">Selecione</option>
                                                    {availableAppleMemories.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <label className={labelClasses}>Cor*</label>
                                            <select name="color" value={formData.color || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" disabled={!formData.model || (!isMemoryless && !appleStorage)}>
                                                <option value="">Selecione</option>
                                                {formData.color && !availableAppleColors.includes(formData.color) && (
                                                    <option value={formData.color}>{formData.color}</option>
                                                )}
                                                {availableAppleColors.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div className="space-y-2">
                                            <label className={labelClasses}>Marca*</label>
                                            <select name="brand" value={formData.brand || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm">
                                                <option value="">Selecione</option>
                                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClasses}>Categoria*</label>
                                            <select name="category" value={formData.category || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" disabled={!formData.brand}>
                                                <option value="">Selecione</option>
                                                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClasses}>Modelo*</label>
                                            <select name="model" value={formData.model || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" disabled={!formData.category}>
                                                <option value="">Selecione</option>
                                                {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-start">
                                    <button type="button" onClick={() => setShowVariations(s => !s)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showVariations ? 'bg-primary text-white' : 'text-primary bg-primary/5 hover:bg-primary/10'}`}>
                                        <PlusIcon className="h-4 w-4" /> {showVariations ? 'Ocultar Variações' : 'Adicionar Variação Especial'}
                                    </button>
                                </div>
                            </div>

                            {showVariations && (
                                <div className="p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Grades e Variações</label>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.variations?.map((v, index) => (
                                            <div key={index} className="flex items-center gap-2 bg-white border border-primary/20 rounded-2xl px-3 py-2 shadow-sm animate-scale-in">
                                                {v.valueName ? (
                                                    <>
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{v.gradeName}:</span>
                                                        <span className="text-xs font-bold text-gray-700">{v.valueName}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{v.gradeName}</span>
                                                )}
                                                <button type="button" onClick={() => handleRemoveVariation(index)} className="p-1 hover:text-red-500 transition-colors"><XCircleIcon className="h-4 w-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 px-1">Grade</label>
                                            <select value={currentGradeId} onChange={e => { setCurrentGradeId(e.target.value); setCurrentValueId(''); }} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none h-[42px]">
                                                <option value="">Selecione...</option>
                                                {grades.filter(g => productType === 'Apple' ? g.name.toLowerCase() !== 'cor' : true).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 px-1">Valor</label>
                                            <select value={currentValueId} onChange={e => setCurrentValueId(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none h-[42px]" disabled={!currentGradeId}>
                                                <option value="">Selecione...</option>
                                                {availableGradeValues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                        </div>
                                        <button type="button" onClick={handleAddVariation} className="h-[42px] px-6 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-md">Adicionar</button>
                                    </div>
                                </div>
                            )}

                            {/* Identificação Serial */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <div className="space-y-2"><label className={labelClasses}>IMEI 1</label><input type="text" name="imei1" value={formData.imei1 || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" /></div>
                                <div className="space-y-2"><label className={labelClasses}>IMEI 2</label><input type="text" name="imei2" value={formData.imei2 || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" /></div>
                                <div className="space-y-2"><label className={labelClasses}>Nº de Série</label><input type="text" name="serialNumber" value={formData.serialNumber || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" /></div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Código de Barras</label>
                                    <input type="text" value={formData.barcodes?.[0] || ''} onChange={(e) => setFormData(prev => ({ ...prev, barcodes: e.target.value ? [e.target.value] : [] }))} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" />
                                </div>
                                {formData.variations && formData.variations.length > 0 && (
                                    <div className="col-span-1 md:col-span-4 flex flex-wrap gap-4 mt-1 pl-1">
                                        {formData.variations.map((v, i) => (
                                            <span key={i} className="text-xs italic text-gray-500">
                                                {v.gradeName}: {v.valueName}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Detalhes de Estado */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                <div className="space-y-2">
                                    <label className={labelClasses}>Condição*</label>
                                    <select name="condition" value={formData.condition || ''} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none shadow-sm">
                                        {formData.condition && !conditionOptions.some(c => c.name === formData.condition) && (
                                            <option value={formData.condition}>{formData.condition}</option>
                                        )}
                                        {conditionOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                {productType === 'Apple' && formData.condition === 'Seminovo' && (
                                    <div className="space-y-2"><label className={labelClasses}>Bateria (%)</label><input type="number" name="batteryHealth" min="0" max="100" value={formData.batteryHealth ?? 100} onChange={handleNumberChange} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm font-black text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none shadow-sm" /></div>
                                )}
                                <div className="space-y-2">
                                    <label className={labelClasses}>Garantia*</label>
                                    <select name="warranty" value={formData.warranty || ''} onChange={handleInputChange} className={`w-full p-3 bg-white border ${!formData.warranty ? 'border-red-500' : 'border-gray-200'} rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none shadow-sm`}>
                                        <option value="">Selecione...</option>
                                        {formData.warranty && !warrantyOptions.some(w => w.name === formData.warranty) && (
                                            <option value={formData.warranty}>{formData.warranty}</option>
                                        )}
                                        {warrantyOptions.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Estoque*</label>
                                    <select name="storageLocation" value={formData.storageLocation || ''} onChange={handleInputChange} className={`w-full p-3 bg-white border ${!formData.storageLocation ? 'border-red-500' : 'border-gray-200'} rounded-2xl text-sm font-bold text-gray-700 h-[48px] focus:ring-4 focus:ring-primary/5 outline-none shadow-sm`}>
                                        <option value="">Selecione...</option>
                                        {formData.storageLocation && !locationOptions.some(l => l.name === formData.storageLocation) && (
                                            <option value={formData.storageLocation}>{formData.storageLocation}</option>
                                        )}
                                        {locationOptions.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Origem e Custo */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-3">
                                    <label className={labelClasses}>Origem / Fornecedor</label>
                                    <div className="flex gap-3">
                                        <div className="flex-grow">
                                            <SearchableDropdown options={supplierOptions} value={formData.supplierId || null} onChange={(val) => setFormData(prev => ({ ...prev, supplierId: val || undefined }))} placeholder="Buscar fornecedor..." />
                                        </div>
                                        <button type="button" onClick={() => setIsSupplierModalOpen(true)} className="p-3 bg-gray-100 text-gray-500 hover:bg-primary/10 hover:text-primary rounded-2xl transition-all shadow-sm"><PlusIcon className="h-6 w-6" /></button>
                                    </div>
                                </div>

                                {!isTradeInMode && (
                                    <div className="flex items-end gap-6 pb-2">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-12 h-6 rounded-full transition-all relative ${isMinimumStockEnabled ? 'bg-success shadow-lg shadow-success/20' : 'bg-gray-200'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMinimumStockEnabled ? 'left-7' : 'left-1'}`} />
                                            </div>
                                            <input type="checkbox" checked={isMinimumStockEnabled} onChange={(e) => handleToggleMinimumStock(e.target.checked)} className="hidden" />
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-tighter group-hover:text-gray-700">Estoque Mínimo</span>
                                        </label>
                                        {isMinimumStockEnabled && (
                                            <div className="animate-fade-in-left">
                                                <input type="number" name="minimumStock" min="1" value={formData.minimumStock ?? 1} onChange={handleNumberChange} className="w-24 p-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-sm" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Preços - Layout de Cartão Premium */}
                            <div className="bg-gray-50 rounded-[40px] p-8 border border-gray-200/50 shadow-inner grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-1">Custo de Entrada</label>
                                        <CurrencyInput value={formData.costPrice} onChange={handlePriceChange('costPrice')} className="w-full p-4 bg-white border border-gray-200 rounded-3xl font-black text-2xl text-gray-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Custo Adicional</label>
                                        <CurrencyInput value={formData.additionalCostPrice} onChange={handlePriceChange('additionalCostPrice')} className="w-full p-3 bg-white border border-gray-200 rounded-2xl font-bold text-lg text-gray-600 outline-none shadow-sm" />
                                    </div>
                                </div>

                                <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-xl transform hover:scale-[1.02] transition-transform flex flex-col justify-center gap-6 text-center">
                                    {/* Custo Total em Cima */}
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custo Total</span>
                                        <span className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrency(totalCost)}</span>
                                    </div>

                                    {/* Divider sutil */}
                                    <div className="w-full h-px bg-gray-100"></div>

                                    {/* Markup em Baixo */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center justify-between w-full px-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Markup</span>
                                            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                                                <PlusIcon className="h-3 w-3" />
                                                {formData.markup ?? 0}%
                                            </div>
                                        </div>
                                        <div className="relative w-24">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.markup ?? ''}
                                                onChange={handleMarkupChange}
                                                className="w-full bg-transparent border-b-2 border-gray-100 text-center text-sm font-bold text-gray-500 focus:border-primary focus:text-primary outline-none transition-colors pb-1"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-0 bottom-1 text-xs font-bold text-gray-300 pointer-events-none">%</span>
                                        </div>
                                    </div>
                                </div>




                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-success uppercase tracking-widest px-1">Preço de Venda*</label>
                                        <CurrencyInput value={formData.price} onChange={handlePriceChange('price')} className="w-full p-4 bg-white border border-success/20 rounded-3xl font-black text-2xl text-success focus:ring-4 focus:ring-success/5 outline-none transition-all shadow-lg" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Preço Atacado</label>
                                        <CurrencyInput value={formData.wholesalePrice} onChange={(val) => setFormData(prev => ({ ...prev, wholesalePrice: val || 0 }))} className="w-full p-3 bg-white border border-gray-200 rounded-2xl font-bold text-lg text-gray-600 outline-none shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {activeTab === 'extras' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Seção de Acessórios */}
                            <section>
                                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ArchiveBoxIcon className="h-5 w-5" /></span>
                                    Itens Inclusos / Acessórios
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {accessoryItems.map(item => (
                                        <label key={item} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${formData.accessories?.includes(item) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${formData.accessories?.includes(item) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                                                {formData.accessories?.includes(item) && <CheckIcon className="h-3 w-3 text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={formData.accessories?.includes(item) || false}
                                                onChange={() => handleAccessoryToggle(item)}
                                                className="hidden"
                                            />
                                            <span className={`text-sm font-bold ${formData.accessories?.includes(item) ? 'text-blue-700' : 'text-gray-600'}`}>{item}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            {/* Seção de Fotos */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                        <span className="p-2 bg-purple-50 text-purple-600 rounded-lg"><PhotographIcon className="h-5 w-5" /></span>
                                        Fotos do Aparelho
                                    </h3>
                                    <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{formData.photos?.length || 0} / 6 fotos</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {(formData.photos || []).map((photo, index) => (
                                        <div key={index} className="aspect-[4/5] relative group rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                                            <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePhoto(index)}
                                                    className="p-2 bg-white text-red-500 rounded-full hover:bg-red-50 transition-colors transform hover:scale-110 shadow-lg"
                                                    title="Remover foto"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {(formData.photos?.length || 0) < 6 && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCameraOpen(true)}
                                            className="aspect-[4/5] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-all group text-gray-400 hover:text-primary"
                                        >
                                            <div className="p-3 bg-gray-50 rounded-full group-hover:bg-white transition-colors shadow-sm">
                                                <PhotographIcon className="h-6 w-6" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest">Adicionar</span>
                                        </button>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                {/* Footer Fixo */}
                <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-between items-center sticky bottom-0 z-10">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsável</span>
                        <span className="text-sm font-bold text-gray-700">{user?.name || 'Sistema'}</span>
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:shadow-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 min-w-[200px]">
                            {isSaving ? <SpinnerIcon className="h-5 w-5 mx-auto animate-spin" /> : (isTradeInMode ? 'Confirmar Troca' : 'Salvar no Estoque')}
                        </button>
                    </div>
                </div>
            </form >

            {isSupplierModalOpen && (
                <CustomerModal
                    entity={null}
                    initialType="Fornecedor"
                    onClose={() => setIsSupplierModalOpen(false)}
                    onSave={handleSaveNewSupplier as any}
                    isSaving={savingSupplier}
                />
            )}

            <CameraModal
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handleAddPhoto}
            />
        </div >
    );
};
export default ProductModal;
