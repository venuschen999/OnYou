# Vercel and Neon

This page moved. The full setup and deployment guide, which covers everything that was here (environments, the Neon integration, migrations, and the #3 handoff checklist, all now done) plus local setup, Resend, maintenance, and troubleshooting, is [setup-and-deployment.md](setup-and-deployment.md).

- Production: <https://onyou123.vercel.app>, deployed from `main` by the Vercel project `onyou123`, connected to `venuschen999/OnYou`.
- Database: Neon, created from the project's Storage tab (prefix `DATABASE`), with a branch per preview.
- Build: `npm run vercel-build` (`prisma migrate deploy && next build`).

Earlier decisions and sprint records link here; see `docs/agent-memory/workflow.md` W4 and W5 for the history.
