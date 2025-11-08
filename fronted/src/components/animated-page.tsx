import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "../lib/cn";

gsap.registerPlugin(useGSAP);

interface AnimatedPageProps {
  className?: string;
  children: React.ReactNode;
}

export function AnimatedPage({ className, children }: AnimatedPageProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 24, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power3.out",
        },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("space-y-6", className)}>
      {children}
    </div>
  );
}
