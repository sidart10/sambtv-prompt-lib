#!/bin/bash

# Task 11: SSL Setup and Automation for ai.sambatv.com
# Production-ready Let's Encrypt SSL with automatic renewal

set -e

echo "🔒 SambaTV AI Platform - SSL Setup for ai.sambatv.com"
echo "=================================================="

# Configuration
DOMAIN="ai.sambatv.com"
EMAIL="admin@sambatv.com"
WEBROOT="/var/www/certbot"
NGINX_CONF="/etc/nginx/conf.d/ai.sambatv.com.conf"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt-get update -qq

# Install required packages
print_status "Installing certbot and nginx plugin..."
apt-get install -y certbot python3-certbot-nginx

# Create webroot directory for challenges
print_status "Creating webroot directory for ACME challenges..."
mkdir -p "$WEBROOT"
chown -R www-data:www-data "$WEBROOT"

# Check if certificate already exists
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_warning "SSL certificate for $DOMAIN already exists"
    print_status "Checking certificate expiration..."
    
    # Check expiration date
    EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" | cut -d= -f2)
    print_status "Certificate expires: $EXPIRY"
    
    # Renew if needed
    print_status "Running certificate renewal (if needed)..."
    certbot renew --nginx --quiet
else
    print_status "Obtaining new SSL certificate for $DOMAIN..."
    
    # Initial certificate generation
    certbot --nginx \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --no-eff-email \
        --redirect
fi

# Verify certificate installation
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_status "✅ SSL certificate successfully installed for $DOMAIN"
    
    # Display certificate information
    print_status "Certificate information:"
    openssl x509 -text -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" | grep -E "(Subject:|Issuer:|Not After :|DNS:)"
else
    print_error "❌ Failed to install SSL certificate"
    exit 1
fi

# Set up automatic renewal with crontab
print_status "Setting up automatic certificate renewal..."

# Create renewal script
cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash
# Automatic SSL certificate renewal for SambaTV AI Platform

/usr/bin/certbot renew --nginx --quiet

# Restart nginx if certificates were renewed
if [ $? -eq 0 ]; then
    /usr/sbin/nginx -t && /usr/sbin/nginx -s reload
    echo "$(date): SSL certificates renewed successfully" >> /var/log/ssl-renewal.log
fi
EOF

chmod +x /usr/local/bin/renew-ssl.sh

# Add to crontab (runs twice daily)
CRON_JOB="0 12,0 * * * /usr/local/bin/renew-ssl.sh"
(crontab -l 2>/dev/null | grep -v "renew-ssl.sh"; echo "$CRON_JOB") | crontab -

print_status "✅ Automatic renewal configured (runs twice daily)"

# Test nginx configuration
print_status "Testing nginx configuration..."
if nginx -t; then
    print_status "✅ Nginx configuration is valid"
    
    # Reload nginx
    systemctl reload nginx
    print_status "✅ Nginx reloaded successfully"
else
    print_error "❌ Nginx configuration test failed"
    exit 1
fi

# Test SSL configuration
print_status "Testing SSL configuration..."
if curl -I -s "https://$DOMAIN/health" | grep -q "200 OK"; then
    print_status "✅ HTTPS endpoint is responding correctly"
else
    print_warning "⚠️  HTTPS endpoint test failed (may be expected if application is not running)"
fi

# Security test
print_status "Running SSL security test..."
if command -v openssl &> /dev/null; then
    echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates
    
    # Check TLS version support
    print_status "Checking TLS protocol support..."
    if echo | openssl s_client -tls1_2 -servername "$DOMAIN" -connect "$DOMAIN:443" &>/dev/null; then
        print_status "✅ TLS 1.2 supported"
    fi
    
    if echo | openssl s_client -tls1_3 -servername "$DOMAIN" -connect "$DOMAIN:443" &>/dev/null; then
        print_status "✅ TLS 1.3 supported"
    fi
fi

# Create monitoring script
print_status "Creating SSL monitoring script..."
cat > /usr/local/bin/ssl-monitor.sh << 'EOF'
#!/bin/bash
# SSL Certificate Monitoring for SambaTV AI Platform

DOMAIN="ai.sambatv.com"
THRESHOLD_DAYS=30

# Check certificate expiration
if [ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]; then
    EXPIRY_DATE=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    echo "$(date): SSL certificate expires in $DAYS_UNTIL_EXPIRY days" >> /var/log/ssl-monitor.log
    
    if [ $DAYS_UNTIL_EXPIRY -lt $THRESHOLD_DAYS ]; then
        echo "$(date): WARNING - SSL certificate expires in $DAYS_UNTIL_EXPIRY days" >> /var/log/ssl-monitor.log
        # Add notification logic here (email, webhook, etc.)
    fi
else
    echo "$(date): ERROR - SSL certificate not found" >> /var/log/ssl-monitor.log
fi
EOF

chmod +x /usr/local/bin/ssl-monitor.sh

# Add monitoring to crontab (runs daily)
MONITOR_CRON="0 8 * * * /usr/local/bin/ssl-monitor.sh"
(crontab -l 2>/dev/null | grep -v "ssl-monitor.sh"; echo "$MONITOR_CRON") | crontab -

print_status "✅ SSL monitoring configured (runs daily at 8 AM)"

# Final verification
print_status "Running final verification..."

# Check certificate chain
if openssl verify -CAfile /etc/letsencrypt/live/$DOMAIN/chain.pem /etc/letsencrypt/live/$DOMAIN/cert.pem; then
    print_status "✅ Certificate chain verification passed"
else
    print_warning "⚠️  Certificate chain verification failed"
fi

# Summary
echo ""
echo "🎉 SSL Setup Complete for $DOMAIN"
echo "=================================="
echo "✅ SSL certificate installed and verified"
echo "✅ Automatic renewal configured (twice daily)"
echo "✅ SSL monitoring enabled (daily)"
echo "✅ Nginx configuration updated and tested"
echo ""
echo "Certificate Details:"
echo "- Domain: $DOMAIN"
echo "- Certificate Path: /etc/letsencrypt/live/$DOMAIN/"
echo "- Renewal Logs: /var/log/letsencrypt/"
echo "- SSL Monitor Logs: /var/log/ssl-monitor.log"
echo ""
print_status "ai.sambatv.com is now secured with production-grade SSL!"

# Test HTTPS redirect
print_status "Testing HTTP to HTTPS redirect..."
if curl -I -s "http://$DOMAIN" | grep -q "301"; then
    print_status "✅ HTTP to HTTPS redirect working correctly"
else
    print_warning "⚠️  HTTP redirect test inconclusive"
fi

print_status "Task 11 SSL Setup Complete! 🔒✨"