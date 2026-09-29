-- Conserve le titre officiel de l'album en alphabet latin dans la bio arabe.
-- Additif et idempotent : ne touche qu'au texte arabe s'il existe déjà.

update public.site_bio
set body = replace(body, 'لونا بوهيميا', 'Luna Bohemia'),
    updated_at = now()
where locale = 'ar'
  and body like '%لونا بوهيميا%';
