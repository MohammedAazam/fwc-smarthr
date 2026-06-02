import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

// 1. Manually load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
      process.env[key] = val;
    }
  });
}

import User from '../models/User';
import Attendance from '../models/Attendance';
import Leave from '../models/Leave';
import Payroll from '../models/Payroll';
import Job from '../models/Job';
import Candidate from '../models/Candidate';
import Feedback from '../models/Feedback';
import { connectToDatabase } from '../lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in .env.local. Seeding aborted.');
  process.exit(1);
}

async function seed() {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Connected to MongoDB successfully.');

    // Clear existing collections
    console.log('Clearing existing database collections...');
    await User.deleteMany({});
    await Attendance.deleteMany({});
    await Leave.deleteMany({});
    await Payroll.deleteMany({});
    await Job.deleteMany({});
    await Candidate.deleteMany({});
    await Feedback.deleteMany({});
    console.log('Collections cleared.');

    // Generate Passwords Hashes
    console.log('Hashing passwords...');
    const adminHash = bcrypt.hashSync('admin123', 10);
    const managerHash = bcrypt.hashSync('manager123', 10);
    const hrHash = bcrypt.hashSync('hr123', 10);
    const employeeHash = bcrypt.hashSync('employee123', 10);

    const usersToInsert = [];

    // 1. Create Admin
    const adminUser = {
      name: 'FWC Admin',
      email: 'admin@fwc.com',
      passwordHash: adminHash,
      role: 'admin' as const,
      department: 'HR',
      designation: 'System Administrator',
      managerId: null,
      joiningDate: new Date('2024-01-01'),
      phone: '1234567890',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      isActive: true,
      basicSalary: 95000,
    };
    usersToInsert.push(adminUser);

    // 2. Create Senior Managers (2)
    const manager1 = {
      name: 'John Doe (Mgr)',
      email: 'manager1@fwc.com',
      passwordHash: managerHash,
      role: 'senior_manager' as const,
      department: 'Engineering',
      designation: 'Engineering Director',
      managerId: null,
      joiningDate: new Date('2024-03-15'),
      phone: '9876543210',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      isActive: true,
      basicSalary: 85000,
    };
    const manager2 = {
      name: 'Sarah Smith (Mgr)',
      email: 'manager2@fwc.com',
      passwordHash: managerHash,
      role: 'senior_manager' as const,
      department: 'Sales',
      designation: 'VP of Sales',
      managerId: null,
      joiningDate: new Date('2024-04-01'),
      phone: '5556667777',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      isActive: true,
      basicSalary: 80000,
    };
    usersToInsert.push(manager1, manager2);

    // 3. Create HR Recruiters (3)
    const hrRecruiters = [
      {
        name: 'Alice Johnson (HR)',
        email: 'hr1@fwc.com',
        passwordHash: hrHash,
        role: 'hr_recruiter' as const,
        department: 'HR',
        designation: 'Senior Talent Acquisition',
        managerId: null,
        joiningDate: new Date('2024-05-01'),
        phone: '1112223333',
        photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
        isActive: true,
        basicSalary: 55000,
      },
      {
        name: 'Bob Carter (HR)',
        email: 'hr2@fwc.com',
        passwordHash: hrHash,
        role: 'hr_recruiter' as const,
        department: 'HR',
        designation: 'Technical Recruiter',
        managerId: null,
        joiningDate: new Date('2024-06-15'),
        phone: '2223334444',
        photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
        isActive: true,
        basicSalary: 50000,
      },
      {
        name: 'Clara Oswald (HR)',
        email: 'hr3@fwc.com',
        passwordHash: hrHash,
        role: 'hr_recruiter' as const,
        department: 'HR',
        designation: 'HR Coordinator',
        managerId: null,
        joiningDate: new Date('2024-08-01'),
        phone: '3334445555',
        photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
        isActive: true,
        basicSalary: 45000,
      },
    ];
    usersToInsert.push(...hrRecruiters);

    // 4. Create 194 Employees distributed across 6 departments
    // Engineering (40), Sales (45), HR (15), Finance (25), Operations (39), Design (30)
    // Subtracting the ones we already added to matching departments:
    // Admin is HR, Manager1 is Engineering, Manager2 is Sales, HR Recruiters are HR (3).
    // Let's create:
    // Engineering: 39 more
    // Sales: 44 more
    // HR: 11 more
    // Finance: 25
    // Operations: 39
    // Design: 30
    // Total = 39 + 44 + 11 + 25 + 39 + 30 = 188.
    // Wait, let's create exactly 194 employees distributed to make the total count exactly 200.
    const distributions = [
      { dept: 'Engineering', count: 39, design: 'Software Engineer' },
      { dept: 'Sales', count: 44, design: 'Account Executive' },
      { dept: 'HR', count: 11, design: 'HR Associate' },
      { dept: 'Finance', count: 25, design: 'Financial Analyst' },
      { dept: 'Operations', count: 45, design: 'Operations Coordinator' },
      { dept: 'Design', count: 30, design: 'UI/UX Designer' },
    ];

    let employeeIdx = 1;
    for (const dist of distributions) {
      for (let i = 0; i < dist.count; i++) {
        const salary = faker.number.int({ min: 18000, max: 75000 });
        usersToInsert.push({
          name: faker.person.fullName(),
          email: `employee${employeeIdx}@fwc.com`,
          passwordHash: employeeHash,
          role: 'employee' as const,
          department: dist.dept,
          designation: dist.design,
          managerId: null, // Will be linked below
          joiningDate: faker.date.between({ from: '2023-01-01', to: '2025-12-31' }),
          phone: faker.phone.number(),
          photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
          isActive: true,
          basicSalary: salary,
        });
        employeeIdx++;
      }
    }

    console.log(`Inserting ${usersToInsert.length} user records...`);
    const insertedUsers = await User.insertMany(usersToInsert);
    console.log('Users inserted successfully.');

    // Extract inserted database documents to reference their IDs
    const dbAdmin = insertedUsers.find(u => u.role === 'admin')!;
    const dbMgr1 = insertedUsers.find(u => u.email === 'manager1@fwc.com')!;
    const dbMgr2 = insertedUsers.find(u => u.email === 'manager2@fwc.com')!;

    // Link managers
    console.log('Linking employees to managers...');
    await User.updateMany({ department: 'Engineering', role: 'employee' }, { managerId: dbMgr1._id });
    await User.updateMany({ department: 'Sales', role: 'employee' }, { managerId: dbMgr2._id });
    await User.updateMany({ department: { $in: ['HR', 'Finance', 'Operations', 'Design'] }, role: 'employee' }, { managerId: dbAdmin._id });
    console.log('Managers linked.');

    // 5. Seed 30 Days of Attendance for all 200 users
    console.log('Seeding attendance for 30 days...');
    const attendanceRecords = [];
    const today = new Date();
    const daysToSeed = 30;
    const weekdays: Date[] = [];
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

    while (weekdays.length < daysToSeed) {
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        weekdays.push(new Date(checkDate));
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (const user of insertedUsers) {
      for (const date of weekdays) {
        const rand = Math.random();
        let status: 'present' | 'absent' | 'late' | 'wfh' | 'holiday' = 'present';
        let clockIn: Date | undefined;
        let clockOut: Date | undefined;

        if (rand < 0.80) {
          // Present
          status = 'present';
          clockIn = new Date(date);
          clockIn.setHours(faker.number.int({ min: 8, max: 9 }), faker.number.int({ min: 0, max: 59 }), 0);
          clockOut = new Date(date);
          clockOut.setHours(faker.number.int({ min: 17, max: 18 }), faker.number.int({ min: 0, max: 59 }), 0);
        } else if (rand < 0.92) {
          // Late
          status = 'late';
          clockIn = new Date(date);
          clockIn.setHours(faker.number.int({ min: 10, max: 11 }), faker.number.int({ min: 1, max: 45 }), 0);
          clockOut = new Date(date);
          clockOut.setHours(faker.number.int({ min: 17, max: 18 }), faker.number.int({ min: 0, max: 59 }), 0);
        } else if (rand < 0.97) {
          // WFH
          status = 'wfh';
          clockIn = new Date(date);
          clockIn.setHours(9, 0, 0);
          clockOut = new Date(date);
          clockOut.setHours(17, 30, 0);
        } else {
          // Absent
          status = 'absent';
        }

        attendanceRecords.push({
          userId: user._id,
          date,
          status,
          clockIn,
          clockOut,
        });
      }
    }

    console.log(`Inserting ${attendanceRecords.length} attendance records...`);
    // Chunk array insertion to avoid payload limits
    const chunkSize = 2000;
    for (let i = 0; i < attendanceRecords.length; i += chunkSize) {
      await Attendance.insertMany(attendanceRecords.slice(i, i + chunkSize));
    }
    console.log('Attendance records inserted.');

    // 6. Seed 5 Active Job Postings
    console.log('Seeding job postings...');
    const jobsData = [
      {
        title: 'Senior Frontend Engineer',
        department: 'Engineering',
        description: 'We are seeking a senior frontend engineer skilled in Next.js, React, and CSS styling to build beautiful user interfaces.',
        requirements: ['3+ years Experience in React/Next.js', 'Strong TailwindCSS skills', 'Experience with TypeScript'],
        postedBy: dbAdmin._id,
        isActive: true,
      },
      {
        title: 'Full Stack Engineer',
        department: 'Engineering',
        description: 'Looking for a full stack engineer proficient in Node.js, Express, MongoDB, and Next.js APIs.',
        requirements: ['Experience with MongoDB & Mongoose', 'REST API design', 'Next.js App Router experience'],
        postedBy: dbAdmin._id,
        isActive: true,
      },
      {
        title: 'Sales Account Executive',
        department: 'Sales',
        description: 'Identify and close sales leads. Experience in B2B enterprise software sales is preferred.',
        requirements: ['Excellent communication', '2+ years SaaS sales experience', 'Goal oriented mindset'],
        postedBy: dbAdmin._id,
        isActive: true,
      },
      {
        title: 'HR Manager',
        department: 'HR',
        description: 'Oversee company-wide recruitment, employee relations, leave tracking, and payroll review systems.',
        requirements: ['HRMS software experience', 'HR Policy design', 'Conflict resolution skills'],
        postedBy: dbAdmin._id,
        isActive: true,
      },
      {
        title: 'Senior UI/UX Designer',
        department: 'Design',
        description: 'Design interactive, beautiful and accessible user interfaces. Create wireframes and high fidelity prototypes.',
        requirements: ['Figma expertise', 'Design systems knowledge', 'Interaction design experience'],
        postedBy: dbAdmin._id,
        isActive: true,
      },
    ];

    const insertedJobs = await Job.insertMany(jobsData);
    console.log('Job postings inserted.');

    // 7. Seed 20 Candidate Records with random stages/scores
    console.log('Seeding candidates...');
    const candidateRecords = [];
    const stages: Array<'applied' | 'screened' | 'interview' | 'offer' | 'hired' | 'rejected'> = [
      'applied', 'screened', 'interview', 'offer', 'hired', 'rejected'
    ];

    for (let i = 0; i < 20; i++) {
      const job = insertedJobs[i % insertedJobs.length];
      const stage = faker.helpers.arrayElement(stages);
      const score = faker.number.int({ min: 45, max: 98 });
      candidateRecords.push({
        jobId: job._id,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        resumeUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        aiScore: score,
        aiMatchReason: `Candidate matched on key skills: ${job.requirements.slice(0,2).join(', ')}. Clear background in ${job.department} related work.`,
        stage,
        interviewNotes: stage === 'interview' || stage === 'offer' || stage === 'hired' ? 'Good presence. Strong coding skills demonstrated in live test.' : '',
        aiRecommendation: score > 85 ? 'Strong Match' : score > 65 ? 'Moderate Match' : 'Weak Match',
      });
    }
    await Candidate.insertMany(candidateRecords);
    console.log('Candidates seeded.');

    // 8. Seed Leave Requests (Mix of status)
    console.log('Seeding leave requests...');
    const leaveRecords = [];
    const leaveTypes: Array<'casual' | 'sick' | 'earned' | 'unpaid'> = ['casual', 'sick', 'earned', 'unpaid'];
    const leaveStatuses: Array<'pending' | 'approved' | 'rejected'> = ['pending', 'approved', 'rejected'];

    // Select 50 random employees to have leave requests
    const selectedEmployees = faker.helpers.arrayElements(insertedUsers.filter(u => u.role === 'employee'), 50);

    for (const employee of selectedEmployees) {
      for (let r = 0; r < 2; r++) {
        const type = faker.helpers.arrayElement(leaveTypes);
        const status = faker.helpers.arrayElement(leaveStatuses);
        const fromDate = faker.date.between({ from: '2026-01-01', to: '2026-06-30' });
        const toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() + faker.number.int({ min: 1, max: 5 }));

        leaveRecords.push({
          userId: employee._id,
          type,
          from: fromDate,
          to: toDate,
          reason: faker.lorem.sentence(),
          status,
          approvedBy: status !== 'pending' ? dbMgr1._id : null,
          comment: status === 'approved' ? 'Approved, cover your shifts.' : status === 'rejected' ? 'Rejected due to project deadlines.' : '',
        });
      }
    }
    await Leave.insertMany(leaveRecords);
    console.log('Leave requests seeded.');

    // 9. Seed Payroll Records for last 3 months
    console.log('Seeding payroll records for last 3 months...');
    const payrollRecords = [];
    // Months: 3 (March), 4 (April), 5 (May) of 2026
    const monthsToSeed = [
      { month: 3, year: 2026 },
      { month: 4, year: 2026 },
      { month: 5, year: 2026 },
    ];

    for (const user of insertedUsers) {
      // Calculate payroll components
      const basic = user.basicSalary;
      const hra = Math.round(basic * 0.40);
      const da = Math.round(basic * 0.20);
      const gross = basic + hra + da;
      const tds = gross > 25000 ? Math.round(gross * 0.10) : 0;
      const deductions = 500; // Flat PF/Profession tax deduction
      const netSalary = gross - tds - deductions;

      for (const m of monthsToSeed) {
        payrollRecords.push({
          userId: user._id,
          month: m.month,
          year: m.year,
          basic,
          hra,
          da,
          deductions,
          tds,
          netSalary,
          generatedAt: new Date(m.year, m.month - 1, 28),
        });
      }
    }
    
    // Chunk insertion
    for (let i = 0; i < payrollRecords.length; i += chunkSize) {
      await Payroll.insertMany(payrollRecords.slice(i, i + chunkSize));
    }
    console.log('Payroll records seeded.');

    // 10. Seed Feedback (sentiment analysis data)
    console.log('Seeding feedback (sentiment metrics)...');
    const feedbackRecords = [];
    const depts = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Design'];
    
    // Seed feedback for Jan, Feb, Mar, Apr, May 2026
    for (const user of insertedUsers) {
      if (user.role !== 'employee') continue;
      
      const months = [1, 2, 3, 4, 5];
      for (const month of months) {
        // Engineering drops feedback positive sentiment in April/May by design to test AI Feature 5
        let sentimentLabel: 'POSITIVE' | 'NEGATIVE' = 'POSITIVE';
        let sentimentScore = faker.number.float({ min: 0.65, max: 0.95 });
        let feedbackText = 'I really enjoy working with the team, learning a lot!';
        
        if (user.department === 'Engineering' && month >= 4) {
          sentimentLabel = 'NEGATIVE';
          sentimentScore = faker.number.float({ min: 0.65, max: 0.90 }); // high negative score
          feedbackText = 'The workload is extremely high and the project deadlines are unrealistic. Team morale is low.';
        } else {
          const coin = Math.random();
          if (coin < 0.2) {
            sentimentLabel = 'NEGATIVE';
            sentimentScore = faker.number.float({ min: 0.55, max: 0.85 });
            feedbackText = 'Communication between departments is slow and frustrating. We need better tools.';
          }
        }
        
        feedbackRecords.push({
          userId: user._id,
          month,
          year: 2026,
          responses: [feedbackText],
          sentimentScore,
          sentimentLabel,
        });
      }
    }
    await Feedback.insertMany(feedbackRecords);
    console.log('Feedback seeded.');

    console.log('DB SEEDING SUCCESSFUL! All records created.');
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL ERROR DURING SEEDING:', error);
    process.exit(1);
  }
}

seed();
