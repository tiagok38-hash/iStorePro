
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../supabaseClient.ts';
import { Product, Customer, Sale, User, Supplier, PurchaseOrder, Brand, Category, ProductModel, Grade, GradeValue, TodaySale, Payment, AuditLog, AuditActionType, AuditEntityType, ProductConditionParameter, StorageLocationParameter, WarrantyParameter, PaymentMethodParameter, CardConfigData, CompanyInfo, PermissionProfile, PermissionSet, ReceiptTermParameter, CashSession, CashMovement, StockHistoryEntry, PurchaseItem, PriceHistoryEntry, TradeInEntry } from '../../types.ts';
import { getNowISO, getTodayDateString, formatDateTimeBR } from '../utils/dateUtils.ts';

// --- CACHE SYSTEM ---
const cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cross-tab cache synchronization
const cacheChannel = new BroadcastChannel('app_cache_sync');

cacheChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'CLEAR_CACHE' && Array.isArray(event.data.keys)) {
        event.data.keys.forEach((key: string) => {
            delete cache[key];
        });
    }
};

const fetchWithCache = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    if (cache[key] && (now - cache[key].timestamp < CACHE_TTL)) {
        // Return a copy to prevent mutation issues
        return JSON.parse(JSON.stringify(cache[key].data));
    }
    const data = await fetcher();
    cache[key] = { data, timestamp: now };
    return data;
};

const clearCache = (keys: string[]) => {
    keys.forEach(key => delete cache[key]);
    cacheChannel.postMessage({ type: 'CLEAR_CACHE', keys });
};


const fetchWithRetry = async <T>(fetcher: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fetcher();
    } catch (error: any) {
        // Don't retry if it's a legitimate user abortion or timeout that shouldn't be retried blindly
        if (error?.name === 'AbortError') {
            throw error;
        }

        if (retries <= 0) throw error;

        const isNetworkError =
            error?.message?.includes('aborted') || // specific supabase aborts might differ
            error?.message?.includes('Failed to fetch') ||
            error?.message?.includes('NetworkError');

        if (isNetworkError) {
            console.warn(`mockApi: Network error detected. Retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(fetcher, retries - 1, delay * 2);
        }
        throw error;
    }
};

// Helper para formatar moeda (mantido local pois é utilitário de UI)
export const formatCurrency = (value: number | null | undefined, fallback: string = 'R$ 0,00'): string => {
    if (typeof value !== 'number' || isNaN(value)) {
        return fallback;
    }
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const formatPhone = (value: string): string => {
    if (!value) return "";
    let v = value.replace(/\D/g, "");
    v = v.substring(0, 11);
    if (v.length <= 2) return `(${v}`;
    if (v.length <= 6) return `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length <= 10) return `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
    return `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
};



// --- AUDIT LOGGING HELPER ---
export const addAuditLog = async (
    action: AuditActionType,
    entity: AuditEntityType,
    entityId: string,
    details: string,
    userId: string = 'system',
    userName: string = 'Sistema'
) => {
    try {
        await supabase.from('audit_logs').insert([{
            timestamp: getNowISO(),
            userId,
            userName,
            action,
            entity,
            entityId,
            details
        }]);
        clearCache(['audit_logs']);
    } catch (e) {
        console.error("Failed to add audit log", e);
    }
};

// --- AUTH & USERS ---

export const login = async (email: string, password_param: string): Promise<User> => {
    console.log('Login attempt for:', email);
    if (!email || !password_param) throw new Error('E-mail e senha são obrigatórios.');

    console.log('mockApi: Calling signInWithPassword...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password_param,
    });
    console.log('mockApi: signInWithPassword returned', authError ? 'Error' : 'Success');

    if (authError) {
        console.error('mockApi: Auth error:', authError);
        throw new Error(authError.message);
    }

    if (!authData.user) throw new Error('Usuário não encontrado.');
    console.log('mockApi: Auth success, user ID:', authData.user.id);

    console.log('mockApi: Fetching profile from users table...');
    const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

    if (profileError) {
        console.warn('Profile fetch error:', profileError);
    }

    if (profileError || !profile) {
        console.warn('Profile not found for authenticated user, using fallback.');
        return {
            id: authData.user.id,
            email: authData.user.email || '',
            name: authData.user.user_metadata?.name || 'Usuário',
            permissionProfileId: 'profile-admin',
            phone: '',
            createdAt: authData.user.created_at
        } as User;
    }

    console.log('Profile found:', profile.name);

    // Log login event (fire-and-forget to not block login)
    addAuditLog(
        AuditActionType.LOGIN,
        AuditEntityType.USER,
        profile.id,
        `Login realizado: ${profile.name} (${profile.email})`,
        profile.id,
        profile.name
    ).catch(err => console.error('Failed to log login event:', err));

    return profile as User;
};

export const logout = async (userId?: string, userName?: string) => {
    // Log logout event before signing out (fire-and-forget)
    if (userId && userName) {
        addAuditLog(
            AuditActionType.LOGOUT,
            AuditEntityType.USER,
            userId,
            `Logout realizado: ${userName}`,
            userId,
            userName
        ).catch(err => console.error('Failed to log logout event:', err));
    }

    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error.message);
    clearCache(Object.keys(cache));
};

export const getProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) return null;
    return data as User;
};

export const getUsers = async (): Promise<User[]> => {
    return fetchWithCache('users', async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        return data || [];
    });
};

export const addUser = async (data: any) => {
    // We use a separate client instance to sign up the new user 
    // without logging out the current admin session.
    const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
    });

    // 1. Create entry in Auth
    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: { name: data.name }
        }
    });

    if (authError) {
        console.error('mockApi: Erro no signUp:', authError);
        if (authError.message.includes('already registered') || authError.status === 422) {
            throw new Error('Este e-mail já está cadastrado no sistema de autenticação (pode pertencer a um usuário antigo/excluído). Por favor, use um e-mail diferente.');
        }
        if (authError.message.includes('Database error')) {
            throw new Error('Erro interno ao salvar usuário (possível falha de Trigger). Tente novamente ou use outro e-mail.');
        }
        throw new Error(`Erro ao criar acesso: ${authError.message}`);
    }
    if (!authData.user) throw new Error('Falha silenciosa ao criar credenciais de acesso.');

    // 2. Wait for the SQL Trigger to create the profile in public.users
    let profile = await getProfile(authData.user.id);
    let retries = 0;
    while (!profile && retries < 10) {
        await new Promise(r => setTimeout(r, 500));
        profile = await getProfile(authData.user.id);
        retries++;
    }

    if (profile) {
        // 3. Update the profile with additional fields from the form
        const { error: updateError } = await supabase
            .from('users')
            .update({
                phone: data.phone || '',
                permissionProfileId: data.permissionProfileId,
                // Do NOT save password here as it is now in Auth
            })
            .eq('id', profile.id);

        if (updateError) console.error("Error updating profile metadata:", updateError);

        // Return the updated profile
        profile = { ...profile, phone: data.phone || '', permissionProfileId: data.permissionProfileId };
    }

    clearCache(['users']);
    return profile;
};

export const updateUser = async (data: any) => {
    console.log('mockApi: Starting updateUser for ID:', data.id);

    // 1. Handle password update if provided
    if (data.password) {
        console.log('mockApi: Password change detected.');
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && currentUser.id === data.id) {
            console.log('mockApi: Updating password in Supabase Auth for current user...');
            const { error: authError } = await supabase.auth.updateUser({
                password: data.password
            });
            if (authError) {
                console.error('mockApi: Auth password update error:', authError);
                throw authError;
            }
            console.log('mockApi: Auth password updated successfully.');
        } else {
            console.warn('mockApi: Cannot update password for other users via client SDK.');
            throw new Error('Não é possível alterar a senha de outros usuários por aqui. O usuário deve usar "Esqueci minha senha" ou alterar no próprio perfil.');
        }
    }

    // 2. Prepare data for the public.users table update
    // We remove fields that shouldn't be updated manually or might cause conflicts
    const { id, password, createdAt, ...updateFields } = data;

    console.log('mockApi: Payload for DB update:', updateFields);
    const { data: updated, error } = await supabase
        .from('users')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('mockApi: Error updating user profile:', error);
        throw error;
    }

    console.log('mockApi: User updated successfully in database.');
    clearCache(['users']);
    return updated;
};

export const deleteUser = async (id: string, userId: string = 'system', userName: string = 'Sistema') => {
    const { data: user } = await supabase.from('users').select('*').eq('id', id).single();

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
        console.error('Erro ao excluir usuário:', error);
        if (error.code === '23503' || (error as any).status === 409) {
            throw new Error('Não é possível excluir este usuário pois ele possui registros vinculados (Vendas, Caixas, etc). Para remover o acesso, altere a senha ou o perfil de permissões.');
        }
        throw error;
    }

    if (user) {
        await addAuditLog(
            AuditActionType.DELETE,
            AuditEntityType.USER,
            id,
            `Usuário excluído: ${user.name} (${user.email})`,
            userId,
            userName
        );
    }

    clearCache(['users']);
};

export const registerAdmin = async (name: string, email: string, password_param: string): Promise<User> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: password_param,
        options: {
            data: { name }
        }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Falha ao criar usuário.');

    // Profile will be created by the SQL trigger. We wait a bit or fetch it.
    let profile = await getProfile(authData.user.id);
    let retries = 0;
    while (!profile && retries < 5) {
        await new Promise(r => setTimeout(r, 500));
        profile = await getProfile(authData.user.id);
        retries++;
    }

    return profile || {
        id: authData.user.id,
        name,
        email,
        permissionProfileId: 'profile-admin',
        phone: '',
        createdAt: getNowISO()
    } as User;
};

export const checkAdminExists = async (): Promise<boolean> => {
    const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('permissionProfileId', 'profile-admin');

    if (error) return false;
    return (count || 0) > 0;
};

// --- PERMISSIONS ---

export const getPermissionProfiles = async (): Promise<PermissionProfile[]> => {
    return fetchWithCache('permission_profiles', async () => {
        const { data, error } = await supabase.from('permissions_profiles').select('*');
        if (error) throw error;
        return data || [];
    });
};

export const addPermissionProfile = async (data: any) => {
    const payload = { ...data };
    if (!payload.id) {
        payload.id = crypto.randomUUID();
    }
    const { data: newProfile, error } = await supabase.from('permissions_profiles').insert([payload]).select().single();
    if (error) throw error;
    clearCache(['permission_profiles']);
    return newProfile;
};

export const updatePermissionProfile = async (data: any) => {
    const { data: updated, error } = await supabase.from('permissions_profiles').update(data).eq('id', data.id).select().single();
    if (error) throw error;
    clearCache(['permission_profiles']);
    return updated;
};

export const deletePermissionProfile = async (id: string) => {
    const { error } = await supabase.from('permissions_profiles').delete().eq('id', id);
    if (error) throw error;
    clearCache(['permission_profiles']);
};

// --- CASH SESSIONS ---

export const getCashSessions = async (): Promise<CashSession[]> => {
    return fetchWithCache('cash_sessions', async () => {
        const { data, error } = await supabase.from('cash_sessions').select('*').order('open_time', { ascending: false });
        if (error) throw error;

        // Map snake_case to camelCase
        return (data || []).map((s: any) => ({
            ...s,
            userId: s.user_id,
            displayId: s.display_id,
            openingBalance: s.opening_balance,
            cashInRegister: s.cash_in_register,
            openTime: s.open_time,
            closeTime: s.close_time
        }));
    });
};

export const addCashSession = async (data: any, odId: string = 'system', userName: string = 'Sistema') => {
    // Generate sequential displayId
    const { count } = await supabase.from('cash_sessions').select('*', { count: 'exact', head: true });
    const nextDisplayId = (count || 0) + 1;

    // Use snake_case column names (Supabase default)
    const session = {
        user_id: data.userId,
        display_id: nextDisplayId,
        opening_balance: data.openingBalance || 0,
        cash_in_register: data.openingBalance || 0,
        withdrawals: 0,
        deposits: 0,
        movements: [],
        open_time: getNowISO(),
        status: 'aberto'
    };

    console.log('Creating cash session with payload:', session);

    const { data: newSession, error } = await supabase.from('cash_sessions').insert([session]).select().single();
    if (error) {
        console.error('Error creating cash session:', error);
        throw error;
    }

    // Fire-and-forget audit log to avoid blocking
    addAuditLog(
        AuditActionType.CASH_OPEN,
        AuditEntityType.USER,
        newSession.id,
        `Caixa #${newSession.display_id || nextDisplayId} aberto com saldo inicial de ${formatCurrency(data.openingBalance || 0)}`,
        data.userId,
        userName
    ).catch(err => console.error('Failed to log cash open event:', err));

    clearCache(['cash_sessions']);

    // Map response back to camelCase for frontend
    return {
        ...newSession,
        userId: newSession.user_id,
        displayId: newSession.display_id,
        openingBalance: newSession.opening_balance,
        cashInRegister: newSession.cash_in_register,
        openTime: newSession.open_time,
        closeTime: newSession.close_time
    };
};

