// Utilidades de data e hora para garantir sincronização com horário de Brasília (UTC-3)

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna a data/hora atual no fuso horário de Brasília
 */
export const getNow = (): Date => {
    return new Date();
};

/**
 * Retorna a data/hora atual como string ISO no fuso horário de Brasília
 * Formato: YYYY-MM-DDTHH:mm:ss.sssZ
 */
export const getNowISO = (): string => {
    return new Date().toISOString();
};

/**
 * Retorna a data de hoje (meia-noite) no fuso horário de Brasília
 */
export const getTodayStart = (): Date => {
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
    brazilTime.setHours(0, 0, 0, 0);
    return brazilTime;
};

/**
 * Retorna a data de hoje no formato YYYY-MM-DD
 */
export const getTodayDateString = (): string => {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: BRAZIL_TIMEZONE }); // en-CA gives YYYY-MM-DD format
};

/**
 * Formata uma data para exibição no padrão brasileiro
 * @param date - Data a ser formatada (string ISO ou Date)
 * @param options - Opções de formatação
 */
export const formatDateBR = (
    date: string | Date,
    options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR', { ...options, timeZone: BRAZIL_TIMEZONE });
};

/**
 * Formata uma hora para exibição no padrão brasileiro
 * @param date - Data/hora a ser formatada (string ISO ou Date)
 * @param showSeconds - Se deve mostrar segundos
 */
export const formatTimeBR = (
    date: string | Date,
    showSeconds: boolean = false
): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: BRAZIL_TIMEZONE
    };
    if (showSeconds) {
        options.second = '2-digit';
    }
    return d.toLocaleTimeString('pt-BR', options);
};

/**
 * Formata data e hora completa para exibição
 * @param date - Data/hora a ser formatada
 */
export const formatDateTimeBR = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: BRAZIL_TIMEZONE
    });
};

/**
 * Formata data relativa (Hoje, Ontem, ou data completa)
 * @param date - Data a ser formatada
 */
export const formatRelativeDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = d.toLocaleDateString('pt-BR', { timeZone: BRAZIL_TIMEZONE });
    const todayStr = today.toLocaleDateString('pt-BR', { timeZone: BRAZIL_TIMEZONE });
    const yesterdayStr = yesterday.toLocaleDateString('pt-BR', { timeZone: BRAZIL_TIMEZONE });

    if (dateStr === todayStr) return 'Hoje';
    if (dateStr === yesterdayStr) return 'Ontem';

    return d.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: BRAZIL_TIMEZONE
    });
};

/**
 * Converte uma data para o início do dia (00:00:00) no fuso de Brasília
 */
export const startOfDay = (date: Date | string): Date => {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Converte uma data para o final do dia (23:59:59) no fuso de Brasília
 */
export const endOfDay = (date: Date | string): Date => {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Verifica se uma data está dentro de um período
 */
export const isDateInRange = (date: Date | string, start: Date, end: Date): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d >= start && d <= end;
};

/**
 * Retorna a data/hora formatada para input datetime-local
 */
export const toDateTimeLocalValue = (date?: Date | string): string => {
    const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
    // Format: YYYY-MM-DDTHH:mm
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Retorna a data formatada para input date
 */
export const toDateValue = (date?: Date | string): string => {
    const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const TIMEZONE = BRAZIL_TIMEZONE;
