#!/bin/bash

set -euxo pipefail

NIC_NAME="eno1"
DOCKER_ROUTING_INTERFACE_NAME="$NIC_NAME.vlan"
DOCKERNETWORK_IP_ADDRESS="192.168.1.250"
DOCKERNETWORK_IP_RANGE="192.168.1.248/29" # 248-255

sleep 1s

sudo ip link add ${DOCKER_ROUTING_INTERFACE_NAME} link ${NIC_NAME} type macvlan mode bridge
sudo ip addr add ${DOCKERNETWORK_IP_ADDRESS}/32 dev ${DOCKER_ROUTING_INTERFACE_NAME}
sudo ip link set ${DOCKER_ROUTING_INTERFACE_NAME} up
sudo ip route add ${DOCKERNETWORK_IP_RANGE} dev ${DOCKER_ROUTING_INTERFACE_NAME}

# allow parent nic to forward all received packets
sudo ifconfig ${NIC_NAME} promisc

curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--node-ip=${DOCKERNETWORK_IP_ADDRESS} --flannel-iface=${DOCKER_ROUTING_INTERFACE_NAME}" sh -

kubectl apply -k ./hello
kubectl apply -k ./ytdl
kubectl apply -k ./ddns
kubectl apply -k ./redbot
