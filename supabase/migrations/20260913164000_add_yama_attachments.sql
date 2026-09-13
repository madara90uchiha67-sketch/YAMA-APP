-- Private attachment storage and metadata for YAMA AI.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'yama-attachments',
  'yama-attachments',
  false,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
    'application/json', 'text/html', 'application/xml'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table "Message" add column if not exists "attachments" text;
alter table "UsageLog" add column if not exists "attachmentCount" integer not null default 0;
