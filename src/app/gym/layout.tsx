import { GymTabs } from "@/features/gym/gym-tabs";

/** Every gym page shares the gym's own navigation (play, rewards, history, Trainer Card). */
export default function GymLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GymTabs />
      {children}
    </>
  );
}
