import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Factura, DocumentoLinea, Empresa, VerifactuRegistro } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ClienteData {
  nombre?: string;
  razonSocial?: string;
  cif?: string;
  direccion?: string;
  cp?: string;
  ciudad?: string;
}

interface FacturaPDFViewProps {
  facturaId: string;
  onClose?: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const FacturaPDFView: React.FC<FacturaPDFViewProps> = ({ facturaId, onClose }) => {
  const [factura, setFactura] = useState<Factura | null>(null);
  const [lineas, setLineas] = useState<DocumentoLinea[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [verifactu, setVerifactu] = useState<VerifactuRegistro | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Cargar factura
      const { data: fac } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', facturaId)
        .single();
      if (!fac) { setLoading(false); return; }
      setFactura(fac as unknown as Factura);

      // Cargar líneas
      const { data: lns } = await supabase
        .from('factura_lineas')
        .select('*')
        .eq('factura_id', facturaId)
        .order('orden');
      setLineas((lns || []) as unknown as DocumentoLinea[]);

      // Cargar empresa
      if (fac.empresa_id) {
        const { data: emp } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', fac.empresa_id)
          .single();
        if (emp) setEmpresa(emp as unknown as Empresa);
      }

      // Cargar datos del cliente
      if (fac.cliente_id) {
        const { data: cli } = await supabase
          .from('clients')
          .select('name, cif, address, cp, city')
          .eq('id', fac.cliente_id)
          .single();
        if (cli) {
          const c = cli as Record<string, string>;
          setCliente({ nombre: c.name, cif: c.cif, direccion: c.address, cp: c.cp, ciudad: c.city });
        }
      }

      // Cargar registro VeriFactu
      const { data: vr } = await supabase
        .from('verifactu_registros')
        .select('*')
        .eq('factura_id', facturaId)
        .single();
      if (vr) {
        setVerifactu({
          id: vr.id,
          facturaId: vr.factura_id,
          empresaId: vr.empresa_id,
          numRegistro: Number(vr.num_registro),
          nifEmisor: vr.nif_emisor,
          numSerie: vr.num_serie,
          fechaFactura: vr.fecha_factura,
          tipoFactura: vr.tipo_factura,
          cuotaTotal: Number(vr.cuota_total),
          importeTotal: Number(vr.importe_total),
          hashAnterior: vr.hash_anterior,
          hashActual: vr.hash_actual,
          qrUrl: vr.qr_url,
          fechaRegistro: vr.fecha_registro,
          estadoEnvio: vr.estado_envio,
        });
      }

      setLoading(false);
    };
    fetchData();
  }, [facturaId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Cargando factura…</div>
  );
  if (!factura) return (
    <div className="p-6 text-red-500">Factura no encontrada</div>
  );

