#!/bin/bash
set -e

cd /home/azureuser/Darktechappdesignn12
git add .
git commit -m "Atualização automática via VPS/OpenClaw" || echo "Nada para commitar"
git push
