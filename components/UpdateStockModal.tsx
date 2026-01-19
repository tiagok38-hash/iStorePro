import React, { useState } from 'react';
import { Product } from '../../types.ts';
import { PlusIcon, MinusIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';

interface UpdateStockModalProps {
  product: Product;
  onClose: () => void;
  onSave: (product: Product, newStock: number) => void;
}

const UpdateStockModal: React.FC<UpdateStockModalProps> = ({ product, onClose, onSave }) => {
  const [adjustment, setAdjustment] = useState(0);
  const { showToast } = useToast();

  const newStock = product.stock + adjustment;
  const isUniqueProduct = !!(product.serialNumber || product.imei1 || product.imei2);
  const isInvalidStock = isUniqueProduct && newStock > 1;

  const handleSave = () => {
    if (isInvalidStock) {
      showToast('Produtos únicos (com IMEI/Nº de Série) não podem ter estoque maior que 1.', 'error');
      return;
    }
    onSave(product, newStock);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-primary mb-2">Ajustar Estoque</h2>
        <p className="text-muted mb-6">{product.model}</p>

        <div className="flex items-center justify-center gap-4 my-4">
          <div>
            <p className="text-sm text-center text-muted">Estoque Atual</p>
            <p className="text-4xl font-bold text-center">{product.stock}</p>
          </div>
          <div className="text-4xl font-light text-muted">+</div>
          <div>
            <p className="text-sm text-center text-muted">Ajuste</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setAdjustment(adj => adj - 1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"><MinusIcon className="h-5 w-5" /></button>
              <input type="number" value={adjustment} onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)} className="w-20 text-center p-2 border rounded bg-transparent border-border text-4xl font-bold" />
              <button onClick={() => setAdjustment(adj => adj + 1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"><PlusIcon className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="text-4xl font-light text-muted">=</div>
          <div>
            <p className="text-sm text-center text-muted">Novo Estoque</p>
            <p className={`text-4xl font-bold text-center ${newStock < 0 ? 'text-danger' : 'text-primary'}`}>{newStock}</p>
          </div>
        </div>
        {isInvalidStock && (
          <p className="text-center text-sm text-danger mt-2">Produtos únicos não podem ter estoque maior que 1.</p>
        )}

        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger/90"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 disabled:bg-muted disabled:cursor-not-allowed"
            disabled={newStock < 0 || adjustment === 0 || isInvalidStock}
            title={isInvalidStock ? 'Produtos únicos não podem ter estoque maior que 1.' : ''}
          >
            Confirmar Ajuste
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateStockModal;