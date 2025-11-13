echo "Updating package lists and installing dependencies..."
apt update
apt install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

echo "Adding Docker’s official GPG key..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "Adding Docker repository to sources list..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Updating package lists after adding Docker repo..."
apt update

echo "Installing Docker Engine, CLI, and containerd..."
apt install -y docker-ce docker-ce-cli containerd.io

echo "Enabling Docker service to start on boot..."
systemctl enable docker

echo "Starting Docker service..."
systemctl start docker
# systemctl status docker

echo "Creating systemd override directory for Docker service..."
mkdir -p /etc/systemd/system/docker.service.d

echo "Configuring Docker to listen on TCP port 2375..."
tee /etc/systemd/system/docker.service.d/setup.conf > /dev/null <<EOL
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// -H tcp://127.0.0.1:2375
EOL

echo "Reloading systemd configuration and restarting Docker..."
systemctl daemon-reexec
systemctl daemon-reload
systemctl restart docker

echo "Docker installation and configuration complete."
