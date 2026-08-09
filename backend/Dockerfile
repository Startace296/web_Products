# syntax=docker/dockerfile:1
#
# Không có .nvmrc/"engines" nào trong package.json để cố định version — chọn node:20
# theo @types/node ^20.x (gợi ý mạnh nhất có trong repo về version Node dự kiến).

# ---- deps: cài ĐẦY ĐỦ cả devDependencies. Cần cho 2 việc ở stage build (tsc, prisma
# generate) VÀ cho chính stage runtime: "prisma" (CLI) nằm ở devDependencies trong
# package.json, nhưng script "start" lại chạy `prisma migrate deploy` lúc container
# khởi động — nên KHÔNG thể prune devDependencies ở runtime như thường lệ, trừ khi
# chuyển "prisma" sang dependencies trong package.json (ngoài phạm vi việc này).
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# --ignore-scripts: package.json có "postinstall": "prisma generate", nhưng ở stage này
# CHƯA copy prisma/schema.prisma lẫn chưa cài openssl (Prisma engine trên Alpine cần) —
# chạy postinstall ở đây sẽ lỗi. Stage build bên dưới đã tự chạy `npx prisma generate`
# một cách tường minh SAU KHI có đủ 2 thứ đó, nên bỏ qua an toàn ở đây.
RUN npm ci --ignore-scripts

# ---- build: generate Prisma Client rồi biên dịch TypeScript (src/ -> dist/) ----
FROM node:20-alpine AS build
WORKDIR /app
# Prisma engine trên Alpine (musl) cần OpenSSL để chạy được — thiếu là lỗi kinh điển
# "Error loading shared library libssl" lúc `prisma generate`/`migrate deploy`.
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ---- runtime: image chạy thật, chỉ `npm start` (= prisma migrate deploy && node dist/server.js) ----
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
# prisma/seed.ts import "../src/config/prisma" (source .ts, chạy qua tsx — xem
# package.json "prisma.seed") — không phải dist/, nên phải copy thêm src/ thì
# `docker compose exec backend npx prisma db seed` mới chạy được.
COPY --from=build /app/src ./src
COPY package*.json ./

EXPOSE 4000
CMD ["npm", "start"]
