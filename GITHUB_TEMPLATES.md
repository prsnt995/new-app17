# GitHub Issue & Pull Request Templates

**Version:** 1.0  
**Last Updated:** August 2026

---

## Directory Structure

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   ├── feature_request.md
│   ├── documentation.md
│   └── performance.md
├── pull_request_template.md
└── PULL_REQUEST_TEMPLATE/
    ├── backend.md
    ├── frontend.md
    └── mobile.md
```

---

## Issue Templates

### .github/ISSUE_TEMPLATE/bug_report.md

```markdown
---
name: "🐛 Bug Report"
about: "Report a bug to help us improve"
title: "[BUG] "
labels: ["bug", "needs-triage"]
assignees: []
---

## 🐛 Bug Description
<!-- Provide a clear and concise description of what the bug is -->

## 📍 Where It Happens
<!-- Which page/feature/component is affected? -->
- [ ] Web App
- [ ] iOS App
- [ ] Android App
- [ ] API
- [ ] Other: ________

## 🔄 Steps to Reproduce
<!-- How do we reproduce this issue? -->

1. Go to '...'
2. Click on '...'
3. See error

## ✅ Expected Behavior
<!-- What should happen instead? -->

## ❌ Actual Behavior
<!-- What actually happened? -->

## 📸 Screenshots or Videos
<!-- Add screenshots or videos if applicable -->

## 🖥️ Environment Details
<!-- Please complete the following information -->
- **OS**: [e.g. macOS, Windows, iOS, Android]
- **Browser**: [e.g. Chrome, Safari]
- **App Version**: [e.g. 1.0.0]
- **Network**: [e.g. WiFi, 4G]

## 📝 Additional Context
<!-- Any other context about the problem? -->

## 🏥 Impact Assessment
- [ ] **Critical** - System is down, users can't complete orders
- [ ] **High** - Major feature broken, workaround available
- [ ] **Medium** - Feature not working as expected
- [ ] **Low** - Minor UI/UX issue, no functionality impact

## 📋 Checklist
- [ ] I have searched for existing issues
- [ ] This issue is reproducible
- [ ] Steps to reproduce are clear
- [ ] Screenshots/videos are provided
```

---

### .github/ISSUE_TEMPLATE/feature_request.md

```markdown
---
name: "✨ Feature Request"
about: "Suggest a new feature or improvement"
title: "[FEATURE] "
labels: ["enhancement", "needs-triage"]
assignees: []
---

## 📝 Feature Description
<!-- Clear and concise description of what you want -->

## 🎯 Problem It Solves
<!-- What problem does this feature solve? -->

### Current Behavior
<!-- What's the current behavior/limitation? -->

### Desired Behavior
<!-- What should happen instead? -->

## 👥 Affected Users
<!-- Who would benefit from this feature? -->
- [ ] Individual users
- [ ] Small businesses
- [ ] Shipping partners
- [ ] Support team
- [ ] All users

## 💡 Proposed Solution
<!-- How should this feature work? Be specific -->

## 🤔 Alternatives Considered
<!-- Any other ways to solve this problem? -->

## 🔗 Related Issues
<!-- Link any related issues using #issue-number -->

## 📊 Impact Assessment
- **Priority**: High / Medium / Low
- **Effort**: Small / Medium / Large
- **User Impact**: High / Medium / Low

## 📋 Acceptance Criteria
- [ ] 
- [ ] 
- [ ] 

## 📚 Additional Resources
<!-- Any designs, mockups, or documentation? -->

## 📋 Checklist
- [ ] Feature aligns with product roadmap
- [ ] There are no duplicate feature requests
- [ ] I have provided sufficient detail
```

---

### .github/ISSUE_TEMPLATE/documentation.md

```markdown
---
name: "📚 Documentation"
about: "Request documentation improvements or report missing docs"
title: "[DOCS] "
labels: ["documentation"]
assignees: []
---

## 📖 What Documentation Is Missing or Unclear?
<!-- Describe what documentation is needed or what's unclear -->

## 🔍 Where Did You Look?
<!-- Which docs did you check? -->
- [ ] README.md
- [ ] PRD.md
- [ ] DEVELOPMENT.md
- [ ] API_SPEC.md
- [ ] WIREFRAMES.md
- [ ] DATABASE_SCHEMA.md
- [ ] DEPLOYMENT.md
- [ ] CICD.md
- [ ] Other: ________

## 📍 Specific Section
<!-- Link to the section or describe the location -->

## ✍️ Suggested Improvement
<!-- What would make the documentation better? -->

## 📚 Related Issue
<!-- Link any related issues #issue-number -->

## 📋 Checklist
- [ ] I have checked existing documentation
- [ ] I have searched for related issues
- [ ] I can provide suggested text (optional)
```

---

### .github/ISSUE_TEMPLATE/performance.md

```markdown
---
name: "⚡ Performance Issue"
about: "Report performance degradation"
title: "[PERF] "
labels: ["performance", "needs-triage"]
assignees: []
---

