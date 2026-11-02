import { messages } from "@/config/messages";

export function SiteFooter() {
  return (
    <footer className="border-border mt-12 border-t">
      <div className="text-muted mx-auto max-w-6xl px-4 py-8 text-center text-sm">
        <p>
          {messages.footer.credits}{" "}
          <a
            href="https://pokeapi.co"
            target="_blank"
            rel="noreferrer"
            className="text-foreground font-medium underline underline-offset-2"
          >
            PokéAPI
          </a>
          .
        </p>
        <p className="mx-auto mt-2 max-w-2xl">{messages.footer.trademark}</p>
      </div>
    </footer>
  );
}
