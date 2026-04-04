FROM node:22-alpine AS client-build
WORKDIR /client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache gettext
COPY web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=client-build /client/dist /usr/share/nginx/html
EXPOSE 80
ENTRYPOINT ["sh", "-c", "export API_UPSTREAM=${API_UPSTREAM:-http://api:3001}; envsubst '$API_UPSTREAM' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
