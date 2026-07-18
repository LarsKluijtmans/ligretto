# Ligretto web image — serves the pre-built SPA (dist/) via nginx (same-origin proxy to the backend).
# Build dist on the HOST first, because the @lars-kluijtmans/* SDKs are unpublished and resolve from the
# sibling ../../auth checkout (they can't install inside Docker). `npm run build` bakes frontend/.env.production.
#
#   cd frontend && npm ci && npm run build      # produces dist/ with prod VITE_* baked in
#   docker compose build web                    # this image just copies dist/
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
