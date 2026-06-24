import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const FONT_PARAMS = {
  'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400',
  'Playfair Display':   'Playfair+Display:wght@400;600;700',
  'EB Garamond':        'EB+Garamond:wght@400;600',
  'Lora':               'Lora:wght@400;600;700',
  'Libre Baskerville':  'Libre+Baskerville:wght@400;700',
  'Spectral':           'Spectral:wght@400;600;700',
  'Montserrat':         'Montserrat:wght@300;400;500;600;700',
  'DM Sans':            'DM+Sans:wght@300;400;500;600;700',
  'Inter':              'Inter:wght@300;400;500;600;700',
  'Raleway':            'Raleway:wght@300;400;500;600;700',
  'Nunito Sans':        'Nunito+Sans:wght@300;400;600;700',
  'Poppins':            'Poppins:wght@300;400;500;600;700',
};

function loadFont(name) {
  if (!name || !FONT_PARAMS[name]) return;
  const id = 'gf-' + name.replace(/\s+/g, '-').toLowerCase();
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${FONT_PARAMS[name]}&display=swap`;
  document.head.appendChild(link);
}

function applyTheme(t) {
  if (!t) return;
  const r = document.documentElement;
  const set = (k, v) => v && r.style.setProperty(k, v);
  set('--burgundy',      t.burgundy);
  set('--burgundy-deep', t.burgundy_deep);
  set('--gold',          t.gold);
  set('--gold-light',    t.gold_light);
  set('--charcoal',      t.charcoal);
  set('--charcoal-soft', t.charcoal_soft);
  set('--warm-white',    t.warm_white);
  set('--muted',         t.muted);
  set('--border-soft',   t.border_soft);
  if (t.heading_font) {
    loadFont(t.heading_font);
    set('--font-heading', `'${t.heading_font}', serif`);
  }
  if (t.body_font) {
    loadFont(t.body_font);
    set('--font-body', `'${t.body_font}', sans-serif`);
  }
}

export function useTheme() {
  useEffect(() => {
    supabase.from('site_theme').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => applyTheme(data));

    const channel = supabase
      .channel('site_theme_live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_theme' },
        ({ new: data }) => applyTheme(data))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);
}
