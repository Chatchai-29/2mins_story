#!/usr/bin/env bash
echo "=== WSL GPU libs (vulkan/d3d related) ==="
ls /usr/lib/wsl/lib/ | grep -i -E 'vulkan|dxg|d3d|glx' || echo '(none)'
echo
echo "=== all WSL libs ==="
ls /usr/lib/wsl/lib/
echo
echo "=== vulkan packages installed ==="
dpkg -l | grep -E 'mesa-vulkan|vulkan-tools|libvulkan' || echo '(none)'
echo
echo "=== candidate packages in apt ==="
apt-cache policy mesa-vulkan-drivers vulkan-tools libvulkan1 2>/dev/null | grep -E '^[a-z]|Installed|Candidate'
echo
echo "=== ubuntu release ==="
lsb_release -d 2>/dev/null || cat /etc/os-release | head -2
