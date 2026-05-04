## Packages
date-fns | For formatting dates nicely in events and chat
framer-motion | For beautiful page transitions and animations
react-hook-form | For building robust forms
@hookform/resolvers | For Zod validation in forms

## Notes
- We assume Replit Auth is correctly wired. If not logged in, `useAuth` returns `null` user.
- Chat implements polling (`refetchInterval: 3000`) on the messages endpoint to simulate real-time without WS.
- We use Unsplash placeholder images for the visual aesthetic.
