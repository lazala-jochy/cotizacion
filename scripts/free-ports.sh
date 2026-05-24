#!/usr/bin/env sh
# Libera puertos usados en desarrollo (3847 API, 5173 Vite)
for port in 3847 5173; do
  pids=$(lsof -ti :"$port" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "Liberando puerto $port (PID: $pids)"
    kill -9 $pids 2>/dev/null || true
  fi
done