export const updateCashSession = async (data: any, odId: string = 'system', userName: string = 'Sistema') => {
    // Convert camelCase to snake_case for Supabase
    const updatePayload: any = {
        status: data.status
    };
    if (data.closeTime !== undefined) updatePayload.close_time = data.closeTime;
    if (data.cashInRegister !== undefined) updatePayload.cash_in_register = data.cashInRegister;
    if (data.withdrawals !== undefined) updatePayload.withdrawals = data.withdrawals;
    if (data.deposits !== undefined) updatePayload.deposits = data.deposits;
    if (data.movements !== undefined) updatePayload.movements = data.movements;

    const { data: updated, error } = await supabase.from('cash_sessions').update(updatePayload).eq('id', data.id).select().single();
    if (error) {
        console.error('Error updating cash session:', error);
        throw error;
    }

    const displayId = updated.display_id || updated.displayId;
    const auditAction = data.status === 'fechado' ? AuditActionType.CASH_CLOSE : AuditActionType.CASH_OPEN;
    const actionDescription = data.status === 'fechado'
        ? `Caixa #${displayId} fechado`
        : `Caixa #${displayId} reaberto`;

    // Fire-and-forget audit
    addAuditLog(
        auditAction,
        AuditEntityType.USER,
        updated.id,
        actionDescription,
        data.userId || odId,
        userName
    ).catch(err => console.error('Failed to log cash session update:', err));

    clearCache(['cash_sessions']);

    // Map back to camelCase
    return {
        ...updated,
        userId: updated.user_id,
        displayId: updated.display_id,
        openingBalance: updated.opening_balance,
        cashInRegister: updated.cash_in_register,
        openTime: updated.open_time,
        closeTime: updated.close_time
    };
};

export const addCashMovement = async (sid: string, mov: any, odId: string = 'system', userName: string = 'Sistema') => {
    const { data: session, error: fetchError } = await supabase.from('cash_sessions').select('*').eq('id', sid).single();
    if (fetchError) throw fetchError;

    const movements = session.movements || [];
    const newMovement = { ...mov, id: crypto.randomUUID(), timestamp: getNowISO() };
    const updatedMovements = [...movements, newMovement];

    const totalAmount = Number(mov.amount);
    // Use snake_case column names
    const currentCash = session.cash_in_register || session.cashInRegister || 0;
    const currentWithdrawals = session.withdrawals || 0;
    const currentDeposits = session.deposits || 0;

    let updates: any = { movements: updatedMovements };
    if (mov.type === 'sangria') {
        updates.withdrawals = currentWithdrawals + totalAmount;
        updates.cash_in_register = currentCash - totalAmount;
    } else {
        updates.deposits = currentDeposits + totalAmount;
        updates.cash_in_register = currentCash + totalAmount;
    }

    const { data: updated, error } = await supabase
        .from('cash_sessions')
        .update(updates)
        .eq('id', sid)
        .select()
        .single();

    if (error) throw error;

    // Fire-and-forget logging to avoid UI hang
    const auditAction = mov.type === 'sangria' ? AuditActionType.CASH_WITHDRAWAL : AuditActionType.CASH_SUPPLY;
    const actionLabel = mov.type === 'sangria' ? 'Sangria' : 'Suprimento';
    addAuditLog(
        auditAction,
        AuditEntityType.USER,
        sid,
        `${actionLabel} no Caixa #${updated.display_id || updated.displayId}: ${formatCurrency(totalAmount)} - Motivo: ${mov.reason}`,
        odId,
        userName
    ).catch(err => console.error('Failed to log cash movement:', err));

    clearCache(['cash_sessions']);

    // Map back to camelCase
    return {
        ...updated,
        userId: updated.user_id,
        displayId: updated.display_id,
        openingBalance: updated.opening_balance,
        cashInRegister: updated.cash_in_register,
        openTime: updated.open_time,
        closeTime: updated.close_time
    };
};

// --- PRODUCTS ---

export const getProducts = async (): Promise<Product[]> => {
    return fetchWithCache('products', async () => {
        return fetchWithRetry(async () => {
            const { data, error } = await supabase.from('products').select('*');
            if (error) throw error;
            return (data || []).map((p: any) => ({
                ...p,
                supplierId: p.supplier_id || p.supplierId // Map snake_case to camelCase
            }));
        });
    });
};

export const addProduct = async (data: any, userId: string = 'system', userName: string = 'Sistema'): Promise<Product> => {
    const { markup, selectedCustomerId, stockHistory, priceHistory, createdByName, ...rest } = data;
    const now = getNowISO();

    const imei1 = rest.imei1 || null;
    const imei2 = rest.imei2 || null;
    const serialNumber = rest.serialNumber || null;

    // PROFESSIONAL DEVICE LIFECYCLE: Check if IMEI/Serial already exists
    let existingProduct = null;

    if (imei1 || imei2 || serialNumber) {
        console.log('[addProduct] Checking for existing product by IMEI/Serial...');
        const orConditions = [];
        if (imei1) orConditions.push(`imei1.eq.${imei1}`, `imei2.eq.${imei1}`);
        if (imei2) orConditions.push(`imei1.eq.${imei2}`, `imei2.eq.${imei2}`);
        if (serialNumber) orConditions.push(`serialNumber.eq.${serialNumber}`);

        try {
            const searchQuery = supabase
                .from('products')
                .select('id, imei1, imei2, serialNumber, stock, stockHistory, model, warranty, batteryHealth')
                .or(orConditions.join(','))
                .limit(1)
                .maybeSingle();

            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), 10000)
            );

            const result = await Promise.race([searchQuery, timeout]) as any;
            existingProduct = result.data || null;
            console.log('[addProduct] Search result:', existingProduct ? `Found ID=${existingProduct.id}, stock=${existingProduct.stock}` : 'Not found');
        } catch (e: any) {
            if (e.message === 'SEARCH_TIMEOUT') {
                console.warn('[addProduct] Search timed out. Proceeding as new product.');
                existingProduct = null;
            } else {
                throw e;
            }
        }
    }

    // If product exists, check its status
    if (existingProduct) {
        if (existingProduct.stock > 0) {
            // ❌ BLOCK: Product is currently in stock (real duplicate)
            throw new Error(`Este produto já está em estoque com IMEI/Serial: ${imei1 || imei2 || serialNumber}`);
        }

        // ✅ REACTIVATE: Product was sold, now being repurchased
        console.log('[addProduct] REACTIVATING existing product:', existingProduct.id);

        const newStockHistoryEntry = {
            id: crypto.randomUUID(),
            oldStock: 0,
            newStock: data.stock || 1,
            adjustment: data.stock || 1,
            reason: data.origin === 'Troca' ? 'Recompra (Troca)' : 'Reentrada',
            timestamp: now,
            changedBy: userName,
            details: data.origin === 'Troca' ? 'Produto retornou via troca no PDV' : 'Produto reativado no sistema'
        };

        const existingHistory = existingProduct.stockHistory || [];

        const updatePayload = {
            stock: data.stock || 1,
            costPrice: data.costPrice,
            price: data.price,
            wholesalePrice: data.wholesalePrice,
            condition: data.condition,
            storageLocation: data.storageLocation,
            warranty: data.warranty || existingProduct.warranty,
            batteryHealth: data.batteryHealth || existingProduct.batteryHealth,
            origin: data.origin || 'Recompra',
            supplier: data.supplier || data.supplierName,
            updatedAt: now,
            stockHistory: [...existingHistory, newStockHistoryEntry]
        };

        // Simple UPDATE without requiring response
        const { error: updateError } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', existingProduct.id);

        if (updateError) throw updateError;

        console.log('[addProduct] Product REACTIVATED successfully:', existingProduct.id);

        // Return the merged product data
        const reactivatedProduct = { ...existingProduct, ...updatePayload };

        // Fire-and-forget audit log (non-blocking)
        addAuditLog(
            AuditActionType.STOCK_LAUNCH,
            AuditEntityType.PRODUCT,
            existingProduct.id,
            `Produto reativado (${data.origin || 'Recompra'}): ${existingProduct.model}. Estoque: 0 → ${data.stock || 1}.`,
            userId,
            userName
        ).catch(e => console.warn('[addProduct] Audit log failed:', e));

        clearCache(['products']);
        return reactivatedProduct as Product;
    }

    // ✅ NEW PRODUCT: IMEI/Serial doesn't exist, create it
    console.log('[addProduct] Creating new product...');

    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const nextSku = `#${(count || 0) + 1}`;

    const productData: any = {
        name: data.name,
        brand: data.brand,
        model: data.model,
        color: data.color,
        storage: data.storage || data.storageCapacity,
        condition: data.condition,
        price: data.price,
        costPrice: data.costPrice,
        wholesalePrice: data.wholesalePrice,
        stock: data.stock,
        sku: data.sku || nextSku,
        category: data.categoryId || data.category,
        categoryId: data.categoryId || data.category,
        supplier: data.supplier || data.supplierName,
        imei1: imei1,
        imei2: imei2,
        serialNumber: serialNumber,
        batteryHealth: data.batteryHealth,
        origin: data.origin,
        storageLocation: data.storageLocation,
        warranty: data.warranty,
        createdAt: now,
        updatedAt: now,
        // Track who created the product
        createdBy: data.createdBy || userId || null,
        createdByName: data.createdByName || userName || null,
        // Trade-in and purchase extras
        photos: data.photos || [],
        accessories: data.accessories || [],
        checklist: data.checklist || null,
        additionalCostPrice: data.additionalCostPrice || 0,
        variations: data.variations || [],
        // Add initial stock history entry for traceability
        stockHistory: [{
            id: crypto.randomUUID(),
            oldStock: 0,
            newStock: data.stock || 1,
            adjustment: data.stock || 1,
            reason: data.origin === 'Troca' ? 'Entrada via Troca' : 'Cadastro Inicial',
            timestamp: now,
            changedBy: data.createdByName || userName || 'Sistema',
            details: data.origin === 'Troca'
                ? `Produto recebido em troca. Fornecedor: ${data.supplierName || data.supplier || 'N/A'}. Custo: R$ ${(data.costPrice || 0).toFixed(2)}`
                : `Produto cadastrado manualmente.`
        }]
    };

    Object.keys(productData).forEach(key => productData[key] === undefined && delete productData[key]);

    // INSERT with timeout - if it takes too long, assume success and return anyway
    try {
        const insertQuery = supabase.from('products').insert([productData]);
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('INSERT_TIMEOUT')), 15000)
        );

        const result = await Promise.race([insertQuery, timeout]) as any;
        if (result.error) throw result.error;
        console.log('[addProduct] Product created successfully');
    } catch (e: any) {
        if (e.message === 'INSERT_TIMEOUT') {
            console.warn('[addProduct] Insert timed out, but proceeding anyway (product may have been created)');
        } else {
            // Real error - throw it
            throw e;
        }
    }

    // Return the product data we created (without waiting for DB response)
    const createdProduct = { ...productData, id: crypto.randomUUID() };

    // Fire-and-forget audit log (non-blocking)
    addAuditLog(
        AuditActionType.STOCK_LAUNCH,
        AuditEntityType.PRODUCT,
        createdProduct.id,
        `Entrada de estoque (${createdProduct.origin || 'Cadastro'}): ${createdProduct.model}. Estoque: ${createdProduct.stock}.`,
        userId,
        userName
    ).catch(e => console.warn('[addProduct] Audit log failed:', e));

    clearCache(['products']);
    return createdProduct as Product;
};

