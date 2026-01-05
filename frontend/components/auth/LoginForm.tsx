"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";

interface LoginFormProps {
  onFlip: () => void;
}

export default function LoginForm({ onFlip }: LoginFormProps) {
  return (
    <Card className="w-full h-full glass-effect">
      <CardHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-2xl font-bold text-white">PS</span>
          </div>
          <CardTitle className="text-3xl font-bold text-[#0F172A]">Welcome Back</CardTitle>
          <p className="text-sm text-[#64748B]">
            Sign in to your account to continue
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="login-email"
              className="text-sm font-semibold text-[#0F172A]"
            >
              Email Address
            </label>
            <Input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="login-password"
              className="text-sm font-semibold text-[#0F172A]"
            >
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              required
            />
          </div>
          <div className="flex items-center text-sm">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-input text-primary focus:ring-2 focus:ring-primary"
              />
              <span className="text-[#0F172A]">Remember me</span>
            </label>
          </div>
          <Button type="submit" variant="gradient" className="w-full" size="lg">
            Sign In
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-[#0F172A]">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={onFlip}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-bold transition-colors"
            >
              Sign Up
            </button>
          </p>
        </div>
        <div className="mt-6 pt-6 border-t border-border/50">
          <p className="text-xs text-center text-[#64748B] mb-3">
            Demo Access (UI Only)
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/admin"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors font-medium"
            >
              Admin
            </Link>
            <Link
              href="/hr"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors font-medium"
            >
              HR
            </Link>
            <Link
              href="/manager"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors font-medium"
            >
              Manager
            </Link>
            <Link
              href="/employee"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors font-medium"
            >
              Employee
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
