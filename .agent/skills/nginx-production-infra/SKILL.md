---
name: nginx-production-infra
description: Production-grade Nginx configuration and scaling guidelines for the RE-Engine ecosystem.
---

# Nginx Production Infrastructure Skill

This skill provides a high-performance configuration for Nginx as a reverse proxy, covering SSL, rate limiting, and horizontal scaling.

## Objective
Secure the application layer, optimize static asset delivery, and provide a stable entry point for both web and mobile traffic.

## 🛠️ Implementation Guide

### 1. Reverse Proxy Config (`nginx/reengine.conf`)
Basic high-performance configuration.

```nginx
server {
    listen 80;
    server_name api.reengine.cloud;

    location / {
        proxy_pass http://engine:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
    }
}
```

### 2. Rate Limiting
Protect the system against brute-force and DDoS.

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    # ...
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://engine:3000;
    }
}
```

### 3. Horizontal Scaling (Load Balancing)
Configure Nginx to distribute traffic across multiple engine instances.

```nginx
upstream reengine_cluster {
    server engine-1:3000;
    server engine-2:3000;
    least_conn; # Distribute to instance with fewest active connections
}

server {
    location / {
        proxy_pass http://reengine_cluster;
    }
}
```

## ⚠️ Best Practices
- **SSL Termination**: Always use Let's Encrypt (Certbot) for SSL termination at the Nginx level.
- **Buffer Tuning**: Increase `proxy_buffer_size` if your API returns large JSON objects (e.g., property feature list).
- **Worker Processes**: Set `worker_processes auto` and `worker_connections 1024` for standard production loads.
