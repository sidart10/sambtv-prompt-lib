#!/bin/bash

# SambaTV AI Platform Monitoring Startup Script
# Task 13: Comprehensive Monitoring & Alerts
# Agent C Implementation

set -e

echo "🚀 Starting SambaTV AI Platform Monitoring Stack..."
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Error: docker-compose not found. Please install docker-compose."
    exit 1
fi

# Create monitoring directories if they don't exist
echo "📁 Creating monitoring directories..."
mkdir -p monitoring/{rules,alertmanager,grafana/{provisioning/{datasources,dashboards},dashboards}}

# Set proper permissions for monitoring volumes
echo "🔐 Setting up volume permissions..."
sudo mkdir -p /var/lib/prometheus /var/lib/grafana /var/lib/alertmanager
sudo chown -R 65534:65534 /var/lib/prometheus
sudo chown -R 472:472 /var/lib/grafana  
sudo chown -R 65534:65534 /var/lib/alertmanager

# Check if monitoring configuration files exist
echo "✅ Checking monitoring configuration..."
REQUIRED_FILES=(
    "monitoring/prometheus.yml"
    "monitoring/rules/alerts.yml"
    "monitoring/alertmanager/config.yml"
    "monitoring/grafana/dashboards/ai-platform-overview.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Required file $file not found!"
        echo "Please ensure all monitoring configuration files are present."
        exit 1
    fi
done

echo "✅ All configuration files found."

# Start core infrastructure first
echo "🐳 Starting core infrastructure services..."
docker-compose -f docker-compose.production.yml up -d \
    langfuse-postgres \
    redis \
    minio \
    nginx

# Wait for core services to be healthy
echo "⏳ Waiting for core services to be healthy..."
sleep 30

# Check core service health
echo "🔍 Checking core service health..."
for service in langfuse-postgres redis minio; do
    if docker-compose -f docker-compose.production.yml ps "$service" | grep -q "Up.*healthy"; then
        echo "✅ $service is healthy"
    else
        echo "⚠️  Warning: $service may not be fully ready"
    fi
done

# Start monitoring stack
echo "📊 Starting monitoring services..."
docker-compose -f docker-compose.production.yml --profile monitoring up -d \
    prometheus \
    grafana \
    alertmanager \
    node-exporter \
    postgres-exporter \
    redis-exporter

# Wait for monitoring services
echo "⏳ Waiting for monitoring services to start..."
sleep 45

# Check monitoring service status
echo "🔍 Checking monitoring service status..."
MONITORING_SERVICES=(
    "prometheus:9090"
    "grafana:3001"
    "alertmanager:9093"
    "node-exporter:9100"
)

for service in "${MONITORING_SERVICES[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if curl -f -s "http://localhost:$port" > /dev/null 2>&1; then
        echo "✅ $name is responding on port $port"
    else
        echo "⚠️  Warning: $name may not be ready on port $port"
    fi
done

# Start main applications
echo "🚀 Starting main application services..."
docker-compose -f docker-compose.production.yml up -d \
    prompt-library \
    ai-platform

echo ""
echo "🎉 Monitoring stack startup complete!"
echo "=================================================="
echo ""
echo "📊 Access Points:"
echo "• Prometheus:   http://localhost:9090"
echo "• Grafana:      http://localhost:3001 (admin/sambatv2025)"
echo "• Alertmanager: http://localhost:9093"
echo "• Main App:     http://localhost:3000"
echo "• AI Platform:  http://localhost:3004"
echo ""
echo "📈 Key Dashboards:"
echo "• AI Platform Overview: http://localhost:3001/d/ai-platform-overview"
echo "• Infrastructure Health: http://localhost:3001/d/infrastructure-health"
echo ""
echo "🚨 Alert Channels:"
echo "• Slack: #ai-platform-alerts"
echo "• Email: ops@samba.tv (critical), platform-team@samba.tv (warnings)"
echo "• PagerDuty: Critical alerts only"
echo ""
echo "📚 Documentation:"
echo "• Runbooks: docs/runbooks/"
echo "• Monitoring Guide: monitoring/README.md"
echo ""
echo "🔧 Quick Health Check:"
echo "docker-compose -f docker-compose.production.yml ps"
echo ""
echo "🛑 To stop monitoring:"
echo "./scripts/stop-monitoring.sh"
echo ""

# Final health check
echo "🏥 Running final health check..."
sleep 10

# Check if applications are responding
if curl -f -s "http://localhost:3000/api/health" > /dev/null 2>&1; then
    echo "✅ Main application is healthy"
else
    echo "⚠️  Main application health check failed"
fi

if curl -f -s "http://localhost:3004" > /dev/null 2>&1; then
    echo "✅ AI Platform is responding"
else
    echo "⚠️  AI Platform health check failed"
fi

# Show running containers
echo ""
echo "📦 Running Containers:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "✨ SambaTV AI Platform Monitoring is now active!"
echo "Monitor the dashboards and check Slack for any alerts."