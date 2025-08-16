'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect } from 'react';
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
import { Eye, EyeClosed } from 'lucide-react';

const EDUCATION_IMAGE =
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=800&q=80';


interface Department {
  id: string;
  name: string;
}

const LoginSchema = z
  .object({
    email: z.string().trim().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    departmentId: z.string().optional(),
  })

type LoginSchemaType = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '', departmentId: undefined },
  });

  useEffect(() => {
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
        redirect: true,
        callbackUrl: '/', // middleware will route by role
      });

      if ((result as any)?.error) {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    }
  };

  return (
    <div
      className="min-h-[800px] flex items-center justify-center p-6 bg-gray-50 font-sans"
    >
      <div className="flex w-full max-w-5xl rounded-xl overflow-hidden shadow-xl">
        <div className="hidden md:block w-1/2 bg-blue-600 relative">
          <Image
            fill
            className="object-cover"
            src={EDUCATION_IMAGE}
            alt="Education themed"
          />
          <div className="absolute inset-0 bg-blue-900/40 flex flex-col justify-end p-8">
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
              <Select
                onValueChange={(val) => setValue('departmentId', val === '__NONE__' ? undefined : val)}
                disabled={departmentsLoading}
              >
                <SelectTrigger
                  className="w-full px-4 py-6  h-auto rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  id="departmentId"
                >
                  <SelectValue placeholder={departmentsLoading ? 'Loading...' : 'Select your department (leave blank for Admin/Dean/Asst Dean)'} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="__NONE__" className="text-gray-600">No department (Admin/Dean/Asst Dean)</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem
                      key={dept.id}
                      value={dept.id}
                      className="focus:bg-blue-50 focus:text-primary-700 data-[highlighted]:bg-blue-300 data-[state=checked]:bg-primary-100 data-[state=checked]:text-primary-700"
                    >
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && <p className="text-red-500 text-sm mt-1">{errors.departmentId.message}</p>}
              {/* <p className="text-sm text-gray-500 mt-1">Admins, Deans and Assistant Deans should not select a department.</p> */}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="your@email.com"
                required
                // ref={emailRef}
                className="w-full px-4 py-3 h-auto rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  required
                  placeholder="••••••••"
                  className="pr-10 w-full px-4 py-3 h-auto rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeClosed/> : <Eye/>}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full flex px-4 py-6 items-center border border-transparent justify-center bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5  mr-2" />
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
