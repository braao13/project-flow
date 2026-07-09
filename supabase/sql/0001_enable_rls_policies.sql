-- Row-Level Security for Projetin (BYO Supabase — este projeto NÃO usa Lovable Cloud)
-- ------------------------------------------------------------
-- Rode este arquivo no SQL Editor do seu projeto Supabase
-- (dwyzhetkfdroyenzdyoe) uma única vez. Ele:
--   1) Habilita RLS em todas as tabelas de dados compartilhados.
--   2) Adiciona políticas escopadas por autor/dono. O time inteiro
--      enxerga o workspace (necessário para o Dashboard e para ver
--      tasks atribuídas por outros), mas somente o autor/dono de
--      cada registro consegue alterá-lo ou deletá-lo.
--   3) Impede que um usuário eleve o próprio `role` ou reverta
--      `first_login_completed` via API direta.
--   4) Restringe o bucket "attachments" (privado + allowlist de
--      MIME + limite de tamanho) e adiciona policies em
--      storage.objects para o mesmo bucket.
-- ------------------------------------------------------------

-- =============== helper: role check =========================
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = _role
  )
$$;

grant execute on function public.has_role(uuid, public.user_role) to authenticated;

-- =============== profiles ===================================
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Impede que o próprio usuário eleve seu role ou reverta o
-- first_login_completed via API. Somente admins podem tocar
-- nessas colunas em outra linha.
create or replace function public.enforce_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.first_login_completed is distinct from old.first_login_completed) then
    if not public.has_role(auth.uid(), 'administrador') then
      if new.role is distinct from old.role then
        raise exception 'Somente administradores podem alterar o role.';
      end if;
      if new.first_login_completed = false and old.first_login_completed = true then
        raise exception 'first_login_completed não pode ser revertido.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_privileged_columns on public.profiles;
create trigger profiles_privileged_columns
  before update on public.profiles
  for each row execute function public.enforce_profile_privileged_columns();

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.has_role(auth.uid(), 'administrador'))
  with check (public.has_role(auth.uid(), 'administrador'));

-- =============== projects ===================================
alter table public.projects enable row level security;

drop policy if exists "projects_select_authenticated" on public.projects;
create policy "projects_select_authenticated"
  on public.projects for select to authenticated using (true);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "projects_update_owner_or_admin" on public.projects;
create policy "projects_update_owner_or_admin"
  on public.projects for update to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(), 'administrador'))
  with check (auth.uid() = owner_id or public.has_role(auth.uid(), 'administrador'));

drop policy if exists "projects_delete_owner_or_admin" on public.projects;
create policy "projects_delete_owner_or_admin"
  on public.projects for delete to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(), 'administrador'));

-- =============== tasks ======================================
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_authenticated" on public.tasks;
create policy "tasks_select_authenticated"
  on public.tasks for select to authenticated using (true);

drop policy if exists "tasks_insert_authenticated" on public.tasks;
create policy "tasks_insert_authenticated"
  on public.tasks for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "tasks_update_creator_or_responsible_or_admin" on public.tasks;
create policy "tasks_update_creator_or_responsible_or_admin"
  on public.tasks for update to authenticated
  using (
    auth.uid() = created_by
    or auth.uid() = responsible_user_id
    or public.has_role(auth.uid(), 'administrador')
  )
  with check (
    auth.uid() = created_by
    or auth.uid() = responsible_user_id
    or public.has_role(auth.uid(), 'administrador')
  );

drop policy if exists "tasks_delete_creator_or_admin" on public.tasks;
create policy "tasks_delete_creator_or_admin"
  on public.tasks for delete to authenticated
  using (auth.uid() = created_by or public.has_role(auth.uid(), 'administrador'));

-- =============== task_assignees =============================
alter table public.task_assignees enable row level security;

drop policy if exists "task_assignees_select_authenticated" on public.task_assignees;
create policy "task_assignees_select_authenticated"
  on public.task_assignees for select to authenticated using (true);

drop policy if exists "task_assignees_write_task_managers" on public.task_assignees;
create policy "task_assignees_write_task_managers"
  on public.task_assignees for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id
        and (
          t.created_by = auth.uid()
          or t.responsible_user_id = auth.uid()
          or public.has_role(auth.uid(), 'administrador')
        )
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id
        and (
          t.created_by = auth.uid()
          or t.responsible_user_id = auth.uid()
          or public.has_role(auth.uid(), 'administrador')
        )
    )
  );

-- =============== task_updates ===============================
alter table public.task_updates enable row level security;

drop policy if exists "task_updates_select_authenticated" on public.task_updates;
create policy "task_updates_select_authenticated"
  on public.task_updates for select to authenticated using (true);

drop policy if exists "task_updates_insert_authenticated" on public.task_updates;
create policy "task_updates_insert_authenticated"
  on public.task_updates for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "task_updates_update_author_or_responsible_or_admin" on public.task_updates;
create policy "task_updates_update_author_or_responsible_or_admin"
  on public.task_updates for update to authenticated
  using (
    auth.uid() = created_by
    or auth.uid() = responsible_user_id
    or public.has_role(auth.uid(), 'administrador')
  )
  with check (
    auth.uid() = created_by
    or auth.uid() = responsible_user_id
    or public.has_role(auth.uid(), 'administrador')
  );

drop policy if exists "task_updates_delete_author_or_admin" on public.task_updates;
create policy "task_updates_delete_author_or_admin"
  on public.task_updates for delete to authenticated
  using (auth.uid() = created_by or public.has_role(auth.uid(), 'administrador'));

-- =============== comments ===================================
alter table public.comments enable row level security;

drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated"
  on public.comments for select to authenticated using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "comments_update_author" on public.comments;
create policy "comments_update_author"
  on public.comments for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "comments_delete_author_or_admin" on public.comments;
create policy "comments_delete_author_or_admin"
  on public.comments for delete to authenticated
  using (auth.uid() = author_id or public.has_role(auth.uid(), 'administrador'));

-- =============== attachments ================================
alter table public.attachments enable row level security;

drop policy if exists "attachments_select_authenticated" on public.attachments;
create policy "attachments_select_authenticated"
  on public.attachments for select to authenticated using (true);

drop policy if exists "attachments_insert_own" on public.attachments;
create policy "attachments_insert_own"
  on public.attachments for insert to authenticated
  with check (auth.uid() = uploaded_by);

drop policy if exists "attachments_delete_uploader_or_admin" on public.attachments;
create policy "attachments_delete_uploader_or_admin"
  on public.attachments for delete to authenticated
  using (auth.uid() = uploaded_by or public.has_role(auth.uid(), 'administrador'));

-- =============== storage: attachments bucket ================
-- Privado + allowlist de MIME (defesa em profundidade para a
-- validação client-side em src/lib/store.tsx) + limite de tamanho.
update storage.buckets
set public = false,
    file_size_limit = 20971520, -- 20 MB
    allowed_mime_types = array[
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif'
    ]
where id = 'attachments';

drop policy if exists "attachments_objects_select" on storage.objects;
create policy "attachments_objects_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'attachments');

drop policy if exists "attachments_objects_insert" on storage.objects;
create policy "attachments_objects_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and owner = auth.uid());

drop policy if exists "attachments_objects_delete" on storage.objects;
create policy "attachments_objects_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (owner = auth.uid() or public.has_role(auth.uid(), 'administrador'))
  );
