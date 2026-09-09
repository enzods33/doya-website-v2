-- Textes bio éditables depuis l’admin (une ligne par locale).
-- Lecture publique ; écriture via Edge Function service_role uniquement.

create table if not exists public.site_bio (
  locale text primary key check (locale in ('fr', 'es', 'en', 'pt')),
  lead text not null default '',
  body text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_bio enable row level security;
revoke all on public.site_bio from anon, authenticated, public;
grant select on public.site_bio to anon, authenticated;
grant all on public.site_bio to service_role;

create policy site_bio_select_public on public.site_bio
  for select
  to anon, authenticated
  using (true);

insert into public.site_bio (locale, lead, body) values
(
  'fr',
  $fr_lead$DOYA, c’est Marina et Melissa.$fr_lead$,
  $fr_body$Un duo qui chante entre l’espagnol et le français, sans choisir un seul rivage.

De Mariposa à Mueve, de Lo vi venir à No anda sola, leur trajectoire s’écrit déjà en refrains — des chansons qui tiennent debout seules, avant même l’album.

Luna Bohemia (2026) en est le chapitre : douze titres, une lumière de désert, une identité nette.

Deux voix, une même ligne. Le noir et le blanc. La chaleur du sable, le rouge des étoiles.

DOYA ne raconte pas une légende inventée : elle pose un univers, et laisse la musique le porter.$fr_body$
),
(
  'es',
  $es_lead$DOYA son Marina y Melissa.$es_lead$,
  $es_body$Un dúo que canta entre el español y el francés, sin elegir una sola orilla.

De Mariposa a Mueve, de Lo vi venir a No anda sola, su camino ya se escribe en estribillos — canciones que se sostienen solas, incluso antes del álbum.

Luna Bohemia (2026) es el capítulo: doce temas, luz de desierto, una identidad nítida.

Dos voces, una misma línea. El negro y el blanco. El calor de la arena, el rojo de las estrellas.

DOYA no inventa una leyenda: plantea un universo y deja que la música lo lleve.$es_body$
),
(
  'en',
  $en_lead$DOYA is Marina and Melissa.$en_lead$,
  $en_body$A duo singing between Spanish and French, never choosing only one shore.

From Mariposa to Mueve, from Lo vi venir to No anda sola, their path is already written in choruses — songs that stand on their own, even before the album.

Luna Bohemia (2026) is the next chapter: twelve tracks, desert light, a clear identity.

Two voices, one line. Black and white. The warmth of sand, the red of the stars.

DOYA does not invent a legend: it sets an universe, and lets the music carry it.$en_body$
),
(
  'pt',
  $pt_lead$DOYA são Marina e Melissa.$pt_lead$,
  $pt_body$Um duo que canta entre o espanhol e o francês, sem escolher só uma margem.

De Mariposa a Mueve, de Lo vi venir a No anda sola, o seu caminho já se escreve em refrões — canções que se aguentam sozinhas, mesmo antes do álbum.

Luna Bohemia (2026) é o capítulo: doze faixas, luz de deserto, uma identidade nítida.

Duas vozes, uma mesma linha. O preto e o branco. O calor da areia, o vermelho das estrelas.

A DOYA não inventa uma lenda: cria um universo e deixa a música levá-lo.$pt_body$
)
on conflict (locale) do nothing;
