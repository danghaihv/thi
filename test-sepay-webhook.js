#!/usr/bin/env node

/**
 * Script test Sepay webhook
 * 
 * Cách sử dụng:
 * node test-sepay-webhook.js [webhook_url] [memo] [amount] [webhook_token]
 * 
 * Ví dụ:
 * node test-sepay-webhook.js http://localhost:5173/api/webhook/sepay HMATHTHANHQUANG5A2C 50000 your_secret_token
 */

const http = require('http');
const https = require('https');

// Parse arguments
const webhookUrl = process.argv[2] || 'http://localhost:5173/api/webhook/sepay';
const memo = process.argv[3] || 'HMATHTHANHQUANG5A2C';
const amount = parseInt(process.argv[4] || '50000', 10);
const webhookToken = process.argv[5] || 'test_webhook_token';

console.log('🔧 Sepay Webhook Test');
console.log('━'.repeat(50));
console.log(`📝 Webhook URL: ${webhookUrl}`);
console.log(`💬 Memo: ${memo}`);
console.log(`💰 Amount: ${amount.toLocaleString('vi-VN')} VND`);
console.log(`🔐 Token: ${webhookToken}`);
console.log('━'.repeat(50));

// Sample payload from Sepay
const payload = {
  id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  content: memo,
  transaction_content: memo,
  transferAmount: amount,
  amount: amount,
  amount_in: amount,
  transactionDate: new Date().toISOString(),
  senderAccount: '1111111111',
  referenceCode: `SEPAY${Date.now()}`,
  transaction_id: `tx_${Date.now()}`,
};

const body = JSON.stringify(payload);

// Parse URL
const url = new URL(webhookUrl);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Authorization': `Bearer ${webhookToken}`,
    'x-sepay-token': webhookToken,
  },
};

console.log('\n📤 Sending request...\n');

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📥 Response Status: ${res.statusCode}`);
    console.log(`📋 Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    try {
      const responseData = JSON.parse(data);
      console.log('\n✅ Response Body:');
      console.log(JSON.stringify(responseData, null, 2));
      
      if (res.statusCode === 200 && responseData.success) {
        console.log('\n🎉 Webhook test PASSED!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Webhook returned non-success response');
        process.exit(1);
      }
    } catch (err) {
      console.log('\n❌ Response Body (raw):');
      console.log(data);
      console.log('\n⚠️  Failed to parse response as JSON');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
  process.exit(1);
});

// Send payload
req.write(body);
console.log('📦 Payload:');
console.log(JSON.stringify(payload, null, 2));

req.end();

// Set timeout
setTimeout(() => {
  console.error('\n⏱️  Request timeout after 10 seconds');
  process.exit(1);
}, 10000);
