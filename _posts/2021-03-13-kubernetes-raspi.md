---
layout: post
title: "A Raspberry Pi Kubernetes Cluster with k3OS"
date: 2021-03-13
permalink: kubernetes-raspi
---

Today I decided to cluster together a few Raspberry Pis (two Pi4s and 1 Pi3b) with [k3s and k3OS](https://github.com/rancher/k3OS#quick-start).

![pi-cluster.png]({{site.url}}/assets/resources-kubernetes-raspi/pi-cluster.png)

## Initial Cluster Setup

> Shout out to [Chris Woolum's awesome guide](https://www.chriswoolum.dev/k3s-cluster-on-raspberry-pi) that introduced me to many of the initialization tools we'll be using below! 

To create the images, use [sgielen's](https://github.com/sgielen) imager tool [on GitHub](https://github.com/sgielen/picl-k3OS-image-generator).  


Add your Pi's MAC addresses to the config file as instructed by the README. These were my completed config files, each one named `<PI'S MAC>.yaml`.

In this example:

`rasp-01` is the master \
`rasp-00` and `rasp-02` are the workers.

## Server
```yaml
# the hostname you want for the Pi
hostname: rasp-01

# If you don't add an SSH key, you won't be able to connect directly to the host.
ssh_authorized_keys:
  - <YOUR_KEY>

# Ethernet config
write_files:
  - path: /var/lib/connman/default.config
    content: |-
      [service_eth0]
      Type=ethernet
      IPv4=10.44.0.81/255.255.248.0/10.44.0.1
      IPv6=off
      Nameservers=1.1.1.1

# I found that I needed to do this in order to get ntpd to run
# If ntpd is not running, k3s will NOT start up.
boot_cmd:
  - "ln -sf /etc/init.d/ntpd /etc/runlevels/boot/ntpd"

k3os:
  dns_nameservers:
    - 1.1.1.1
    - 9.9.9.9

  ntp_servers:
    - 0.us.pool.ntp.org
    - 1.us.pool.ntp.org

  k3s_args:
    - server
```

## Agent 
```yaml
hostname: rasp-02

ssh_authorized_keys:
  - <YOUR_KEY>

# Ethernet config
write_files:
  - path: /var/lib/connman/default.config
    content: |-
      [service_eth0]
      Type=ethernet
      IPv4=10.44.0.82/255.255.248.0/10.44.0.1
      IPv6=off
      Nameservers=1.1.1.1

boot_cmd:
  - "ln -sf /etc/init.d/ntpd /etc/runlevels/boot/ntpd"

k3os:
  dns_nameservers:
    - 1.1.1.1
    - 9.9.9.9

  ntp_servers:
    - 0.us.pool.ntp.org
    - 1.us.pool.ntp.org

  k3s_args:
    - agent

  token: <YOUR TOKEN FROM MASTER NODE>

  server_url: https://10.44.0.81:6443

```

I added the following lines to the Dockerfile to use newer versions of k3OS and the raspberry pi kernel.

```Dockerfile
ENV RASPBERRY_PI_FIRMWARE=latest
ENV K3OS_VERSION=v0.11.1
```

Then I built the image and ran the command, just as suggested in the README.

```bash
docker build . -t picl-builder:latest

docker run -e TARGET=raspberrypi -v ${PWD}:/app -v /dev:/dev --privileged picl-builder:latest
```

Finally, use something like Etcher to write the image to a microSD card.

Copy your kubeconfig file from your master node at `/etc/rancher/k3s/k3s.yaml` and add it to your local host at `~/.kube/config`.  You'll need to change the IP from a localhost IP, the the static IP of your Pi master node.

On Mac, downloading kubectl is as easy as running a `brew install kubectl`. Let's see if it worked:

```bash
[~]$ kubectl get nodes
NAME      STATUS   ROLES    AGE     VERSION
rasp-00   Ready    worker   3d20h   v1.18.9+k3s1
rasp-01   Ready    master   3d21h   v1.18.9+k3s1
rasp-02   Ready    worker   3d20h   v1.18.9+k3s1
```

## Traefik Dashboard

https://forums.rancher.com/t/k3s-traefik-dashboard-activation/17142/5

https://randy-stad.gitlab.io/posts/2020-01-29-k3s-traefik-dashboard/ 
https://www.youtube.com/watch?v=Z2dpN7k_IL8

```bash
rasp-01 [/var/lib/rancher/k3s/server/manifests]$ kubectl get endpoints -n kube-system
NAME                    ENDPOINTS                                     AGE
metrics-server          10.42.0.71:443                                3d23h
kube-dns                10.42.0.70:53,10.42.0.70:9153,10.42.0.70:53   3d23h
traefik-prometheus      10.42.2.34:9100                               109s
traefik-dashboard       10.42.2.34:8080                               109s
traefik                 10.42.2.34:443,10.42.2.34:80                  109s
rancher.io-local-path   <none>                                        3d23h
```

## Taint your master node and assign the worker label

```bash
rasp-01$ kubectl taint nodes rasp-01 key1=value1:NoSchedule
```

```bash
local-machine$ kubectl label node rasp-00 node-role.kubernetes.io/worker=worker
```

##