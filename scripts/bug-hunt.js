#!/usr/bin/env node

/**
 * 🐛 Bug Hunt Playbook - Next.js Web App
 * 
 * Systematically identifies, documents, and logs bugs in the Next.js application.
 * Each bug found will be logged with full reproduction details.
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class BugHunter {
    constructor() {
        this.bugs = [];
        this.testResults = {
            compilation: null,
            authentication: [],
            routing: [],
            forms: [],
            api: [],
            ui: [],
            performance: [],
            accessibility: []
        };
        this.startTime = new Date();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const colors = {
            info: '\x1b[36m',
            success: '\x1b[32m',
            warning: '\x1b[33m',
            error: '\x1b[31m',
            reset: '\x1b[0m'
        };
        
        console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
    }

    addBug(title, description, severity, steps, expected, actual, category) {
        const bug = {
            id: `BUG-${Date.now()}-${this.bugs.length + 1}`,
            title,
            description,
            severity, // 'critical', 'high', 'medium', 'low'
            category, // 'compilation', 'authentication', 'routing', 'forms', 'api', 'ui', 'performance', 'accessibility'
            steps,
            expected,
            actual,
            environment: this.getEnvironmentInfo(),
            timestamp: new Date().toISOString()
        };
        
        this.bugs.push(bug);
        this.log(`🐛 BUG FOUND: ${title} (${severity})`, 'error');
        return bug;
    }

    getEnvironmentInfo() {
        return {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            timestamp: new Date().toISOString()
        };
    }

    async runCommand(command, cwd = process.cwd()) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd }, (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    error,
                    stdout,
                    stderr,
                    command
                });
            });
        });
    }

    async testCompilation() {
        this.log('🔨 Testing Compilation & Build Process', 'info');
        
        // Test linting
        const lintResult = await this.runCommand('npm run lint');
        if (!lintResult.success || lintResult.stderr.includes('error')) {
            this.addBug(
                'ESLint errors prevent clean compilation',
                'Multiple TypeScript and ESLint errors found during linting',
                'medium',
                ['Run npm run lint'],
                'No linting errors',
                `Found errors: ${lintResult.stderr}`,
                'compilation'
            );
        }

        // Test build
        const buildResult = await this.runCommand('npm run build');
        if (!buildResult.success) {
            this.addBug(
                'Application fails to build',
                'Build process fails, preventing deployment',
                'critical',
                ['Run npm run build'],
                'Successful build completion',
                `Build failed: ${buildResult.stderr}`,
                'compilation'
            );
        }

        this.testResults.compilation = {
            lint: lintResult,
            build: buildResult
        };
    }

    async testRouting() {
        this.log('🗺️  Testing Pages & Routing', 'info');
        
        const routes = [
            '/',
            '/dashboard',
            '/customer',
            '/tradesperson',
            '/onboarding',
            '/sign-in',
            '/sign-up',
            '/jobs',
            '/debug-onboarding'
        ];

        // Check if route files exist
        for (const route of routes) {
            const routePath = route === '/' ? '/page.tsx' : `${route}/page.tsx`;
            const fullPath = path.join(process.cwd(), 'src/app', routePath);
            
            if (!fs.existsSync(fullPath)) {
                this.addBug(
                    `Missing page component for route ${route}`,
                    `Route ${route} does not have a corresponding page.tsx file`,
                    'high',
                    [`Navigate to ${route}`],
                    'Page should load successfully',
                    'Page component file does not exist',
                    'routing'
                );
            }
        }
    }

    async testApiEndpoints() {
        this.log('🔌 Testing API Integration', 'info');
        
        const apiRoutes = [
            '/api/jobs',
            '/api/applications',
            '/api/quote-templates',
            '/api/stripe/checkout-session',
            '/api/stripe/webhook'
        ];

        for (const route of apiRoutes) {
            const routePath = path.join(process.cwd(), 'src/app', route, 'route.ts');
            
            if (!fs.existsSync(routePath)) {
                this.addBug(
                    `Missing API route handler for ${route}`,
                    `API endpoint ${route} does not have a route handler`,
                    'high',
                    [`Make request to ${route}`],
                    'API should respond with appropriate status',
                    'Route handler file does not exist',
                    'api'
                );
            }
        }
    }

    async testAuthentication() {
        this.log('🔐 Testing Authentication & Authorization', 'info');
        
        // Check middleware exists
        const middlewarePath = path.join(process.cwd(), 'src/middleware.ts');
        if (!fs.existsSync(middlewarePath)) {
            this.addBug(
                'Missing authentication middleware',
                'No middleware.ts file found for route protection',
                'critical',
                ['Check src/middleware.ts'],
                'Middleware should exist for auth routing',
                'middleware.ts file not found',
                'authentication'
            );
        }

        // Check auth utility functions
        const authLibPath = path.join(process.cwd(), 'src/lib/auth.ts');
        if (!fs.existsSync(authLibPath)) {
            this.addBug(
                'Missing authentication utilities',
                'No auth.ts library file found',
                'high',
                ['Check src/lib/auth.ts'],
                'Auth utilities should be available',
                'auth.ts file not found',
                'authentication'
            );
        }
    }

    async testFormValidation() {
        this.log('📝 Testing Forms & Input Validation', 'info');
        
        // Check schema definitions
        const schemaPath = path.join(process.cwd(), 'src/lib/schemas.ts');
        if (!fs.existsSync(schemaPath)) {
            this.addBug(
                'Missing validation schemas',
                'No schemas.ts file found for form validation',
                'medium',
                ['Check src/lib/schemas.ts'],
                'Validation schemas should be available',
                'schemas.ts file not found',
                'forms'
            );
        }
    }

    async testDatabaseConnection() {
        this.log('🗄️  Testing Database Integration', 'info');
        
        const prismaPath = path.join(process.cwd(), 'prisma/schema.prisma');
        if (!fs.existsSync(prismaPath)) {
            this.addBug(
                'Missing Prisma schema',
                'No Prisma schema file found',
                'critical',
                ['Check prisma/schema.prisma'],
                'Database schema should be defined',
                'schema.prisma file not found',
                'api'
            );
        }

        // Check if migrations exist
        const migrationsPath = path.join(process.cwd(), 'prisma/migrations');
        if (!fs.existsSync(migrationsPath)) {
            this.addBug(
                'No database migrations found',
                'Migrations directory does not exist',
                'high',
                ['Check prisma/migrations/'],
                'Database migrations should exist',
                'migrations directory not found',
                'api'
            );
        }
    }

    async testUIComponents() {
        this.log('🎨 Testing UI/UX Components', 'info');
        
        const componentsPath = path.join(process.cwd(), 'src/components');
        if (!fs.existsSync(componentsPath)) {
            this.addBug(
                'Missing components directory',
                'No components directory found',
                'medium',
                ['Check src/components/'],
                'Components directory should exist',
                'components directory not found',
                'ui'
            );
        }

        // Check for common UI components
        const expectedComponents = ['ui', 'forms', 'navigation'];
        for (const component of expectedComponents) {
            const componentPath = path.join(componentsPath, component);
            if (!fs.existsSync(componentPath)) {
                this.addBug(
                    `Missing ${component} components`,
                    `No ${component} component directory found`,
                    'low',
                    [`Check src/components/${component}/`],
                    `${component} components should exist`,
                    `${component} directory not found`,
                    'ui'
                );
            }
        }
    }

    generateBugReport() {
        const duration = new Date() - this.startTime;
        const report = {
            summary: {
                totalBugs: this.bugs.length,
                severityBreakdown: {
                    critical: this.bugs.filter(b => b.severity === 'critical').length,
                    high: this.bugs.filter(b => b.severity === 'high').length,
                    medium: this.bugs.filter(b => b.severity === 'medium').length,
                    low: this.bugs.filter(b => b.severity === 'low').length
                },
                categoryBreakdown: {
                    compilation: this.bugs.filter(b => b.category === 'compilation').length,
                    authentication: this.bugs.filter(b => b.category === 'authentication').length,
                    routing: this.bugs.filter(b => b.category === 'routing').length,
                    forms: this.bugs.filter(b => b.category === 'forms').length,
                    api: this.bugs.filter(b => b.category === 'api').length,
                    ui: this.bugs.filter(b => b.category === 'ui').length,
                    performance: this.bugs.filter(b => b.category === 'performance').length,
                    accessibility: this.bugs.filter(b => b.category === 'accessibility').length
                },
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            },
            bugs: this.bugs,
            testResults: this.testResults,
            environment: this.getEnvironmentInfo()
        };

        return report;
    }

    generateGitHubIssues() {
        return this.bugs.map(bug => ({
            title: `BUG: ${bug.title}`,
            body: `## 🐛 Bug Report

**Category:** ${bug.category}
**Severity:** ${bug.severity}
**Bug ID:** ${bug.id}

### Description
${bug.description}

### Steps to Reproduce
${bug.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

### Expected Behavior
${bug.expected}

### Actual Behavior
${bug.actual}

### Environment
- Node Version: ${bug.environment.nodeVersion}
- Platform: ${bug.environment.platform}
- Architecture: ${bug.environment.arch}
- Timestamp: ${bug.environment.timestamp}

### Additional Context
Found during automated bug hunt session.

---
*Generated by Bug Hunt Playbook - ${bug.timestamp}*`,
            labels: ['bug', bug.severity, bug.category]
        }));
    }

    async run() {
        this.log('🚀 Starting Bug Hunt Session', 'info');
        this.log('====================================', 'info');

        try {
            await this.testCompilation();
            await this.testRouting();
            await this.testAuthentication();
            await this.testApiEndpoints();
            await this.testFormValidation();
            await this.testDatabaseConnection();
            await this.testUIComponents();

            const report = this.generateBugReport();
            
            // Save detailed report
            const reportPath = path.join(process.cwd(), 'bug-hunt-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            // Save GitHub issues
            const issuesPath = path.join(process.cwd(), 'github-issues.json');
            const githubIssues = this.generateGitHubIssues();
            fs.writeFileSync(issuesPath, JSON.stringify(githubIssues, null, 2));

            this.log('====================================', 'info');
            this.log(`🏁 Bug Hunt Complete!`, 'success');
            this.log(`📊 Found ${report.summary.totalBugs} bugs total`, report.summary.totalBugs > 0 ? 'warning' : 'success');
            this.log(`📈 Critical: ${report.summary.severityBreakdown.critical}`, 'error');
            this.log(`📈 High: ${report.summary.severityBreakdown.high}`, 'warning');
            this.log(`📈 Medium: ${report.summary.severityBreakdown.medium}`, 'warning');
            this.log(`📈 Low: ${report.summary.severityBreakdown.low}`, 'info');
            this.log(`📄 Detailed report saved to: ${reportPath}`, 'info');
            this.log(`📋 GitHub issues saved to: ${issuesPath}`, 'info');

            return report;

        } catch (error) {
            this.log(`❌ Bug hunt failed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Run the bug hunt if this file is executed directly
if (require.main === module) {
    const bugHunter = new BugHunter();
    bugHunter.run().catch(console.error);
}

module.exports = BugHunter;