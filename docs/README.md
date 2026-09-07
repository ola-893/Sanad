# 📚 Sanad Protocol Documentation

Welcome to the Sanad Protocol documentation. This directory contains all project documentation organized by category.

## 📖 Table of Contents

### 🚀 [Deployment](./deployment/)
Documentation for deploying Sanad to various platforms.

- **[Render Deployment Guide](./deployment/render-deployment.md)** - Complete guide for deploying backend and database to Render

### 🏗️ [Architecture](./architecture/)
System architecture, design documents, and technical specifications.

- **[Database Schema](./architecture/database-schema.sql)** - PostgreSQL database schema
- **[Database Interlinking Matrix](./architecture/database-interlinking-matrix.md)** - Database relationships and connections
- **[API Documentation](./architecture/api-documentation.json)** - REST API specifications
- **[Functional Requirements Document](./architecture/functional-requirements-document.md)** - FRD for the entire system
- **[Detailed Frontend-Backend FRD](./architecture/detailed-frontend-backend-frd.md)** - Frontend and backend requirements
- **[Technical Requirements](./architecture/technical-requirements.md)** - Technical specs and constraints
- **[Design Direction](./architecture/design-direction.md)** - UI/UX design guidelines
- **[Suyula Liquid Project Plan](./architecture/suyula-liquid-project-plan.md)** - Project planning documentation

**Component Documentation:**
- **[Backend Credit Bureau](./architecture/backend-credit-bureau.md)** - Credit bureau service architecture
- **[Backend Investor](./architecture/backend-investor.md)** - Investor service architecture
- **[Backend Services](./architecture/backend-services.md)** - Backend services overview
- **[Frontend Credit Bureau](./architecture/frontend-credit-bureau.md)** - Frontend credit bureau implementation
- **[Frontend Auth](./architecture/frontend-auth.md)** - Authentication system documentation

### 💻 [Development](./development/)
Setup guides and development workflows.

- **[Python Setup Guide](./development/python-setup.md)** - Setting up Python environment for AI agent

### 📝 [Guides](./guides/)
User guides, tutorials, and demo scripts.

- **[Quickstart Guide](./guides/quickstart-guide.md)** - Quick start guide for testers
- **[Demo & Pitch Script](./guides/demo-pitch-script.md)** - Demo walkthrough and pitch presentation

---

## 🎯 Quick Links

### For Developers
- [Backend README](../backend/README.md)
- [Frontend README](../frontend/README.md)
- [Python Agent README](../agent/README.md)

### For Deployment
- [Render Deployment](./deployment/render-deployment.md)
- [Docker Compose Setup](../docker-compose.yml)

### For Understanding the System
- [Architecture Overview](../README.md#architecture)
- [Database Schema](./architecture/database-schema.sql)
- [API Documentation](./architecture/api-documentation.json)

---

## 📂 Documentation Structure

```
docs/
├── README.md                          # This file
├── deployment/                        # Deployment guides
│   └── render-deployment.md
├── architecture/                      # System architecture & design
│   ├── database-schema.sql
│   ├── api-documentation.json
│   ├── functional-requirements-document.md
│   ├── detailed-frontend-backend-frd.md
│   ├── technical-requirements.md
│   ├── design-direction.md
│   ├── database-interlinking-matrix.md
│   ├── backend-credit-bureau.md
│   ├── backend-investor.md
│   ├── backend-services.md
│   ├── frontend-credit-bureau.md
│   └── frontend-auth.md
├── development/                       # Development setup
│   └── python-setup.md
└── guides/                           # User guides
    ├── quickstart-guide.md
    └── demo-pitch-script.md
```

---

## 🤝 Contributing to Documentation

When adding new documentation:
1. Place it in the appropriate category folder
2. Use kebab-case for filenames (e.g., `my-new-guide.md`)
3. Update this README.md with a link to your new doc
4. Follow the existing markdown formatting style

---

## 📧 Need Help?

- Check the [Quickstart Guide](./guides/quickstart-guide.md)
- Review the [Architecture Documentation](./architecture/)
- See the main [README](../README.md)