export const updateProduct = async (data: any, userId?: string, userName?: string) => {
    // 1. Fetch current product to compare prices
    const { data: currentProduct, error: fetchError } = await supabase.from('products').select('*').eq('id', data.id).maybeSingle();

    // If product not found (RLS or doesn't exist), still try to update
    if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
    }

    // Use data as fallback if currentProduct is null
    const existingProduct = currentProduct || data;

    const { markup, selectedCustomerId, stockHistory, priceHistory: inputPriceHistory, ...rest } = data;
    const now = getNowISO();

    // Build the update payload
    const updatePayload: any = {
        ...rest,
        updatedAt: now
    };

    // Note: supplier_id column does not exist in the products table

    // Track price changes for history
    const existingPriceHistory = existingProduct.priceHistory || [];
    let priceHistoryUpdated = false;

    // If sale price changed, add to price history
    if (existingProduct.price !== data.price) {
        // Log price change to audit_logs
        await addAuditLog(
            AuditActionType.UPDATE,
            AuditEntityType.PRODUCT,
            data.id,
            `Preço de venda alterado de ${formatCurrency(existingProduct.price)} para ${formatCurrency(data.price)}`,
            userId || 'system',
            userName || 'Sistema'
        );

        // Add to priceHistory column
        const newPriceEntry = {
            id: crypto.randomUUID(),
            oldPrice: existingProduct.price,
            newPrice: data.price,
            priceType: 'sale',
            changedBy: userName || 'Sistema',
            timestamp: now
        };
        existingPriceHistory.push(newPriceEntry);
        priceHistoryUpdated = true;
    }

    // If wholesale price changed, add to price history
    if (data.wholesalePrice !== undefined && existingProduct.wholesalePrice !== data.wholesalePrice) {
        // Log wholesale price change to audit_logs
        await addAuditLog(
            AuditActionType.UPDATE,
            AuditEntityType.PRODUCT,
            data.id,
            `Preço de atacado alterado de ${formatCurrency(existingProduct.wholesalePrice || 0)} para ${formatCurrency(data.wholesalePrice)}`,
            userId || 'system',
            userName || 'Sistema'
        );

        // Add to priceHistory column
        const newWholesaleEntry = {
            id: crypto.randomUUID(),
            oldPrice: existingProduct.wholesalePrice || 0,
            newPrice: data.wholesalePrice,
            priceType: 'wholesale',
            changedBy: userName || 'Sistema',
            timestamp: now
        };
        existingPriceHistory.push(newWholesaleEntry);
        priceHistoryUpdated = true;
    }

    // If cost price changed, add to price history
    if (data.costPrice !== undefined && existingProduct.costPrice !== data.costPrice) {
        // Log cost price change to audit_logs
        await addAuditLog(
            AuditActionType.UPDATE,
            AuditEntityType.PRODUCT,
            data.id,
            `Preço de custo alterado de ${formatCurrency(existingProduct.costPrice || 0)} para ${formatCurrency(data.costPrice)}`,
            userId || 'system',
            userName || 'Sistema'
        );

        // Add to priceHistory column
        const newCostEntry = {
            id: crypto.randomUUID(),
            oldPrice: existingProduct.costPrice || 0,
            newPrice: data.costPrice,
            priceType: 'cost',
            changedBy: userName || 'Sistema',
            timestamp: now
        };
        existingPriceHistory.push(newCostEntry);
        priceHistoryUpdated = true;
    }

    if (priceHistoryUpdated) {
        updatePayload.priceHistory = existingPriceHistory;
    }

    // Try to update with priceHistory
    let updatedRows, error;
    try {
        const res = await supabase.from('products').update(updatePayload).eq('id', data.id).select();
        updatedRows = res.data;
        error = res.error;
    } catch (e: any) {
        if (e.name === 'AbortError' || e.message?.includes('aborted')) {
            // Translating the cryptic AbortError to something the user can understand
            throw new Error('A conexão foi interrompida durante a atualização. Por favor, verifique sua internet e tente novamente.');
        }
        throw e;
    }

    if (error) throw error;

    const updated = (updatedRows && updatedRows.length > 0) ? updatedRows[0] : { ...existingProduct, ...updatePayload };

    if (!updatedRows || updatedRows.length === 0) {
        console.warn('mockApi: Product updated successfully but returned no data (likely RLS). Using local payload.');
    }
    clearCache(['products']);
    return updated;
};

export const deleteProduct = async (id: string, userId: string = 'system', userName: string = 'Sistema') => {
    // Pegar infos do produto antes de deletar para o log e verificação de estoque
    const { data: product } = await supabase.from('products').select('*').eq('id', id).single();

    // Verificação de Segurança: Impedir exclusão se houver vendas vinculadas (Exceto Canceladas)
    // O produto não pode ser excluído se já foi vendido, a menos que a venda tenha sido cancelada.
    const { count } = await supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'Cancelada')
        .contains('items', [{ productId: id }]);

    if (count && count > 0) {
        throw new Error('Este produto possui vendas registradas e não pode ser excluído. Cancele as vendas associadas antes de excluir.');
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;

    if (product) {
        await addAuditLog(
            AuditActionType.DELETE,
            AuditEntityType.PRODUCT,
            id,
            `Produto excluído: ${product.model} (${product.brand})`,
            userId,
            userName
        );
    }

    clearCache(['products']);
};

export const updateProductStock = async (id: string, newStock: number, reason: string = 'Ajuste Manual', userId?: string, userName?: string) => {
    const { data: currentProduct, error: fetchError } = await supabase.from('products').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;

    const now = getNowISO();
    const adjustment = newStock - currentProduct.stock;

    // Build update payload
    const updatePayload: any = {
        stock: newStock,
        updatedAt: now
    };

    if (adjustment !== 0) {
        await addAuditLog(
            AuditActionType.STOCK_ADJUST,
            AuditEntityType.PRODUCT,
            id,
            `Estoque ajustado manualmente. Anterior: ${currentProduct.stock}, Novo: ${newStock} (Ajuste: ${adjustment > 0 ? '+' : ''}${adjustment})`,
            userId || 'user',
            userName || 'Usuário'
        );

        // Add to stockHistory column
        const existingStockHistory = currentProduct.stockHistory || [];
        const newStockEntry = {
            id: crypto.randomUUID(),
            oldStock: currentProduct.stock,
            newStock: newStock,
            adjustment: adjustment,
            reason: reason,
            timestamp: now,
            changedBy: userName || 'Usuário'
        };
        updatePayload.stockHistory = [...existingStockHistory, newStockEntry];
    }

    const { data, error } = await supabase.from('products').update(updatePayload).eq('id', id).select().single();

    if (error) throw error;
    clearCache(['products']);
    return data;
};

export const updateMultipleProducts = async (updates: { id: string; price?: number; costPrice?: number; wholesalePrice?: number }[], userId?: string, userName?: string) => {
    const now = getNowISO();

    for (const u of updates) {
        const { data: currentProduct } = await supabase.from('products').select('*').eq('id', u.id).single();
        if (!currentProduct) continue;

        const payload: any = {};
        const existingPriceHistory = currentProduct.priceHistory || [];
        let priceHistoryUpdated = false;

        // Handle sale price update
        if (u.price !== undefined) {
            payload.price = u.price;
            if (currentProduct.price !== u.price) {
                // Log to audit_logs
                await addAuditLog(
                    AuditActionType.UPDATE,
                    AuditEntityType.PRODUCT,
                    u.id,
                    `Atualização em Massa: Preço de venda alterado de ${formatCurrency(currentProduct.price)} para ${formatCurrency(u.price)}`,
                    userId || 'system',
                    userName || 'Atualização em Massa'
                );

                // Add to priceHistory column
                const newPriceEntry = {
                    id: crypto.randomUUID(),
                    oldPrice: currentProduct.price,
                    newPrice: u.price,
                    priceType: 'sale',
                    changedBy: userName || 'Atualização em Massa',
                    timestamp: now
                };
                existingPriceHistory.push(newPriceEntry);
                priceHistoryUpdated = true;
            }
        }

        // Handle wholesale price update
        if (u.wholesalePrice !== undefined) {
            payload.wholesalePrice = u.wholesalePrice;
            if (currentProduct.wholesalePrice !== u.wholesalePrice) {
                // Log to audit_logs
                await addAuditLog(
                    AuditActionType.UPDATE,
                    AuditEntityType.PRODUCT,
                    u.id,
                    `Atualização em Massa: Preço de atacado alterado de ${formatCurrency(currentProduct.wholesalePrice || 0)} para ${formatCurrency(u.wholesalePrice)}`,
                    userId || 'system',
                    userName || 'Atualização em Massa'
                );

                // Add to priceHistory column
                const newWholesaleEntry = {
                    id: crypto.randomUUID(),
                    oldPrice: currentProduct.wholesalePrice || 0,
                    newPrice: u.wholesalePrice,
                    priceType: 'wholesale',
                    changedBy: userName || 'Atualização em Massa',
                    timestamp: now
                };
                existingPriceHistory.push(newWholesaleEntry);
                priceHistoryUpdated = true;
            }
        }

        // Handle cost price update
        if (u.costPrice !== undefined) {
            payload.costPrice = u.costPrice;
            if (currentProduct.costPrice !== u.costPrice) {
                // Log to audit_logs
                await addAuditLog(
                    AuditActionType.UPDATE,
                    AuditEntityType.PRODUCT,
                    u.id,
                    `Atualização em Massa: Preço de custo alterado de ${formatCurrency(currentProduct.costPrice || 0)} para ${formatCurrency(u.costPrice)}`,
                    userId || 'system',
                    userName || 'Atualização em Massa'
                );

                // Add to priceHistory column
                const newCostEntry = {
                    id: crypto.randomUUID(),
                    oldPrice: currentProduct.costPrice || 0,
                    newPrice: u.costPrice,
                    priceType: 'cost',
                    changedBy: userName || 'Atualização em Massa',
                    timestamp: now
                };
                existingPriceHistory.push(newCostEntry);
                priceHistoryUpdated = true;
            }
        }

        if (priceHistoryUpdated) {
            payload.priceHistory = existingPriceHistory;
        }

        if (Object.keys(payload).length > 0) {
            payload.updatedAt = now;
            await supabase.from('products').update(payload).eq('id', u.id);
        }
    }
    clearCache(['products']);
};

export const getSales = async (): Promise<Sale[]> => {
    return fetchWithCache('sales', async () => {
        return fetchWithRetry(async () => {
            // Don't order by 'date' as the column may not exist
            const { data, error } = await supabase.from('sales').select('*');
            if (error) {
                console.error('Error fetching sales:', error);
                throw error;
            }
            return data;
        }).then(data => {

            return (data || []).map((sale: any) => {
                try {
                    const separatorCSDID = '\n---CSDID---\n';
                    const separatorInternal = '\n---INTERNAL---\n';

                    let external = sale.observations || '';
                    let internal = '';
                    let csdid = undefined;

                    if (external.includes(separatorCSDID)) {
                        const parts = external.split(separatorCSDID);
                        external = parts[0];
                        const csdidStr = parts[1];
                        csdid = parseInt(csdidStr, 10);
                    }

                    if (external.includes(separatorInternal)) {
                        const parts = external.split(separatorInternal);
                        external = parts[0];
                        internal = parts.slice(1).join(separatorInternal);
                    }

                    return {
                        ...sale,
                        customerId: sale.customer_id,
                        salespersonId: sale.salesperson_id,
                        cashSessionId: sale.cash_session_id,
                        warrantyTerm: sale.warranty_term,
                        posTerminal: sale.pos_terminal,
                        observations: external,
                        internalObservations: internal,
                        cashSessionDisplayId: csdid,
                        items: Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items) : []),
                        payments: Array.isArray(sale.payments) ? sale.payments : (typeof sale.payments === 'string' ? JSON.parse(sale.payments) : [])
                    };
                } catch (e) {
                    console.error("Error mapping sale:", sale.id, e);
                    return {
                        ...sale,
                        items: [],
                        payments: [],
                        observations: sale.observations || '',
                    };
                }
            });
        });
    });
};

export const getProductSalesHistory = async (productId: string): Promise<Sale[]> => {
    // Optimization: Reuse the cached 'sales' list instead of a specific DB query
    const allSales = await getSales();
    return allSales.filter((s: Sale) => s.items.some((i: any) => i.productId === productId));
};

export const getTodaysSales = async (): Promise<TodaySale[]> => {
    return [];
};

// --- SALES ---

