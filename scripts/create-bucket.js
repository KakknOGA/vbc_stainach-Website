'use strict';
require('dotenv').config();
const supabase = require('../lib/supabase');

(async () => {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) { console.error('Fehler beim Auflisten:', listError.message); process.exit(1); }

  console.log('Vorhandene Buckets:', buckets.map(b => b.name).join(', ') || '(keine)');

  if (buckets.some(b => b.name === 'media')) {
    console.log('Bucket "media" existiert bereits – nichts zu tun.');
    return;
  }

  const { error: createError } = await supabase.storage.createBucket('media', {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  });
  if (createError) { console.error('Fehler beim Erstellen:', createError.message); process.exit(1); }

  console.log('✅ Bucket "media" (öffentlich) wurde erstellt.');
})();