  return (
    <div className="bg-gray-100 min-h-screen py-6 px-4 print:bg-white print:py-0 print:px-0">
      {/* Controles (se ocultan al imprimir) */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center print:hidden">
        <h2 className="text-base font-semibold text-slate-700">Vista previa de factura</h2>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Imprimir / Guardar PDF
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-sm rounded-lg hover:bg-slate-50"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      {/* Documento factura */}
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none">
        <div className="p-8 print:p-6">

          {/* Cabecera */}
          <div className="flex justify-between items-start mb-8">
            {/* Datos emisor */}
            <div className="max-w-xs">
              {empresa?.logoUrl && (
                <img src={empresa.logoUrl} alt={empresa.nombre} className="h-12 mb-3 object-contain" />
              )}
              <div className="font-bold text-base text-slate-900">{empresa?.razonSocial || empresa?.nombre}</div>
              <div className="text-sm text-slate-600 mt-0.5">CIF: {empresa?.cif}</div>
              {empresa?.direccion && <div className="text-sm text-slate-500">{empresa.direccion}</div>}
              {(empresa?.cp || empresa?.ciudad) && (
                <div className="text-sm text-slate-500">{empresa?.cp} {empresa?.ciudad}</div>
              )}
              {empresa?.telefono && <div className="text-sm text-slate-500">Tel: {empresa.telefono}</div>}
              {empresa?.email && <div className="text-sm text-slate-500">{empresa.email}</div>}
            </div>

            {/* Número y fecha */}
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">FACTURA</div>
              <div className="text-base font-semibold text-blue-700 mt-1">{factura.referencia}</div>
              <div className="text-sm text-slate-600 mt-1">Fecha: {fmtDate(factura.fecha)}</div>
              {factura.fechaVencimiento && (
                <div className="text-sm text-slate-500">Vence: {fmtDate(factura.fechaVencimiento)}</div>
              )}
              <div className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                factura.estado === 'cobrada' ? 'bg-green-100 text-green-700' :
                factura.estado === 'cancelada' ? 'bg-red-100 text-red-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                {factura.estado.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Datos cliente */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Cliente / Destinatario</div>
            <div className="font-semibold text-slate-900">{cliente?.nombre || factura.clienteNombre || '—'}</div>
            {cliente?.cif && <div className="text-sm text-slate-600">CIF/NIF: {cliente.cif}</div>}
            {cliente?.direccion && <div className="text-sm text-slate-500">{cliente.direccion}</div>}
            {(cliente?.cp || cliente?.ciudad) && (
              <div className="text-sm text-slate-500">{cliente?.cp} {cliente?.ciudad}</div>
            )}
          </div>

          {/* Líneas */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-right w-16">Cant.</th>
                <th className="px-3 py-2 text-right w-24">Precio ud.</th>
                <th className="px-3 py-2 text-right w-16">Dto %</th>
                <th className="px-3 py-2 text-right w-20">IVA %</th>
                <th className="px-3 py-2 text-right w-24">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 text-slate-800">{l.descripcion}</td>
                  <td className="px-3 py-2 text-right">{l.cantidad}</td>
                  <td className="px-3 py-2 text-right">{fmt(l.precioUnitario)}</td>
                  <td className="px-3 py-2 text-right">{l.descuento > 0 ? `${l.descuento}%` : '—'}</td>
                  <td className="px-3 py-2 text-right">{l.ivaPorcentaje}%</td>
                  <td className="px-3 py-2 text-right font-medium">{fmt(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{fmt(factura.subtotal)}</span>
              </div>
              {factura.descuentoGlobal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Descuento global ({factura.descuentoGlobal}%)</span>
                  <span className="text-red-600">-{fmt(factura.subtotal * factura.descuentoGlobal / 100)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Base imponible</span>
                <span>{fmt(factura.baseImponible)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA ({factura.ivaPorcentaje}%)</span>
                <span>{fmt(factura.iva)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-slate-900 border-t border-slate-300 pt-2 mt-2">
                <span>TOTAL</span>
                <span className="text-blue-700">{fmt(factura.total)}</span>
              </div>
            </div>
          </div>

          {/* Datos de cobro */}
          {factura.estado === 'cobrada' && factura.fechaCobro && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6 text-sm">
              <span className="font-medium text-green-800">Factura cobrada</span>
              <span className="text-green-700 ml-2">
                el {fmtDate(factura.fechaCobro)}
                {factura.metodoCobro && ` · ${factura.metodoCobro}`}
              </span>
            </div>
          )}

          {/* Datos bancarios del emisor */}
          {empresa?.iban && (
            <div className="border-t border-slate-200 pt-4 mb-6 text-sm">
              <span className="text-slate-500">Datos bancarios: </span>
              <span className="font-mono text-slate-800">{empresa.iban}</span>
            </div>
          )}

          {/* Notas */}
          {factura.notas && (
            <div className="bg-slate-50 rounded-lg p-3 mb-6 text-sm text-slate-600">
              <div className="font-medium text-slate-700 mb-1">Notas:</div>
              {factura.notas}
            </div>
          )}

          {/* Footer VeriFactu */}
          <div className="border-t border-slate-200 pt-4 flex items-start justify-between gap-4">
            <div className="flex-1 text-xs text-slate-500 space-y-1">
              <div className="font-medium text-slate-700 text-sm">
                Factura verificable · VeriFactu AEAT
              </div>
              {verifactu ? (
                <>
                  <div>Núm. registro: <span className="font-mono">{verifactu.numRegistro}</span></div>
                  <div>Hash: <span className="font-mono break-all text-[10px]">{verifactu.hashActual}</span></div>
                  <div className="text-[10px] text-slate-400">
                    Fecha registro: {new Date(verifactu.fechaRegistro).toLocaleString('es-ES')}
                  </div>
                </>
              ) : (
                <div className="text-amber-600 text-xs">
                  Factura pendiente de registro en VeriFactu
                </div>
              )}
            </div>

            {/* QR VeriFactu */}
            {verifactu?.qrUrl && (
              <div className="flex flex-col items-center gap-1 shrink-0">
                <QRCodeSVG
                  value={verifactu.qrUrl}
                  size={80}
                  level="M"
                  includeMargin={false}
                />
                <span className="text-[9px] text-slate-400 text-center">Verificar en AEAT</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
