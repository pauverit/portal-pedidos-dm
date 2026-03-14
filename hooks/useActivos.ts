import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Activo, Incident, WorkOrder } from '../types';

// ─── Mappers ──────────────────────────────────────────────────────────────────

const mapActivo = (r: any): Activo => ({
  id:                   r.id,
  numeroActivo:         r.numero_activo,
  nombre:               r.nombre,
  empresaId:            r.empresa_id,
  clientId:             r.client_id,
  clientName:           r.cliente_nombre || r.client_name,
  clienteEmpresa:       r.cliente_empresa,
  brand:                r.marca || r.brand,
  model:                r.modelo || r.model,
  serialNumber:         r.numero_serie || r.serial_number,
  status:               r.estado || r.status,
  installDate:          r.fecha_instalacion || r.install_date,
  warrantyExpires:      r.garantia_hasta || r.warranty_expires,
  ubicacion:            r.ubicacion,
  notes:                r.notas || r.notes,
  createdAt:            r.created_at,
  updatedAt:            r.updated_at,
  incidenciasAbiertas:  r.incidencias_abiertas != null ? Number(r.incidencias_abiertas) : 0,
  otAbiertas:           r.ot_abiertas != null ? Number(r.ot_abiertas) : 0,
});

const mapIncident = (r: any): Incident => ({
  id:              r.id,
  reference:       r.reference,
  clientId:        r.client_id,
  machineId:       r.machine_id,
  description:     r.description,
  status:          r.status,
  severity:        r.severity,
  assignedTo:      r.assigned_to,
  assignedToName:  r.assigned_to_name,
  createdAt:       r.created_at,
  closedAt:        r.closed_at,
});

const mapWorkOrder = (r: any): WorkOrder => ({
  id:             r.id,
  reference:      r.reference,
  incidentId:     r.incident_id,
  machineId:      r.machine_id,
  clientId:       r.client_id,
  technicianId:   r.technician_id,
  technicianName: r.technician_name,
  scheduledDate:  r.scheduled_date,
  startDate:      r.start_date,
  endDate:        r.end_date,
  status:         r.status,
  diagnosis:      r.diagnosis,
  resolution:     r.resolution,
  hoursWorked:    r.hours_worked ? Number(r.hours_worked) : undefined,
  materialsCost:  Number(r.materials_cost ?? 0),
  laborCost:      Number(r.labor_cost ?? 0),
  rappelDiscount: Number(r.rappel_discount ?? 0),
  total:          Number(r.total ?? 0),
  createdAt:      r.created_at,
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useActivos() {
  const [activos,  setActivos]  = useState<Activo[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  /**
   * Carga todos los activos desde v_activos_cliente (vista de PASO 13).
   * Fallback a machines si la vista no existe.
   */
  const loadActivos = useCallback(async () => {
    setLoading(true);
    setError(null);
    let { data, error: err } = await supabase
      .from('v_activos_cliente')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) {
      // Fallback a tabla machines base
      const fb = await supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false });
      data = fb.data || [];
    }
    setLoading(false);
    if (data) setActivos(data.map(mapActivo));
  }, []);

  /**
   * Carga el detalle completo de un activo: atributos + incidencias + OTs.
   */
  const loadActivoDetalle = useCallback(async (activoId: string): Promise<Activo | null> => {
    // Activo base
    let { data: m } = await supabase
      .from('v_activos_cliente')
      .select('*')
      .eq('id', activoId)
      .single();

    if (!m) {
      const fb = await supabase.from('machines').select('*').eq('id', activoId).single();
      m = fb.data;
    }
    if (!m) return null;

    // Incidencias
    const { data: incs } = await supabase
      .from('incidents')
      .select('*')
      .eq('machine_id', activoId)
      .order('created_at', { ascending: false });

    // Órdenes de trabajo
    const { data: wos } = await supabase
      .from('work_orders')
      .select('*')
      .eq('machine_id', activoId)
      .order('created_at', { ascending: false });

    return {
      ...mapActivo(m),
      incidents:  (incs  || []).map(mapIncident),
      workOrders: (wos   || []).map(mapWorkOrder),
    };
  }, []);

  /**
   * Crea un nuevo activo (máquina de cliente).
   */
  const createActivo = useCallback(async (
    data: {
      clientId: string;
      nombre?: string;
      brand?: string;
      model?: string;
      serialNumber?: string;
      installDate?: string;
      warrantyExpires?: string;
      ubicacion?: string;
      notes?: string;
      empresaId?: string;
    }
  ): Promise<Activo | null> => {
    const row = {
      client_id:       data.clientId,
      nombre:          data.nombre || null,
      brand:           data.brand || null,
      model:           data.model || null,
      serial_number:   data.serialNumber || '',
      install_date:    data.installDate || null,
      warranty_expires: data.warrantyExpires || null,
      ubicacion:       data.ubicacion || null,
      notes:           data.notes || null,
      empresa_id:      data.empresaId || null,
      status:          'active',
    };
    const { data: created, error: err } = await supabase
      .from('machines')
      .insert(row)
      .select()
      .single();
    if (err || !created) { setError(err?.message || 'Error'); return null; }
    await loadActivos();
    return mapActivo(created);
  }, [loadActivos]);

  /**
   * Actualiza campos de un activo.
   */
  const updateActivo = useCallback(async (
    id: string,
    data: Partial<{
      nombre: string; brand: string; model: string; serialNumber: string;
      status: 'active' | 'inactive' | 'decommissioned';
      installDate: string; warrantyExpires: string;
      ubicacion: string; notes: string; empresaId: string;
    }>
  ) => {
    const row: any = { updated_at: new Date().toISOString() };
    if (data.nombre         !== undefined) row.nombre           = data.nombre;
    if (data.brand          !== undefined) row.brand            = data.brand;
    if (data.model          !== undefined) row.model            = data.model;
    if (data.serialNumber   !== undefined) row.serial_number    = data.serialNumber;
    if (data.status         !== undefined) row.status           = data.status;
    if (data.installDate    !== undefined) row.install_date     = data.installDate;
    if (data.warrantyExpires !== undefined) row.warranty_expires = data.warrantyExpires;
    if (data.ubicacion      !== undefined) row.ubicacion        = data.ubicacion;
    if (data.notes          !== undefined) row.notes            = data.notes;
    if (data.empresaId      !== undefined) row.empresa_id       = data.empresaId;
    const { error: err } = await supabase.from('machines').update(row).eq('id', id);
    if (err) { setError(err.message); return; }
    await loadActivos();
  }, [loadActivos]);

  return {
    activos, loading, error,
    loadActivos, loadActivoDetalle,
    createActivo, updateActivo,
  };
}
