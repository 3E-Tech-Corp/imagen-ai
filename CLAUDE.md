# CLAUDE.md — Project Context for AI Assistants

## Project Overview
**Imagen AI** — A web application for generating images and videos using AI.
Full-stack: .NET 8 Web API backend + React/Vite/TypeScript frontend, deployed to IIS.

## Architecture
- **Backend:** `backend/ProjectTemplate.Api/` — .NET 8 minimal API with Dapper + SQL Server
- **Frontend:** `frontend/` — React 18 + Vite + TypeScript + Tailwind CSS (single-page, no routing)
- **Deployment:** GitHub Actions → self-hosted runner → IIS
- **AI APIs:** FAL.ai (Flux for images, Kling for videos)

## Key Features
- Text-to-image generation (styles: photographic, realistic, artistic, anime, 3D render)
- Text-to-video generation
- Negative prompt support
- No authentication required (public access)

## Key Files
- `frontend/src/App.tsx` — Main app component with generation logic
- `frontend/src/components/PromptInput.tsx` — Prompt input with style selection
- `frontend/src/components/Gallery.tsx` — Results gallery
- `backend/.../Controllers/GenerationController.cs` — Generation API endpoint
- `backend/.../Services/ImageGenerationService.cs` — FAL.ai integration

## API Endpoints
- `POST /api/generation/create` — Generate image or video (no auth required)
  - Body: `{ prompt, type: "image"|"video", style, negativePrompt? }`
- `GET /health` — Health check

## Configuration Placeholders (appsettings.json)
- `__CONNECTION_STRING__` — SQL Server connection string
- `__JWT_KEY__` — JWT signing key (legacy, kept for auth service)
- `__CORS_ORIGINS__` — Comma-separated allowed CORS origins
- `__FAL_API_KEY__` — FAL.ai API key for image/video generation

## Build Commands
```bash
# Backend
cd backend/ProjectTemplate.Api && dotnet build

# Frontend
cd frontend && npm install && npm run build
```

## Deployment
- Physical paths: `F:\New_WWW\{site_name}\WWW` (frontend) + `F:\New_WWW\{site_name}\API` (backend)
- Deploy: manual trigger via GitHub Actions `deploy.yml`
