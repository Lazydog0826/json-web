FROM nginx:latest AS base
WORKDIR /app
COPY nginx.conf /etc/nginx/nginx.conf
COPY . .
CMD ["nginx", "-g", "daemon off;"]