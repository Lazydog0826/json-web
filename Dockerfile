FROM caddy:latest AS base
EXPOSE 80
WORKDIR /app
COPY Caddyfile /etc/caddy
COPY . .
CMD ["caddy", "run"]