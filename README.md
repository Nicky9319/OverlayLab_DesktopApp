# setup

An Electron application with React

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```


## Connecting Dockerode (Node.js) to Docker in WSL

This guide documents the **technical steps** taken to enable Dockerode (Node.js) to connect to Docker running inside a WSL2 distro on Windows.

---

### 1. **Modify Docker Service Configuration in WSL**

By default, Docker inside WSL listens on a Unix socket (`/var/run/docker.sock`) that is not accessible from Windows. To allow access from Node.js on Windows, you need to make Docker listen on a TCP socket.

#### Create systemd override configuration:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo nano /etc/systemd/system/docker.service.d/override.conf
```

#### Add the following content:

```ini
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// -H tcp://127.0.0.1:2375
```

> This clears the default ExecStart and adds TCP listening on `localhost:2375`.

---

### 2. **Reload and Restart Docker**

Apply the new configuration:

```bash
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl restart docker
```

Verify Docker is now listening on the TCP port:

```bash
curl http://localhost:2375/version
```

---

### 3. **Connect Dockerode from Node.js on Windows**

Install Dockerode:

```bash
npm install dockerode
```

Create a simple test file (`dockerode-test.js`):

```js
const Docker = require('dockerode');
const docker = new Docker({ host: '127.0.0.1', port: 2375 });

docker.listContainers((err, containers) => {
  if (err) return console.error(err);
  console.log(containers);
});
```

Run it from your Windows shell:

```bash
node dockerode-test.js
```

If everything is configured correctly, it will list the running Docker containers from WSL.

---


