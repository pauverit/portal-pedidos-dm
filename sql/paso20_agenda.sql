-- ============================================================
-- PASO 20 — AGENDA & CALENDARIO
-- ERP Digital Market — Marzo 2026
-- ============================================================
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── Tabla principal de citas / eventos ──────────────────────
create table if not exists citas (
  id              uuid         default gen_random_uuid() primary key,
  empresa_id      uuid         references empresas(id),
  titulo          text         not null,
  tipo            text         not null
                               check (tipo in ('sat','comercial','reunion','llamada','tarea','recordatorio','otro')),
  fecha_inicio    timestamptz  not null,
  fecha_fin       timestamptz,
  todo_el_dia     boolean      default false,
  descripcion     text,
  ubicacion       text,
  estado          text         default 'pendiente'
                               check (estado in ('pendiente','confirmada','en_curso','completada','cancelada')),

  -- Vínculos a otros módulos (opcional)
  cliente_id      uuid,
  cliente_nombre  text,
  responsable_id  uuid         references auth.users(id),
  responsable_nombre text,

  -- Vinculación con SAT / CRM
  work_order_id   uuid,
  incidencia_id   uuid,
  visita_id       uuid,

  -- Recordatorio
  recordatorio_min integer default 0,   -- minutos antes del inicio

  -- Metadatos
  color           text    default 'blue',
  created_at      timestamptz default now(),
  created_by      uuid    references auth.users(id)
);

-- ── Índices ──────────────────────────────────────────────────
create index if not exists idx_citas_fecha_inicio on citas (fecha_inicio);
create index if not exists idx_citas_empresa      on citas (empresa_id);
create index if not exists idx_citas_responsable  on citas (responsable_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table citas enable row level security;

-- Todos los usuarios autenticados pueden ver y gestionar citas
create policy "citas_select" on citas for select  using (auth.role() = 'authenticated');
create policy "citas_insert" on citas for insert  with check (auth.role() = 'authenticated');
create policy "citas_update" on citas for update  using (auth.role() = 'authenticated');
create policy "citas_delete" on citas for delete  using (auth.role() = 'authenticated');

-- ── Vista resumen para el dashboard ──────────────────────────
create or replace view v_agenda_proximas as
select
  c.id,
  c.titulo,
  c.tipo,
  c.fecha_inicio,
  c.fecha_fin,
  c.todo_el_dia,
  c.estado,
  c.cliente_nombre,
  c.responsable_nombre,
  c.ubicacion,
  c.color
from citas c
where c.fecha_inicio >= now()
  and c.estado not in ('completada','cancelada')
order by c.fecha_inicio
limit 50;

grant select on v_agenda_proximas to authenticated;

-- ── Función helper: citas de un mes ──────────────────────────
create or replace function get_citas_mes(p_anio int, p_mes int)
returns setof citas
language sql stable
as $$
  select * from citas
  where date_trunc('month', fecha_inicio at time zone 'Europe/Madrid')
        = make_date(p_anio, p_mes, 1)::date
  order by fecha_inicio;
$$;

grant execute on function get_citas_mes(int,int) to authenticated;
