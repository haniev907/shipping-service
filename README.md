# CindxServer

## Working with ansible

You can operate with the servers manually or use ansible playbooks for some frequent operations, e.g. "run user-listener service on 5 servers".

### Specify the hosts list

Modify the `ansible/hosts` file if necessary. **Attention!** The group name, e.g. `user-listener` should be the same as the container name, that should be runned on it.

### Restart the container

```
ansible-playbook restart.yml -i hosts --extra-vars="service=following"
```

### Get the container logs

```
ansible-playbook get_logs.yml --extra-vars="service=market-parser tail=100"
```

### Add SSH key to the root

**Important** Don't forget the single quotes around the `key` value into the `extra-vars` content.

```
ansible-playbook ansible/add_key.yml -i ansible/hosts --extra-vars="key='ssh-rsa KEY STUFF pavlovdog@pavlovdog'"
```

## Using custom scripts

For different scenarios it's make sense to build the sequence of ansible playbooks.

### Restarting all the services

This script allows you to:

1. Flush the Redis (for some reason Bull may work pretty shitty, so it makes sense to flush Redis sometimes)
2. Restart all the services

```
cd ansible/scripts/
./restart_all.sh
```

## Collect the metrics

By using Prometheus, Grafana, node-exporter, list of custom metrics and custom dashboards, you can monitor multiple platform characteristics.

## Restarting the node-exporter

Node exporter is the special software, which is usually used by the Prometheus to collect bare-metal metrics (CPU, RAM, disk, etc).

```
docker run --name node-exporter -d -p 9100:9100 prom/node-exporter
```

To run node-exporter on each server from the `hosts` use the following ansible script:

```
ansible-playbook restart_node_exporter.yml -i hosts
```

## Restarting the Prometheus server & Grafana dashboards

This services could be started by using only one docker-compose file.

```
cd CindxServer/monitoring/
docker-compose up -d
```

## Restarting the metrics exporter

There are some custom metrics, which have been designed for visualizing the inner logic of the platform.

```
docker run -d -p 9822:9822 --name metrics -e SERVICE_NAME=metrics --env-file envs/dev.env bitinvest/cdx:standalone
```
