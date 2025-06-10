#!/bin/bash

# SSL Certificate Setup Script for SambaTV AI Platform
# Uses Let's Encrypt with Certbot

set -e

DOMAIN=${1:-ai.sambatv.com}
EMAIL=${2:-devops@sambatv.com}

echo "🔐 Setting up SSL certificates for $DOMAIN"
echo "========================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Create required directories
echo "📁 Creating SSL directories..."
mkdir -p ./nginx/ssl
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Check if certificates already exist
if [ -f "./certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL certificates already exist for $DOMAIN"
    read -p "Do you want to renew them? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Start nginx temporarily for domain validation
echo "🚀 Starting Nginx for domain validation..."
docker-compose up -d nginx

# Wait for nginx to be ready
sleep 5

# Request certificates
echo "📝 Requesting SSL certificates from Let's Encrypt..."
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN \
    -d minio.$DOMAIN \
    -d monitoring.$DOMAIN

# Generate strong DH parameters if not exists
if [ ! -f "./certbot/conf/dhparam.pem" ]; then
    echo "🔑 Generating DH parameters (this may take a while)..."
    openssl dhparam -out ./certbot/conf/dhparam.pem 2048
fi

# Create SSL options file
cat > ./certbot/conf/options-ssl-nginx.conf << 'EOF'
# Strong SSL Security
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

# SSL session settings
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Security headers are set in main nginx config
EOF

# Create certificate renewal script
cat > ./scripts/renew-certificates.sh << 'EOF'
#!/bin/bash
# Certificate renewal script

echo "[$(date)] Checking certificate renewal..."
docker-compose run --rm certbot renew

# Reload nginx if renewal was successful
if [ $? -eq 0 ]; then
    echo "[$(date)] Reloading Nginx..."
    docker-compose exec nginx nginx -s reload
fi

echo "[$(date)] Certificate renewal check completed"
EOF

chmod +x ./scripts/renew-certificates.sh

# Set up cron job for automatic renewal
echo "⏰ Setting up automatic renewal..."
(crontab -l 2>/dev/null; echo "0 0,12 * * * cd $(pwd) && ./scripts/renew-certificates.sh >> ./logs/ssl-renewal.log 2>&1") | crontab -

# Restart nginx with SSL configuration
echo "🔄 Restarting Nginx with SSL configuration..."
docker-compose restart nginx

# Verify SSL setup
echo "🔍 Verifying SSL setup..."
sleep 5

# Test HTTPS connection
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/health | grep -q "200"; then
    echo "✅ SSL setup completed successfully!"
    echo ""
    echo "🌐 Your services are now available at:"
    echo "   Main App: https://$DOMAIN"
    echo "   MinIO Console: https://minio.$DOMAIN"
    echo "   Monitoring: https://monitoring.$DOMAIN (internal only)"
    echo ""
    echo "🔐 SSL Grade: Run 'curl -s https://api.ssllabs.com/api/v3/analyze?host=$DOMAIN' to check"
else
    echo "⚠️  SSL setup completed but health check failed"
    echo "   Please check the logs: docker-compose logs nginx"
fi

echo ""
echo "📋 Certificate Information:"
docker-compose run --rm certbot certificates

# Create SSL monitoring script
cat > ./scripts/check-ssl-expiry.sh << 'EOF'
#!/bin/bash
# Check SSL certificate expiration

DOMAIN=${1:-ai.sambatv.com}
DAYS_WARNING=30

expiry_date=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
expiry_epoch=$(date -d "$expiry_date" +%s)
current_epoch=$(date +%s)
days_left=$(( ($expiry_epoch - $current_epoch) / 86400 ))

echo "SSL Certificate Status for $DOMAIN:"
echo "Expires: $expiry_date"
echo "Days remaining: $days_left"

if [ $days_left -lt $DAYS_WARNING ]; then
    echo "⚠️  WARNING: Certificate expires in less than $DAYS_WARNING days!"
    exit 1
else
    echo "✅ Certificate is valid"
fi
EOF

chmod +x ./scripts/check-ssl-expiry.sh

echo ""
echo "✅ SSL setup completed! Certificates will auto-renew every 12 hours."