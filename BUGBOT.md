# BugBot Configuration for Solar CRM

This file defines coding standards, best practices, and project-specific guidelines for BugBot analysis.

## Project Overview
This is a Solar CRM system with:
- **Backend**: Node.js/Express with MongoDB
- **Frontend**: React with Tailwind CSS
- **Architecture**: RESTful API with real-time WebSocket features

## Code Quality Rules

### Security & Authentication
- Always validate user input and sanitize data before database operations
- Ensure proper JWT token validation in protected routes
- Check for SQL injection vulnerabilities in MongoDB queries
- Validate file uploads and implement proper file type restrictions
- Ensure sensitive data (passwords, tokens) are never logged or exposed

### Error Handling
- All async operations must have proper try-catch blocks
- API responses should follow consistent error format
- Database connection errors should be handled gracefully
- File upload errors should provide clear user feedback

### Database Operations
- Always use proper MongoDB query validation
- Implement proper indexing for frequently queried fields
- Check for potential data races in concurrent operations
- Ensure proper connection pooling and cleanup

### API Design
- All routes should have proper middleware for authentication
- Validate request payloads against expected schemas
- Implement proper rate limiting for sensitive endpoints
- Use appropriate HTTP status codes

### Frontend Best Practices
- Components should handle loading and error states
- Avoid direct DOM manipulation in React components
- Implement proper form validation
- Handle API call failures gracefully
- Use proper key props in list rendering

### Performance
- Check for potential memory leaks in event listeners
- Identify inefficient database queries (N+1 problems)
- Flag large file operations without streaming
- Review unnecessary re-renders in React components

### Business Logic
- Validate quotation calculations and pricing logic
- Ensure proper inventory management workflows
- Check customer data consistency across operations
- Validate payment processing flows

### Code Organization
- Functions should have single responsibility
- Avoid deeply nested conditional logic
- Check for duplicate code patterns
- Ensure proper separation of concerns

## File-Specific Rules

### Backend (`/backend/`)
- Controller functions should be focused and not exceed 50 lines
- Models should include proper validation rules
- Routes should have consistent middleware application
- Utility functions should be pure and testable

### Frontend (`/frontend/`)
- Components should not exceed 200 lines
- Custom hooks should be reusable and focused
- API calls should be centralized in service files
- State management should be predictable

### Environment & Configuration
- Check for hardcoded credentials or sensitive data
- Ensure environment variables are properly validated
- Review CORS settings for security implications

## Ignored Patterns
- Legacy browser compatibility warnings (project uses modern browsers)
- Console.log statements in development files
- TODO comments (tracked separately)

## Priority Issues
Focus on these high-priority issue types:
1. **Security vulnerabilities** - Critical
2. **Data corruption risks** - Critical  
3. **Authentication bypasses** - Critical
4. **Performance bottlenecks** - High
5. **Error handling gaps** - High
6. **Code maintainability** - Medium

## Custom Checks
- Verify WhatsApp webhook security implementation
- Check Razorpay payment integration security
- Validate file upload restrictions for product images
- Review PDF generation for potential XSS risks
- Ensure proper cleanup of temporary files
