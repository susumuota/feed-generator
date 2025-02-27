# How to setup a free e2-micro instance on Google Cloud Platform (GCP)

This document describes how to setup a free `e2-micro` instance on Google Cloud Platform (GCP).

At first, check this page to confirm the free tier of GCP.

- https://cloud.google.com/free/docs/free-cloud-features#compute

## Install the gcloud CLI

Install the gcloud CLI because CLI is better than Web UI for automation and reproducibility.

- https://cloud.google.com/sdk/docs/install

But the web UI is also useful for checking the default or typical values of the settings. You can press `EQUIVALENT CODE` button to see the equivalent CLI command on the web UI.

## Create a project

Create a project. e.g. `e2-micro-free-tier-4`. You should create a new project and then delete it later to avoid any unexpected charges.

- https://cloud.google.com/resource-manager/docs/creating-managing-projects#creating_a_project

```sh
export PROJECT_ID="e2-micro-free-tier-4"
gcloud projects create $PROJECT_ID
gcloud projects list
# gcloud projects delete $PROJECT_ID
# unset PROJECT_ID
```

## Enable billing

Follow this instruction. I could not find any way to enable billing from the gcloud CLI.

- https://cloud.google.com/billing/docs/how-to/modify-project#how-to-enable-billing

Then confirm it.

```sh
gcloud beta billing projects describe $PROJECT_ID
```

It should show `billingEnabled: true`.

## Choose region, zone, image and machine type

Choose a region from `us-west1`, `us-central1`, `us-east1` which are within free-tier. e.g. `us-central1`.

Choose a zone. e.g. `us-central1-a`.

Enable Compute Engine API. Then list images and machine types.

- https://cloud.google.com/compute/docs/instances/create-start-instance#view-images

```sh
export REGION="us-central1"
export ZONE="us-central1-a"
gcloud services enable compute.googleapis.com --project=$PROJECT_ID
gcloud compute images list --project=$PROJECT_ID > images_list.txt
gcloud compute machine-types list --project=$PROJECT_ID --zones=$ZONE > machine_types_list.txt
# gcloud services disable compute.googleapis.com --project=$PROJECT_ID
# unset REGION ZONE
```

Choose an image from `images_list.txt`. Memo both of `PROJECT` field and `FAMILY` field. e.g. `ubuntu-os-cloud` and `ubuntu-2204-lts`.

Choose a machine type from `machine_types_list.txt`. e.g. `e2-micro` for free-tier.

## Create a disk

Here, I prefer to create a disk and instance separately to manage them. But you can create an instance with a disk at the same time.

Create a disk with image. A `30GB` standard persistent disk (`pd-standard`) should be within free-tier.

```sh
export DISK_NAME="disk-1"
export DISK_SIZE="30GB"
export DISK_TYPE="pd-standard"
export IMAGE_PROJECT="ubuntu-os-cloud"
export IMAGE_FAMILY="ubuntu-2204-lts"
gcloud compute disks create $DISK_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --size=$DISK_SIZE \
  --type=$DISK_TYPE \
  --image-project=$IMAGE_PROJECT \
  --image-family=$IMAGE_FAMILY
gcloud compute disks describe $DISK_NAME --project=$PROJECT_ID --zone=$ZONE
gcloud compute disks list --project=$PROJECT_ID
# gcloud compute disks delete $DISK_NAME --project=$PROJECT_ID --zone=$ZONE
# unset DISK_NAME DISK_SIZE DISK_TYPE IMAGE_PROJECT IMAGE_FAMILY
```

See reference for more options.

- https://cloud.google.com/sdk/gcloud/reference/compute/disks/create


## Optional: Create firewall rules

If you want to open HTTP or HTTPS ports, you need to create firewall rules.

- https://cloud.google.com/vpc/docs/using-firewalls

Later, you can specify tags to the instance to allow the traffic. e.g. `http-server`.

