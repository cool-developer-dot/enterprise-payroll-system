# Payroll & Workforce Management System

Enterprise-grade payroll and workforce management platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Admin Dashboard**: Comprehensive overview of payroll and workforce metrics
- **Employee Management**: Full CRUD operations for employee directory
- **Payroll Management**: Process and manage payroll periods
- **Time Sheet Approval**: Review and approve employee time sheets
- **Reports**: Executive reports and analytics
- **Settings**: Configure payroll rules, bonuses, deductions, and leave policies

## Tech Stack

- **Framework**: Next.js 14.2.35 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Code Quality**: ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Deployment to Vercel

1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository in Vercel
3. Vercel will automatically detect Next.js and configure build settings
4. Deploy!

The project includes `vercel.json` for optimal Vercel configuration.

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── ui/               # UI primitives
│   ├── employees/        # Employee components
│   ├── payroll/          # Payroll components
│   ├── reports/          # Reports components
│   └── settings/         # Settings components
├── lib/                  # Utilities and services
│   ├── constants/        # Constants
│   └── services/         # API services (mocked)
└── styles/               # Global styles
```

## Environment Variables

No environment variables required for basic functionality. Mock data services are used for development.

## License

Private - Enterprise Payroll System
