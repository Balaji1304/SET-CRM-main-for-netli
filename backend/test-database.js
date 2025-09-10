const mongoose = require('mongoose');
const Report = require('./models/Report');
const Lead = require('./models/Lead');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar-crm', {
  dbName: 'solar-crm',
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testDatabase() {
  try {
    console.log('🔍 Testing Database Connection and Models...\n');

    // Test 1: Database Connection
    console.log('1. Testing MongoDB Connection...');
    await mongoose.connection.db.admin().ping();
    console.log('✅ MongoDB connection successful\n');

    // Test 2: Report Model
    console.log('2. Testing Report Model...');
    const testReport = new Report({
      reportId: 'TEST-RPT-' + Date.now(),
      reportName: 'Test Report',
      reportType: 'lead_analysis',
      generatedBy: new mongoose.Types.ObjectId(),
      period: 'custom',
      startDate: new Date(),
      endDate: new Date(),
      reportStatus: 'completed'
    });

    // Validate the model
    const validationError = testReport.validateSync();
    if (validationError) {
      console.log('❌ Report model validation failed:', validationError.message);
    } else {
      console.log('✅ Report model validation passed');
    }

    // Test 3: Lead Model
    console.log('\n3. Testing Lead Model...');
    const testLead = new Lead({
      name: 'Test Lead',
      email: 'test@example.com',
      phone: '1234567890',
      source: 'website',
      status: 'new'
    });

    const leadValidationError = testLead.validateSync();
    if (leadValidationError) {
      console.log('❌ Lead model validation failed:', leadValidationError.message);
    } else {
      console.log('✅ Lead model validation passed');
    }

    // Test 4: User Model
    console.log('\n4. Testing User Model...');
    const testUser = new User({
      name: 'Test User',
      email: 'testuser@example.com',
      role: 'sales_person'
    });

    const userValidationError = testUser.validateSync();
    if (userValidationError) {
      console.log('❌ User model validation failed:', userValidationError.message);
    } else {
      console.log('✅ User model validation passed');
    }

    // Test 5: Check existing data
    console.log('\n5. Checking existing data...');
    const reportCount = await Report.countDocuments();
    const leadCount = await Lead.countDocuments();
    const userCount = await User.countDocuments();

    console.log(`📊 Database Statistics:`);
    console.log(`   - Reports: ${reportCount}`);
    console.log(`   - Leads: ${leadCount}`);
    console.log(`   - Users: ${userCount}`);

    // Test 6: Test Report Creation
    console.log('\n6. Testing Report Creation...');
    try {
      const newReport = new Report({
        reportId: 'TEST-CREATE-' + Date.now(),
        reportName: 'Database Test Report',
        reportType: 'lead_analysis',
        generatedBy: new mongoose.Types.ObjectId(),
        period: 'custom',
        startDate: new Date(),
        endDate: new Date(),
        reportStatus: 'completed',
        reportData: {
          kpis: {
            totalLeads: 10,
            convertedLeads: 2,
            conversionRate: '20%'
          }
        }
      });

      await newReport.save();
      console.log('✅ Report creation successful');
      console.log(`   - Report ID: ${newReport.reportId}`);
      console.log(`   - MongoDB ID: ${newReport._id}`);

      // Test finding the report
      const foundReport = await Report.findOne({ reportId: newReport.reportId });
      if (foundReport) {
        console.log('✅ Report retrieval successful');
      } else {
        console.log('❌ Report retrieval failed');
      }

      // Clean up test report
      await Report.deleteOne({ _id: newReport._id });
      console.log('✅ Test report cleaned up');

    } catch (error) {
      console.log('❌ Report creation failed:', error.message);
    }

    console.log('\n🎉 Database and Models Test Complete!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDatabase();