export const addSale = async (data: any, userId: string = 'system', userName: string = 'Sistema') => {
    const now = new Date();

    // Get all IDs to find the max and ensure uniqueness efficiently
    const { data: existingIds } = await supabase.from('sales').select('id');

    let nextNum = 1;
    if (existingIds && existingIds.length > 0) {
        const numbers = existingIds
            .map((s: { id: string }) => {
                const match = s.id.match(/^ID-(\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter((n: number) => !isNaN(n) && n < 1000000000); // Filter out timestamp-based IDs

        if (numbers.length > 0) {
            nextNum = Math.max(...numbers) + 1;
        }
    }

    // Merge observations for DB storage
    let dbObservations = data.observations || '';
    if (data.internalObservations) {
        dbObservations = `${dbObservations}\n---INTERNAL---\n${data.internalObservations}`;
    }
    if (data.cashSessionDisplayId) {
        dbObservations = `${dbObservations}\n---CSDID---\n${data.cashSessionDisplayId}`;
    }

    const saleData: any = {
        id: `ID-${nextNum}`,
        date: now.toISOString(),
        customer_id: data.customerId,
        salesperson_id: data.salespersonId,
        items: data.items,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        payments: data.payments,
        pos_terminal: data.posTerminal || 'Caixa 1',
        status: data.status || 'Finalizada',
        origin: data.origin || 'PDV',
        warranty_term: data.warrantyTerm || null,
        observations: dbObservations,
        cash_session_id: data.cashSessionId || null,
        lead_origin: data.leadOrigin || null,
    };

    console.log('mockApi: Adding sale with payload:', saleData);
    const { data: insertedRows, error } = await supabase.from('sales').insert([saleData]).select();

    if (error) {
        console.error("Error adding sale:", JSON.stringify(error, null, 2));
        throw error;
    }

    // Handle case where RLS hides the inserted row (returns 0 rows but no error)
    const newSale = (insertedRows && insertedRows.length > 0) ? insertedRows[0] : saleData;

    if (!insertedRows || insertedRows.length === 0) {
        console.warn('mockApi: Sale inserted successfully but returned no data (likely RLS). Using local payload.');
    }

    // Map back to camelCase for frontend
    const mappedSale = {
        ...newSale,
        date: newSale.date,
        customerId: newSale.customer_id,
        salespersonId: newSale.salesperson_id,
        posTerminal: newSale.pos_terminal,
        warrantyTerm: newSale.warranty_term,
        cashSessionId: newSale.cash_session_id,
        leadOrigin: newSale.lead_origin
    };

    // Update stock and history for sold items
    if (data.items && Array.isArray(data.items)) {
        // Fetch customer name for history
        const { data: customerData } = await supabase.from('customers').select('*').eq('id', data.customerId).single();
        const customerName = customerData?.name || 'Cliente';
        const paymentMethods = data.payments?.map((p: Payment) => p.method).join(', ') || 'N/A';

        // Add main sale audit log
        await addAuditLog(
            AuditActionType.SALE_CREATE,
            AuditEntityType.SALE,
            newSale.id,
            `Venda criada. Cliente: ${customerName} | Total: ${formatCurrency(newSale.total)} | Pagamento: ${paymentMethods}`,
            userId,
            userName
        );

        for (const item of data.items) {
            const { data: product } = await supabase.from('products').select('*').eq('id', item.productId).single();
            if (product) {
                const currentStock = Number(product.stock);
                const quantityToDeduct = Number(item.quantity);
                const newStock = Math.max(0, currentStock - quantityToDeduct);

                // Record History in Audit Log per product
                await addAuditLog(
                    AuditActionType.SALE_CREATE,
                    AuditEntityType.PRODUCT,
                    item.productId,
                    `Venda #${newSale.id} - Qtd: ${quantityToDeduct} | Estoque restante: ${newStock}`,
                    userId,
                    userName
                );

                // Add to stockHistory column
                const existingStockHistory = product.stockHistory || [];
                const newStockEntry = {
                    id: crypto.randomUUID(),
                    oldStock: currentStock,
                    newStock: newStock,
                    adjustment: -quantityToDeduct,
                    reason: 'Venda',
                    relatedId: newSale.id,
                    timestamp: now.toISOString(),
                    changedBy: userName,
                    details: `Cliente: ${customerName} | Pagamento: ${paymentMethods}`
                };

                await supabase.from('products').update({
                    stock: newStock,
                    stockHistory: [...existingStockHistory, newStockEntry]
                }).eq('id', item.productId);
            }
        }
    }

    clearCache(['sales', 'products', 'cash_sessions']);
    return mappedSale;
};

export const updateSale = async (data: any, userId: string = 'system', userName: string = 'Sistema') => {
    console.log('mockApi: updateSale called with ID:', data.id);

    // STEP 0: Check if a trade-in product was removed from this sale
    if (data.payments) {
        // Fetch the original sale to compare
        const { data: originalSale } = await supabase.from('sales').select('payments').eq('id', data.id).maybeSingle();

        if (originalSale?.payments) {
            // Find trade-in payments in original that are NOT in the new payments
            const originalTradeIns = (originalSale.payments || []).filter((p: any) =>
                p.method === 'Aparelho na Troca' && p.tradeInDetails?.productId
            );
            const newTradeInProductIds = (data.payments || [])
                .filter((p: any) => p.method === 'Aparelho na Troca' && p.tradeInDetails?.productId)
                .map((p: any) => p.tradeInDetails.productId);

            for (const originalTradeIn of originalTradeIns) {
                const productId = originalTradeIn.tradeInDetails?.productId;
                if (productId && !newTradeInProductIds.includes(productId)) {
                    console.log(`[updateSale] Trade-in product ${productId} was REMOVED from sale`);

                    // Fetch the product to check its history
                    const { data: product } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();

                    if (product) {
                        const stockHistory = product.stockHistory || [];

                        // A "fresh" product has only the initial trade-in entry (stockHistory length = 1)
                        // and was never sold (current stock = 1 or the initial stock)
                        const isFresh = stockHistory.length <= 1 && product.stock > 0;

                        if (isFresh) {
                            // DELETE the product completely
                            console.log(`[updateSale] Product ${productId} is FRESH - DELETING permanently`);
                            await supabase.from('products').delete().eq('id', productId);

                            await addAuditLog(
                                AuditActionType.DELETE,
                                AuditEntityType.PRODUCT,
                                productId,
                                `Produto de troca excluído (removido da venda original): ${product.model}`,
                                userId,
                                userName
                            );
                        } else {
                            // Set stock to 0 (product has history, can't be deleted)
                            console.log(`[updateSale] Product ${productId} has HISTORY - setting stock to 0`);

                            const newStockEntry = {
                                id: crypto.randomUUID(),
                                oldStock: product.stock,
                                newStock: 0,
                                adjustment: -product.stock,
                                reason: 'Remoção de Troca',
                                relatedId: data.id,
                                timestamp: getNowISO(),
                                changedBy: userName,
                                details: 'Produto de troca removido da venda original'
                            };

                            await supabase.from('products').update({
                                stock: 0,
                                stockHistory: [...stockHistory, newStockEntry]
                            }).eq('id', productId);

                            await addAuditLog(
                                AuditActionType.STOCK_ADJUST,
                                AuditEntityType.PRODUCT,
                                productId,
                                `Estoque zerado (troca removida da venda): ${product.model}. Estoque: ${product.stock} → 0`,
                                userId,
                                userName
                            );
                        }
                    }
                }
            }
        }
    }

    // Merge observations for DB storage
    let dbObservations = data.observations || '';
    if (data.internalObservations && !dbObservations.includes('---INTERNAL---')) {
        dbObservations = `${dbObservations}\n---INTERNAL---\n${data.internalObservations}`;
    } else if (data.internalObservations && dbObservations.includes('---INTERNAL---')) {
        // Replace existing internal part if needed, or keep as is if it's already there
        const parts = dbObservations.split('\n---INTERNAL---\n');
        dbObservations = `${parts[0]}\n---INTERNAL---\n${data.internalObservations}`;
    }

    if (data.cashSessionDisplayId && !dbObservations.includes('---CSDID---')) {
        dbObservations = `${dbObservations}\n---CSDID---\n${data.cashSessionDisplayId}`;
    }

    const updatePayload: any = {};
    if (dbObservations !== undefined) updatePayload.observations = dbObservations;

    // Explicitly map known fields to snake_case
    if (data.customerId) updatePayload.customer_id = data.customerId;
    if (data.salespersonId) updatePayload.salesperson_id = data.salespersonId;
    if (data.status) updatePayload.status = data.status;
    if (data.posTerminal) updatePayload.pos_terminal = data.posTerminal;
    if (data.warrantyTerm) updatePayload.warranty_term = data.warrantyTerm;
    if (data.cashSessionId) updatePayload.cash_session_id = data.cashSessionId;
    if (data.leadOrigin) updatePayload.lead_origin = data.leadOrigin;
    if (data.items) updatePayload.items = data.items;
    if (data.subtotal !== undefined) updatePayload.subtotal = data.subtotal;
    if (data.discount !== undefined) updatePayload.discount = data.discount;
    if (data.total !== undefined) updatePayload.total = data.total;
    if (data.payments) updatePayload.payments = data.payments;

    console.log('mockApi: updateSale payload:', updatePayload);

    const { data: updatedRows, error } = await supabase.from('sales').update(updatePayload).eq('id', data.id).select();
    if (error) {
        console.error('mockApi: Error updating sale:', error);
        throw error;
    }

    // Handle RLS: if no rows returned but no error, use local data
    const updated = (updatedRows && updatedRows.length > 0) ? updatedRows[0] : { id: data.id, ...updatePayload };

    if (!updatedRows || updatedRows.length === 0) {
        console.warn('mockApi: Sale updated successfully but returned no data (likely RLS). Using local payload.');
    }

    await addAuditLog(
        AuditActionType.UPDATE,
        AuditEntityType.SALE,
        data.id,
        `Venda atualizada. Status: ${data.status || updated.status}`,
        userId,
        userName
    );

    // If sale was not Finalizada/Editada and now it is, we need to deduct stock
    // (This is a simplified logic, ideally we should compare old and new state)
    const oldStatus = data.oldStatus || ''; // We might need to pass this or fetch it
    const newStatus = updated.status;

    if ((oldStatus === 'Pendente' || !oldStatus) && (newStatus === 'Finalizada' || newStatus === 'Editada')) {
        console.log('mockApi: Sale finalized during update, deducting stock...');
        const paymentMethods = data.payments?.map((p: any) => p.method).join(', ') || 'N/A';
        const { data: customerData } = await supabase.from('customers').select('name').eq('id', updated.customer_id).single();
        const customerName = customerData?.name || 'Cliente';

        for (const item of updated.items || []) {
            const { data: product } = await supabase.from('products').select('*').eq('id', item.productId).single();
            if (product) {
                const currentStock = Number(product.stock);
                const quantityToDeduct = Number(item.quantity);
                const newStock = Math.max(0, currentStock - quantityToDeduct);

                await addAuditLog(AuditActionType.SALE_CREATE, AuditEntityType.PRODUCT, item.productId,
                    `Venda #${updated.id} finalizada na edição - Qtd: ${quantityToDeduct} | Estoque restante: ${newStock}`,
                    userId, userName);

                await supabase.from('products').update({
                    stock: newStock,
                    stockHistory: [...(product.stockHistory || []), {
                        id: crypto.randomUUID(),
                        oldStock: currentStock,
                        newStock: newStock,
                        adjustment: -quantityToDeduct,
                        reason: 'Venda (Finalizada na Edição)',
                        relatedId: updated.id,
                        timestamp: getNowISO(),
                        changedBy: userName,
                        details: `Cliente: ${customerName} | Pagamento: ${paymentMethods}`
                    }]
                }).eq('id', item.productId);
            }
        }
    }

    // If sale was already finalized and is being edited, update stockHistory with new payment info
    if (newStatus === 'Editada' && data.payments) {
        console.log('mockApi: Sale edited, updating product stockHistory with new payment info...');
        const paymentMethods = data.payments?.map((p: any) => p.method).join(', ') || 'N/A';
        const { data: customerData } = await supabase.from('customers').select('name').eq('id', updated.customer_id).maybeSingle();
        const customerName = customerData?.name || 'Cliente';

        for (const item of updated.items || []) {
            const { data: product } = await supabase.from('products').select('stockHistory').eq('id', item.productId).maybeSingle();
            if (product && product.stockHistory) {
                // Find and update the stockHistory entry for this sale
                const updatedHistory = product.stockHistory.map((entry: any) => {
                    if (entry.relatedId === updated.id && entry.reason?.includes('Venda')) {
                        // Update the details with new payment info
                        return {
                            ...entry,
                            details: `Cliente: ${customerName} | Pagamento: ${paymentMethods}`
                        };
                    }
                    return entry;
                });

                await supabase.from('products').update({
                    stockHistory: updatedHistory
                }).eq('id', item.productId);
            }
        }
    }

    clearCache(['sales', 'products']);

    return {
        ...updated,
        customerId: updated.customer_id,
        salespersonId: updated.salesperson_id,
        posTerminal: updated.pos_terminal,
        warrantyTerm: updated.warranty_term,
        cashSessionId: updated.cash_session_id,
        leadOrigin: updated.lead_origin,
        date: updated.date
    };
};

export const cancelSale = async (id: string, reason: string, userId: string = 'system', userName: string = 'Sistema') => {
    const { data: sale, error: fetchError } = await supabase.from('sales').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;

    const { data: updatedSale, error: updateError } = await supabase.from('sales').update({ status: 'Cancelada', observations: reason ? `${sale.observations || ''} [Cancelada: ${reason}]` : sale.observations }).eq('id', id).select().single();
    if (updateError) throw updateError;

    // Add main sale cancel audit log
    await addAuditLog(
        AuditActionType.SALE_CANCEL,
        AuditEntityType.SALE,
        id,
        `Venda Cancelada. Motivo: ${reason}`,
        userId,
        userName
    );

    if (sale.items && Array.isArray(sale.items)) {
        const now = getNowISO();
        for (const item of sale.items) {
            const { data: product } = await supabase.from('products').select('*').eq('id', item.productId).single();
            if (product) {
                const currentStock = Number(product.stock);
                const newStock = currentStock + item.quantity;

                await addAuditLog(
                    AuditActionType.SALE_CANCEL,
                    AuditEntityType.PRODUCT,
                    item.productId,
                    `Venda #${sale.id} Cancelada. Motivo: ${reason}. Estoque retornado: +${item.quantity}`,
                    userId,
                    userName
                );

                // Add to stockHistory column
                const existingStockHistory = product.stockHistory || [];
                const newStockEntry = {
                    id: crypto.randomUUID(),
                    oldStock: currentStock,
                    newStock: newStock,
                    adjustment: item.quantity,
                    reason: 'Cancelamento de Venda',
                    relatedId: sale.id,
                    timestamp: now,
                    changedBy: userName,
                    details: `Motivo: ${reason}`
                };

                await supabase.from('products').update({
                    stock: newStock,
                    stockHistory: [...existingStockHistory, newStockEntry]
                }).eq('id', item.productId);
            }
        }
    }

    clearCache(['sales', 'products']);
    return updatedSale;
};

export const getCustomerSales = async (customerId: string): Promise<Sale[]> => {
    // Optimization: Reuse the cached 'sales' list instead of a specific DB query
    const allSales = await getSales();
    return allSales.filter(s => s.customerId === customerId);
};

// --- CUSTOMERS ---
// --- MAPPING HELPERS ---
const mapCustomer = (c: any) => ({
    ...c,
    avatarUrl: c.avatar_url,
    birthDate: c.birth_date,
    createdAt: c.createdAt || c.created_at,
    isBlocked: c.is_blocked,
    customTag: c.custom_tag,
    instagram: c.instagram,
    address: {
        zip: c.cep || '',
        street: c.street || '',
        number: c.numero || '',
        complement: c.complemento || '',
        neighborhood: c.bairro || '',
        city: c.city || '',
        state: c.state || ''
    }
});

const mapSupplier = (s: any) => ({
    ...s,
    contactPerson: s.contact_person,
    avatarUrl: s.avatar_url,
    linkedCustomerId: s.linked_customer_id,
    instagram: s.instagram
});

// Mapped fields list to avoid fetching 'avatar_url' which might contain massive base64 strings
const CUSTOMER_COLUMNS = 'id, name, email, phone, cpf, rg, birth_date, createdAt, is_blocked, custom_tag, instagram, cep, street, numero, complemento, bairro, city, state';

export const getCustomers = async () => {
    return fetchWithCache('customers', async () => {
        return fetchWithRetry(async () => {
            console.log('mockApi: Fetching customers from Supabase...');
            // Exclude avatar_url to prevent large payloads from crashing the app
            const { data, error } = await supabase.from('customers').select(CUSTOMER_COLUMNS);
            if (error) {
                console.error('mockApi: Error fetching customers:', error);
                throw error;
            }
            return data;
        }).then(data => {
            console.log('mockApi: Fetched customers count:', data?.length || 0);
            return (data || []).map(mapCustomer);
        });
    });
};

// Fetch single customer directly from DB without cache (for fresh data like tradeInHistory)
export const getCustomerById = async (id: string): Promise<Customer | null> => {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error) {
        console.error('Error fetching customer by ID:', error);
        return null;
    }
    return data ? populateTradeInHistory(mapCustomer(data)) : null;
};

// Helper function to populate tradeInHistory from sales interactions
const populateTradeInHistory = async (customer: Customer): Promise<Customer> => {
    // 1. Fetch sales for this customer
    const { data: sales } = await supabase.from('sales').select('*').eq('customer_id', customer.id);

    if (sales && sales.length > 0) {
        // 2. We need user names for 'salespersonName'
        // Using a simple cache or fetching all users might be heavy, but for a single customer view it's acceptable.
        // Optimization: Fetch only needed users? Or cache users globally? 
        // For now, fetch all users as it's a small table usually.
        const { data: users } = await supabase.from('users').select('id, name');
        const userMap = (users || []).reduce((acc: any, u: any) => ({ ...acc, [u.id]: u.name }), {});

        const derivedHistory: TradeInEntry[] = [];

        sales.forEach((sale: any) => {
            if (sale.payments && Array.isArray(sale.payments)) {
                sale.payments.forEach((p: any) => {
                    // Check for trade-in method or presence of tradeInDetails
                    if ((p.method === 'Aparelho na Troca' || p.tradeInDetails) && p.tradeInDetails) {
                        derivedHistory.push({
                            id: `trade-${sale.id}-${p.tradeInDetails.productId || Math.random().toString(36).substr(2, 5)}`,
                            productId: p.tradeInDetails.productId,
                            date: sale.date,
                            value: p.value,
                            model: p.tradeInDetails.model,
                            serialNumber: p.tradeInDetails.serialNumber,
                            imei1: p.tradeInDetails.imei1,
                            imei2: p.tradeInDetails.imei2,
                            batteryHealth: p.tradeInDetails.batteryHealth,
                            saleId: sale.id,
                            salespersonName: userMap[sale.salespersonId] || 'Vendedor'
                        });
                    }
                });
            }
        });

        // Sort by date descending
        derivedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { ...customer, tradeInHistory: derivedHistory };
    }

    return customer;
};

export const addCustomer = async (data: any, userId: string = 'system', userName: string = 'Sistema') => {
    // Only include fields that exist in the actual customers table schema
    const payload: any = {
        name: data.name,
        phone: data.phone
    };

    // Optional fields - only add if they have values
    if (data.email) payload.email = data.email;
    if (data.avatarUrl) payload.avatar_url = data.avatarUrl;
    if (data.cpf) payload.cpf = data.cpf;
    if (data.rg) payload.rg = data.rg;
    if (data.birthDate) payload.birth_date = data.birthDate;
    if (data.isBlocked) payload.is_blocked = data.isBlocked;
    if (data.customTag) payload.custom_tag = data.customTag;
    if (data.instagram) payload.instagram = data.instagram;

    // Address fields
    if (data.address) {
        if (data.address.zip) payload.cep = data.address.zip;
        if (data.address.street) payload.street = data.address.street;
        if (data.address.number) payload.numero = data.address.number;
        if (data.address.complement) payload.complemento = data.address.complement;
        if (data.address.neighborhood) payload.bairro = data.address.neighborhood;
        if (data.address.city) payload.city = data.address.city;
        if (data.address.state) payload.state = data.address.state;
    }

    console.log("mockApi: Adding customer with payload:", payload);

    // --- Validation: Check for duplicates ---
    if (payload.cpf) {
        const { data: existingCpf, error: cpfError } = await supabase
            .from('customers')
            .select('id, name')
            .eq('cpf', payload.cpf)
            .maybeSingle();

        if (existingCpf) {
            throw new Error(`Já existe um cliente cadastrado com este CPF: ${existingCpf.name}`);
        }
    }

    if (payload.rg) {
        // Try-catch block to handle case where 'rg' column might not exist yet
        try {
            const { data: existingRg, error: rgError } = await supabase
                .from('customers')
                .select('id, name')
                .eq('rg', payload.rg)
                .maybeSingle();

            if (rgError && rgError.code !== 'PGRST100') throw rgError; // Ignore simple errors, but throw specifics

            if (existingRg) {
                throw new Error(`Já existe um cliente cadastrado com este RG: ${existingRg.name}`);
            }
        } catch (err: any) {
            // If column doesn't exist (Postgres error 42703), we can't check duplication but we also can't save it.
            // Let the insert fail naturally if column is missing, or ignore check error.
            if (err.code !== '42703' && !err.message?.includes('rg')) {
                console.warn('Error checking RG duplication:', err);
                // If it's a duplication error thrown by us, rethrow
                if (err.message && err.message.includes('Já existe um cliente')) throw err;
            }
        }
    }
    // ----------------------------------------
    let result = await supabase.from('customers').insert([payload]).select().single();

    if (result.error && payload.instagram && (result.error.code === '42703' || result.error.message?.includes('instagram'))) {
        console.warn("Instagram column missing, retrying without it...");
        delete payload.instagram;
        result = await supabase.from('customers').insert([payload]).select().single();
    }

    const { data: newCustomer, error } = result;
    if (error) {
        console.error("Error adding customer:", JSON.stringify(error, null, 2));
        throw error;
    }

    await addAuditLog(
        AuditActionType.CREATE,
        AuditEntityType.CUSTOMER,
        newCustomer.id,
        `Cliente cadastrado: ${newCustomer.name}`,
        userId,
        userName
    );

    clearCache(['customers']);
    return mapCustomer(newCustomer);
};

export const updateCustomer = async (data: any, userId: string = 'system', userName: string = 'Sistema') => {
    // Only include fields that exist in the actual customers table schema
    const payload: any = {
        name: data.name,
        phone: data.phone
    };

    // Optional fields - only add if they have values
    if (data.email !== undefined) payload.email = data.email || null;
    if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl || null;
    if (data.cpf !== undefined) payload.cpf = data.cpf || null;
    if (data.rg !== undefined) payload.rg = data.rg || null;
    if (data.birthDate !== undefined) payload.birth_date = data.birthDate || null;
    if (data.isBlocked !== undefined) payload.is_blocked = data.isBlocked || false;
    if (data.customTag !== undefined) payload.custom_tag = data.customTag || null;
    if (data.instagram !== undefined) payload.instagram = data.instagram || null;

    // Address fields
    if (data.address) {
        if (data.address.zip !== undefined) payload.cep = data.address.zip;
        if (data.address.street !== undefined) payload.street = data.address.street;
        if (data.address.number !== undefined) payload.numero = data.address.number;
        if (data.address.complement !== undefined) payload.complemento = data.address.complement;
        if (data.address.neighborhood !== undefined) payload.bairro = data.address.neighborhood;
        if (data.address.city !== undefined) payload.city = data.address.city;
        if (data.address.state !== undefined) payload.state = data.address.state;
    }

    console.log("mockApi: Updating customer with payload:", payload, "ID:", data.id);

    // --- Validation: Check for duplicates (excluding self) ---
    if (payload.cpf) {
        const { data: existingCpf } = await supabase
            .from('customers')
            .select('id, name')
            .eq('cpf', payload.cpf)
            .neq('id', data.id)
            .maybeSingle();

        if (existingCpf) {
            throw new Error(`Outro cliente já possui este CPF: ${existingCpf.name}`);
        }
    }

    if (payload.rg) {
        try {
            const { data: existingRg, error: rgError } = await supabase
                .from('customers')
                .select('id, name')
                .eq('rg', payload.rg)
                .neq('id', data.id)
                .maybeSingle();

            if (existingRg) {
                throw new Error(`Outro cliente já possui este RG: ${existingRg.name}`);
            }
        } catch (err: any) {
            if (err.message && err.message.includes('Outro cliente')) throw err;
            // Ignore other errors (like column missing) during check, let update handle it
        }
    }
    // ---------------------------------------------------------

    // Timeout de segurança para evitar hang infinito
    const updatePromise = supabase.from('customers').update(payload).eq('id', data.id).select().single();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao atualizar cliente no Supabase (10s)')), 10000));

    let result: any;
    try {
        result = await Promise.race([updatePromise, timeoutPromise]);
        console.log("mockApi: Update result received:", result);
    } catch (err: any) {
        console.error("mockApi: Exception during update race:", err);
        throw err;
    }

    if (result.error && payload.instagram && (result.error.code === '42703' || result.error.message?.includes('instagram'))) {
        console.warn("Instagram column missing, retrying without it...");
        delete payload.instagram;
        result = await supabase.from('customers').update(payload).eq('id', data.id).select().single();
        console.log("mockApi: Retry result:", result);
    }

    const { data: updated, error } = result;
    if (error) {
        console.error("Error updating customer:", JSON.stringify(error, null, 2));
        throw error;
    }

    await addAuditLog(
        AuditActionType.UPDATE,
        AuditEntityType.CUSTOMER,
        updated.id,
        `Cliente atualizado: ${updated.name}`,
        userId,
        userName
    );

    clearCache(['customers']);
    return mapCustomer(updated);
};

export const deleteCustomer = async (id: string, userId: string = 'system', userName: string = 'Sistema') => {
    const { data: customer } = await supabase.from('customers').select('*').eq('id', id).single();

    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;

    if (customer) {
        await addAuditLog(
            AuditActionType.DELETE,
            AuditEntityType.CUSTOMER,
            id,
            `Cliente excluído: ${customer.name}`,
            userId,
            userName
        );
    }

    clearCache(['customers']);
};

// --- SUPPLIERS ---

export const getSuppliers = async () => {
    return fetchWithCache('suppliers', async () => {
        const { data, error } = await supabase.from('suppliers').select('*');
        if (error) throw error;
        return (data || []).map(mapSupplier);
    });
};

export const addSupplier = async (data: any, userId: string = 'system', userName: string = 'Sistema') => {
    // Only include fields that exist in the table
    const payload: any = {
        name: data.name,
        phone: data.phone
    };

    // Optional fields - only add if they have values
    if (data.contactPerson) payload.contact_person = data.contactPerson;
    if (data.email) payload.email = data.email;
    if (data.cnpj) payload.cnpj = data.cnpj;
    if (data.avatarUrl) payload.avatar_url = data.avatarUrl;
    if (data.linkedCustomerId) payload.linked_customer_id = data.linkedCustomerId;
    if (data.instagram) payload.instagram = data.instagram;

    console.log("mockApi: Adding supplier with payload:", payload);
    let result = await supabase.from('suppliers').insert([payload]).select().single();

    if (result.error && payload.instagram && (result.error.code === '42703' || result.error.message?.includes('instagram'))) {
        console.warn("Instagram column missing, retrying without it...");
        delete payload.instagram;
        result = await supabase.from('suppliers').insert([payload]).select().single();
    }

    const { data: newSupplier, error } = result;
    if (error) {
        console.error("Error adding supplier:", JSON.stringify(error, null, 2));
        throw error;
    }

    await addAuditLog(
        AuditActionType.CREATE,
        AuditEntityType.SUPPLIER,
        newSupplier.id,
        `Fornecedor cadastrado: ${newSupplier.name}`,
        userId,
        userName
    );

    clearCache(['suppliers']);
    return mapSupplier(newSupplier);
};

export const updateSupplier = async (data: any, userId: string = 'system', userName: string = 'Sistema') => {
    // Only include fields that exist in the actual suppliers table
    const payload: any = {
        name: data.name,
        phone: data.phone
    };

    // Optional fields - only add if they have values
    if (data.contactPerson !== undefined) payload.contact_person = data.contactPerson;
    if (data.email !== undefined) payload.email = data.email;
    if (data.cnpj !== undefined) payload.cnpj = data.cnpj;
    if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
    if (data.linkedCustomerId !== undefined) payload.linked_customer_id = data.linkedCustomerId;
    if (data.instagram !== undefined) payload.instagram = data.instagram || null;

    console.log("mockApi: Updating supplier with payload:", payload);
    let result = await supabase.from('suppliers').update(payload).eq('id', data.id).select().single();

    if (result.error && payload.instagram && (result.error.code === '42703' || result.error.message?.includes('instagram'))) {
        console.warn("Instagram column missing, retrying without it...");
        delete payload.instagram;
        result = await supabase.from('suppliers').update(payload).eq('id', data.id).select().single();
    }

    const { data: updated, error } = result;
    if (error) {
        console.error("Error updating supplier:", JSON.stringify(error, null, 2));
        throw error;
    }

    await addAuditLog(
        AuditActionType.UPDATE,
        AuditEntityType.SUPPLIER,
        updated.id,
        `Fornecedor atualizado: ${updated.name}`,
        userId,
        userName
    );

    clearCache(['suppliers']);
    return mapSupplier(updated);
};

export const deleteSupplier = async (id: string, userId: string = 'system', userName: string = 'Sistema') => {
    const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', id).single();

    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;

    if (supplier) {
        await addAuditLog(
            AuditActionType.DELETE,
            AuditEntityType.SUPPLIER,
            id,
            `Fornecedor excluído: ${supplier.name}`,
            userId,
            userName
        );
    }

    clearCache(['suppliers']);
};

export const findOrCreateSupplierFromCustomer = async (c: Customer, retryCount = 0): Promise<Supplier> => {
    // Create a fallback supplier that we can use if DB operations fail or timeout
    const fallbackSupplier: Supplier = {
        id: `temp-supplier-${c.id}`,
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        linkedCustomerId: c.id,
        contactPerson: c.name,
        cnpj: '',
        address: ''
    };

    // Timeout wrapper for the entire operation
    const timeoutPromise = new Promise<Supplier>((_, reject) =>
        setTimeout(() => reject(new Error('SUPPLIER_TIMEOUT')), 8000)
    );

    const mainOperation = async (): Promise<Supplier> => {
        try {
            const { data: existing, error } = await supabase.from('suppliers').select('*').eq('linked_customer_id', c.id).maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error("Error checking existing supplier:", error);
                // If AbortError and first try, retry once after a short delay
                if ((error.message?.includes('aborted') || (error as any).name === 'AbortError') && retryCount < 2) {
                    console.warn('AbortError on check, retrying after delay...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    return findOrCreateSupplierFromCustomer(c, retryCount + 1);
                }
                throw error;
            }
            if (existing) return mapSupplier(existing);

            // Use only basic columns that exist in the suppliers table
            const ns: any = {
                name: c.name,
                email: c.email || null,
                phone: c.phone || null,
                linked_customer_id: c.id,
                instagram: c.instagram || null
            };

            const { data: insertedRows, error: insertError } = await supabase.from('suppliers').insert([ns]).select();

            if (insertError) {
                console.error("Error creating supplier from customer:", JSON.stringify(insertError, null, 2));
                // If AbortError and first try, retry once after a short delay
                if ((insertError.message?.includes('aborted') || (insertError as any).name === 'AbortError') && retryCount < 2) {
                    console.warn('AbortError on insert, retrying after delay...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    return findOrCreateSupplierFromCustomer(c, retryCount + 1);
                }
                throw insertError;
            }

            // Handle RLS: if no rows returned but no error, use local data
            const newSupplier = (insertedRows && insertedRows.length > 0) ? insertedRows[0] : { ...ns, id: crypto.randomUUID() };

            console.log('mockApi: Supplier created successfully from customer.');
            clearCache(['suppliers']);
            return mapSupplier(newSupplier);
        } catch (err: any) {
            // If insert fails, try with even more minimal fields
            console.warn('First insert failed, trying minimal fields:', err.message);

            // If AbortError and we haven't retried yet, retry the whole function
            if ((err.message?.includes('aborted') || err.name === 'AbortError') && retryCount < 2) {
                console.warn('AbortError caught, retrying after delay...');
                await new Promise(resolve => setTimeout(resolve, 300));
                return findOrCreateSupplierFromCustomer(c, retryCount + 1);
            }

            const minimalNs = {
                name: c.name,
                linked_customer_id: c.id
            };
            const { data: minInsertedRows, error: minError } = await supabase.from('suppliers').insert([minimalNs]).select();
            if (minError) throw minError;

            const newSupplier = (minInsertedRows && minInsertedRows.length > 0) ? minInsertedRows[0] : { ...minimalNs, id: crypto.randomUUID() };
            clearCache(['suppliers']);
            return mapSupplier(newSupplier);
        }
    };

    // Race between main operation and timeout
    try {
        return await Promise.race([mainOperation(), timeoutPromise]);
    } catch (err: any) {
        if (err.message === 'SUPPLIER_TIMEOUT') {
            console.warn('findOrCreateSupplierFromCustomer: Timeout reached, using fallback supplier');
            return fallbackSupplier;
        }
        // For any other error, also return fallback to not block the user
        console.error('findOrCreateSupplierFromCustomer: Error, using fallback supplier', err);
        return fallbackSupplier;
    }
};


// --- GENERIC PARAMETERS (Brands, Categories, etc) ---

const getTable = async (table: string, cacheKey: string) => {
    return fetchWithCache(cacheKey, async () => {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        return data || [];
    });
};

const addItem = async (table: string, data: any, cacheKey: string, userId: string = 'system', userName: string = 'Sistema') => {
    const { data: newItem, error } = await supabase.from(table).insert([data]).select().single();
    if (error) {
        console.error(`Error adding item to ${table}:`, error);
        throw error;
    }

    await addAuditLog(
        AuditActionType.CREATE,
        getTableEntityType(table),
        newItem.id,
        `Item adicionado em ${table}: ${JSON.stringify(data)}`,
        userId,
        userName
    );

    clearCache([cacheKey]);
    return newItem;
};

const updateItem = async (table: string, data: any, cacheKey: string, userId: string = 'system', userName: string = 'Sistema') => {
    const { data: updated, error } = await supabase.from(table).update(data).eq('id', data.id).select().single();
    if (error) {
        console.error(`Error updating item in ${table}:`, error);
        throw error;
    }

    await addAuditLog(
        AuditActionType.UPDATE,
        getTableEntityType(table),
        data.id,
        `Item atualizado em ${table}. Alterações: ${JSON.stringify(data)}`,
        userId,
        userName
    );

    clearCache([cacheKey]);
    return updated;
};

const deleteItem = async (table: string, id: string, cacheKey: string, userId: string = 'system', userName: string = 'Sistema') => {
    // Pegar infos antes de deletar
    const { data: item } = await supabase.from(table).select('*').eq('id', id).single();

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;

    if (item) {
        await addAuditLog(
            AuditActionType.DELETE,
            getTableEntityType(table),
            id,
            `Item excluído de ${table}: ${item.name || item.id}`,
            userId,
            userName
        );
    }

    clearCache([cacheKey]);
};

const getTableEntityType = (table: string): AuditEntityType => {
    switch (table) {
        case 'products': return AuditEntityType.PRODUCT;
        case 'customers': return AuditEntityType.CUSTOMER;
        case 'suppliers': return AuditEntityType.SUPPLIER;
        case 'sales': return AuditEntityType.SALE;
        case 'purchase_orders': return AuditEntityType.PURCHASE_ORDER;
        case 'users': return AuditEntityType.USER;
        default: return AuditEntityType.PRODUCT; // Fallback
    }
}

export const getBrands = () => getTable('brands', 'brands');
export const addBrand = (data: any, userId?: string, userName?: string) => addItem('brands', data, 'brands', userId, userName);
export const updateBrand = (data: any, userId?: string, userName?: string) => updateItem('brands', data, 'brands', userId, userName);
export const deleteBrand = (id: string, userId?: string, userName?: string) => deleteItem('brands', id, 'brands', userId, userName);

export const getCategories = async () => {
    return fetchWithCache('categories', async () => {
        const { data, error } = await supabase.from('categories').select('*');
        if (error) throw error;
        return (data || []).map((c: any) => ({
            ...c,
            brandId: c.brand_id
        }));
    });
};
export const addCategory = async (data: any, userId?: string, userName?: string) => {
    const payloads = [
        { name: data.name, brand_id: data.brandId },
        { name: data.name }
    ];

    let lastError: any = null;
    for (const payload of payloads) {
        try {
            console.log('addCategory: Attempting with payload:', payload);
            return await addItem('categories', payload, 'categories', userId, userName);
        } catch (error: any) {
            console.error('addCategory: Error:', error.message);
            lastError = error;
            if (!error.message?.includes('column') && !error.message?.includes('schema')) {
                throw error;
            }
        }
    }
    throw lastError;
};
export const updateCategory = async (data: any, userId?: string, userName?: string) => {
    const payloads = [
        { id: data.id, name: data.name, brand_id: data.brandId },
        { id: data.id, name: data.name }
    ];

    let lastError: any = null;
    for (const payload of payloads) {
        try {
            return await updateItem('categories', payload, 'categories', userId, userName);
        } catch (error: any) {
            lastError = error;
            if (!error.message?.includes('column') && !error.message?.includes('schema')) {
                throw error;
            }
        }
    }
    throw lastError;
};
export const deleteCategory = (id: string, userId?: string, userName?: string) => deleteItem('categories', id, 'categories', userId, userName);

export const getProductModels = async () => {
    return fetchWithCache('product_models', async () => {
        const { data, error } = await supabase.from('product_models').select('*');
        if (error) throw error;
        return (data || []).map((m: any) => ({
            ...m,
            categoryId: m.category_id,
            imageUrl: m.image_url
        }));
    });
};
export const addProductModel = async (data: any, userId?: string, userName?: string) => {
    // Try progressively simpler payloads until one works
    const payloads = [
        { name: data.name, category_id: data.categoryId, image_url: data.imageUrl },
        { name: data.name, category_id: data.categoryId },
        { name: data.name }
    ];

    let lastError: any = null;
    for (const payload of payloads) {
        try {
            console.log('addProductModel: Attempting with payload:', payload);
            return await addItem('product_models', payload, 'product_models', userId, userName);
        } catch (error: any) {
            console.error('addProductModel: Error:', error.message);
            lastError = error;
            // Continue to next simpler payload if column doesn't exist
            if (!error.message?.includes('column') && !error.message?.includes('schema')) {
                throw error; // If error is not about missing column, rethrow
            }
        }
    }
    throw lastError;
};
export const updateProductModel = async (data: any, userId?: string, userName?: string) => {
    const payloads = [
        { id: data.id, name: data.name, category_id: data.categoryId, image_url: data.imageUrl },
        { id: data.id, name: data.name, category_id: data.categoryId },
        { id: data.id, name: data.name }
    ];

    let lastError: any = null;
    for (const payload of payloads) {
        try {
            return await updateItem('product_models', payload, 'product_models', userId, userName);
        } catch (error: any) {
            lastError = error;
            if (!error.message?.includes('column') && !error.message?.includes('schema')) {
                throw error;
            }
        }
    }
    throw lastError;
};
export const deleteProductModel = (id: string, userId?: string, userName?: string) => deleteItem('product_models', id, 'product_models', userId, userName);

export const getGrades = () => getTable('grades', 'grades');
export const addGrade = (data: any, userId?: string, userName?: string) => addItem('grades', data, 'grades', userId, userName);
export const updateGrade = (data: any, userId?: string, userName?: string) => updateItem('grades', data, 'grades', userId, userName);
export const deleteGrade = (id: string, userId?: string, userName?: string) => deleteItem('grades', id, 'grades', userId, userName);

export const getGradeValues = async () => {
    return fetchWithCache('grade_values', async () => {
        const { data, error } = await supabase.from('grade_values').select('*');
        if (error) throw error;
        return (data || []).map((v: any) => ({
            ...v,
            gradeId: v.grade_id
        }));
    });
};
export const addGradeValue = async (data: any, userId?: string, userName?: string) => {
    const payloads = [
        { name: data.name, grade_id: data.gradeId },
        { name: data.name }
    ];

    let lastError: any = null;
    for (const payload of payloads) {
        try {
            console.log('addGradeValue: Attempting with payload:', payload);
            return await addItem('grade_values', payload, 'grade_values', userId, userName);
        } catch (error: any) {
            console.error('addGradeValue: Error:', error.message);
            lastError = error;
            if (!error.message?.includes('column') && !error.message?.includes('schema')) {
                throw error;
            }
        }
    }
    throw lastError;
};
export const updateGradeValue = async (data: any, userId?: string, userName?: string) => {
    const payloads = [
        { id: data.id, name: data.name, grade_id: data.gradeId },
        { id: data.id, name: data.name }
    ];

    let lastError: any = null;
    for (const payload of payloads) {
        try {
            return await updateItem('grade_values', payload, 'grade_values', userId, userName);
        } catch (error: any) {
            lastError = error;
            if (!error.message?.includes('column') && !error.message?.includes('schema')) {
                throw error;
            }
        }
    }
    throw lastError;
};
export const deleteGradeValue = (id: string, userId?: string, userName?: string) => deleteItem('grade_values', id, 'grade_values', userId, userName);

export const getReceiptTerms = async () => {
    return fetchWithCache('receipt_terms', async () => {
        const { data, error } = await supabase.from('receipt_terms').select('*');
        if (error) throw error;
        return (data || []).map((term: any) => ({
            ...term,
            warrantyTerm: term.warranty_term,
            warrantyExclusions: term.warranty_exclusions,
            imageRights: term.image_rights
        }));
    });
};

export const addReceiptTerm = async (data: any, userId: string = 'system', userName: string = 'Sistema') => {
    // Prepare data for Supabase - send objects directly for JSONB columns
    const sanitizedData = {
        name: data.name || '',
        warranty_term: data.warrantyTerm || null,
        warranty_exclusions: data.warrantyExclusions || null,
        image_rights: data.imageRights || null,
    };

    const { data: newItem, error } = await supabase.from('receipt_terms').insert([sanitizedData]).select().single();
    if (error) {
        console.error('Error adding receipt term:', error);
        throw error;
    }
    await addAuditLog(
        AuditActionType.CREATE,
        AuditEntityType.PRODUCT, // No specific entity for terms yet, using PRODUCT as placeholder or system
        newItem.id,
        `Termo de recebimento adicionado: ${newItem.name}`,
        userId,
        userName
    );

    clearCache(['receipt_terms']);
    return newItem;
};

export const updateReceiptTerm = async (data: any, userId: string = 'system', userName: string = 'Sistema') => {
    const sanitizedData = {
        id: data.id,
        name: data.name || '',
        warranty_term: data.warrantyTerm || null,
        warranty_exclusions: data.warrantyExclusions || null,
        image_rights: data.imageRights || null,
    };

    const { data: updated, error } = await supabase.from('receipt_terms').update(sanitizedData).eq('id', data.id).select().single();
    if (error) {
        console.error('Error updating receipt term:', error);
        throw error;
    }
    await addAuditLog(
        AuditActionType.UPDATE,
        AuditEntityType.PRODUCT,
        data.id,
        `Termo de recebimento atualizado: ${updated.name}`,
        userId,
        userName
    );

    clearCache(['receipt_terms']);
    return updated; // Fixed
};

export const deleteReceiptTerm = (id: string, userId: string = 'system', userName: string = 'Sistema') => deleteItem('receipt_terms', id, 'receipt_terms', userId, userName);

const serializePaymentMethod = (data: any) => {
    const { type, active, config, ...rest } = data;
    const safeConfig = config || {};
    return {
        ...rest,
        config: {
            ...safeConfig,
            _meta_type: type || 'cash',
            _meta_active: active !== undefined ? active : true
        }
    };
};

const deserializePaymentMethod = (data: any) => {
    if (!data) return data;
    return {
        ...data,
        type: data.config?._meta_type || 'cash',
        active: data.config?._meta_active !== undefined ? data.config._meta_active : true
    };
};

export const getPaymentMethods = async () => {
    return fetchWithCache('payment_methods', async () => {
        return fetchWithRetry(async () => {
            const { data, error } = await supabase.from('payment_methods').select('*');
            if (error) throw error;
            return data;
        }).then(data => {
            if (!data || data.length === 0) {
                return [
                    { id: '1', name: 'Dinheiro', type: 'cash', active: true },
                    { id: '2', name: 'Pix', type: 'cash', active: true },
                    { id: '3', name: 'Cartão Débito', type: 'card', active: true },
                    { id: '4', name: 'Cartão Crédito', type: 'card', active: true },
                    { id: '5', name: 'Crediário', type: 'cash', active: true }
                ];
            }
            return data.map(deserializePaymentMethod);
        });
    });
};

export const addPaymentMethod = (data: any, userId?: string, userName?: string) => {
    const paymentMethod = serializePaymentMethod(data);
    if (!paymentMethod.id) {
        paymentMethod.id = crypto.randomUUID();
    }
    return addItem('payment_methods', paymentMethod, 'payment_methods', userId, userName);
};
export const updatePaymentMethod = (data: any, userId?: string, userName?: string) => updateItem('payment_methods', serializePaymentMethod(data), 'payment_methods', userId, userName);
export const deletePaymentMethod = (id: string, userId?: string, userName?: string) => deleteItem('payment_methods', id, 'payment_methods', userId, userName);

export const getProductConditions = () => getTable('product_conditions', 'product_conditions');
export const addProductCondition = (data: any, userId?: string, userName?: string) => addItem('product_conditions', data, 'product_conditions', userId, userName);
export const updateProductCondition = (data: any, userId?: string, userName?: string) => updateItem('product_conditions', data, 'product_conditions', userId, userName);
export const deleteProductCondition = (id: string, userId?: string, userName?: string) => deleteItem('product_conditions', id, 'product_conditions', userId, userName);

export const getStorageLocations = () => getTable('storage_locations', 'storage_locations');
export const addStorageLocation = (data: any, userId?: string, userName?: string) => addItem('storage_locations', data, 'storage_locations', userId, userName);
export const updateStorageLocation = (data: any, userId?: string, userName?: string) => updateItem('storage_locations', data, 'storage_locations', userId, userName);
export const deleteStorageLocation = (id: string, userId?: string, userName?: string) => deleteItem('storage_locations', id, 'storage_locations', userId, userName);

export const getWarranties = async () => {
    return fetchWithCache('warranties', async () => {
        const { data, error } = await supabase.from('warranties').select('*');
        if (error) throw error;
        return (data || []).map((w: any) => ({
            ...w,
            warrantyTerm: w.warranty_term
        }));
    });
};
export const addWarranty = (data: any, userId?: string, userName?: string) =>
    addItem('warranties', { name: data.name, warranty_term: data.warrantyTerm }, 'warranties', userId, userName);
export const updateWarranty = (data: any, userId?: string, userName?: string) =>
    updateItem('warranties', { id: data.id, name: data.name, warranty_term: data.warrantyTerm }, 'warranties', userId, userName);
export const deleteWarranty = (id: string, userId?: string, userName?: string) => deleteItem('warranties', id, 'warranties', userId, userName);

// --- COMPANY INFO ---

export const getCompanyInfo = async () => {
    return fetchWithCache('company_info', async () => {
        const { data, error } = await supabase.from('company_info').select('*').single();
        if (error) {
            return {};
        }
        return data;
    });
};

export const updateCompanyInfo = async (data: CompanyInfo, userId: string = 'system', userName: string = 'Sistema') => {
    const payload = { ...data } as any;

    if (!payload.id) {
        // Try to find existing record to update
        const { data: existing } = await supabase.from('company_info').select('id').limit(1).maybeSingle();
        if (existing) {
            payload.id = existing.id;
        } else {
            // If no record, generate new valid UUID
            payload.id = crypto.randomUUID();
        }
    }

    const { data: updated, error } = await supabase.from('company_info').upsert(payload).select().single();
    if (error) throw error;

    await addAuditLog(
        AuditActionType.UPDATE,
        AuditEntityType.USER, // Or a dynamic SYSTEM entity
        updated.id, // Use the ID from the updated record
        `Dados da empresa atualizados por ${userName}`,
        userId,
        userName
    );

    clearCache(['company_info']);
    window.dispatchEvent(new CustomEvent('companyInfoUpdated'));
    return updated;
};

// --- PURCHASE ORDERS ---

// Helper to map database row to TypeScript PurchaseOrder interface
const mapPurchaseOrder = (row: any): PurchaseOrder => {
    return {
        id: row.id,
        displayId: row.displayId || row.display_id,
        locatorId: row.locatorId || row.locator_id || '',
        purchaseDate: row.purchaseDate || row.purchase_date || row.createdAt || row.created_at || getNowISO(),
        origin: row.origin || 'Compra Nacional',
        purchaseTerm: row.purchaseTerm || row.purchase_term,
        supplierId: row.supplierId || row.supplier_id || '',
        supplierName: row.supplierName || row.supplier_name || '',
        items: (row.items || []).map((item: any) => ({
            ...item,
            id: item.id || crypto.randomUUID(),
        })),
        total: Number(row.total) || 0,
        additionalCost: Number(row.additionalCost || row.additional_cost) || 0,
        stockStatus: row.stockStatus || row.stock_status || 'Pendente',
        financialStatus: row.financialStatus || row.financial_status || 'Pendente',
        status: row.status,
        createdAt: row.createdAt || row.created_at || getNowISO(),
        createdBy: row.createdBy || row.created_by || 'Sistema',
        isCustomerPurchase: row.isCustomerPurchase || row.is_customer_purchase || false,
        observations: row.observations,
    };
};

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
    return fetchWithCache('purchase_orders', async () => {
        const { data, error } = await supabase.from('purchase_orders').select('*').order('createdAt', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapPurchaseOrder);
    });
};

export const addPurchaseOrder = async (data: any) => {
    const items = (data.items || []).map((item: any) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unitCost: Number(item.unitCost || 0),
        additionalUnitCost: Number(item.additionalUnitCost || 0),
        finalUnitCost: Number(item.finalUnitCost || 0),
    }));

    let observations = data.observations || '';
    if (data.purchaseTerm) {
        observations = observations ? `${observations} | Termo: ${data.purchaseTerm}` : `Termo: ${data.purchaseTerm}`;
    }

    // Generate displayId and locatorId
    const { count } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true });
    const displayId = (count || 0) + 1;
    const locatorId = `L${Date.now()}`;
    const now = getNowISO();

    // Convert purchaseDate from datetime-local format to proper ISO with timezone
    // The input comes as YYYY-MM-DDTHH:mm (local time), we need to handle it correctly
    let purchaseDateISO = now;
    if (data.purchaseDate) {
        // If purchaseDate doesn't have timezone info, assume it's in Brazil timezone (GMT-3)
        if (!data.purchaseDate.includes('Z') && !data.purchaseDate.includes('+') && !data.purchaseDate.includes('-', 10)) {
            // Append Brazil timezone offset
            purchaseDateISO = new Date(data.purchaseDate).toISOString();
        } else {
            purchaseDateISO = data.purchaseDate;
        }
    }

    // Include all fields needed for the purchase_orders table
    const poData: any = {
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        items,
        observations,
        status: data.status || 'Pendente',
        total: data.total || 0,
        additionalCost: data.additionalCost || 0,
        purchaseDate: purchaseDateISO,
        origin: data.origin || 'Compra Nacional',
        displayId,
        locatorId,
        stockStatus: data.stockStatus || 'Pendente',
        financialStatus: data.financialStatus || 'Pendente',
        createdAt: now,
        createdBy: data.createdBy || 'Sistema',
        isCustomerPurchase: data.isCustomerPurchase || false,
    };

    console.log("mockApi: Adding purchase order with payload:", poData);
    const { data: newPO, error } = await supabase.from('purchase_orders').insert([poData]).select().single();
    if (error) {
        console.error("Error adding purchase order:", JSON.stringify(error, null, 2));
        throw error;
    }
    clearCache(['purchase_orders']);
    return mapPurchaseOrder(newPO);
};

