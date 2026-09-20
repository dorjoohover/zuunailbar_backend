# --- Deps (with native build toolchain for bcrypt) ---
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
  && npm prune --omit=dev

# --- Runtime ---
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# su-exec — entrypoint-ыг root-оор эхлүүлээд (volume-ын эзэмшил засах),
# дараа нь node процессыг "app" хэрэглэгчээр ажиллуулахад хэрэгтэй.
RUN apk add --no-cache su-exec
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./package.json
# Алдааны лог (/app/logs) болон файл upload (/app/uploads) volume-үүдийг
# app хэрэглэгч бичиж чадахаар урьдчилан үүсгэж эзэмшүүлнэ — эс тэгвэл
# root-ын өмчилдөг /app дотор non-root app хэрэглэгч mkdir хийж чадахгүй
# (EACCES: permission denied, mkdir '/app/logs').
RUN mkdir -p /app/logs /app/uploads && chown -R app:app /app/logs /app/uploads
# Entrypoint нь root-оор ажиллаж volume-ын эзэмшлийг зассаны дараа su-exec-ээр
# "app" хэрэглэгч рүү буудаг тул USER-ыг энд заахгүй (процесс өөрөө app-аар
# ажиллана).
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 5000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
