import Link from "next/link";
import Button from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/background (2).png')",
          backgroundAttachment: 'fixed',
        }}
      />
      {/* Subtle overlay for better content readability while preserving background beauty */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-white/50 via-white/40 to-white/50" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl space-y-12">
        <div className="text-center space-y-6">
          <div className="flex justify-center mb-6">
            <div className="h-64 w-64 flex items-center justify-center">
              <img 
                src="/payroll logo.png" 
                alt="MeeTech Labs Management system Logo" 
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
          <h1 className="text-6xl font-bold text-[#0F172A]">
            MeeTech Labs Management system
          </h1>
          <p className="text-xl text-[#64748B] max-w-2xl mx-auto">
            Enterprise Workforce Management Platform
            <br />
            <span className="text-base text-[#64748B]">
              Streamline your payroll, manage your workforce, and grow your business
            </span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/login" className="w-full sm:w-auto">
            <Button className="w-full sm:w-48" size="lg" variant="gradient">
              Sign In
            </Button>
          </Link>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-[#64748B] max-w-md mx-auto">
            Need access to the system? Please contact your system administrator to receive your login credentials.
            Only administrators can create user accounts for security purposes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 rounded-2xl glass-effect">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-lg mb-2 text-[#0F172A]">Fast & Efficient</h3>
            <p className="text-[#64748B] text-sm">Process payroll in minutes, not hours</p>
          </div>
          <div className="p-6 rounded-2xl glass-effect">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-bold text-lg mb-2 text-[#0F172A]">Secure & Reliable</h3>
            <p className="text-[#64748B] text-sm">Enterprise-grade security for your data</p>
          </div>
          <div className="p-6 rounded-2xl glass-effect">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-bold text-lg mb-2 text-[#0F172A]">Insights & Analytics</h3>
            <p className="text-[#64748B] text-sm">Make data-driven decisions with real-time reports</p>
          </div>
        </div>
      </div>
    </div>
  );
}
