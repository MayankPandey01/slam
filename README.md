<h1 align="center">
  <br>
  <a href="https://github.com/MayankPandey01/slam/"><img width="750" height="250" src="https://github.com/user-attachments/assets/a3cd910f-414e-4a08-8c65-6fb31596e00b"></a>
</h1>
<h4 align="center">A Network monitoring tool for scanning and analyzing devices on your local area network </h4>

<p align="center">
<a href="https://www.python.org/"><img src="https://img.shields.io/badge/Made%20with-Python-1f425f.svg"></a>
<a href="https://react.dev/"><img src="https://img.shields.io/badge/Made%20with-React-1f425f.svg"></a>
<a href="https://github.com/MayankPandey01/slam/issues"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square"></a>
<a href="https://twitter.com/mayank_pandey01"><img src="https://img.shields.io/twitter/follow/mayank_pandey01?style=social"></a>
<a href="https://pypi.python.org/pypi/ansicolortags/"><img src="https://img.shields.io/pypi/l/ansicolortags.svg"></a>
<a href="https://github.com/ellerbrock/open-source-badges/"><img src="https://badges.frapsoft.com/os/v1/open-source.svg?v=103"></a>  
</p>




# 🤔 What is this?

**SLAM (Simple Local Area Monitor)** is a simple tool that helps you scan and track devices on your local network.

**SLAM** works in the background, automatically scanning any network you connect to, and keeps a historical record of the devices and network for future reference. It’s a hands-off solution for continuous network monitoring and security tracking, making it useful for network admins, security enthusiasts, and hobbyists.

# 🚀 Usage
SLAM consists of two main components:

- **Frontend**: A user interface to visualize the network scan results. This can be easily deployed using Docker Compose.

- **Backend**: A service that performs the network scans and stores the data. This is installed via pip and managed using Python’s package manager.

```
The separate backend in SLAM was needed because Docker on macOS has a limitation:  
it does not support the `--network=host` option, which prevents containers from sharing the host's network stack.

As a result, tools like nmap or arp-scan, which require direct access to the host's network interface,  
cannot function properly within Docker containers on macOS.

To bypass this, the backend handles the scanning tasks. It runs separately, with full network access,  
performs the scans and sends the results to the frontend.  
This ensures proper functionality and avoids Docker’s networking limitations on macOS.
```
<img width="1505" alt="image" src="https://github.com/user-attachments/assets/a5b70f25-22f7-4e83-a516-35d9da2f92b5" />

<br>


https://github.com/user-attachments/assets/05e3bc7d-a5a7-4192-b2c6-ebde5bbffc00

# 🔧Installation

## 🔨 Using Docker and pip

The frontend can be deployed using Docker Compose, and it will be accessible at [http://localhost:3000](http://localhost:3000).

```bash
git clone https://github.com/MayankPandey01/slam.git
cd slam
docker compose up --build
```
The backend can be installed as an executable by running pip install from the root directory.
This will create an executable called `slam` in the current directory, which can be run directly.

```
pip install .
```
The backend service uses the following ports:

- FastAPI running on **localhost:5000**, with API documentation available at **localhost:5000/docs**

- WebSocket server running on **ws://127.0.0.1:6789**

**The backend stores data in a local SQLite database file.**


## 🧪 Recommended Python Version:
- This Tool Only Supports Python 3.
- The recommended version for Python 3 is 3.10.x.

## ⛳ Dependencies:

To run SLAM, the following binaries must be installed on your host system:

- **ipconfig:** Used for retrieving network configuration and interface details.

- **arp-scan:** A network scanning tool used to detect devices on the local network via ARP requests.

- **nmap:** A network scanning tool that can discover hosts and services on a computer network.

Make sure to install these tools before running SLAM. You can install them using the following commands:

**For macOS:**

```bash
brew install arp-scan nmap
```

**For Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install arp-scan nmap
```
## 🐞 Is this tool for me?

This tool is mainly focused on Network Administrators and Security Enthusiasts.
You can use **SLAM** to scan local networks, identify devices, and perform reconnaissance on connected systems, which is helpful for network auditing, vulnerability assessments, or discovering potential targets in a penetration testing engagement.

**Why Use This ❓**

- **Automatic Background Scanning:** SLAM runs continuously in the background, scanning any network you join without manual input.

- **Real-Time Device Discovery:** Instantly identifies devices on the network, providing immediate insights.

- **Local Data Storage:** Keeps a historical record of devices in a local SQLite database for easy reference.

- **Security Auditing:** Perfect for Network Security Professionals and Security Enthusiasts to spot potential vulnerabilities.

- **Easy Setup:** Quick deployment via Docker Compose for the frontend and pip install for the backend.

 

## 🎯 Contribution ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)
We love to get contributions from the Open Source Community💙. You are Welcome to provide your Important Suggestions to make this tool more Awesome. Open a PR  and we will see to it ASAP.

**Ways to contribute**
- Suggest a feature
- Add More Methods to Identify Hostnames
- Report a bug
- Fix something and open a pull request
- Spread the word

## 📚 DISCLAIMER

This project is a [personal development](https://en.wikipedia.org/wiki/Personal_development). Please respect its philosophy and don't use it for evil purposes. By using SLAM, you agree to the MIT license included in the repository. For more details at [The MIT License &mdash; OpenSource](https://opensource.org/licenses/MIT).

Using SLAM for attacking targets without prior mutual consent is illegal. It is the end user's responsibility to obey all applicable local, state, and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program.

Happy Hacking ✨✨

## 📃 Licensing

This project is licensed under the MIT license.

## Star History

<p align="center">
  <a href="[https://star-history.com/#MayankPandey01/slam&Date](https://avatars.githubusercontent.com/u/29165227?v=4)">
   <picture>
     <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=MayankPandey01/slam&type=Date&theme=dark" />
     <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=MayankPandey01/slam&type=Date" />
     <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=MayankPandey01/slam&type=Date" />
   </picture>
  </a>
</p>