```sh
gcloud compute firewall-rules create default-allow-http \
  --project=$PROJECT_ID \
  --network=default \
  --priority=1000 \
  --direction=INGRESS \
  --action=allow \
  --rules=tcp:80 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server
gcloud compute firewall-rules create default-allow-https \
  --project=$PROJECT_ID \
  --network=default \
  --priority=1000 \
  --direction=INGRESS \
  --action=allow \
  --rules=tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=https-server
gcloud compute firewall-rules describe default-allow-http --project=$PROJECT_ID
gcloud compute firewall-rules describe default-allow-https --project=$PROJECT_ID
gcloud compute firewall-rules list --project=$PROJECT_ID
# gcloud compute firewall-rules delete default-allow-http --project=$PROJECT_ID
# gcloud compute firewall-rules delete default-allow-https --project=$PROJECT_ID
```

## Optional: Reserve an external static address

If you have a plan to publish a web server, you need to reserve an external static address.

> **Note:** Don't forget to delete the address after you delete the instance, otherwise you will be charged for the address.

```sh
export ADDRESS_NAME="external-ip-1"
gcloud compute addresses create $ADDRESS_NAME --project=$PROJECT_ID --region=$REGION
gcloud compute addresses list --project=$PROJECT_ID
# gcloud compute addresses delete $ADDRESS_NAME --project=$PROJECT_ID --region=$REGION
```

## Create an instance

Create an instance with the disk and machine type. `e2-micro` should be within free-tier.

`SCOPES` specify GCP services that the instance can access. e.g. `storage-full` for GCS.

`TAGS` specify firewall-rules tags that the instance can access. e.g. `http-server` for HTTP.

```sh
export INSTANCE_NAME="instance-1"
export MACHINE_TYPE="e2-micro"
export SCOPES="default,storage-full"  # or just "default"
# export TAGS="http-server,https-server"
# uncomment --address line below if you reserved an external static address
# uncomment --tags line below if you created firewall rules
gcloud compute instances create $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=$MACHINE_TYPE \
  --scopes=$SCOPES \
  --disk=boot=yes,device-name=${DISK_NAME},mode=rw,name=${DISK_NAME} \
  # --address=$ADDRESS_NAME \
  # --tags=$TAGS \
gcloud compute instances describe $INSTANCE_NAME --project=$PROJECT_ID --zone=$ZONE
gcloud compute instances list --project=$PROJECT_ID
# gcloud compute instances delete $INSTANCE_NAME --project=$PROJECT_ID --zone=$ZONE
# unset INSTANCE_NAME MACHINE_TYPE SCOPES
```

See the reference for more options.

- https://cloud.google.com/sdk/gcloud/reference/compute/instances/create

## Connect to the instance

Open a terminal on your local machine.

Optional: Add the private key to the ssh-agent.

```sh
ssh-add ~/.ssh/google_compute_engine
```

Connect to the instance.

```sh
gcloud compute ssh $INSTANCE_NAME --project=$PROJECT_ID --zone=$ZONE
```

For port forwarding.

```sh
gcloud compute ssh $INSTANCE_NAME --project=$PROJECT_ID --zone=$ZONE -- -L 3000:localhost:3000
```

See the reference for more options. e.g. port forwarding.

- https://cloud.google.com/solutions/connecting-securely#port-forwarding-over-ssh

Confirm disks and memory.

```sh
$ df -h
Filesystem      Size  Used Avail Use% Mounted on
/dev/root        29G  1.8G   28G   7% /
tmpfs           483M     0  483M   0% /dev/shm
tmpfs           194M  928K  193M   1% /run
tmpfs           5.0M     0  5.0M   0% /run/lock
/dev/sda15      105M  5.3M  100M   5% /boot/efi
tmpfs            97M  4.0K   97M   1% /run/user/1001
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           965Mi       213Mi       362Mi       0.0Ki       390Mi       610Mi
Swap:             0B          0B          0B
```

We will create swap files later.

## Update packages

```sh
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
sudo reboot
```

Then, login again.

## Add swap files

Add an 1GB swap file.

- https://help.ubuntu.com/community/SwapFaq
- https://www.digitalocean.com/community/tutorials/how-to-add-swap-space-on-ubuntu-20-04-ja

```sh
cat /proc/swaps
ls -l /swapfile                  # check if /swapfile does not exist
sudo fallocate -l 1g /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
cat /proc/swaps
```

