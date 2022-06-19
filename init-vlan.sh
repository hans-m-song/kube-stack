#!/bin/bash

set -euxo pipefail

NIC_NAME="eno1"
VNIC="$NIC_NAME.vlan"
STATIC_IP="192.168.1.250"
IP_RANGE="192.168.1.248/29" # 248-255
MAC_ADDRESS="A2:73:D3:1C:1D:FC"
sleep 1s

sudo ip link add ${VNIC} address ${MAC_ADDRESS} link ${NIC_NAME} type macvlan mode bridge
sudo ip addr add ${STATIC_IP}/32 dev ${VNIC}
sudo ip link set ${VNIC} up
sudo ip route add ${IP_RANGE} dev ${VNIC}

# allow parent nic to forward all received packets
sudo ifconfig ${NIC_NAME} promisc