export const updatePurchaseOrder = async (data: any) => {
    console.log('mockApi: Starting updatePurchaseOrder', data);
    const { id, purchaseTerm, createdAt, displayId, locatorId, ...rest } = data; // Remove fields that shouldn't change or cause issues

    // Date handling similar to addPurchaseOrder
    let purchaseDateISO = rest.purchaseDate;
    if (purchaseDateISO) {
        if (!purchaseDateISO.includes('Z') && !purchaseDateISO.includes('+') && !purchaseDateISO.includes('T')) {
            // Handle if just date? Or if datetime-local format without timezone
            purchaseDateISO = new Date(purchaseDateISO).toISOString();
        } else if (purchaseDateISO.includes('T') && !purchaseDateISO.includes('Z') && !purchaseDateISO.includes('+') && !purchaseDateISO.slice(10).includes('-')) {
            // datetime-local format (YYYY-MM-DDTHH:mm)
            purchaseDateISO = new Date(purchaseDateISO).toISOString();
        }
    }

    const payload: any = {
        supplierId: rest.supplierId,
        supplierName: rest.supplierName,
        items: rest.items,
        observations: rest.observations,
        status: rest.status,
        total: rest.total,
        additionalCost: rest.additionalCost,
        purchaseDate: purchaseDateISO,
        origin: rest.origin,
        stockStatus: rest.stockStatus,
        financialStatus: rest.financialStatus,
        isCustomerPurchase: rest.isCustomerPurchase,
    };

    // Remove undefined
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data: updated, error } = await supabase.from('purchase_orders').update(payload).eq('id', id).select().single();
    if (error) {
        console.error("Error updating purchase order:", error);
        throw error;
    }
    clearCache(['purchase_orders']);
    // Return mapped object
    return {
        ...updated,
        displayId: updated.displayId || updated.display_id || displayId, // ensure we return consistent data
        locatorId: updated.locatorId || updated.locator_id || locatorId,
    };
    // Actually simpler to just return updated and let caller refetch if needed, 
    // but the app expects the updated record.
};

