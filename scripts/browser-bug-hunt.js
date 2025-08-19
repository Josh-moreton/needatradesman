#!/usr/bin/env node

/**
 * 🌐 Browser Bug Hunt Playbook - Next.js Web App
 * 
 * Comprehensive browser-based testing for the marketplace application.
 * Tests actual functionality, user flows, and interaction scenarios.
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class BrowserBugHunter {
    constructor() {
        this.bugs = [];
        this.testResults = {};
        this.startTime = new Date();
        this.serverProcess = null;
        this.appUrl = 'http://localhost:3000';
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

    addBug(title, description, severity, steps, expected, actual, category, url = null) {
        const bug = {
            id: `BROWSER-BUG-${Date.now()}-${this.bugs.length + 1}`,
            title,
            description,
            severity,
            category,
            steps,
            expected,
            actual,
            url,
            environment: this.getEnvironmentInfo(),
            timestamp: new Date().toISOString()
        };
        
        this.bugs.push(bug);
        this.log(`🐛 BROWSER BUG FOUND: ${title} (${severity})`, 'error');
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
        return new Promise((resolve) => {
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

    async startDevServer() {
        this.log('🚀 Starting Next.js development server...', 'info');
        
        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('npm', ['run', 'dev'], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let serverReady = false;
            
            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Local:') && !serverReady) {
                    serverReady = true;
                    this.log('✅ Development server started successfully', 'success');
                    // Give it a moment to fully initialize
                    setTimeout(resolve, 2000);
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                if (error.includes('Error:') || error.includes('TypeError:')) {
                    this.addBug(
                        'Development server startup error',
                        'Server failed to start properly',
                        'critical',
                        ['Run npm run dev'],
                        'Server should start without errors',
                        `Server error: ${error}`,
                        'compilation'
                    );
                }
            });

            this.serverProcess.on('error', (error) => {
                reject(error);
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!serverReady) {
                    reject(new Error('Server startup timeout'));
                }
            }, 30000);
        });
    }

    async stopDevServer() {
        if (this.serverProcess) {
            this.log('🛑 Stopping development server...', 'info');
            this.serverProcess.kill('SIGTERM');
            
            // Force kill if it doesn't stop gracefully
            setTimeout(() => {
                if (this.serverProcess && !this.serverProcess.killed) {
                    this.serverProcess.kill('SIGKILL');
                }
            }, 5000);
        }
    }

    async testPageLoading() {
        this.log('📄 Testing page loading and routing...', 'info');
        
        const routes = [
            { path: '/', name: 'Home Page' },
            { path: '/dashboard', name: 'Dashboard' },
            { path: '/onboarding', name: 'Onboarding' },
            { path: '/sign-in', name: 'Sign In' },
            { path: '/sign-up', name: 'Sign Up' },
            { path: '/debug-onboarding', name: 'Debug Onboarding' }
        ];

        const curlResults = [];
        
        for (const route of routes) {
            const result = await this.runCommand(`curl -s -o /dev/null -w "%{http_code}" ${this.appUrl}${route.path}`);
            const statusCode = result.stdout.trim();
            
            curlResults.push({
                route: route.path,
                name: route.name,
                statusCode,
                success: ['200', '301', '302', '307'].includes(statusCode)
            });

            if (!['200', '301', '302', '307'].includes(statusCode)) {
                this.addBug(
                    `${route.name} returns ${statusCode} status`,
                    `Page ${route.path} is not accessible`,
                    statusCode === '404' ? 'high' : 'medium',
                    [`Navigate to ${this.appUrl}${route.path}`],
                    'Page should return 200 or redirect status',
                    `Received ${statusCode} status code`,
                    'routing',
                    `${this.appUrl}${route.path}`
                );
            }
        }

        this.testResults.pageLoading = curlResults;
    }

    async testAPIEndpoints() {
        this.log('🔌 Testing API endpoints...', 'info');
        
        const apiEndpoints = [
            { path: '/api/jobs', method: 'GET', name: 'Jobs API' },
            { path: '/api/applications', method: 'GET', name: 'Applications API' },
            { path: '/api/quote-templates', method: 'GET', name: 'Quote Templates API' }
        ];

        const apiResults = [];
        
        for (const endpoint of apiEndpoints) {
            const result = await this.runCommand(`curl -s -o /dev/null -w "%{http_code}" -X ${endpoint.method} ${this.appUrl}${endpoint.path}`);
            const statusCode = result.stdout.trim();
            
            apiResults.push({
                endpoint: endpoint.path,
                method: endpoint.method,
                name: endpoint.name,
                statusCode,
                success: ['200', '401', '403'].includes(statusCode) // Auth-protected endpoints might return 401/403
            });

            // API endpoints should at least not return 404 or 500
            if (['404', '500', '502', '503'].includes(statusCode)) {
                this.addBug(
                    `${endpoint.name} endpoint error`,
                    `API endpoint ${endpoint.path} returns error status`,
                    statusCode === '500' ? 'critical' : 'high',
                    [`Make ${endpoint.method} request to ${this.appUrl}${endpoint.path}`],
                    'API should return valid response or auth error',
                    `Received ${statusCode} status code`,
                    'api',
                    `${this.appUrl}${endpoint.path}`
                );
            }
        }

        this.testResults.apiEndpoints = apiResults;
    }

    async testStaticAssets() {
        this.log('🖼️  Testing static assets...', 'info');
        
        // Test if favicon loads
        const faviconResult = await this.runCommand(`curl -s -o /dev/null -w "%{http_code}" ${this.appUrl}/favicon.ico`);
        if (faviconResult.stdout.trim() !== '200') {
            this.addBug(
                'Favicon not loading',
                'Favicon.ico returns non-200 status',
                'low',
                [`Navigate to ${this.appUrl}/favicon.ico`],
                'Favicon should load successfully',
                `Received ${faviconResult.stdout.trim()} status`,
                'ui',
                `${this.appUrl}/favicon.ico`
            );
        }

        // Test CSS loading by checking if globals.css exists
        const cssPath = path.join(process.cwd(), 'src/app/globals.css');
        if (!fs.existsSync(cssPath)) {
            this.addBug(
                'Missing global CSS file',
                'globals.css file not found',
                'medium',
                ['Check src/app/globals.css'],
                'Global CSS should exist',
                'File not found',
                'ui'
            );
        }
    }

    async testEnvironmentVariables() {
        this.log('🔐 Testing environment configuration...', 'info');
        
        const requiredEnvVars = [
            'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
            'CLERK_SECRET_KEY',
            'DATABASE_URL',
            'STRIPE_SECRET_KEY',
            'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
        ];

        const envPath = path.join(process.cwd(), '.env.local');
        const exampleEnvPath = path.join(process.cwd(), '.env.example');
        
        if (!fs.existsSync(envPath) && !fs.existsSync(exampleEnvPath)) {
            this.addBug(
                'Missing environment configuration',
                'No .env.local or .env.example file found',
                'critical',
                ['Check for .env.local or .env.example file'],
                'Environment configuration should exist',
                'No environment files found',
                'configuration'
            );
        }

        // Check if required environment variables are documented
        if (fs.existsSync(exampleEnvPath)) {
            const exampleEnvContent = fs.readFileSync(exampleEnvPath, 'utf8');
            for (const envVar of requiredEnvVars) {
                if (!exampleEnvContent.includes(envVar)) {
                    this.addBug(
                        `Missing environment variable documentation: ${envVar}`,
                        `Required environment variable ${envVar} not documented in .env.example`,
                        'medium',
                        ['Check .env.example file'],
                        'All required environment variables should be documented',
                        `${envVar} not found in .env.example`,
                        'configuration'
                    );
                }
            }
        }
    }

    async testDependencyHealth() {
        this.log('📦 Testing dependency health...', 'info');
        
        // Check for known security vulnerabilities
        const auditResult = await this.runCommand('npm audit --audit-level=high');
        if (!auditResult.success) {
            this.addBug(
                'Security vulnerabilities in dependencies',
                'npm audit found high-severity vulnerabilities',
                'high',
                ['Run npm audit'],
                'No high-severity vulnerabilities',
                `npm audit failed: ${auditResult.stderr}`,
                'security'
            );
        }

        // Check for outdated dependencies
        const outdatedResult = await this.runCommand('npm outdated');
        if (outdatedResult.stdout && outdatedResult.stdout.trim().length > 0) {
            this.addBug(
                'Outdated dependencies detected',
                'Some dependencies are outdated',
                'low',
                ['Run npm outdated'],
                'Dependencies should be up to date',
                `Outdated packages: ${outdatedResult.stdout}`,
                'maintenance'
            );
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
                categoryBreakdown: Object.keys(this.bugs.reduce((acc, bug) => {
                    acc[bug.category] = (acc[bug.category] || 0) + 1;
                    return acc;
                }, {})).reduce((acc, category) => {
                    acc[category] = this.bugs.filter(b => b.category === category).length;
                    return acc;
                }, {}),
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
            body: `## 🐛 Browser Bug Report

**Category:** ${bug.category}
**Severity:** ${bug.severity}
**Bug ID:** ${bug.id}
${bug.url ? `**URL:** ${bug.url}` : ''}

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
Found during automated browser-based bug hunt session.

---
*Generated by Browser Bug Hunt Playbook - ${bug.timestamp}*`,
            labels: ['bug', bug.severity, bug.category, 'browser-testing']
        }));
    }

    async run() {
        this.log('🌐 Starting Browser Bug Hunt Session', 'info');
        this.log('==========================================', 'info');

        try {
            // Static tests (don't require server)
            await this.testEnvironmentVariables();
            await this.testDependencyHealth();
            await this.testStaticAssets();

            // Try to start the server for live testing
            try {
                await this.startDevServer();
                
                // Server-dependent tests
                await this.testPageLoading();
                await this.testAPIEndpoints();
                
            } catch (serverError) {
                this.addBug(
                    'Failed to start development server',
                    'Cannot start Next.js development server for live testing',
                    'critical',
                    ['Run npm run dev'],
                    'Development server should start successfully',
                    `Server startup failed: ${serverError.message}`,
                    'compilation'
                );
            } finally {
                await this.stopDevServer();
            }

            const report = this.generateBugReport();
            
            // Save detailed report
            const reportPath = path.join(process.cwd(), 'browser-bug-hunt-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            // Save GitHub issues
            const issuesPath = path.join(process.cwd(), 'browser-github-issues.json');
            const githubIssues = this.generateGitHubIssues();
            fs.writeFileSync(issuesPath, JSON.stringify(githubIssues, null, 2));

            this.log('==========================================', 'info');
            this.log(`🏁 Browser Bug Hunt Complete!`, 'success');
            this.log(`📊 Found ${report.summary.totalBugs} bugs total`, report.summary.totalBugs > 0 ? 'warning' : 'success');
            this.log(`📈 Critical: ${report.summary.severityBreakdown.critical}`, 'error');
            this.log(`📈 High: ${report.summary.severityBreakdown.high}`, 'warning');
            this.log(`📈 Medium: ${report.summary.severityBreakdown.medium}`, 'warning');
            this.log(`📈 Low: ${report.summary.severityBreakdown.low}`, 'info');
            this.log(`📄 Detailed report saved to: ${reportPath}`, 'info');
            this.log(`📋 GitHub issues saved to: ${issuesPath}`, 'info');

            return report;

        } catch (error) {
            this.log(`❌ Browser bug hunt failed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Run the browser bug hunt if this file is executed directly
if (require.main === module) {
    const browserBugHunter = new BrowserBugHunter();
    browserBugHunter.run().catch(console.error);
}

module.exports = BrowserBugHunter;