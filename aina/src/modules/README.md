# Modules Structure

This directory contains the modular architecture for the application.

## Structure

```
modules/
├── valoracio/        # Valoració d'Ofertes
│   ├── components/   # Module specific components
│   ├── lib/          # Module utilities and helpers
│   ├── pages/        # Module pages
│   └── types/        # Module type definitions
├── elaboracio/       # Elaboració Decrets
│   ├── components/   # Module specific components
│   ├── lib/          # Module utilities and helpers
│   ├── pages/        # Module pages
│   └── types/        # Module type definitions
├── kit/              # Kit Lingüístic
│   ├── components/   # Module specific components
│   ├── lib/          # Module utilities and helpers
│   ├── pages/        # Module pages
│   └── types/        # Module type definitions
└── shared/           # Shared resources
    ├── components/   # Reusable UI components
    ├── lib/          # Shared utilities and helpers
    └── types/        # Shared type definitions
```

## Modules

### Valoració d'Ofertes (`/valoracio`)

Gestió i avaluació d'ofertes - Management and evaluation of offers.

### Elaboració Decrets (`/elaboracio`)

Gestió i elaboració de decrets - Management and elaboration of decrees.

### Kit Lingüístic (`/kit`)

Eines i recursos lingüístics - Linguistic tools and resources.

## Guidelines

- Each module is self-contained with its own components, utilities, and types
- Place module-specific code in the respective module folder
- Place reusable code that's shared across modules in the `shared/` folder
- Import from other modules should be explicit and documented
