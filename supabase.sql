create extension if not exists pgcrypto;

do $$
begin
  create type public.message_status as enum (
    'PENDENTE_MODERACAO',
    'AGUARDANDO_DESTINATARIO',
    'ENTREGUE',
    'REJEITADA'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sobrenome text not null,
  apelido text not null,
  turma text null,
  created_at timestamptz not null default now()
);

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  destinatario_nome text not null,
  destinatario_sobrenome text not null,
  destinatario_apelido text null,
  destinatario_turma text null,
  sender_fingerprint text null,
  emissor_nome text null,
  emissor_sobrenome text null,
  emissor_apelido text null,
  emissor_turma text null,
  claim_code text null,
  mensagem text not null,
  anonima boolean not null default true,
  status public.message_status not null default 'PENDENTE_MODERACAO',
  created_at timestamptz not null default now(),
  approved_at timestamptz null,
  delivered_at timestamptz null,
  destinatario_usuario_id uuid null references public.usuarios (id)
);

alter table public.mensagens add column if not exists emissor_nome text null;
alter table public.mensagens add column if not exists emissor_sobrenome text null;
alter table public.mensagens add column if not exists emissor_apelido text null;
alter table public.mensagens add column if not exists emissor_turma text null;
alter table public.mensagens add column if not exists claim_code text null;
alter table public.mensagens add column if not exists sender_fingerprint text null;