export const deletePurchaseOrder = async (id: string, userId: string = 'system', userName: string = 'Sistema') => {
    // Pegar infos da compra antes de deletar
    const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', id).single();

    // 1. Check if products associated with this PO have been sold
    const { data: productsInPo } = await supabase.from('products').select('id').eq('purchaseOrderId', id);

    if (productsInPo && productsInPo.length > 0) {
        const productIds = productsInPo.map(p => p.id);

        // Fetch sales to see if any contain these products
        const { data: sales } = await supabase.from('sales').select('items');

        const isSold = sales?.some((sale: any) =>
            sale.items && Array.isArray(sale.items) && sale.items.some((item: any) => productIds.includes(item.productId))
        );

        if (isSold) {
            throw new Error("Alguns itens desta compra já foram vendidos. Não é possível excluir a compra.");
        }

        // 2. If not sold, delete the products (revert stock)
        const { error: deleteProdError } = await supabase.from('products').delete().eq('purchaseOrderId', id);
        if (deleteProdError) throw deleteProdError;
    }

    // 3. Delete the Purchase Order
    const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
    if (error) throw error;

    if (po) {
        await addAuditLog(
            AuditActionType.DELETE,
            AuditEntityType.PURCHASE_ORDER,
            id,
            `Compra excluída: #${po.displayId} - Fornecedor: ${po.supplierName} | Total: ${formatCurrency(po.total)}`,
            userId,
            userName
        );
    }

    clearCache(['purchase_orders', 'products']);
};

