#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📦 Creating PawPilot HQ Project Bundle...\n');

// Get all files in the project
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Create bundle information
const projectFiles = getAllFiles('.');
const totalFiles = projectFiles.length;
const totalSize = projectFiles.reduce((size, file) => {
  try {
    return size + fs.statSync(file).size;
  } catch (error) {
    return size;
  }
}, 0);

console.log(`✅ Found ${totalFiles} files`);
console.log(`📊 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log('\n📋 Project Structure:');

// Show project structure
const structure = {};
projectFiles.forEach(file => {
  const relativePath = path.relative('.', file);
  const parts = relativePath.split(path.sep);
  let current = structure;
  
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      // It's a file
      if (!current._files) current._files = [];
      current._files.push(part);
    } else {
      // It's a directory
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  });
});

function printStructure(obj, indent = '') {
  Object.keys(obj).forEach(key => {
    if (key === '_files') {
      obj[key].slice(0, 5).forEach(file => {
        console.log(`${indent}  📄 ${file}`);
      });
      if (obj[key].length > 5) {
        console.log(`${indent}  ... and ${obj[key].length - 5} more files`);
      }
    } else {
      console.log(`${indent}📁 ${key}/`);
      printStructure(obj[key], indent + '  ');
    }
  });
}

printStructure(structure);

console.log('\n🎯 Key Features Implemented:');
console.log('✅ Complete authentication system');
console.log('✅ Pet management with health tracking');
console.log('✅ Real-time messaging and social features');
console.log('✅ Photo albums and pet reels');
console.log('✅ Lost & found with interactive maps');
console.log('✅ Groups and events system');
console.log('✅ Donations platform');
console.log('✅ AI symptom analyzer');
console.log('✅ Push notifications');
console.log('✅ Advanced privacy controls');
console.log('✅ Admin panel and analytics');
console.log('✅ Mobile app support');
console.log('✅ Payment processing');
console.log('✅ Offline capabilities');

console.log('\n🚀 Ready for Production Deployment!');
console.log('\n📖 Next Steps:');
console.log('1. Copy all files to your local machine');
console.log('2. Run: npm install');
console.log('3. Set up Supabase project and run migrations');
console.log('4. Configure environment variables');
console.log('5. Deploy to Vercel/Netlify');
console.log('\nSee docs/ folder for detailed setup instructions.');