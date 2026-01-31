import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, "aria-label": ariaLabel, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    return (
      <div className="relative w-full min-w-0">
        <select
          className={cn(
            "flex h-12 w-full min-w-0 appearance-none rounded-xl border-2 border-[#2563EB]/30 bg-white px-4 py-3 pr-10 text-sm text-[#0F172A] ring-offset-background placeholder:text-[#64748B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:border-[#2563EB] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm cursor-pointer",
            className
          )}
          ref={ref}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          {...props}
        >
          {children}
        </select>
        <div 
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
          aria-hidden="true"
        >
          <svg
            className="h-5 w-5 text-[#64748B] transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
