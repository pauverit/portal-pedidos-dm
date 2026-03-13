import { useEmpresaData } from './useEmpresaData';
import { Empresa } from '../types';

interface UseEmpresaReturn {
  empresa: Empresa | null;
  loading: boolean;
  error: string | null;
}

export function useEmpresa(): UseEmpresaReturn {
  const { empresas, loading, error } = useEmpresaData();
  return { empresa: empresas[0] ?? null, loading, error };
}