export const updatePurchaseFinancialStatus = async (id: string) => {
    const { data: po } = await supabase.from('purchase_orders').select('financialStatus').eq('id', id).single();
    if (po) {
        const newStatus = po.financialStatus === 'Pendente' ? 'Pago' : 'Pendente';
        const { data: updated } = await supabase.from('purchase_orders').update({ financialStatus: newStatus }).eq('id', id).select().single();
        clearCache(['purchase_orders']);
        return updated;
    }
};

export const revertPurchaseLaunch = async (id: string) => {
    await supabase.from('purchase_orders').update({ stockStatus: 'Pendente' }).eq('id', id);
    await supabase.from('products').delete().eq('purchaseOrderId', id);
    clearCache(['purchase_orders', 'products']);
};

export const launchPurchaseToStock = async (purchaseOrderId: string, products: any[]) => {
    console.log('[launchPurchaseToStock] STARTING. Products:', products.length);

    const now = getNowISO();

    // STEP 1: Get purchase order info (with timeout)
    console.log('[STEP 1] Fetching purchase order...');
    let purchaseOrder: any = null;
    let poError: any = null;

    try {
        const poQuery = supabase.from('purchase_orders').select('displayId, createdBy, supplierId').eq('id', purchaseOrderId).single();
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_PO')), 10000));

        const result = await Promise.race([poQuery, timeout]) as any;
        purchaseOrder = result.data;
        poError = result.error;
    } catch (e: any) {
        if (e.message === 'TIMEOUT_PO') {
            console.error('[STEP 1] TIMEOUT! Supabase not responding.');
            throw new Error('O banco de dados não está respondendo. Verifique sua conexão com a internet e o status do Supabase.');
        }
        throw e;
    }
    console.log('[STEP 1] Done. PO:', purchaseOrder?.displayId, 'Error:', poError?.message);

    const displayId = purchaseOrder?.displayId || '???';
    const createdBy = purchaseOrder?.createdBy || 'Sistema';

    // STEP 2: Get current SKU count
    console.log('[STEP 2] Getting SKU count...');
    const { count, error: countError } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log('[STEP 2] Done. Count:', count, 'Error:', countError?.message);
    let currentSkuCount = count || 0;

    const productsToInsert: any[] = [];
    const productsToReactivate: any[] = [];
    const blockedProducts: string[] = [];

    // STEP 3: Process each product
    console.log('[STEP 3] Processing products...');
    for (const p of products) {
        const imei1 = p.imei1 || null;
        const imei2 = p.imei2 || null;
        const serialNumber = p.serialNumber || null;

        let existingProduct = null;

        // Search for existing product by IMEI or Serial
        if (imei1 || imei2 || serialNumber) {
            console.log(`[STEP 3a] Searching for existing product: IMEI=${imei1}, Serial=${serialNumber}`);

            // Build the query conditions dynamically
            const orConditions = [];
            if (imei1) orConditions.push(`imei1.eq.${imei1}`, `imei2.eq.${imei1}`);
            if (imei2) orConditions.push(`imei1.eq.${imei2}`, `imei2.eq.${imei2}`);
            if (serialNumber) orConditions.push(`serialNumber.eq.${serialNumber}`);

            if (orConditions.length > 0) {
                const { data: found, error: searchError } = await supabase
                    .from('products')
                    .select('id, imei1, serialNumber, stock, stockHistory')
                    .or(orConditions.join(','))
                    .limit(1)
                    .maybeSingle();

                console.log(`[STEP 3a] Search result:`, found ? `Found ID=${found.id}, stock=${found.stock}` : 'Not found', searchError?.message || '');
                existingProduct = found;
            }
        }

        if (existingProduct) {
            if (existingProduct.stock > 0) {
                // ❌ BLOCK: Product is currently in stock (real duplicate)
                console.log(`[launchPurchaseToStock] BLOCKED: ${imei1 || serialNumber} already in stock`);
                blockedProducts.push(imei1 || imei2 || serialNumber || 'unknown');
            } else {
                // ✅ REACTIVATE: Product was sold, now being repurchased
                console.log(`[launchPurchaseToStock] REACTIVATE: ${imei1 || serialNumber} (was sold, now repurchased)`);

                // Build new stock history entry
                const newStockHistoryEntry = {
                    id: crypto.randomUUID(),
                    oldStock: 0,
                    newStock: p.stock || 1,
                    adjustment: p.stock || 1,
                    reason: 'Recompra',
                    relatedId: purchaseOrderId,
                    timestamp: now,
                    changedBy: createdBy,
                    details: `Recompra via Compra #${displayId}`
                };

                const existingHistory = existingProduct.stockHistory || [];

                productsToReactivate.push({
                    id: existingProduct.id,
                    updates: {
                        stock: p.stock || 1,
                        costPrice: p.costPrice,
                        price: p.price,
                        wholesalePrice: p.wholesalePrice,
                        condition: p.condition,
                        storageLocation: p.storageLocation,
                        purchaseOrderId: purchaseOrderId,
                        updatedAt: now,
                        stockHistory: [...existingHistory, newStockHistoryEntry]
                    }
                });
            }
        } else {
            // ✅ NEW: Product doesn't exist, create it
            currentSkuCount++;

            const { stockHistory, priceHistory, purchaseItemId, ...productDataWithoutHistory } = p;

            const initialStockHistory = [{
                id: crypto.randomUUID(),
                oldStock: 0,
                newStock: p.stock || 1,
                adjustment: p.stock || 1,
                reason: 'Lançamento de Compra',
                relatedId: purchaseOrderId,
                timestamp: now,
                changedBy: createdBy,
                details: `Compra #${displayId}`
            }];

            productsToInsert.push({
                ...productDataWithoutHistory,
                imei1: imei1 || null,
                imei2: imei2 || null,
                serialNumber: serialNumber || null,
                purchaseOrderId,
                createdAt: now,
                updatedAt: now,
                sku: p.sku || `#${currentSkuCount}`,
                stockHistory: initialStockHistory,
                priceHistory: []
            });
        }
    }

    // Check if all products were blocked
    if (blockedProducts.length === products.length) {
        throw new Error(`Todos os produtos já estão em estoque: ${blockedProducts.join(', ')}`);
    }

    // Execute REACTIVATIONS
    if (productsToReactivate.length > 0) {
        console.log(`[launchPurchaseToStock] Reactivating ${productsToReactivate.length} products...`);
        for (const { id, updates } of productsToReactivate) {
            await supabase.from('products').update(updates).eq('id', id);
        }
    }

    // Execute INSERTS
    if (productsToInsert.length > 0) {
        console.log(`[launchPurchaseToStock] Inserting ${productsToInsert.length} new products...`);
        const { error: insertError } = await supabase.from('products').insert(productsToInsert);
        if (insertError) {
            console.error('[launchPurchaseToStock] Insert error:', insertError);
            throw insertError;
        }
    }

    console.log('[launchPurchaseToStock] SUCCESS!');
    console.log(`  - Reactivated: ${productsToReactivate.length}`);
    console.log(`  - New: ${productsToInsert.length}`);
    console.log(`  - Blocked: ${blockedProducts.length}`);

    // Update purchase order status
    await supabase.from('purchase_orders').update({ stockStatus: 'Lançado' }).eq('id', purchaseOrderId);
    clearCache(['products', 'purchase_orders']);
};

