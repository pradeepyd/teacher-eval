'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const EDUCATION_IMAGE =
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=800&q=80';

interface Department {
  id: string;
  name: string;
}

const ROLES = ['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN'] as const;
type Role = (typeof ROLES)[number];

const LoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
    departmentId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Department validation will be handled by backend
  });

type LoginSchemaType = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(LoginSchema),
  });

  useEffect(() => {
    emailRef.current?.focus();
    fetch('/api/departments/public')
      .then((res) => res.json())
      .then((data) => Array.isArray(data) ? setDepartments(data) : toast.error('Invalid department data'))
      .catch(() => toast.error('Failed to load departments'))
      .finally(() => setDepartmentsLoading(false));
  }, []);

  const onSubmit = async (formData: LoginSchemaType) => {
    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        departmentId: formData.departmentId || null,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid credentials');
      } else {
        const session = await getSession();
        if (session?.user && 'role' in session.user) {
          const role = (session.user as any).role;
          router.push(
            role === 'TEACHER' ? '/dashboard/teacher' :
            role === 'HOD' ? '/dashboard/hod' :
            role === 'ASST_DEAN' ? '/dashboard/asst-dean' :
            role === 'DEAN' ? '/dashboard/dean' :
            role === 'ADMIN' ? '/admin' : '/dashboard'
          );
        }
      }
    } catch (error) {
      toast.error('An error occurred during login');
    }
  };

  return (
    <div className="min-h-[800px] flex items-center justify-center p-6 bg-gray-50 font-sans">
      <div className="flex w-full max-w-5xl rounded-xl overflow-hidden shadow-xl">
        <div className="hidden md:block w-1/2 bg-primary-600 relative">
          <Image
            fill
            className="object-cover"
            src={EDUCATION_IMAGE}
            alt="Education themed"
          />
          <div className="absolute inset-0 bg-primary-900/40 flex flex-col justify-end p-8">
            <h2 className="text-white text-3xl font-bold mb-2">Teacher Evaluation System</h2>
            <p className="text-white/90 text-lg">Structured assessment for academic excellence</p>
          </div>
        </div>

        <div className="w-full md:w-1/2 bg-white p-8 md:p-12">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Please sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1">Department (Optional)</label>
              <Select onValueChange={(val) => setValue('departmentId', val)} disabled={departmentsLoading}>
                <SelectTrigger className="w-full" id="departmentId">
                  <SelectValue placeholder={departmentsLoading ? 'Loading...' : 'Select your department (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && <p className="text-red-500 text-sm mt-1">{errors.departmentId.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input id="email" type="email" {...register('email')} placeholder="your@email.com" ref={emailRef} />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-700">
                <input type="checkbox" className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                Remember me
              </label>
              <a href="#" className="text-primary-600 hover:text-primary-800">Forgot Password?</a>
            </div>

            <Button
              type="submit"
              className="w-full flex items-center justify-center bg-primary-600 hover:bg-primary-700 focus:ring-primary-focus text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Signing in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
