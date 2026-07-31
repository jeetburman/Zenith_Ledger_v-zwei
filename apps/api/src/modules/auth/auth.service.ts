import bcrypt from 'bcryptjs';
import { authRepository } from './auth.repository';
import { ConflictError } from '../../shared/errors/AppError';
import { z } from 'zod';

// Validation schema for registration
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  number: z.string().min(10, 'Enter a valid phone number').max(15),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  email: z.string().email('Enter a valid email').optional(),
});

export const authService = {
  register: async (input: z.infer<typeof registerSchema>) => {
    // Check phone number isn't already taken
    const existingByNumber = await authRepository.findUserByNumber(
      input.number
    );
    if (existingByNumber) {
      throw new ConflictError(
        'An account with this phone number already exists'
      );
    }

    // Check email isn't already taken (if provided)
    if (input.email) {
      const existingByEmail = await authRepository.findUserByEmail(
        input.email
      );
      if (existingByEmail) {
        throw new ConflictError(
          'An account with this email already exists'
        );
      }
    }

    // Hash the password — never store plain text.
    // 10 salt rounds is the standard balance between
    // security and performance.
    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await authRepository.createUserWithBalance({
      name: input.name,
      number: input.number,
      password: hashedPassword,
      email: input.email,
    });

    // Return only safe fields — never return the password hash
    return {
      id: user.id,
      name: user.name,
      number: user.number,
      email: user.email,
    };
  },
};