## 📊 Performance Issue Description
<!-- Describe the performance problem -->

## 📍 Affected Area
- [ ] Web App - Page Load Time
- [ ] Web App - API Response Time
- [ ] Mobile App - Startup Time
- [ ] Mobile App - Navigation Speed
- [ ] API - Response Time
- [ ] Database - Query Performance
- [ ] Other: ________

## ⚙️ Current Performance
<!-- What are current metrics? -->
- **Load Time**: _____ ms
- **Response Time**: _____ ms
- **Bundle Size**: _____ KB
- **Memory Usage**: _____ MB

## 🎯 Expected Performance
<!-- What should the metrics be? -->

## 📈 Performance Metrics
<!-- Provide any logs, metrics, or screenshots -->

```
[Paste metrics/logs here]
```

## 🔄 Steps to Reproduce
1. ...
2. ...
3. ...

## 🖥️ Environment
- **OS**: 
- **Browser**: 
- **Network**: 
- **Device**: 

## 🛠️ Profiling Data
<!-- Attach profiling data, flame graphs, etc. -->

## 📋 Checklist
- [ ] I have benchmarked the current performance
- [ ] I have identified the specific bottleneck
- [ ] I have provided profiling data or screenshots
```

---

## Pull Request Templates

### .github/pull_request_template.md (Default)

```markdown
## 📝 Description
<!-- Brief description of changes -->

## 🎯 Related Issue
<!-- Link to issue: Fixes #123 -->

## 🔄 Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] 📚 Documentation update
- [ ] ♻️ Code refactor
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security fix

## 📋 Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests passed locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules
- [ ] I have checked my code and corrected any misspellings

## 🧪 Testing
<!-- Describe the tests you ran to verify your changes -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## 📸 Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## 🔍 Code Review Notes
<!-- Any specific areas you want reviewers to focus on? -->

## 🚀 Deployment Considerations
- [ ] Database migrations needed
- [ ] Environment variables updated
- [ ] Breaking changes documented
- [ ] API changes documented

