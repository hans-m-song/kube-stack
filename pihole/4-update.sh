#!/bin/bash

set -e
set -o pipefail

adlist=$(curl https://v.firebog.net/hosts/lists.php\?type\=tick)

pod_name=$(kubectl get pod -n pihole -o name | head -n 1)

db="/etc/pihole/gravity.db"

for address in $(echo $adlist); do
  insertions="$insertions
  INSERT OR IGNORE INTO adlist (address) VALUES (\"$address\");
  "
done

kubectl exec $pod_name -n pihole -- sqlite3 $db -batch <<EOF
$insertions
.exit
EOF

kubectl exec $pod_name -n pihole -- pihole -g
