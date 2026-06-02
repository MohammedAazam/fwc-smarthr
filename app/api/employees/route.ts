import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const employeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'senior_manager', 'hr_recruiter', 'employee']),
  department: z.string(),
  designation: z.string(),
  managerId: z.string().nullable().optional(),
  phone: z.string().optional(),
  photoUrl: z.string().optional(),
  basicSalary: z.number().nonnegative().default(0),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'senior_manager', 'hr_recruiter'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const department = searchParams.get('department') || '';
  const managerOnly = searchParams.get('managerOnly') === 'true';

  const query: any = { isActive: true };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (department) {
    query.department = department;
  }

  if (managerOnly) {
    query.role = { $in: ['admin', 'senior_manager'] };
  }

  const skip = (page - 1) * limit;

  try {
    const total = await User.countDocuments(query);
    const data = await User.find(query)
      .select('-passwordHash')
      .populate('managerId', 'name email designation')
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data,
      total,
      page,
      totalPages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const validatedData = employeeSchema.parse(body);

    const existingUser = await User.findOne({ email: validatedData.email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const defaultPassword = validatedData.password || 'employee123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    const newUser = new User({
      name: validatedData.name,
      email: validatedData.email.toLowerCase(),
      passwordHash,
      role: validatedData.role,
      department: validatedData.department,
      designation: validatedData.designation,
      managerId: validatedData.managerId || null,
      phone: validatedData.phone,
      photoUrl: validatedData.photoUrl || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      basicSalary: validatedData.basicSalary,
      joiningDate: new Date(),
      isActive: true,
    });

    await newUser.save();

    const responseData = newUser.toObject();
    delete (responseData as any).passwordHash;

    return NextResponse.json(responseData, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectToDatabase();

  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 });
    }

    if (updateFields.email) {
      const existingUser = await User.findOne({
        email: updateFields.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    if (updateFields.password) {
      updateFields.passwordHash = bcrypt.hashSync(updateFields.password, 10);
      delete updateFields.password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectToDatabase();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 });
    }

    // Soft delete by deactivating
    const user = await User.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!user) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Employee deactivated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
