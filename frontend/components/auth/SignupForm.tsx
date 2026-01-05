"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ROLES } from "@/lib/constants/roles";

interface SignupFormProps {
  onFlip: () => void;
}

const roleOptions = [
  { value: "", label: "Select your role", disabled: true },
  { value: ROLES.ADMIN, label: "Administrator" },
  { value: ROLES.HR, label: "HR Manager" },
  { value: ROLES.MANAGER, label: "Manager" },
  { value: ROLES.EMPLOYEE, label: "Employee" },
];

export default function SignupForm({ onFlip }: SignupFormProps) {
  const [selectedRole, setSelectedRole] = useState("");

  return (
    <Card className="w-full h-full glass-effect overflow-y-auto">
      <CardHeader className="pb-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-2xl font-bold text-white">PS</span>
          </div>
          <CardTitle className="text-3xl font-bold text-[#0F172A]">Create Account</CardTitle>
          <p className="text-sm text-[#64748B] text-center">
            Sign up to get started with Payroll System
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <form className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="signup-name"
              className="text-sm font-semibold text-[#0F172A]"
            >
              Full Name
            </label>
            <Input
              id="signup-name"
              type="text"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="signup-email"
              className="text-sm font-semibold text-[#0F172A]"
            >
              Email Address
            </label>
            <Input
              id="signup-email"
              type="email"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="signup-role"
              className="text-sm font-semibold text-[#0F172A]"
            >
              Role <span className="text-[#DC2626]">*</span>
            </label>
            <Select
              id="signup-role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              required
            >
              {roleOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="signup-password"
              className="text-sm font-semibold text-[#0F172A]"
            >
              Password
            </label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Create a password"
              required
            />
          </div>

          <div className="space-y-2 -mt-1">
            <label
              htmlFor="signup-confirm"
              className="text-sm font-semibold text-[#0F172A]"
            >
              Confirm Password
            </label>
            <Input
              id="signup-confirm"
              type="password"
              placeholder="Confirm your password"
              required
            />
          </div>

          <div className="flex items-start space-x-2 text-sm pt-2">
            <input
              type="checkbox"
              id="terms"
              className="mt-1 rounded border-input text-primary focus:ring-2 focus:ring-primary"
              required
            />
            <label htmlFor="terms" className="text-[#0F172A] cursor-pointer leading-relaxed">
              I agree to the{" "}
              <a href="#" className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold">
                Terms & Conditions
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold">
                Privacy Policy
              </a>
            </label>
          </div>

          <Button type="submit" variant="gradient" className="w-full mt-6" size="lg">
            Create Account
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-border/30 text-center">
          <p className="text-sm text-[#0F172A]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onFlip}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-bold transition-colors"
            >
              Sign In
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
