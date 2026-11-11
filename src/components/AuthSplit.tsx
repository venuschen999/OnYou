import type { ReactElement, ReactNode } from "react";
import { PetArt } from "./PetArt";

type AuthSplitProps = { tagline: string; children: ReactNode };

// Mockup Accounts layout: Mochi greets on the left, the form sits on the right;
// on phones Mochi sits above the form.
export function AuthSplit({ tagline, children }: AuthSplitProps): ReactElement {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-2 md:grid-rows-1">
      <section className="relative flex flex-col items-center justify-center gap-2 bg-tint px-6 pt-14 pb-5 text-center md:gap-3.5 md:p-12">
        <span className="absolute top-[18px] left-5 text-[1.15rem] font-extrabold md:top-7 md:left-9 md:text-xl">
          OnYou
        </span>
        {/* The mockup draws "waiting" as the hungry face with no bowl (pet.md P3). */}
        <PetArt
          state="hungry"
          label="Mochi is waiting"
          className="w-[120px] md:w-[250px]"
        />
        <p className="m-0 max-w-[24ch] text-base font-semibold md:text-[1.15rem]">
          {tagline}
        </p>
      </section>
      <section className="flex flex-col justify-start px-5 py-6 md:justify-center md:px-20 md:py-12">
        {children}
      </section>
    </main>
  );
}