create table if not exists public.administradores (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cupidos (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.usuarios enable row level security;
alter table public.mensagens enable row level security;
alter table public.administradores enable row level security;
alter table public.cupidos enable row level security;

create or replace function public.norm_text(p text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.generate_claim_code()
returns text
language sql
volatile
as $$
  select upper(substr(encode(gen_random_bytes(12), 'hex'), 1, 12));
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.administradores a
    where a.id = auth.uid()
  );
$$;

create or replace function public.is_cupido()
returns boolean
language sql
stable
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.cupidos c
      where c.id = auth.uid()
    );
$$;

drop policy if exists "public_insert_mensagens" on public.mensagens;
create policy "public_insert_mensagens"
on public.mensagens
for insert
to anon, authenticated
with check (true);

drop policy if exists "admin_select_mensagens" on public.mensagens;
create policy "admin_select_mensagens"
on public.mensagens
for select
to authenticated
using (public.is_admin());

drop policy if exists "admin_update_mensagens" on public.mensagens;
create policy "admin_update_mensagens"
on public.mensagens
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_select_usuarios" on public.usuarios;
create policy "admin_select_usuarios"
on public.usuarios
for select
to authenticated
using (public.is_admin());

drop policy if exists "self_select_administradores" on public.administradores;
create policy "self_select_administradores"
on public.administradores
for select
to authenticated
using (id = auth.uid());

drop policy if exists "self_select_cupidos" on public.cupidos;
create policy "self_select_cupidos"
on public.cupidos
for select
to authenticated
using (id = auth.uid());

drop policy if exists "admin_select_cupidos" on public.cupidos;
create policy "admin_select_cupidos"
on public.cupidos
for select
to authenticated
using (public.is_admin());

drop policy if exists "admin_insert_cupidos" on public.cupidos;
create policy "admin_insert_cupidos"
on public.cupidos
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admin_update_cupidos" on public.cupidos;
create policy "admin_update_cupidos"
on public.cupidos
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_delete_cupidos" on public.cupidos;
create policy "admin_delete_cupidos"
on public.cupidos
for delete
to authenticated
using (public.is_admin());

create or replace function public.get_public_stats()
returns table (
  total_mensagens bigint,
  total_entregues bigint,
  total_participantes bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.mensagens)::bigint as total_mensagens,
    (select count(*) from public.mensagens where status = 'ENTREGUE')::bigint as total_entregues,
    (select count(distinct sender_fingerprint) from public.mensagens where sender_fingerprint is not null)::bigint as total_participantes;
$$;

create or replace function public.get_participante_perfil(p_usuario_id uuid)
returns table (
  id uuid,
  nome text,
  sobrenome text,
  apelido text,
  turma text,
  total_recebidas bigint
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.nome,
    u.sobrenome,
    u.apelido,
    u.turma,
    (select count(*) from public.mensagens m where m.destinatario_usuario_id = u.id)::bigint as total_recebidas
  from public.usuarios u
  where u.id = p_usuario_id
  limit 1;
$$;

drop function if exists public.get_cupido_queue();
create or replace function public.get_cupido_queue()
returns table (
  destinatario_nome text,
  destinatario_sobrenome text,
  destinatario_apelido text,
  destinatario_turma text,
  codigo text,
  mensagens_aguardando int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_cupido() then
    raise exception 'not authorized';
  end if;

  return query
  select
    m.destinatario_nome,
    m.destinatario_sobrenome,
    m.destinatario_apelido,
    m.destinatario_turma,
    min(m.claim_code) as codigo,
    count(*)::int as mensagens_aguardando
  from public.mensagens m
  where m.status = 'AGUARDANDO_DESTINATARIO'
  group by
    m.destinatario_nome,
    m.destinatario_sobrenome,
    m.destinatario_apelido,
    m.destinatario_turma
  order by mensagens_aguardando desc, m.destinatario_nome asc, m.destinatario_sobrenome asc;
end;
$$;

create or replace function public.resgatar_por_codigo(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(regexp_replace(trim(coalesce(p_codigo, '')), '\s+', '', 'g'));
  v_mensagens jsonb;
begin
  if v_codigo = '' then
    return null;
  end if;

  with candidatos as (
    select
      m.id,
      m.mensagem,
      m.anonima,
      m.emissor_nome,
      m.emissor_sobrenome,
      m.emissor_apelido,
      m.emissor_turma,
      m.created_at
    from public.mensagens m
    where m.status in ('AGUARDANDO_DESTINATARIO', 'ENTREGUE')
      and upper(coalesce(m.claim_code, '')) = v_codigo
  )
  select jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'mensagem', c.mensagem,
      'anonima', c.anonima,
      'emissor_nome', c.emissor_nome,
      'emissor_sobrenome', c.emissor_sobrenome,
      'emissor_apelido', c.emissor_apelido,
      'emissor_turma', c.emissor_turma,
      'created_at', c.created_at
    )
    order by c.created_at asc
  )
  into v_mensagens
  from candidatos c;

  if v_mensagens is null then
    return null;
  end if;

  update public.mensagens
  set
    status = 'ENTREGUE',
    delivered_at = now()
  where status = 'AGUARDANDO_DESTINATARIO'
    and upper(coalesce(claim_code, '')) = v_codigo;

  return jsonb_build_object(
    'codigo', v_codigo,
    'mensagens', v_mensagens
  );
end;
$$;

create or replace function public.admin_approve_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.mensagens%rowtype;
  v_existing_code text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_row
  from public.mensagens m
  where m.id = p_message_id
  limit 1;

  if not found then
    raise exception 'message not found';
  end if;

  select m.claim_code
  into v_existing_code
  from public.mensagens m
  where m.status = 'AGUARDANDO_DESTINATARIO'
    and public.norm_text(m.destinatario_nome) = public.norm_text(v_row.destinatario_nome)
    and public.norm_text(m.destinatario_sobrenome) = public.norm_text(v_row.destinatario_sobrenome)
    and public.norm_text(m.destinatario_apelido) = public.norm_text(v_row.destinatario_apelido)
    and public.norm_text(m.destinatario_turma) = public.norm_text(v_row.destinatario_turma)
    and m.claim_code is not null
  limit 1;

  update public.mensagens
  set
    status = 'AGUARDANDO_DESTINATARIO',
    approved_at = now(),
    claim_code = coalesce(v_existing_code, claim_code, public.generate_claim_code())
  where id = p_message_id;
end;
$$;

do $$
begin
  with grupos as (
    select
      m.destinatario_nome,
      m.destinatario_sobrenome,
      m.destinatario_apelido,
      m.destinatario_turma,
      public.generate_claim_code() as codigo
    from public.mensagens m
    where m.status = 'AGUARDANDO_DESTINATARIO'
      and m.claim_code is null
    group by
      m.destinatario_nome,
      m.destinatario_sobrenome,
      m.destinatario_apelido,
      m.destinatario_turma
  )
  update public.mensagens m
  set claim_code = g.codigo
  from grupos g
  where m.status = 'AGUARDANDO_DESTINATARIO'
    and m.claim_code is null
    and m.destinatario_nome is not distinct from g.destinatario_nome
    and m.destinatario_sobrenome is not distinct from g.destinatario_sobrenome
    and m.destinatario_apelido is not distinct from g.destinatario_apelido
    and m.destinatario_turma is not distinct from g.destinatario_turma;
exception
  when others then null;
end $$;

drop function if exists public.resgatar_mensagens(text, text, text, text);
drop function if exists public.resgatar_mensagens(text, text, text, text, text);
create or replace function public.resgatar_mensagens(
  p_nome text,
  p_sobrenome text,
  p_apelido text,
  p_turma text,
  p_codigo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := public.norm_text(p_nome);
  v_sobrenome text := public.norm_text(p_sobrenome);
  v_apelido text := public.norm_text(p_apelido);
  v_turma text := public.norm_text(p_turma);
  v_codigo text := upper(regexp_replace(trim(coalesce(p_codigo, '')), '\s+', '', 'g'));
  v_usuario public.usuarios%rowtype;
  v_mensagens jsonb;
begin
  if v_nome = '' or v_sobrenome = '' or v_apelido = '' or v_codigo = '' then
    return null;
  end if;

  with candidatos as (
    select
      m.id,
      m.mensagem,
      m.anonima,
      m.emissor_nome,
      m.emissor_sobrenome,
      m.emissor_apelido,
      m.emissor_turma,
      m.created_at
    from public.mensagens m
    where m.status = 'AGUARDANDO_DESTINATARIO'
      and upper(coalesce(m.claim_code, '')) = v_codigo
      and (
        (
          public.norm_text(m.destinatario_nome) = v_nome
          and public.norm_text(m.destinatario_sobrenome) = v_sobrenome
          and public.norm_text(m.destinatario_apelido) = v_apelido
        )
        or (
          public.norm_text(m.destinatario_nome) = v_nome
          and public.norm_text(m.destinatario_sobrenome) = v_sobrenome
        )
        or (
          public.norm_text(m.destinatario_nome) = v_nome
          and public.norm_text(m.destinatario_apelido) = v_apelido
        )
        or (
          v_turma <> ''
          and public.norm_text(m.destinatario_nome) = v_nome
          and public.norm_text(m.destinatario_sobrenome) = v_sobrenome
          and public.norm_text(m.destinatario_turma) = v_turma
        )
      )
  )
  select jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'mensagem', c.mensagem,
      'anonima', c.anonima,
      'emissor_nome', c.emissor_nome,
      'emissor_sobrenome', c.emissor_sobrenome,
      'emissor_apelido', c.emissor_apelido,
      'emissor_turma', c.emissor_turma,
      'created_at', c.created_at
    )
    order by c.created_at asc
  )
  into v_mensagens
  from candidatos c;

  if v_mensagens is null then
    return null;
  end if;

  select *
  into v_usuario
  from public.usuarios u
  where public.norm_text(u.nome) = v_nome
    and public.norm_text(u.sobrenome) = v_sobrenome
    and public.norm_text(u.apelido) = v_apelido
  limit 1;

  if not found then
    insert into public.usuarios (nome, sobrenome, apelido, turma)
    values (trim(p_nome), trim(p_sobrenome), trim(p_apelido), nullif(trim(p_turma), ''))
    returning * into v_usuario;
  else
    update public.usuarios
    set turma = coalesce(nullif(trim(p_turma), ''), turma)
    where id = v_usuario.id
    returning * into v_usuario;
  end if;

  update public.mensagens
  set
    status = 'ENTREGUE',
    delivered_at = now(),
    destinatario_usuario_id = v_usuario.id
  where id in (
    select (x->>'id')::uuid
    from jsonb_array_elements(v_mensagens) x
  );

  return jsonb_build_object(
    'usuario_id', v_usuario.id,
    'usuario_nome', v_usuario.nome,
    'usuario_sobrenome', v_usuario.sobrenome,
    'usuario_apelido', v_usuario.apelido,
    'usuario_turma', v_usuario.turma,
    'mensagens', v_mensagens
  );
end;
$$;
