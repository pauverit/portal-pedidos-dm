-- ════════════════════════════════════════════════════════════════════════════
-- PASO 17 — Conciliación Bancaria + Tesorería
-- Ejecutar en Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ─── TABLA: cuentas_bancarias ─────────────────────────────────────────────────
-- Una empresa puede tener N cuentas bancarias (corriente, ahorro, etc.)
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id   uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre       text NOT NULL,                    -- "Banco Santander — CTA Principal"
    iban         text,                             -- ES12 3456 7890 1234 5678 9012
    banco        text,                             -- "Santander", "BBVA", etc.
    moneda       text DEFAULT 'EUR',
    saldo_actual numeric(14,2) DEFAULT 0,          -- Saldo a día de hoy
    activa       boolean DEFAULT true,
    created_at   timestamptz DEFAULT now()
);

-- ─── TABLA: movimientos_bancarios ─────────────────────────────────────────────
-- Cada línea del extracto bancario (importado desde CSV/OFX o introducido manual)
CREATE TABLE IF NOT EXISTS movimientos_bancarios (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cuenta_id       uuid NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
    empresa_id      uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    fecha           date NOT NULL,
    fecha_valor     date,
    concepto        text NOT NULL,
    importe         numeric(14,2) NOT NULL,         -- + cobro, - pago
    saldo_despues   numeric(14,2),                  -- Saldo tras el movimiento
    referencia      text,                           -- Referencia bancaria
    tipo            text DEFAULT 'otro',            -- 'cobro','pago','transferencia','comision','otro'
    -- Conciliación
    conciliado      boolean DEFAULT false,
    asiento_id      uuid REFERENCES asientos(id),   -- Asiento contable vinculado
    factura_id      text,                           -- ID factura venta/compra vinculada
    notas           text,
    importado_en    timestamptz DEFAULT now(),
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_bancarios_cuenta ON movimientos_bancarios(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_mov_bancarios_empresa ON movimientos_bancarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mov_bancarios_fecha ON movimientos_bancarios(fecha);
CREATE INDEX IF NOT EXISTS idx_mov_bancarios_conciliado ON movimientos_bancarios(conciliado);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE cuentas_bancarias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_bancarios ENABLE ROW LEVEL SECURITY;

-- Políticas: solo admins/administracion/direccion de la empresa
CREATE POLICY "cuentas_bancarias_empresa" ON cuentas_bancarias
    FOR ALL USING (
        empresa_id IN (
            SELECT e.id FROM empresas e
            JOIN users u ON u.empresa_id = e.id
            WHERE u.id = auth.uid()
              AND u.role IN ('admin','administracion','direccion')
        )
    );

CREATE POLICY "movimientos_bancarios_empresa" ON movimientos_bancarios
    FOR ALL USING (
        empresa_id IN (
            SELECT e.id FROM empresas e
            JOIN users u ON u.empresa_id = e.id
            WHERE u.id = auth.uid()
              AND u.role IN ('admin','administracion','direccion')
        )
    );

-- ─── VISTA: v_posicion_liquidez ───────────────────────────────────────────────
-- Posición de liquidez por empresa: saldo total en todas las cuentas activas
CREATE OR REPLACE VIEW v_posicion_liquidez AS
SELECT
    cb.empresa_id,
    COUNT(cb.id)              AS num_cuentas,
    SUM(cb.saldo_actual)      AS saldo_total,
    -- Saldo real calculado desde movimientos
    (
        SELECT COALESCE(SUM(mb.importe), 0)
        FROM movimientos_bancarios mb
        WHERE mb.empresa_id = cb.empresa_id
    )                          AS movimientos_netos,
    -- Cobros pendientes de conciliar (importe > 0)
    (
        SELECT COALESCE(SUM(mb.importe), 0)
        FROM movimientos_bancarios mb
        WHERE mb.empresa_id = cb.empresa_id
          AND mb.conciliado = false
          AND mb.importe > 0
    )                          AS cobros_pendientes,
    -- Pagos pendientes de conciliar (importe < 0)
    (
        SELECT COALESCE(SUM(ABS(mb.importe)), 0)
        FROM movimientos_bancarios mb
        WHERE mb.empresa_id = cb.empresa_id
          AND mb.conciliado = false
          AND mb.importe < 0
    )                          AS pagos_pendientes
FROM cuentas_bancarias cb
WHERE cb.activa = true
GROUP BY cb.empresa_id;

-- ─── VISTA: v_movimientos_pendientes ─────────────────────────────────────────
-- Movimientos sin conciliar con información de cuenta
CREATE OR REPLACE VIEW v_movimientos_pendientes AS
SELECT
    mb.*,
    cb.nombre   AS cuenta_nombre,
    cb.banco    AS banco,
    cb.iban     AS iban
FROM movimientos_bancarios mb
JOIN cuentas_bancarias cb ON cb.id = mb.cuenta_id
WHERE mb.conciliado = false
ORDER BY mb.fecha DESC;

-- ─── FUNCIÓN: conciliar_movimiento ───────────────────────────────────────────
-- Marca un movimiento como conciliado y lo vincula a un asiento
CREATE OR REPLACE FUNCTION conciliar_movimiento(
    p_movimiento_id uuid,
    p_asiento_id    uuid DEFAULT NULL,
    p_factura_id    text DEFAULT NULL,
    p_notas         text DEFAULT NULL
) RETURNS void AS $$
BEGIN
    UPDATE movimientos_bancarios
    SET
        conciliado   = true,
        asiento_id   = p_asiento_id,
        factura_id   = p_factura_id,
        notas        = COALESCE(p_notas, notas)
    WHERE id = p_movimiento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── FUNCIÓN: actualizar_saldo_cuenta ────────────────────────────────────────
-- Recalcula saldo_actual desde movimientos
CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta(p_cuenta_id uuid)
RETURNS numeric AS $$
DECLARE v_saldo numeric;
BEGIN
    SELECT COALESCE(SUM(importe), 0) INTO v_saldo
    FROM movimientos_bancarios
    WHERE cuenta_id = p_cuenta_id;

    UPDATE cuentas_bancarias SET saldo_actual = v_saldo WHERE id = p_cuenta_id;
    RETURN v_saldo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════════════════
-- NOTAS
-- ════════════════════════════════════════════════════════════════════════════
-- 1. El import CSV en la app espera columnas: fecha,concepto,importe,saldo
--    (formato estándar de extractos bancarios españoles).
-- 2. La conciliación manual vincula cada movimiento a un asiento contable
--    (tabla asientos, PASO 12) o a una factura.
-- 3. v_posicion_liquidez se usa en el dashboard de tesorería.
-- ════════════════════════════════════════════════════════════════════════════
