#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Langfuse Performance Audit\n');
console.log('=' + '='.repeat(60) + '\n');

const langfusePath = path.join(__dirname, '..', 'sambatv-ai-platform');

// Check if Langfuse fork exists
if (!fs.existsSync(langfusePath)) {
  console.error('❌ Langfuse fork not found at:', langfusePath);
  process.exit(1);
}

console.log('📁 Analyzing:', langfusePath);
console.log('');

// 1. Check bundle sizes
console.log('📦 Bundle Size Analysis\n');
try {
  process.chdir(path.join(langfusePath, 'web'));
  
  // Build the project if not already built
  if (!fs.existsSync('.next')) {
    console.log('Building project for analysis...');
    execSync('pnpm run build', { stdio: 'ignore' });
  }
  
  // Analyze bundle sizes
  const buildDir = '.next';
  const staticDir = path.join(buildDir, 'static');
  
  if (fs.existsSync(staticDir)) {
    const chunks = [];
    const files = getAllFiles(staticDir);
    
    files.forEach(file => {
      if (file.endsWith('.js') || file.endsWith('.css')) {
        const stats = fs.statSync(file);
        const sizeKB = (stats.size / 1024).toFixed(2);
        chunks.push({
          file: path.relative(staticDir, file),
          size: stats.size,
          sizeKB: parseFloat(sizeKB)
        });
      }
    });
    
    // Sort by size
    chunks.sort((a, b) => b.size - a.size);
    
    console.log('Largest bundles:');
    chunks.slice(0, 10).forEach(chunk => {
      const indicator = chunk.sizeKB > 500 ? '⚠️ ' : chunk.sizeKB > 200 ? '⚡' : '✅';
      console.log(`${indicator} ${chunk.file}: ${chunk.sizeKB} KB`);
    });
    
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    console.log(`\nTotal bundle size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  }
} catch (error) {
  console.error('Failed to analyze bundle sizes:', error.message);
}

// 2. Check for optimization opportunities
console.log('\n\n🔍 Optimization Opportunities\n');

const optimizations = [];

// Check for large images
console.log('Checking images...');
const publicDir = path.join(langfusePath, 'web', 'public');
if (fs.existsSync(publicDir)) {
  const images = getAllFiles(publicDir).filter(f => 
    /\.(png|jpg|jpeg|gif|svg)$/i.test(f)
  );
  
  images.forEach(img => {
    const stats = fs.statSync(img);
    const sizeKB = stats.size / 1024;
    if (sizeKB > 100) {
      optimizations.push({
        type: 'image',
        file: path.relative(publicDir, img),
        sizeKB: sizeKB.toFixed(2),
        recommendation: 'Consider optimizing or using next/image'
      });
    }
  });
}

// Check for unused dependencies
console.log('Checking dependencies...');
try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(langfusePath, 'web', 'package.json'), 'utf-8')
  );
  
  const deps = Object.keys(packageJson.dependencies || {});
  if (deps.length > 50) {
    optimizations.push({
      type: 'dependencies',
      count: deps.length,
      recommendation: 'Review dependencies for unused packages'
    });
  }
} catch (error) {
  console.error('Failed to check dependencies');
}

// 3. Performance recommendations
console.log('\n📊 Performance Recommendations\n');

const recommendations = [
  {
    area: 'Code Splitting',
    checks: [
      'Use dynamic imports for heavy components',
      'Lazy load routes that are not immediately needed',
      'Split vendor bundles appropriately'
    ]
  },
  {
    area: 'Image Optimization',
    checks: [
      'Use next/image for automatic optimization',
      'Serve images in modern formats (WebP)',
      'Implement responsive images'
    ]
  },
  {
    area: 'Caching Strategy',
    checks: [
      'Configure proper cache headers',
      'Use ISR for static content',
      'Implement service worker for offline support'
    ]
  },
  {
    area: 'Bundle Optimization',
    checks: [
      'Tree-shake unused code',
      'Minimize CSS and JS',
      'Use production builds for deployment'
    ]
  }
];

recommendations.forEach(rec => {
  console.log(`${rec.area}:`);
  rec.checks.forEach(check => {
    console.log(`  □ ${check}`);
  });
  console.log('');
});

// 4. Lighthouse simulation
console.log('🏁 Performance Metrics (Simulated)\n');

const metrics = {
  'First Contentful Paint': '1.2s',
  'Largest Contentful Paint': '2.4s',
  'Time to Interactive': '3.8s',
  'Total Blocking Time': '340ms',
  'Cumulative Layout Shift': '0.08',
  'Performance Score': '85/100'
};

Object.entries(metrics).forEach(([metric, value]) => {
  console.log(`${metric}: ${value}`);
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📈 Summary\n');

if (optimizations.length > 0) {
  console.log('⚠️  Found', optimizations.length, 'optimization opportunities:');
  optimizations.forEach(opt => {
    console.log(`\n- ${opt.type.toUpperCase()}`);
    if (opt.file) console.log(`  File: ${opt.file} (${opt.sizeKB} KB)`);
    if (opt.count) console.log(`  Count: ${opt.count}`);
    console.log(`  ${opt.recommendation}`);
  });
} else {
  console.log('✅ No major optimization issues found!');
}

console.log('\n💡 Next Steps:');
console.log('1. Run actual Lighthouse audit for accurate metrics');
console.log('2. Implement recommended optimizations');
console.log('3. Test on various devices and network conditions');
console.log('4. Monitor Core Web Vitals in production');

// Helper function
function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  });
  return files;
}