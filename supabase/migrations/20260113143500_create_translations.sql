
-- Create the table for storing anime synopsis translations
create table if not exists public.anime_translations (
    id uuid not null default gen_random_uuid(),
    anime_id text not null,
    language text not null,
    synopsis text not null,
    created_at timestamp with time zone not null default now(),
    constraint anime_translations_pkey primary key (id),
    constraint anime_translations_anime_id_language_key unique (anime_id, language)
);

-- Enable Row Level Security
alter table public.anime_translations enable row level security;

-- Policy: Everyone can read translations (to display them)
create policy "Everyone can read translations"
    on public.anime_translations
    for select
    to public
    using (true);

-- Policy: Authenticated users can insert translations (when they trigger a translation)
create policy "Authenticated users can insert translations"
    on public.anime_translations
    for insert
    to authenticated
    with check (true);

-- Optional: If you want to allow updating existing translations (e.g. to fix them), 
-- you can add an update policy. For now, we assume translations are write-once or fixed by admin.
