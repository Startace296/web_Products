# syntax=docker/dockerfile:1
#
# node:22 — khớp đúng .github/workflows/ci.yml (frontend job pin node-version: 22 vì
# @testing-library/jest-dom khai báo engines.node ">=22"). Không có .nvmrc riêng.

FROM node:22-alpine AS deps
WORKDIR /app
# `npm ci` (không phải `npm install`) đòi lockfile khớp CHÍNH XÁC package.json, kể cả
# phần optional-dependency dành cho các platform khác (vd @unrs/resolver-binding-wasm32-
# wasi mà Tailwind v4's lightningcss kéo theo) — phần này đã quan sát thấy bị viết lại
# khác nhau tuỳ phiên bản npm/OS chạy `npm install` lần cuối (Windows/npm11 vs Linux/
# npm10 cho ra 2 lockfile hơi khác nhau dù cùng package.json), nên `npm ci` có thể false-
# positive báo "Missing: ... from lock file" dù dependency graph thực tế vẫn đúng.
# `npm install` không có ràng buộc khớp-tuyệt-đối này, tự dung hoà phần lệch đó.
COPY package*.json ./
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
# NEXT_PUBLIC_* được Next.js inline thẳng vào bundle client NGAY LÚC `next build`,
# không đọc lại được lúc container start — phải truyền qua --build-arg khi build image
# (xem docker-compose.yml), không phải qua `environment:` của service lúc chạy.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: chỉ copy output "standalone" (next.config.ts: output: "standalone") —
# Next.js tự bundle server.js + đúng phần node_modules server cần, không cần copy
# node_modules đầy đủ như dev, image nhẹ hơn hẳn so với backend. ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
