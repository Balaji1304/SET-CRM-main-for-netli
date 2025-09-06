#!/usr/bin/env node

/**
 * WhatsApp Configuration Test Script
 * 
 * Tests the current WhatsApp setup and identifies what needs to be configured
 */

require('dotenv').config();
const { testWhatsAppConfig } = require('../utils/sendWhatsApp');
const axios = require('axios');

async function runWhatsAppTest() {
  console.log('🔍 Testing WhatsApp Configuration...\n');

  // Test 1: Check environment variables
  console.log('📋 Environment Variables Check:');
  console.log(`✅ WHATSAPP_ACCESS_TOKEN: ${process.env.WHATSAPP_ACCESS_TOKEN ? 'Set' : '❌ Missing'}`);
  console.log(`✅ WHATSAPP_PHONE_NUMBER_ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID || '❌ Missing'}`);
  console.log(`✅ WABA_ID: ${process.env.WABA_ID || '❌ Missing'}`);
  
  // Optional variables for token management
  console.log(`📝 WHATSAPP_APP_ID: ${process.env.WHATSAPP_APP_ID || '⚠️ Not Set (for token renewal)'}`);
  console.log(`📝 WHATSAPP_APP_SECRET: ${process.env.WHATSAPP_APP_SECRET || '⚠️ Not Set (for token renewal)'}`);
  console.log(`📝 WHATSAPP_SYSTEM_USER_ID: ${process.env.WHATSAPP_SYSTEM_USER_ID || '⚠️ Not Set (for token renewal)'}`);
  
  console.log('\n🧪 Testing WhatsApp API Connection...');

  try {
    const result = await testWhatsAppConfig();
    
    if (result.success) {
      console.log('✅ WhatsApp API Connection: SUCCESS');
      console.log(`📱 Phone Number ID: ${result.phoneNumberId}`);
      console.log('📊 Status:', result.status);
    } else {
      console.log('❌ WhatsApp API Connection: FAILED');
      console.log('🚨 Error:', result.error);
    }
  } catch (error) {
    console.log('❌ WhatsApp API Connection: FAILED');
    console.log('🚨 Error:', error.message);
  }

  // Test 2: Check token validity
  console.log('\n🔑 Testing Access Token Validity...');
  
  try {
    const response = await axios.get(`https://graph.facebook.com/v19.0/me`, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
      }
    });
    
    console.log('✅ Access Token: VALID');
    console.log('📱 Token belongs to:', response.data.name);
  } catch (error) {
    console.log('❌ Access Token: INVALID or EXPIRED');
    console.log('🔄 You may need to regenerate your token');
    console.log('🚨 Error:', error.response?.data?.error?.message || error.message);
  }

  // Test 3: Check phone number status
  console.log('\n📞 Testing Phone Number Status...');
  
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );
    
    console.log('✅ Phone Number: ACTIVE');
    console.log('📱 Display Name:', response.data.display_phone_number);
    console.log('📊 Status:', response.data.verified_name || 'Not verified');
  } catch (error) {
    console.log('❌ Phone Number: ERROR');
    console.log('🚨 Error:', error.response?.data?.error?.message || error.message);
  }

  console.log('\n📝 Summary:');
  console.log('1. If all tests pass ✅ - Your WhatsApp setup is working!');
  console.log('2. If token is invalid ❌ - You need to get App ID, App Secret, System User ID for renewal');
  console.log('3. Missing variables are only needed for automatic token renewal');
  console.log('\n🔗 Need help finding these variables? Check the Meta Developer Console and Business Manager');
}

// Run the test
runWhatsAppTest().catch(console.error);
