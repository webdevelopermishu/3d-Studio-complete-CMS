import Link from "next/link";
import { CircleButton } from "@/components/ui/Primitives";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="not-found" data-ground="dark">
      <p className="t-label not-found__code">Error 404</p>
      <h1 className="not-found__title">This page took a different angle.</h1>
      <p className="not-found__body t-lead">
        The page you are looking for has moved or no longer exists. Try the <Link href="/work">work</Link>, or start from the beginning.
      </p>
      <CircleButton href="/" label="Back home" size={130} />
    </section>
  );
}