## 📊 Performance Impact
- [ ] No performance impact
- [ ] Performance improvement
- [ ] Performance degradation (if yes, explain why it's necessary)

## 🔗 Links
<!-- Add any relevant links -->
- Related PR: 
- Design Document: 
- Issue: 
```

---

### .github/PULL_REQUEST_TEMPLATE/backend.md

```markdown
---
name: Backend PR
---

## 🔧 Backend Changes

### Description
<!-- Describe the backend changes -->

### API Changes
<!-- Document any API endpoint changes -->

```
[Affected endpoints]
```

### Database Changes
- [ ] No database changes
- [ ] Migration created: _________
- [ ] Migration tested

### Environment Variables
- [ ] No new environment variables
- [ ] New variables added:
  ```
  NEW_VAR=value
  ```

### Dependencies
- [ ] No new dependencies
- [ ] Dependencies updated:
  ```
  npm install <package>
  ```

## 🧪 Testing

- [ ] Unit tests added
- [ ] Integration tests added
- [ ] API tests passed
- [ ] Load testing completed (if applicable)

### Test Coverage
```
Current: ___%
New: ___%
```

## 📋 Checklist
- [ ] Code follows backend best practices
- [ ] Error handling implemented
- [ ] Logging added
- [ ] API documentation updated
- [ ] Database indexes optimized
- [ ] No security vulnerabilities
- [ ] Performance impact assessed

## 🚨 Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes documented:
  ```
  [List breaking changes]
  ```

## 🔗 Related Issues
Fixes #123
Related to #456
```

---

### .github/PULL_REQUEST_TEMPLATE/frontend.md

```markdown
---
name: Frontend PR
---

## 🎨 Frontend Changes

### Description
<!-- Describe the UI/feature changes -->

### Components Changed
<!-- List components modified or created -->

- `ComponentName.tsx`
- `AnotherComponent.tsx`

### UI/UX Changes
<!-- Describe visual changes -->

### Responsive Design
- [ ] Tested on mobile (< 480px)
- [ ] Tested on tablet (768px)
- [ ] Tested on desktop (1920px)

### Browser Compatibility
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## 🧪 Testing

- [ ] Component tests added
- [ ] Unit tests passed
- [ ] E2E tests updated
- [ ] Manual testing completed

## 📸 Screenshots

### Before
<!-- Add before screenshots -->

### After
<!-- Add after screenshots -->

## ♿ Accessibility
- [ ] WCAG 2.1 Level AA compliant
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Color contrast verified

## 🎭 Browser/Device Tested
- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Safari
- [ ] iOS Safari
- [ ] Android Chrome

## 📊 Performance Impact
- [ ] Bundle size: ___ KB (change: ___)
- [ ] LCP improvement: ___ ms
- [ ] CLS impact: ___

## 📋 Checklist
- [ ] CSS/styling properly scoped
- [ ] No console warnings/errors
- [ ] Dark mode tested (if applicable)
- [ ] Accessibility tested
- [ ] Performance optimized
- [ ] No hardcoded values

## 🔗 Related Issues
Fixes #123
```

---

### .github/PULL_REQUEST_TEMPLATE/mobile.md

```markdown
---
name: Mobile App PR
---

## 📱 Mobile App Changes

### Description
<!-- Describe the mobile app changes -->

### Platforms
- [ ] iOS
- [ ] Android
- [ ] Both

### Components/Screens Changed
<!-- List screens or components modified -->

## 🧪 Testing

- [ ] Tested on physical device (iOS)
- [ ] Tested on physical device (Android)
- [ ] Tested on simulator/emulator
- [ ] Unit tests added
- [ ] E2E tests updated

### Devices Tested
- [ ] iPhone (model: ___)
- [ ] iPad
- [ ] Android Phone
- [ ] Android Tablet

### OS Versions Tested
- iOS: ___
- Android: ___

## 🎭 Testing Checklist
- [ ] App launches without errors
- [ ] All navigation works
- [ ] Forms submit successfully
- [ ] API calls work
- [ ] Offline mode tested (if applicable)
- [ ] Network switching tested
- [ ] Battery usage acceptable
- [ ] Memory usage acceptable

## 📊 Performance Impact
- [ ] App startup time: ___ ms
- [ ] Screen navigation: ___ ms
- [ ] Bundle size: ___ MB
- [ ] Memory: ___ MB

## 🎯 Expo/EAS
- [ ] Expo dependencies updated
- [ ] EAS build successful
- [ ] Native modules tested (if added)

## 🔗 Related Issues
Fixes #123

## 📹 Testing Video
<!-- Link to video demo if available -->
```

---

## Configuration File

### .github/ISSUE_TEMPLATE/config.yml

```yaml
blank_issues_enabled: false
contact_links:
  - name: Documentation
    url: https://github.com/prsnt995/namastemart/wiki
    about: Visit our wiki for detailed documentation
  - name: Slack Community
    url: https://namastemart.slack.com
    about: Join our community Slack for discussions
  - name: Security Vulnerability
    url: mailto:security@namastemart.com
    about: Report security vulnerabilities privately
```

---

## Usage Instructions

### For Issue Creators

1. Go to **Issues** → **New Issue**
2. Select the appropriate template
3. Fill in all sections
4. Add labels (bug, feature, etc.)
5. Submit

### For PR Creators

1. Create a branch: `git checkout -b feature/feature-name`
2. Make changes and commit
3. Push: `git push origin feature/feature-name`
4. Go to **Pull Requests** → **New PR**
5. Select appropriate template (or use default)
6. Fill in all sections
7. Link related issues using `Fixes #123`
8. Request reviewers
9. Submit

### Branch Naming Convention

```
feature/short-description       # New feature
bugfix/bug-description          # Bug fix
hotfix/critical-fix             # Critical production fix
refactor/component-name         # Code refactoring
docs/documentation-topic        # Documentation
perf/optimization-area          # Performance improvement
```

Example:
```
feature/shipment-tracking
bugfix/payment-gateway-timeout
hotfix/database-connection-leak
refactor/order-service
docs/api-authentication
perf/reduce-bundle-size
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>

Example:
feat(shipment): add real-time GPS tracking

- Implement WebSocket for live location updates
- Add tracking map component
- Update order details page

Fixes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `perf`: Performance improvement
- `chore`: Build, dependencies, tooling

---

## Review Guidelines

### Code Review Checklist

```markdown
## Code Quality
- [ ] Code is readable and well-documented
- [ ] No duplicated code
- [ ] Follows project conventions
- [ ] No console logs or debug code

## Functionality
- [ ] Feature works as expected
- [ ] No regressions
- [ ] Edge cases handled
- [ ] Error handling present

## Performance
- [ ] No performance degradation
- [ ] Efficient database queries
- [ ] No memory leaks
- [ ] Bundle size acceptable

## Testing
- [ ] Tests are comprehensive
- [ ] Tests pass locally
- [ ] Test coverage adequate

## Security
- [ ] No security vulnerabilities
- [ ] Input validation present
- [ ] Authentication/authorization correct
- [ ] Secrets not exposed

## Accessibility
- [ ] Accessible to keyboard users
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
```

---

## Labels Definition

```yaml
bug: Something isn't working
enhancement: New feature or request
documentation: Improvements or additions to documentation
performance: Performance issue or improvement
security: Security vulnerability
urgent: Needs immediate attention
help wanted: Extra attention is needed
good first issue: Good for newcomers
wontfix: This will not be worked on
duplicate: This issue is a duplicate
question: Further information is requested
```

---

*Last Updated: August 2026*
*Version: 1.0*
