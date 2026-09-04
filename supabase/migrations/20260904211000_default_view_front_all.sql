-- Face par défaut pour tous les produits boutique
update public.products
set default_view = 'front', updated_at = now()
where default_view <> 'front';
