# ── Stage 1: Build static export ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_API_URL must be passed as a build arg because Next.js bakes
# it into the static bundle at build time (not at runtime).
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build
# Output: /app/out (static HTML/CSS/JS)

# ── Stage 2: Serve with Nginx ──────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Copy the static export into Nginx's default serve directory
COPY --from=builder /app/out /usr/share/nginx/html

# Custom Nginx config to handle Next.js trailingSlash routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
