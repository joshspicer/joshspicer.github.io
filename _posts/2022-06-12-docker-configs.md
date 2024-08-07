---
layout: post
title: "Docker Config(s)"
date: 2022-06-12
permalink: docker-configs
---

<!-- ![1.png]({{site.url}}/assets/resources-docker-config/1.png) -->

## Pi-hole & Cloudflared (DoH)

My network's DNS traffic gets routed through a local Pi-Hole instance with its upstream DNS server proxied by [cloudflared](https://github.com/cloudflare/cloudflared) to several public DNS over HTTP services.

This config is inspired by [this blog post](http://mroach.com/2020/08/pi-hole-and-cloudflared-with-docker).

```yaml
version: "3"

services:
  cloudflared:
    container_name: cloudflared
    image: cloudflare/cloudflared
    command: proxy-dns
    environment:
      - "TUNNEL_DNS_UPSTREAM=https://1.1.1.1/dns-query,https://1.0.0.1/dns-query,https://9.9.9.9/dns-query,https://149.112.112.9/dns-query"
      - "TUNNEL_DNS_PORT=5053"
      - "TUNNEL_DNS_ADDRESS=0.0.0.0"
    restart: unless-stopped
    networks:
      pihole_net:
        ipv4_address: 10.0.0.2

  pi-hole:
    container_name: pi-hole
    image: pihole/pihole
    restart: unless-stopped
    ports:
      - "8053:80/tcp"
      - "53:53/tcp"
      - "53:53/udp"
    environment:
      - ServerIP=10.0.0.3
      - DNS1=10.0.0.2#5053
      - DNS2='no'
      - IPv6=false
      - TZ=America/New_York
      - DNSMASQ_LISTENING=all
    networks:
      pihole_net:
        ipv4_address: 10.0.0.3
    dns:
      - 127.0.0.1
      - 1.1.1.1
    volumes:
      - "/etc/app-data/pihole-cloudflared/config:/etc/pihole/"
      - "/mnt/app-data/pihole-cloudflared/dnsmasq:/etc/dnsmasq.d/"
    cap_add:
      - NET_ADMIN

networks:
  pihole_net:
    driver: bridge
    ipam:
      config:
        - subnet: 10.0.0.0/29
```

## Unifi Controller

I run my Unifi controller in a docker container.

I get my compose file from [jacobalberty/unifi-docker](https://github.com/jacobalberty/unifi-docker).

```yaml
version: "2.3"
services:
  mongo:
    image: mongo:3.6
    container_name: ${COMPOSE_PROJECT_NAME}_mongo
    networks:
      - unifi
    restart: always
    volumes:
      - db:/data/db
      - dbcfg:/data/configdb
  controller:
    image: "jacobalberty/unifi:${TAG:-latest}"
    container_name: ${COMPOSE_PROJECT_NAME}_controller
    depends_on:
      - mongo
    init: true
    networks:
      - unifi
    restart: always
    volumes:
      - dir:/unifi
      - data:/unifi/data
      - log:/unifi/log
      - cert:/unifi/cert
      - init:/unifi/init.d
      - run:/var/run/unifi
      # Mount local folder for backups and autobackups
      - ./backup:/unifi/data/backup
    user: unifi
    sysctls:
      net.ipv4.ip_unprivileged_port_start: 0
    environment:
      DB_URI: mongodb://mongo/unifi
      STATDB_URI: mongodb://mongo/unifi_stat
      DB_NAME: unifi
    ports:
      - "3478:3478/udp" # STUN
      - "6789:6789/tcp" # Speed test
      - "8080:8080/tcp" # Device/ controller comm.
      - "8443:8443/tcp" # Controller GUI/API as seen in a web browser
      - "8880:8880/tcp" # HTTP portal redirection
      - "8843:8843/tcp" # HTTPS portal redirection
      - "10001:10001/udp" # AP discovery
  logs:
    image: bash
    container_name: ${COMPOSE_PROJECT_NAME}_logs
    depends_on:
      - controller
    command: bash -c 'tail -F /unifi/log/*.log'
    restart: always
    volumes:
      - log:/unifi/log

volumes:
  db:
  dbcfg:
  data:
  log:
  cert:
  init:
  dir:
  run:

networks:
  unifi:
```

## Minecraft Bedrock

Enough said ⚒️

```yaml
version: '3.4'

services:
  bds:
    image: itzg/minecraft-bedrock-server
    environment:
      EULA: "TRUE"
      GAMEMODE: survival
      DIFFICULTY: normal
      SERVER_NAME: SpiceCraft
    ports:
      - 19132:19132/udp
    volumes:
      - bds:/data
    stdin_open: true
    tty: true
  backup:
    image: kaiede/minecraft-bedrock-backup
    container_name: minecraft_backup
    restart: always
    depends_on:
      - "bds"
    environment:
      TZ: "America/Los_Angeles"
    tty: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /home/josh/backups/auto:/backups
      - bds:/server

volumes:
  bds: {}
```

Add this shell script as a local cron job to backup to Azure Blob storage.

```bash
#!/bin/bash

SAS="https://minecraftbackups.blob.core.windows.net/bedrock?<SAS_SIGNATURE>"

CONTAINER_NAME="bedrock"

SOURCE="/home/josh/backups/auto"

/usr/bin/azcopy sync "$SOURCE" "$SAS" --recursive | tee /home/josh/backups/az_logs/$(date -u +'%Y-%m-%d_%H:%M')

```

## Frigate

I use frigate as my NVR with a Google Coral ML accelerator. This also runs in an LXC container on my proxmox machine, writing to an attached SSD mounted here on the host side as `/data`:

```yml
version: "3.9"
services:
  frigate:
    container_name: frigate
    privileged: true 
    restart: unless-stopped
    image: ghcr.io/blakeblackshear/frigate:stable
    shm_size: "64mb" 
    devices:
      - /dev/bus/usb:/dev/bus/usb # passes the USB Coral
      - /dev/dri/renderD128 # for intel hwaccel, needs to be updated for your hardware
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /data/frigate/config:/config
      - /data/frigate/cctv_clips:/media/frigate
      - type: tmpfs # Optional: 1GB of memory, reduces SSD/SD Card wear
        target: /tmp/cache
        tmpfs:
          size: 1000000000
    ports:
      - "5000:5000"
      - "8554:8554" # RTSP feeds
      - "8555:8555/tcp" # WebRTC over tcp
      - "8555:8555/udp" # WebRTC over udp
    environment:
      FRIGATE_RTSP_PASSWORD: "******"
```

