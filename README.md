# kube-stack

migration to kubernetes from https://github.com/hans-m-song/server-stack

## Standing up

### Networking

If sharing a host with something that integrates tightly with your NIC, (e.g. pihole)

1. Initialise a virtual NIC with `./init-vlan.sh` (Customise for your own network).
2. Make the script run on startup with `sudo cp ./init-vlan.sh /etc/network/if-up.d/`.

### Initialising

1. Configure your setup following the values in `src/config.ts`
2. Start up a K3S node with `./k3s-up.sh`.

## Features

- [x] automatic tls certificate provisioning with cert-manager
- [x] dynamic dns updates
- [x] automatic persistent volume provisioning with nfs-subdir-external-provisioner
- [ ] synology support for persistent volumes

## Services

- [x] [discord bot](https://github.com/hans-m-song/huisheng)
- [x] [github actions runner controller](https://github.com/actions-runner-controller/actions-runner-controller)
- [x] [minio object storage](https://github.com/minio/minio)
- [x] [home assistant](https://www.home-assistant.io/)
- [x] jellyfin, jackett, sonarr/lidarr/radarr, and qbittorrent

## Housekeeping

- [ ] ci/cd to deploy this repo on changes
- [ ] ectd snapshot backups

## Potential Services

- [ ] calibre server
- [ ] wikipedia mirror
- [ ] steam server
- [ ] calishot mirror
- [ ] gitlab
- [ ] overleaf
- [ ] jupyter notebook