If you want to make the swap file permanent, edit `/etc/fstab`.

```sh
sudo cp -p /etc/fstab /etc/fstab.bak
sudo nano /etc/fstab
```

Append the following line to the end of the file.

```
/swapfile swap swap defaults 0 0
```

Then, reboot and login again. Check the swap file.

```sh
cat /proc/swaps
```

# Setup with Cloudflare Tunnel

- https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/local/


```sh
sudo apt-get update && sudo apt-get install -y cloudflared
```

```sh
cloudflared tunnel login
cloudflared tunnel create feed
cloudflared tunnel list  # copy ID and paste it to <Tunnel-UUID> on config.yaml
```

```sh
emacs ~/.cloudflared/config.yaml
```

```yaml
url: http://localhost:3000
tunnel: <Tunnel-UUID>
credentials-file: /home/username/.cloudflared/<Tunnel-UUID>.json
```

```sh
cloudflared tunnel run feed
```

## Optional: Create a snapshot schedule

Create a snapshot schedule. Take snapshots everyday at 20:00, retain them for 7 days.

- https://cloud.google.com/compute/docs/disks/scheduled-snapshots

```sh
export SCHEDULE_NAME="snapshot-schedule-1"
export MAX_RETENTION_DAYS="7"
export START_TIME="20:00"
export DELETION_OPTION="keep-auto-snapshots"
gcloud compute resource-policies create snapshot-schedule $SCHEDULE_NAME \
  --project=$PROJECT_ID \
  --region=$REGION \
  --max-retention-days=$MAX_RETENTION_DAYS \
  --start-time=$START_TIME \
  --on-source-disk-delete $DELETION_OPTION \
  --storage-location=$REGION \
  --daily-schedule
gcloud compute resource-policies describe $SCHEDULE_NAME --project=$PROJECT_ID --region=$REGION
gcloud compute resource-policies list --project=$PROJECT_ID
# gcloud compute resource-policies delete $SCHEDULE_NAME --project=$PROJECT_ID --region=$REGION
# unset SCHEDULE_NAME MAX_RETENTION_DAYS START_TIME DELETION_OPTION
```

Then, attach the snapshot schedule to the disk.

```sh
gcloud compute disks add-resource-policies $DISK_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --resource-policies=$SCHEDULE_NAME
gcloud compute disks describe $DISK_NAME --project=$PROJECT_ID --zone=$ZONE
# gcloud compute disks remove-resource-policies $DISK_NAME --project=$PROJECT_ID --zone=$ZONE --resource-policies=$SCHEDULE_NAME
```

## Delete the instance, disk and project

You have to delete the instance and the disk separately.

- https://cloud.google.com/compute/docs/instances/deleting-instance#gcloud

Delete the snapshot schedule and the snapshots.

```sh
gcloud compute disks remove-resource-policies $DISK_NAME --project=$PROJECT_ID --zone=$ZONE --resource-policies=$SCHEDULE_NAME
gcloud compute resource-policies delete $SCHEDULE_NAME --project=$PROJECT_ID --region=$REGION
gcloud compute resource-policies list --project=$PROJECT_ID
# delete all of the snapshots
gcloud compute snapshots list --project=$PROJECT_ID
# gcloud compute snapshots delete $SNAPSHOT_NAME  --project=$PROJECT_ID
```

Delete the instance.

```sh
gcloud compute instances delete $INSTANCE_NAME --project=$PROJECT_ID --zone=$ZONE
gcloud compute instances list --project=$PROJECT_ID
```

Delete the address.

```sh
gcloud compute addresses delete $ADDRESS_NAME --project=$PROJECT_ID --region=$REGION
gcloud compute addresses list --project=$PROJECT_ID
```

Delete the disk.

```sh
gcloud compute disks delete $DISK_NAME --project=$PROJECT_ID --zone=$ZONE
gcloud compute disks list --project=$PROJECT_ID
```

Delete the project if you don't need it to avoid any unexpected charges.

```sh
gcloud projects delete $PROJECT_ID
gcloud projects list
```

That's all.

## Author

Susumu OTA