// --- AUDIT ---

export const getAuditLogs = async (): Promise<AuditLog[]> => {
    return fetchWithCache('audit_logs', async () => {
        const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
        if (error) throw error;
        return data || [];
    });
};

// --- BACKUP & RESTORE ---

const BACKUP_TABLES = [
    'permissions_profiles',
    'users',
    'brands',
    'categories',
    'product_models',
    'grades',
    'grade_values',
    'suppliers',
    'customers',
    'purchase_orders',
    'products',
    'sales',
    'cash_sessions',
    'product_conditions',
    'storage_locations',
    'warranties',
    'payment_methods',
    'receipt_terms',
    'company_info',
    'audit_logs'
];

export const getFullBackup = async () => {
    const backupData: Record<string, any[]> = {};

    for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
            console.error(`Error backing up table ${table}:`, error);
            throw error;
        }
        backupData[table] = data || [];
    }

    return backupData;
};

export const restoreFullBackup = async (backupData: Record<string, any[]>, userId: string, userName: string) => {
    // 1. Validate - check if all keys exist
    for (const table of BACKUP_TABLES) {
        if (!Array.isArray(backupData[table])) {
            throw new Error(`O arquivo de backup é inválido ou está corrompido (tabela ${table} ausente).`);
        }
    }

    // 2. Clear all tables in order (to handle constraints)
    // Deleting in reverse order of dependencies is usually safer
    const tablesToDelete = [...BACKUP_TABLES].reverse();

    for (const table of tablesToDelete) {
        // Use 'id' for most tables, 'name' for others like company_info
        const filterField = table === 'company_info' ? 'name' : 'id';
        const { error } = await supabase.from(table).delete().neq(filterField, '00000000-0000-0000-0000-000000000000');
        if (error) {
            console.error(`Error clearing table ${table}:`, error);
        }
    }

    // 3. Restore data
    for (const table of BACKUP_TABLES) {
        if (backupData[table].length > 0) {
            const { error } = await supabase.from(table).insert(backupData[table]);
            if (error) {
                console.error(`Error restoring table ${table}:`, error);
                throw new Error(`Erro ao restaurar a tabela ${table}: ${error.message}`);
            }
        }
    }

    // 4. Audit the restore
    await addAuditLog(
        AuditActionType.UPDATE,
        AuditEntityType.USER,
        userId,
        'Sistema restaurado a partir de backup completo.',
        userId,
        userName
    );

    // 5. Clear all caches
    clearCache(Object.keys(cache)); // Use current cache keys
    // Since cache is local to the module, we can just clear it if we export a way
};

