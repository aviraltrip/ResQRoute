# ResQRoute: Next-Gen Emergency Coordination Platform

ResQRoute is a comprehensive emergency management system designed for high-density environments like hotels. It bridges the gap between guests, staff, and first responders during critical incidents through real-time communication, AI-powered triage, and interactive navigation.

## 🚀 Key Features

- **Interactive Evacuation Map**: Dynamic floor plans with real-time pathfinding to the nearest safe exit.
- **AI-Powered Distress Triage**: Voice and text distress messages are automatically transcribed and triaged using AI to categorize severity and nature (medical, fire, structural, etc.).
- **Automated Emergency Dispatch**: Instant SMS and Voice call notifications to emergency services via Twilio, including precise guest location and incident details.
- **Multi-Role Dashboards**:
  - **Staff Command Center**: Centralized hub to trigger alarms, monitor guest status, and manage the live distress feed.
  - **Guest Portal**: Interactive check-in, real-time evacuation guidance, and one-tap SOS.
  - **Responder Interface**: Incident-specific views for first responders with live room-by-room status.
- **Pathfinding Engine**: Built-in Dijkstra-based navigation that accounts for blocked routes and accessibility requirements.

## 🛠 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI/ML**: [OpenRouter](https://openrouter.ai/) (Triage), [AssemblyAI](https://www.assemblyai.com/) (Speech-to-Text)
- **Communication**: [Twilio](https://www.twilio.com/) (SMS & Voice)
- **Visualization**: [Leaflet](https://leafletjs.com/) (Maps), [Three.js](https://threejs.org/) (WebGL Effects)

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (Supabase recommended)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/resqroute.git
   cd resqroute
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env.local` file and fill in the required keys (see [Environment Variables](#-environment-variables)).
4. Initialize the database:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

## 🔑 Environment Variables

Required variables in `.env.local`:
- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct connection string for Prisma migrations
- `OPENROUTER_API_KEY`: For AI triage logic
- `ASSEMBLYAI_API_KEY`: For voice message transcription
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: For emergency dispatch

## 📂 Project Structure

- `app/`: Next.js routes and server actions.
- `components/`: Reusable UI components and feature-specific clients.
- `lib/`: Core utilities (Prisma client, AI logic, helpers).
- `prisma/`: Database schema and seed data.
- `public/`: Static assets (icons, logos).

---
*Built with ❤️ for rapid emergency response and human safety.*
