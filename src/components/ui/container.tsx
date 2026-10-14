import { cn } from "@/lib/cn";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-8xl px-4 sm:px-6 lg:px-8 2xl:px-12 3xl:max-w-9xl 3xl:px-16",
        className,
      )}
    >
      {children}
    </div>
  );
}
