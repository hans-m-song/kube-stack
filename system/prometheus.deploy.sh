helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install \
  -n prometheus \
  -f prometheus/prometheus.values.yaml \
  prometheus prometheus-community/kube-prometheus-stack
