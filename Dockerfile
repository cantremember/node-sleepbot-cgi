# Build container
FROM node:16-alpine as builder
WORKDIR /opt/project

RUN \
    apk update && \
    apk add make

COPY app ./app
COPY bin ./bin
COPY config ./config
COPY lib ./lib
COPY views ./views
COPY Makefile .
COPY index.mjs .

COPY .npmrc ./
COPY package-lock.json ./
COPY package.json ./

RUN npm install --omit=dev


# Image container
FROM node:16-alpine as container
WORKDIR /opt/project

# @see config/production.json
ENV NODE_ENV="production"
ENV httpPort=3000

EXPOSE ${httpPort}

COPY --from=builder /opt/project .
# (no adjustments; it's just a demo of a multi-stage build)

# same as `make server`
CMD [ "node", "bin/app.mjs" ]
