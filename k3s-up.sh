#!/bin/bash

set -euxo pipefail

./init-vlan.sh

curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--node-ip=192.168.1.250 --flannel-iface=eno1.vlan" sh -

helm repo add jetstack https://charts.jetstack.io
helm repo add actions-runner-controller https://actions-runner-controller.github.io/actions-runner-controller
helm repo add portainer https://portainer.github.io/k8s/
helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

helm repo update

helm upgrade cert-manager jetstack/cert-manager \
  --atomic \
  --create-namespace \
  --install \
  --namespace cert-manager \
  --set installCRDs=true \
  --wait

helm upgrade actions-runner-controller actions-runner-controller/actions-runner-controller \
  --set "authSecret.create=true" \
  --set "authSecret.github_token=${GITHUB_PAT}" \
  --set "githubWebhookServer.enabled=true,githubWebhookServer.ports[0].nodePort=33080" \
  --atomic \
  --create-namespace \
  --install \
  --namespace actions-runner-system \
  --wait \
  --dry-run

# TODO prometheus/grafana
# helm show values prometheus prometheus-community/kube-prometheus-stack \
# helm template prometheus prometheus-community/kube-prometheus-stack \
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --install \
  --atomic \
  --create-namespace \
  --namespace prometheus \
  --wait

./create-secrets.sh

kubectl apply -f manifests/cert-manager.k8s.yaml
kubectl apply -f manifests/hello-world.k8s.yaml
kubectl apply -f manifests/ddns.k8s.yaml
kubectl apply -f manifests/prefetch.k8s.yaml
kubectl apply -f manifests/arc.k8s.yaml
kubectl apply -f manifests/minio.k8s.yaml
kubectl apply -f manifests/mongo.k8s.yaml
kubectl apply -f manifests/huisheng.k8s.yaml

# TODO home assistant
# kubectl apply -f manifests/home-assistant.k8s.yaml

# TODO traefik dashboard

# TODO kubernetes dashboard
helm upgrade kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard \
  --set "extraArgs[0]=--enable-insecure-login" \
  --set "ingress.enabled=true" \
  --set "ingress.annotations.kubernetes\.io/ingress\.class=traefik" \
  --set "ingress.annotations.cert-manager\.io/cluster-issuer=cert-manager-cluster-issuer-prd" \
  --set "ingress.hosts[0]=dash.k8s.axatol.xyz" \
  --set "ingress.hosts[0]=dash.k8s.axatol.xyz" \
  --set "ingress.tls[0].secretName=dash-k8s-axatol-xyz-tls" \
  --set "ingress.tls[0].hosts[0]=dash.k8s.axatol.xyz" \
  --atomic \
  --install \
  --create-namespace \
  --namespace kubernetes-dashboard \
  --wait \
  --dry-run >kubernetes-dashboard.yaml
# kubectl apply -f manifests/kubernetes-dashboard.k8s.yaml

helm upgrade portainer portainer/portainer \
  --set "service.type=ClusterIP" \
  --set "ingress.enabled=true" \
  --set "ingress.annotations.cert-manager\.io/cluster-issuer=cert-manager-cluster-issuer-prd" \
  --set "ingress.annotations.kubernetes\.io/ingress\.class=traefik" \
  --set "ingress.hosts[0].host=portainer.k8s.axatol.xyz" \
  --set "ingress.hosts[0].paths[0].path=/" \
  --set "ingress.tls[0].secretName=portainer-k8s-axatol-xyz-tls" \
  --set "ingress.tls[0].hosts[0]=portainer.k8s.axatol.xyz" \
  --atomic \
  --install \
  --create-namespace \
  --namespace portainer \
  --wait

# --set "tls.force=true" \
# --set ingress.annotations."nginx\.ingress\.kubernetes\.io/backend-protocol"=HTTPS \
