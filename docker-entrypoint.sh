#!/bin/sh
set -e

# Volume-оор холбогдсон /app/uploads, /app/logs нь өмнөх (жишээ нь backup-аас
# tar-аар сэргээсэн) root өмчлөлтэй ирж болно. Docker нь ХООСОН volume-ын
# эзэмшлийг л image-аас хуулдаг тул, өмнө нь дүүрсэн volume root-ынх хэвээр
# үлдэж, non-root "app" хэрэглэгч файл бичиж чадахгүй болдог:
#   Error: EACCES: permission denied, open 'uploads/....jpeg'
# Container асах бүрд эзэмшлийг засаад, дараа нь эрхээ "app" руу буулгана.
for dir in /app/uploads /app/logs; do
  mkdir -p "$dir" 2>/dev/null || true
  if [ "$(stat -c %U "$dir" 2>/dev/null)" != "app" ]; then
    chown -R app:app "$dir" 2>/dev/null || true
  fi
done

exec su-exec app "$@"
