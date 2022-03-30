# kube-stack

migration to kubernetes from https://github.com/hans-m-song/server-stack

## Standing up

1. Initialise a virtual NIC with `./init-vlan.sh` (Customise for your own network).
2. Make the script run on startup with `sudo cp ./init-vlan.sh /etc/network/if-up.d/`.
3. Start up a K3S node with `./k3s-up.sh`.

## Features

- [x] automatic tls certificate provisioning
- [x] dynamic dns updates
- [ ] synology support for persistent volumes

## Services

- [x] discord bot
- [x] github actions runner controller
- [ ] dlna or plex or something similar
- [ ] transmission

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
