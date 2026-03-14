import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MandatoSEPA, RemesaSEPA, RemesaLinea } from '../types';

function mapMandato(r: any): MandatoSEPA {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    clienteId: r.cliente_id,
    clienteNombre: r.cliente_nombre,
    referencia: r.referencia,
    tipo: r.tipo,
    ibanDeudor: r.iban_deudor,
    bicDeudor: r.bic_deudor,
    secuencia: r.secuencia,
    fechaFirma: r.fecha_firma,
    estado: r.estado,
    notas: r.notas,
    createdAt: r.created_at,
  };
}

function mapRemesa(r: any): RemesaSEPA {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    nombre: r.nombre,
    fechaCreacion: r.fecha_creacion,
    fechaCobro: r.fecha_cobro,
    estado: r.estado,
    numOperaciones: r.num_operaciones ?? 0,
    importeTotal: Number(r.importe_total ?? 0),
    mensajeId: r.mensaje_id,
    xmlGenerado: r.xml_generado,
    notas: r.notas,
    createdAt: r.created_at,
    lineasAceptadas: r.lineas_aceptadas,
    lineasDevueltas: r.lineas_devueltas,
    lineasPendientes: r.lineas_pendientes,
  };
}

function mapLinea(r: any): RemesaLinea {
  return {
    id: r.id,
    remesaId: r.remesa_id,
    mandatoId: r.mandato_id,
    facturaId: r.factura_id,
    clienteNombre: r.cliente_nombre,
    ibanDeudor: r.iban_deudor,
    bicDeudor: r.bic_deudor,
    referenciaMandato: r.referencia_mandato,
    fechaFirmaMandato: r.fecha_firma_mandato,
    secuencia: r.secuencia,
    concepto: r.concepto,
    importe: Number(r.importe ?? 0),
    estado: r.estado,
    motivoDevolucion: r.motivo_devolucion,
  };
}

export function useRemesasSEPA(empresaId: string | undefined) {
  const [mandatos, setMandatos] = useState<MandatoSEPA[]>([]);
  const [remesas, setRemesas]   = useState<RemesaSEPA[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── Mandatos ────────────────────────────────────────────────────────────────

  const loadMandatos = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('mandatos_sepa')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('cliente_nombre');
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMandatos((data || []).map(mapMandato));
  }, [empresaId]);

  const createMandato = async (m: Omit<MandatoSEPA, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('mandatos_sepa').insert({
      empresa_id:     m.empresaId,
      cliente_id:     m.clienteId || null,
      cliente_nombre: m.clienteNombre,
      referencia:     m.referencia,
      tipo:           m.tipo,
      iban_deudor:    m.ibanDeudor,
      bic_deudor:     m.bicDeudor || null,
      secuencia:      m.secuencia,
      fecha_firma:    m.fechaFirma,
      estado:         m.estado,
      notas:          m.notas || null,
    });
    if (error) throw new Error(error.message);
    await loadMandatos();
  };

  const updateMandato = async (id: string, changes: Partial<MandatoSEPA>) => {
    const dbRow: Record<string, any> = {};
    if (changes.clienteNombre !== undefined) dbRow.cliente_nombre = changes.clienteNombre;
    if (changes.ibanDeudor    !== undefined) dbRow.iban_deudor    = changes.ibanDeudor;
    if (changes.bicDeudor     !== undefined) dbRow.bic_deudor     = changes.bicDeudor;
    if (changes.secuencia     !== undefined) dbRow.secuencia      = changes.secuencia;
    if (changes.estado        !== undefined) dbRow.estado         = changes.estado;
    if (changes.notas         !== undefined) dbRow.notas          = changes.notas;
    dbRow.updated_at = new Date().toISOString();
    const { error } = await supabase.from('mandatos_sepa').update(dbRow).eq('id', id);
    if (error) throw new Error(error.message);
    await loadMandatos();
  };

  // ── Remesas ─────────────────────────────────────────────────────────────────

  const loadRemesas = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('remesas_resumen')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_cobro', { ascending: false });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setRemesas((data || []).map(mapRemesa));
  }, [empresaId]);

  const createRemesa = async (r: { nombre: string; fechaCobro: string; notas?: string }) => {
    const { data, error } = await supabase
      .from('remesas_sepa')
      .insert({
        empresa_id:  empresaId,
        nombre:      r.nombre,
        fecha_cobro: r.fechaCobro,
        notas:       r.notas || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await loadRemesas();
    return data.id as string;
  };

  const getLineas = async (remesaId: string): Promise<RemesaLinea[]> => {
    const { data, error } = await supabase
      .from('remesa_lineas')
      .select('*')
      .eq('remesa_id', remesaId)
      .order('cliente_nombre');
    if (error) throw new Error(error.message);
    return (data || []).map(mapLinea);
  };

  const addLinea = async (remesaId: string, linea: Omit<RemesaLinea, 'id' | 'remesaId' | 'estado'>) => {
    const { error } = await supabase.from('remesa_lineas').insert({
      remesa_id:          remesaId,
      mandato_id:         linea.mandatoId || null,
      factura_id:         linea.facturaId || null,
      cliente_nombre:     linea.clienteNombre,
      iban_deudor:        linea.ibanDeudor,
      bic_deudor:         linea.bicDeudor || null,
      referencia_mandato: linea.referenciaMandato,
      fecha_firma_mandato: linea.fechaFirmaMandato,
      secuencia:          linea.secuencia,
      concepto:           linea.concepto,
      importe:            linea.importe,
    });
    if (error) throw new Error(error.message);
  };

  const añadirFacturasPendientes = async (remesaId: string): Promise<number> => {
    const { data, error } = await supabase
      .rpc('añadir_facturas_a_remesa', { p_remesa_id: remesaId });
    if (error) throw new Error(error.message);
    await loadRemesas();
    return data as number;
  };

  const generarXML = async (remesaId: string): Promise<string> => {
    const { data, error } = await supabase
      .rpc('generar_xml_sepa', { p_remesa_id: remesaId });
    if (error) throw new Error(error.message);
    await loadRemesas();
    return data as string;
  };

  const registrarDevolucion = async (lineaId: string, motivo: string = 'MD01') => {
    const { error } = await supabase
      .rpc('registrar_devolucion_sepa', { p_linea_id: lineaId, p_motivo: motivo });
    if (error) throw new Error(error.message);
  };

  const updateEstadoRemesa = async (remesaId: string, estado: string) => {
    const { error } = await supabase
      .from('remesas_sepa')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', remesaId);
    if (error) throw new Error(error.message);
    await loadRemesas();
  };

  const deleteLinea = async (lineaId: string) => {
    const { error } = await supabase.from('remesa_lineas').delete().eq('id', lineaId);
    if (error) throw new Error(error.message);
  };

  return {
    mandatos, remesas, loading, error,
    loadMandatos, createMandato, updateMandato,
    loadRemesas, createRemesa,
    getLineas, addLinea, deleteLinea,
    añadirFacturasPendientes, generarXML, registrarDevolucion,
    updateEstadoRemesa,
  };
}
