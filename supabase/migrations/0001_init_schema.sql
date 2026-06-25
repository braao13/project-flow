-- Projetin · schema inicial
-- Rodar no SQL Editor do Supabase (Dashboard > SQL Editor > New query) do projeto vilpiblpjmjqoqkdlavz.

-- ========== ENUMS ==========
create type public.task_status as enum ('andamento', 'finalizada', 'atrasada');
create type public.task_priority as enum ('maxima', 'alta', 'nenhuma', 'baixa');
create type public.update_source as enum ('web', 'telegram', 'ai');

-- ========== PROFILES ==========
-- 1:1 com auth.users. telegram_chat_id e ai_preferences já previstos para fases 2/3.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  telegram_chat_id text unique,
  ai_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== PROJECTS ==========
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_id_idx on public.projects(owner_id);

-- ========== TASKS ==========
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  status public.task_status not null default 'andamento',
  priority public.task_priority not null default 'nenhuma',
  start_date date not null default current_date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_owner_id_idx on public.tasks(owner_id);
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_due_date_idx on public.tasks(due_date);

-- ========== UPDATES (timeline) ==========
create table public.updates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  description text,
  date date,
  done boolean not null default false,
  position integer not null default 0,
  source public.update_source not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index updates_owner_id_idx on public.updates(owner_id);
create index updates_task_id_idx on public.updates(task_id);
create index updates_date_idx on public.updates(date);

-- ========== COMMENTS ==========
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
create index comments_owner_id_idx on public.comments(owner_id);
create index comments_task_id_idx on public.comments(task_id);

-- ========== ATTACHMENTS ==========
-- arquivo real fica no Storage; aqui guardamos só o metadado + caminho.
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  name text not null,
  type text not null,
  size bigint not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index attachments_owner_id_idx on public.attachments(owner_id);
create index attachments_task_id_idx on public.attachments(task_id);

-- ========== updated_at automático ==========
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger updates_set_updated_at before update on public.updates for each row execute function public.set_updated_at();

-- ========== profile automático no signup ==========
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.updates enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "projects_select_own" on public.projects for select using (auth.uid() = owner_id);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = owner_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = owner_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = owner_id);

create policy "tasks_select_own" on public.tasks for select using (auth.uid() = owner_id);
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = owner_id);
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = owner_id);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = owner_id);

create policy "updates_select_own" on public.updates for select using (auth.uid() = owner_id);
create policy "updates_insert_own" on public.updates for insert with check (auth.uid() = owner_id);
create policy "updates_update_own" on public.updates for update using (auth.uid() = owner_id);
create policy "updates_delete_own" on public.updates for delete using (auth.uid() = owner_id);

create policy "comments_select_own" on public.comments for select using (auth.uid() = owner_id);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = owner_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = owner_id);

create policy "attachments_select_own" on public.attachments for select using (auth.uid() = owner_id);
create policy "attachments_insert_own" on public.attachments for insert with check (auth.uid() = owner_id);
create policy "attachments_delete_own" on public.attachments for delete using (auth.uid() = owner_id);

-- ========== STORAGE (anexos) ==========
-- bucket privado; caminho dos arquivos: {owner_id}/{task_id}/{arquivo}
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_storage_select_own" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_storage_insert_own" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_storage_delete_own" on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- ========== REALTIME ==========
-- necessário para refletir alterações em tempo real (e futuramente, escritas vindas do bot do Telegram).
alter publication supabase_realtime add table
  public.projects,
  public.tasks,
  public.updates,
  public.comments,
  public.attachments;
