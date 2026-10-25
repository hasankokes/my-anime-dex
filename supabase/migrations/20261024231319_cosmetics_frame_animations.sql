-- Optional frame motion read by AvatarFrame (older app versions ignore the field)
update public.cosmetics set payload = payload || '{"animation":{"type":"rotate","duration_ms":3000}}'::jsonb where id = 'frame_flame';
update public.cosmetics set payload = payload || '{"animation":{"type":"rotate","duration_ms":6000}}'::jsonb where id = 'frame_aurora';
update public.cosmetics set payload = payload || '{"animation":{"type":"pulse","duration_ms":1800}}'::jsonb where id = 'frame_sakura';
update public.cosmetics set payload = payload || '{"animation":{"type":"shimmer","duration_ms":2400}}'::jsonb where id = 'frame_gold';
