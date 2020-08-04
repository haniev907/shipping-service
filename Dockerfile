FROM keymetrics/pm2:13-alpine

RUN pm2 install pm2-logrotate

RUN apk update \
    && apk upgrade \
    && apk add --no-cache git openssh

RUN mkdir -p /home/cdx
WORKDIR /home/cdx
COPY ./package.json ./package-lock.json ./link.sh ./
COPY ./config/package.json ./config/package-lock.json ./config/
COPY ./src/cdx/package.json ./src/cdx/package-lock.json ./src/cdx/
COPY ./src/cdx-util/package.json ./src/cdx-util/package-lock.json ./src/cdx-util/
COPY ./src/cdx-stocks/package.json ./src/cdx-stocks/package-lock.json ./src/cdx-stocks/
COPY ./src/cdx-tasks/package.json ./src/cdx-tasks/package-lock.json ./src/cdx-tasks/
RUN npm install --unsafe-perm

COPY . .

RUN export TZ="Etc/UTC" \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone

ENTRYPOINT pm2-runtime start ./pm2/$SERVICE_NAME.json
