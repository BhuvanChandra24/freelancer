require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // ✅ ADDED
const User = require('../models/User');
const Task = require('../models/Task');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task-dashboard');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Task.deleteMany({});

    // ✅ HASH PASSWORD ONCE
    const hashedPassword = await bcrypt.hash('123', 10);

    // Create users
    const manager = new User({
      username: 'manager1',
      password: hashedPassword, // ✅ FIXED
      role: 'manager',
      departments: ['Production', 'Sales'],
      email: 'manager1@company.com',
    });

    const emp1 = new User({
      username: 'emp1',
      password: hashedPassword, // ✅ FIXED
      role: 'employee',
      departments: ['Production'],
      email: 'emp1@company.com',
    });

    const emp2 = new User({
      username: 'emp2',
      password: hashedPassword, // ✅ FIXED
      role: 'employee',
      departments: ['Sales'],
      email: 'emp2@company.com',
    });

    const emp3 = new User({
      username: 'emp3',
      password: hashedPassword, // ✅ FIXED
      role: 'employee',
      departments: ['Production'],
      email: 'emp3@company.com',
    });

    await manager.save();
    await emp1.save();
    await emp2.save();
    await emp3.save();

    console.log('Users created');

    // Create sample tasks (NO CHANGE)
    const tasks = [
      {
        title: 'Prepare production batch',
        description: 'Prepare the first batch for production run',
        department: 'Production',
        assignedTo: emp1._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-26T10:00:00'),
        status: 'pending',
        priority: 'high',
        extraFields: { machine: 'M1', shift: 'morning' },
      },
      {
        title: 'Follow up with client ABC',
        description: 'Send quotation and discuss requirements',
        department: 'Sales',
        assignedTo: emp2._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-26T12:00:00'),
        status: 'pending',
        priority: 'high',
        extraFields: { clientName: 'ABC Corp', amount: 50000 },
      },
      {
        title: 'Quality check batch 001',
        description: 'Perform quality inspection on batch 001',
        department: 'Production',
        assignedTo: emp3._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-26T14:30:00'),
        status: 'in-progress',
        priority: 'medium',
        extraFields: { batchId: 'B001', checkpoints: 5 },
      },
      {
        title: 'Update CRM with new leads',
        description: 'Add 10 new leads to CRM system',
        department: 'CRM',
        assignedTo: emp2._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-27T10:00:00'),
        status: 'pending',
        priority: 'medium',
        extraFields: { leadCount: 10 },
      },
      {
        title: 'Production setup for next week',
        description: 'Setup machines for next week production schedule',
        department: 'Production',
        assignedTo: emp1._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-28T09:00:00'),
        status: 'pending',
        priority: 'medium',
        extraFields: { machines: ['M1', 'M2'], schedule: 'morning' },
      },
      {
        title: 'Call high-value customer',
        description: 'Contact VIP customer for feedback',
        department: 'Sales',
        assignedTo: emp2._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-27T15:00:00'),
        status: 'completed',
        priority: 'high',
        extraFields: { customerId: 'C123' },
      },
      {
        title: 'Generate weekly report',
        description: 'Create weekly performance report',
        department: 'Production',
        assignedTo: emp3._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-25T17:00:00'),
        status: 'completed',
        priority: 'low',
        extraFields: { reportType: 'weekly' },
      },
      {
        title: 'Service customer complaint',
        description: 'Resolve customer service complaint #2342',
        department: 'Service',
        assignedTo: emp1._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-26T18:00:00'),
        status: 'pending',
        priority: 'high',
        extraFields: { complaintId: '2342' },
      },
      {
        title: 'Inventory count',
        description: 'Complete monthly inventory count',
        department: 'Production',
        assignedTo: emp3._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-29T17:00:00'),
        status: 'pending',
        priority: 'medium',
        extraFields: { month: 'April' },
      },
      {
        title: 'Process urgent order',
        description: 'Rush processing for urgent order from client XYZ',
        department: 'Sales',
        assignedTo: emp2._id,
        createdBy: manager._id,
        deadline: new Date('2026-04-26T16:00:00'),
        status: 'in-progress',
        priority: 'high',
        extraFields: { orderId: 'ORD-2026-0342', client: 'XYZ Inc' },
      },
    ];

    await Task.insertMany(tasks);
    console.log('Tasks created');

    console.log('✅ Database seeded successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('Manager: username=manager1, password=123');
    console.log('Employee: username=emp1, password=123');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedData();